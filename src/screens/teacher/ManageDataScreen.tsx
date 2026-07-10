import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Search, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { Theme } from '../../theme/tokens';
import * as teacherService from '../../services/teacherService';
import { useAuth } from '../../context/AuthContext';

const C = Theme.colors;
const ITEMS_PER_PAGE = 8;

const KEY_COLS = ['roll_no', 'student_full_name', 'class_grade', 'section', 'gender', 'student_status'];

type StudentRecord = Record<string, string | number | null | undefined>;

function fmtLabel(key: string): string {
  if (key === 'roll_no') { return 'Roll No'; }
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ManageDataScreen() {
  const navigation = useNavigation<any>();
  const { isClassTeacher } = useAuth();

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [classSections, setClassSections] = useState<Array<{ class_name: string; sections: string[] }>>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [rollSearch, setRollSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      const code = (await AsyncStorage.getItem('school_code')) || '';
      const bid = (await AsyncStorage.getItem('branch_id')) || '';
      setSchoolCode(code);
      setBranchId(bid);
    };
    loadContext();
  }, []);

  const fetchClassSections = useCallback(async () => {
    if (!schoolCode || !branchId) { return; }
    try {
      const data = await teacherService.getClassesSections(branchId, schoolCode);
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      const grouped = new Map<string, Set<string>>();
      items.forEach((item: any) => {
        const cls = String(item?.class_name ?? item?.class_grade ?? '').trim();
        if (!cls) { return; }
        const sectionList = Array.isArray(item?.sections)
          ? item.sections
          : (item?.section ? [item.section] : []);
        if (!grouped.has(cls)) { grouped.set(cls, new Set()); }
        sectionList.forEach((sec: string) => {
          const normalized = String(sec || '').trim();
          if (normalized) { grouped.get(cls)!.add(normalized); }
        });
      });
      setClassSections(
        Array.from(grouped.entries()).map(([class_name, sections]) => ({
          class_name,
          sections: Array.from(sections).sort((a, b) => a.localeCompare(b)),
        })),
      );
    } catch {
      setClassSections([]);
    }
  }, [schoolCode, branchId]);

  const fetchStudents = useCallback(async () => {
    if (!schoolCode || !branchId) { return; }
    setLoading(true);
    try {
      const students = await teacherService.getManageStudents({
        school_code: schoolCode,
        branch_id: branchId,
        ...(selectedClass ? { class_grade: selectedClass } : {}),
        ...(selectedSection ? { section: selectedSection } : {}),
      });
      setRecords(students);
    } catch {
      Alert.alert('Error', 'Failed to fetch student data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolCode, branchId, selectedClass, selectedSection]);

  useEffect(() => {
    fetchClassSections();
  }, [fetchClassSections]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const sectionOptions = useMemo(() => {
    const match = classSections.find(c => c.class_name === selectedClass);
    return match?.sections || [];
  }, [classSections, selectedClass]);

  const filtered = useMemo(() => {
    let result = records;
    const q = rollSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(r => String(r.roll_no || '').toLowerCase().includes(q));
    }
    return result;
  }, [records, rollSearch]);

  useEffect(() => { setCurrentPage(1); }, [rollSearch, selectedClass, selectedSection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const buildUpdatePayload = (row: StudentRecord) => {
    const payload: Record<string, unknown> = { roll_no: row.roll_no };
    Object.entries(row).forEach(([key, value]) => {
      if (['branch_id', 'roll_number', 'admission_number', 'student_photograph', 'confirm_password'].includes(key)) {
        return;
      }
      if (key === 'password' && (!value || String(value).trim() === '')) { return; }
      payload[key] = value === '' ? null : value;
    });
    return payload;
  };

  const saveEdit = async () => {
    if (!editStudent || !schoolCode || !branchId) { return; }
    try {
      setSaving(true);
      await teacherService.updateManageStudent({
        school_code: schoolCode,
        branch_id: branchId,
        data_type: 'students',
        data: buildUpdatePayload(editStudent),
      });
      Alert.alert('Success', 'Student updated successfully');
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = (id: string) => {
    Alert.alert('Delete Student', 'Delete this student record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await teacherService.deleteManageStudent({
              school_code: schoolCode,
              branch_id: branchId,
              data_type: 'students',
              id: String(id),
            });
            fetchStudents();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.detail || 'Delete failed');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const editableFields = useMemo(() => {
    if (!editStudent) { return []; }
    return Object.keys(editStudent).filter(
      k => !['roll_no', 'branch_id', 'roll_number', 'admission_number', 'student_photograph'].includes(k),
    );
  }, [editStudent]);

  if (!isClassTeacher) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={innerPageLayoutStyles.scrollViewFront}
          contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        >
          <StandardPageHeader
            title="Manage Profiles"
            onBackPress={() => navigation.goBack()}
            scrollWithContent
            containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          />
          <View style={[styles.centered, innerPageLayoutStyles.scrollBody]}>
            <AppText style={styles.emptyText}>Manage Profiles is available for class teachers only.</AppText>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.content]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} />}
      >
        <StandardPageHeader
          title="Manage Profiles"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
        <AppText style={styles.subtitle}>Search, view, edit, and delete student records for your classes.</AppText>

        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.filterChip} onPress={() => setClassPickerOpen(true)}>
            <AppText style={styles.filterChipText}>{selectedClass || 'All Classes'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, !selectedClass && styles.filterChipDisabled]}
            onPress={() => selectedClass && setSectionPickerOpen(true)}
            disabled={!selectedClass}
          >
            <AppText style={styles.filterChipText}>{selectedSection || 'All Sections'}</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Search size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by roll number..."
            placeholderTextColor={C.textMuted}
            value={rollSearch}
            onChangeText={setRollSearch}
          />
        </View>

        {loading && records.length === 0 ? (
          <ScreenSkeleton variant="list" />
        ) : paginated.length === 0 ? (
          <AppText style={styles.emptyText}>No students found for the selected filters.</AppText>
        ) : (
          paginated.map(row => (
            <AppCard key={String(row.roll_no)} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" style={styles.name}>{String(row.student_full_name || '—')}</AppText>
                  <AppText style={styles.meta}>
                    Roll {String(row.roll_no || '—')} • Class {String(row.class_grade || '—')}-{String(row.section || '—')}
                  </AppText>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => setEditStudent({ ...row })} style={styles.iconBtn}>
                    <Edit2 size={18} color={C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteStudent(String(row.roll_no || ''))} style={styles.iconBtn}>
                    <Trash2 size={18} color={C.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.tagRow}>
                {KEY_COLS.filter(k => row[k] != null && k !== 'student_full_name' && k !== 'roll_no').slice(0, 4).map(k => (
                  <View key={k} style={styles.tag}>
                    <AppText style={styles.tagText}>{fmtLabel(k)}: {String(row[k])}</AppText>
                  </View>
                ))}
              </View>
            </AppCard>
          ))
        )}

        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              disabled={currentPage <= 1}
              onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeft size={18} color={C.primary} />
            </TouchableOpacity>
            <AppText style={styles.pageText}>{currentPage} / {totalPages}</AppText>
            <TouchableOpacity
              disabled={currentPage >= totalPages}
              onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
            >
              <ChevronRight size={18} color={C.primary} />
            </TouchableOpacity>
          </View>
        )}
        </View>
      </ScrollView>
      <CustomPickerModal
        visible={classPickerOpen}
        title="Select Class"
        options={[{ label: 'All Classes', value: '' }, ...classSections.map(c => ({ label: c.class_name, value: c.class_name }))]}
        selectedValue={selectedClass}
        onValueChange={(value) => {
          setSelectedClass(value);
          setSelectedSection('');
          setClassPickerOpen(false);
        }}
        onClose={() => setClassPickerOpen(false)}
      />

      <CustomPickerModal
        visible={sectionPickerOpen}
        title="Select Section"
        options={[{ label: 'All Sections', value: '' }, ...sectionOptions.map(s => ({ label: s, value: s }))]}
        selectedValue={selectedSection}
        onValueChange={(value) => {
          setSelectedSection(value);
          setSectionPickerOpen(false);
        }}
        onClose={() => setSectionPickerOpen(false)}
      />

      <Modal visible={!!editStudent} animationType="slide" onRequestClose={() => setEditStudent(null)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <AppText weight="bold" style={styles.modalTitle}>Edit Student</AppText>
            <TouchableOpacity onPress={() => setEditStudent(null)}>
              <X size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.modalBody}>
            {editableFields.map(key => (
              <View key={key} style={styles.fieldGroup}>
                <AppText style={styles.fieldLabel}>{fmtLabel(key)}</AppText>
                <TextInput
                  style={styles.fieldInput}
                  value={String(editStudent?.[key] ?? '')}
                  onChangeText={text => setEditStudent(prev => prev ? { ...prev, [key]: text } : prev)}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <AppButton title={saving ? 'Saving...' : 'Save Changes'} onPress={saveEdit} disabled={saving} leftIcon={<Save size={18} color={Theme.colors.card} />} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { paddingBottom: 120 },
  subtitle: { color: C.textSec, marginBottom: Theme.spacing.md },
  filtersRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginBottom: Theme.spacing.md },
  filterChip: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipDisabled: { opacity: 0.5 },
  filterChipText: { color: C.text, fontSize: Theme.typography.caption.fontSize, textAlign: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, paddingVertical: Theme.spacing.md, color: C.text },
  card: { marginBottom: Theme.spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: Theme.typography.h4.fontSize, color: C.text },
  meta: { color: C.textMuted, marginTop: Theme.spacing.xs, fontSize: Theme.typography.caption.fontSize },
  actions: { flexDirection: 'row', gap: Theme.spacing.xs },
  iconBtn: { padding: Theme.spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: C.backgroundAlt, borderRadius: Theme.radius.sm, paddingHorizontal: Theme.spacing.sm, paddingVertical: Theme.spacing.xs },
  tagText: { fontSize: Theme.typography.label.fontSize, color: C.textSec },
  emptyText: { textAlign: 'center', color: C.textMuted, marginTop: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.lg },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Theme.spacing.md, marginTop: Theme.spacing.sm },
  pageBtn: { padding: Theme.spacing.sm, borderRadius: Theme.radius.sm, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { color: C.textSec },
  modalRoot: { flex: 1, backgroundColor: C.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  modalTitle: { fontSize: Theme.typography.h3.fontSize, color: C.text },
  modalBody: { padding: Theme.spacing.md, paddingBottom: 40 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { color: C.textSec, marginBottom: 6, fontSize: Theme.typography.caption.fontSize, fontWeight: '600' },
  fieldInput: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    color: C.text,
  },
  modalFooter: { padding: Theme.spacing.md, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card },
});
