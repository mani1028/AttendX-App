import React, { useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import API, { buildApiUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';

const C = {
  primary: colors.primary,
  primarySoft: colors.primary + '15',
  primaryBorder: colors.primary + '30',
  success: colors.success,
  successSoft: colors.successSoft,
  successBorder: colors.success + '30',
  danger: colors.error,
  dangerSoft: colors.errorSoft,
  dangerBorder: colors.error + '30',
  warning: colors.warning,
  warningSoft: colors.warningSoft,
  white: colors.surface,
  bg: colors.bg,
  border: colors.border,
  borderLight: colors.border + '60',
  t1: colors.textPrimary,
  t2: colors.textPrimary + 'CC',
  t3: colors.textMuted,
  t4: colors.textMuted + '80',
};

interface ClassItem {
  class_grade: string;
  section: string;
  label: string;
  students_total: number;
  present: number;
}

interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  admission_number: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
}

interface SelectedClass {
  class_grade: string;
  section: string;
  label: string;
}

const PALETTE = [
  { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' },
  { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
  { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
  { bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' },
  { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  { bg: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' },
];

const readLS = async (...keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

const avColor = (i: number) => PALETTE[i % PALETTE.length];

const initials = (name: string = ''): string => {
  const text = String(name || '').trim();
  if (!text) return 'ST';
  const parts = text.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
};

interface AddClassModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { class_name: string; sections: string[] }) => Promise<void>;
  existingClasses: ClassItem[];
}

function AddClassModal({ visible, onClose, onSave, existingClasses }: AddClassModalProps) {
  const [className, setClassName] = useState('');
  const [sections, setSections] = useState<string[]>(['A']);
  const [sectionInput, setSectionInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!className.trim()) e.className = 'Class name is required.';
    if (sections.length === 0) e.sections = 'Add at least one section.';

    const duplicates = sections.filter((sec) =>
      existingClasses.some(
        (c) =>
          String(c.class_grade || '').trim() === className.trim() &&
          String(c.section || '').trim().toUpperCase() === sec
      )
    );

    if (duplicates.length > 0) {
      e.sections = `Class ${className} Section ${duplicates.join(', ')} already exists.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSection = () => {
    const v = sectionInput.trim().toUpperCase();
    if (!v) return;
    if (sections.includes(v)) {
      setErrors((p) => ({ ...p, sectionInput: 'Section already added.' }));
      return;
    }
    setSections((p) => [...p, v]);
    setSectionInput('');
    setErrors((p) => ({ ...p, sections: undefined, sectionInput: undefined }));
  };

  const removeSection = (s: string) => setSections((p) => p.filter((x) => x !== s));

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        class_name: className.trim(),
        sections: sections.map((s) => s.toLowerCase()),
      });
      onClose();
    } catch (err: any) {
      setErrors({
        api: err?.response?.data?.detail || 'Failed to add class. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.modalTitle}>Add New Class</AppText>
              <AppText style={styles.modalSubtitle}>Enter class details and configure sections</AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {errors.api && (
              <View style={styles.errorBanner}>
                <AppText style={styles.errorBannerText}>⚠ {errors.api}</AppText>
              </View>
            )}

            <View style={styles.formGroup}>
              <AppText style={styles.label}>
                Class Name <AppText style={styles.requiredStar}>*</AppText>
              </AppText>
              <TextInput
                style={styles.input}
                value={className}
                onChangeText={(text) => {
                  setClassName(text);
                  setErrors((p) => ({ ...p, className: undefined }));
                }}
                placeholder="e.g. Grade 10, Class VI, Standard 2"
                placeholderTextColor={colors.textMuted}
              />
              {errors.className && <AppText style={styles.errorText}>{errors.className}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>
                Sections <AppText style={styles.requiredStar}>*</AppText>
              </AppText>

              <View style={styles.sectionsRow}>
                <TextInput
                  style={[styles.input, styles.flexOne]}
                  value={sectionInput}
                  onChangeText={(text) => {
                    setSectionInput(text.toUpperCase());
                    setErrors((p) => ({ ...p, sectionInput: undefined }));
                  }}
                  placeholder="e.g. A, B, C"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={addSection}
                />
                <TouchableOpacity style={styles.addSectionBtn} onPress={addSection}>
                  <Icon name="plus" size={12} color={colors.textMuted} />
                  <AppText style={styles.addSectionBtnText}>Add</AppText>
                </TouchableOpacity>
              </View>

              {errors.sectionInput && <AppText style={styles.errorText}>{errors.sectionInput}</AppText>}

              {sections.length > 0 && (
                <View style={styles.sectionsWrap}>
                  {sections.map((s) => (
                    <View key={s} style={styles.sectionPill}>
                      <AppText style={styles.sectionPillText}>Section {s}</AppText>
                      <TouchableOpacity onPress={() => removeSection(s)}>
                        <Icon name="x" size={10} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {errors.sections && <AppText style={styles.errorText}>{errors.sections}</AppText>}

              <AppText style={styles.hintText}>
                Type a letter and click "Add" or press Enter. You can add multiple sections.
              </AppText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <AppText style={styles.saveBtnText}>{saving ? 'Saving…' : 'Add Class'}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function StudentPage() {
  const { userName } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [cErr, setCErr] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sErr, setSErr] = useState('');
  const [sLoading, setSLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // Load credentials
  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    if (schoolCode && branchId) {
      loadClasses();
    }
  }, [schoolCode, branchId]);

  useEffect(() => {
    if (selected?.class_grade && selected?.section) {
      loadStudents(selected.class_grade, selected.section);
    }
  }, [selected?.class_grade, selected?.section]);

  const loadCredentials = async () => {
    const code = await readLS('school_code', 'schoolCode', 'school_id', 'schoolId');
    const branch = await readLS('branch_id', 'branchId', 'branch_code', 'branchCode');
    setSchoolCode(code);
    setBranchId(branch);
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  });

  const loadClasses = async () => {
    if (!schoolCode || !branchId) {
      setCErr('Missing credentials — please log in again.');
      return;
    }

    setCLoading(true);
    setCErr('');

    try {
      const res = await API.get('/hm/classes', { headers: getHeaders() });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setClasses(items);

      if (!selected && items.length) {
        const f = items[0];
        setSelected({
          class_grade: f.class_grade,
          section: String(f.section || '').trim(),
          label: f.label,
        });
      }
    } catch (err: any) {
      setCErr(err?.response?.data?.detail || 'Unable to load classes.');
    } finally {
      setCLoading(false);
    }
  };

  const loadStudents = async (classGrade: string, section: string) => {
    setSLoading(true);
    setSErr('');

    try {
      const res = await API.get('/hm/students', {
        headers: getHeaders(),
        params: {
          class_grade: classGrade,
          section: String(section || '').trim(),
        },
      });
      setStudents(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err: any) {
      setSErr(err?.response?.data?.detail || 'Unable to load students.');
    } finally {
      setSLoading(false);
    }
  };

  const handleAddClass = async (payload: { class_name: string; sections: string[] }) => {
    await API.post('/hm/classes', payload, { headers: getHeaders() });
    await loadClasses();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const refreshPromises = [loadClasses()];
    if (selected?.class_grade && selected?.section) {
      refreshPromises.push(loadStudents(selected.class_grade, selected.section));
    }
    await Promise.all(refreshPromises);
    setRefreshing(false);
  };

  const handleExport = async () => {
    if (!selected?.class_grade || !selected?.section) return;

    try {
      const params = new URLSearchParams({
        class_grade: selected.class_grade,
        section: selected.section,
      });

      const response = await fetch(`${buildApiUrl('/hm/students/export')}?${params.toString()}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Download failed');
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Export returned empty file');
      }

      // Convert blob to base64 for sharing
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const filename = `students_${String(selected.label).replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

        try {
          await RNFS.writeFile(filePath, base64Data.split(',')[1], 'base64');

          await Share.open({
            url: `file://${filePath}`,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            title: 'Export Students',
          });
        } catch (err: any) {
          if (err.message !== 'User did not share') {
            Alert.alert('Error', err.message || 'Failed to share file');
          }
        }
      };
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Download failed');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) =>
      String(s.student_full_name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, query]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: colors.successSoft, color: colors.success, icon: 'check-circle' };
      case 'ABSENT':
        return { bg: colors.errorSoft, color: colors.error, icon: 'x-circle' };
      default:
        return { bg: colors.warningSoft, color: colors.warning, icon: 'clock' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.content}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View>
              <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'HM'}!</AppText>
              <AppText style={styles.welcomeSub}>Manage and view student records across all classes.</AppText>
            </View>
            <View style={styles.dateBadge}>
              <Icon name="calendar" size={12} color={colors.textMuted} />
              <AppText style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </AppText>
            </View>
          </View>

          {/* Header */}
          <View style={styles.pageHead}>
            <View>
              <AppText style={styles.pageTitle}>Student Directory</AppText>
              <AppText style={styles.pageSubtitle}>{classes.length} classes · {students.length} students</AppText>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addClassBtn} onPress={() => setShowAddModal(true)}>
                <Icon name="plus" size={14} color="#fff" />
                <AppText style={styles.addClassBtnText}>Add Class</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Banner */}
          {cErr ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorBannerText}>⚠ {cErr}</AppText>
            </View>
          ) : null}

          {/* Main Grid */}
          <View style={styles.grid}>
            {/* Classes Panel */}
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <AppText style={styles.panelTitle}>Classes & Sections</AppText>
                <AppText style={styles.panelSubtitle}>Select a class to view students</AppText>
              </View>

              <ScrollView style={styles.panelBody}>
                {cLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <View key={`class-skeleton-${i}`} style={styles.skeletonClassItem}>
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ))
                ) : classes.length > 0 ? (
                  classes.map((c) => {
                    const normalizedSection = String(c.section || '').trim();
                    const isActive = selected?.label === c.label;
                    const absent = (c.students_total || 0) - (c.present || 0);

                    return (
                      <TouchableOpacity
                        key={`${c.class_grade}-${normalizedSection}`}
                        style={[styles.classBtn, isActive && styles.classBtnActive]}
                        onPress={() => {
                          setSelected({
                            class_grade: c.class_grade,
                            section: normalizedSection,
                            label: c.label,
                          });
                        }}
                      >
                        <AppText style={[styles.classLabel, isActive && styles.classLabelActive]}>
                          Class {c.label}
                        </AppText>
                        <View style={styles.classMeta}>
                          <View style={[styles.metaPill, styles.metaPillDefault]}>
                            <Icon name="users" size={9} color={colors.textMuted} />
                            <AppText style={styles.metaPillText}>{c.students_total}</AppText>
                          </View>
                          <View style={[styles.metaPill, styles.metaPillSuccess]}>
                            <Icon name="check" size={9} color={colors.success} />
                            <AppText style={[styles.metaPillText, { color: colors.success }]}>{c.present}</AppText>
                          </View>
                          <View style={[styles.metaPill, styles.metaPillDanger]}>
                            <Icon name="x" size={9} color={colors.error} />
                            <AppText style={[styles.metaPillText, { color: colors.error }]}>{absent}</AppText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="users" size={36} color={colors.textMuted} />
                    <AppText style={styles.emptyTitle}>No classes found</AppText>
                    <AppText style={styles.emptyText}>No classes available for this branch</AppText>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Students Panel */}
            <View style={styles.studentsPanel}>
              <View style={styles.stuHead}>
                <AppText style={styles.stuTitle}>
                  {selected ? `Students — Class ${selected.label}` : 'Select a Class'}
                </AppText>
                {selected && (
                  <TouchableOpacity style={styles.iconBtn} onPress={handleExport}>
                    <Icon name="download" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {selected ? (
                <>
                  {/* Search Bar */}
                  <View style={styles.searchWrap}>
                    <Icon name="search" size={14} color={colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search by name, roll no., or admission no."
                      placeholderTextColor={colors.textMuted}
                    />
                    {query ? (
                      <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                        <Icon name="x" size={12} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {sErr ? (
                    <View style={styles.errorBanner}>
                      <AppText style={styles.errorBannerText}>⚠ {sErr}</AppText>
                    </View>
                  ) : null}

                  {/* Students Table */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <AppText style={[styles.headerCell, styles.cellStudent]}>Student</AppText>
                        <AppText style={[styles.headerCell, styles.cellRoll]}>Roll No.</AppText>
                        <AppText style={[styles.headerCell, styles.cellAdmission]}>Admission No.</AppText>
                        <AppText style={[styles.headerCell, styles.cellStatus]}>Status</AppText>
                      </View>

                      {sLoading ? (
                        [1, 2, 3, 4, 5, 6].map((i) => (
                          <View key={`student-skeleton-${i}`} style={styles.tableRow}>
                            <View style={styles.skeletonCell} />
                            <View style={styles.skeletonCell} />
                            <View style={styles.skeletonCell} />
                            <View style={styles.skeletonCell} />
                          </View>
                        ))
                      ) : filtered.length > 0 ? (
                        filtered.map((s, idx) => {
                          const { bg, color } = PALETTE[idx % PALETTE.length];
                          const statusStyle = getStatusBadge(s.status);

                          return (
                            <View key={s.student_id || idx} style={styles.tableRow}>
                              <View style={[styles.tableCell, styles.cellStudent]}>
                                <AvatarBubble
                                  displayName={s.student_full_name}
                                  size={30}
                                  textSize={11}
                                  primaryColor={color}
                                />
                                <AppText style={styles.studentName}>{s.student_full_name || '—'}</AppText>
                              </View>
                              <View style={[styles.tableCell, styles.cellRoll]}>
                                <AppText style={styles.monoText}>{s.roll_number || '—'}</AppText>
                              </View>
                              <View style={[styles.tableCell, styles.cellAdmission]}>
                                <AppText style={styles.monoText}>{s.admission_number || '—'}</AppText>
                              </View>
                              <View style={[styles.tableCell, styles.cellStatus]}>
                                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                  <Icon name={statusStyle.icon as any} size={10} color={statusStyle.color} />
                                  <AppText style={[styles.statusText, { color: statusStyle.color }]}>
                                    {s.status}
                                  </AppText>
                                </View>
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <View style={styles.emptyState}>
                          <Icon name="user" size={36} color={colors.textMuted} />
                          <AppText style={styles.emptyTitle}>
                            {query ? 'No results found' : 'No students found'}
                          </AppText>
                          <AppText style={styles.emptyText}>
                            {query
                              ? 'Try a different search term.'
                              : 'No students enrolled in this class.'}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="user" size={36} color={colors.textMuted} />
                  <AppText style={styles.emptyTitle}>No class selected</AppText>
                  <AppText style={styles.emptyText}>Choose a class from the left panel to view students</AppText>
                </View>
              )}
            </View>
          </View>

          {/* Info Bar */}
          <View style={styles.infoBar}>
            <View style={styles.infoChip}>
              <Icon name="home" size={12} color={colors.accent} />
              <AppText style={styles.infoText}>
                School <AppText style={styles.infoStrong}>{schoolCode || '—'}</AppText>
              </AppText>
            </View>
            <View style={styles.infoChip}>
              <Icon name="git-branch" size={12} color={colors.accent} />
              <AppText style={styles.infoText}>
                Branch <AppText style={styles.infoStrong}>{branchId || '—'}</AppText>
              </AppText>
            </View>
            {selected && (
              <View style={styles.infoChip}>
                <Icon name="users" size={12} color={colors.accent} />
                <AppText style={styles.infoText}>
                  Viewing <AppText style={styles.infoStrong}>Class {selected.label}</AppText>
                </AppText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Class Modal */}
      <AddClassModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddClass}
        existingClasses={classes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  pageHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.t1,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: C.t3,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
  },
  addClassBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: C.dangerSoft,
    padding: 12,
    borderRadius: 9,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.dangerBorder,
  },
  errorBannerText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  panel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  panelHead: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.t1,
  },
  panelSubtitle: {
    fontSize: 11,
    color: C.t3,
    marginTop: 2,
  },
  panelBody: {
    maxHeight: 400,
    padding: 12,
  },
  skeletonClassItem: {
    height: 66,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: C.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classBtn: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  classBtnActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryBorder,
  },
  classLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: C.t1,
    marginBottom: 6,
  },
  classLabelActive: {
    color: C.primary,
  },
  classMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaPillDefault: {
    backgroundColor: C.bg,
    borderColor: C.border,
  },
  metaPillSuccess: {
    backgroundColor: C.successSoft,
    borderColor: C.successBorder,
  },
  metaPillDanger: {
    backgroundColor: C.dangerSoft,
    borderColor: C.dangerBorder,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.t3,
  },
  studentsPanel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  stuHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  stuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.t1,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.t1,
    padding: 0,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: {
    minWidth: 500,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: C.t4,
    textTransform: 'uppercase',
  },
  cellStudent: { width: '35%' },
  cellRoll: { width: '20%' },
  cellAdmission: { width: '25%' },
  cellStatus: { width: '20%' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
    color: C.t1,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: C.t3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  skeletonCell: {
    flex: 1,
    height: 20,
    backgroundColor: C.borderLight,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.t1,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: C.t3,
    marginTop: 4,
    textAlign: 'center',
  },
  infoBar: {
    marginTop: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: C.t3,
  },
  infoStrong: {
    fontWeight: '600',
    color: C.t1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: C.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.t1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: C.t3,
    marginTop: 4,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.t2,
    marginBottom: 6,
  },
  requiredStar: {
    color: C.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    padding: 10,
    fontSize: 14,
    color: C.t1,
    backgroundColor: C.bg,
  },
  flexOne: {
    flex: 1,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addSectionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.t3,
  },
  sectionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sectionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },
  hintText: {
    fontSize: 11,
    color: C.t4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 11,
    color: C.danger,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.t2,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});