import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronLeft,
  Plus,
  BookOpen,
  Calendar,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ChevronRight,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Layout
} from 'lucide-react-native';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Types
interface Assignment {
  class_name: string;
  section_name: string;
  subject_name: string;
  class_id?: number;
  section_id?: number;
  subject_id?: number;
}

interface HomeworkItem {
  homework_id: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
}

interface ClassOption {
  class_name: string;
  sections: string[];
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) ||
         (await AsyncStorage.getItem('employee_id')) ||
         (await AsyncStorage.getItem('employeeId')) || '';
};

const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

// Homework Card Component
const HomeworkCard: React.FC<{
  item: HomeworkItem;
  isEditing: boolean;
  onEdit: (item: HomeworkItem) => void;
  onDelete: (id: string) => void;
}> = ({ item, isEditing, onEdit, onDelete }) => (
  <AppCard style={[styles.homeworkCard, isEditing && styles.homeworkCardEditing]}>
    <View style={styles.cardHeader}>
      <View style={styles.subjectContainer}>
        <View style={styles.subjectIcon}>
          <BookOpen size={16} color="#2563EB" />
        </View>
        <Text style={styles.subjectText}>{item.subject_name}</Text>
      </View>
      <View style={styles.actionIcons}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
          <Edit3 size={18} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item.homework_id)} style={styles.iconBtn}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
    
    <Text style={styles.homeworkTitle}>{item.title}</Text>
    <Text style={styles.homeworkDesc} numberOfLines={2}>
      {item.description || 'No description provided.'}
    </Text>
    
    <View style={styles.cardFooter}>
      <View style={styles.metaItem}>
        <Layout size={14} color="#94A3B8" />
        <Text style={styles.metaText}>{item.class_name} - {item.section_name}</Text>
      </View>
      <View style={styles.metaItem}>
        <Calendar size={14} color="#94A3B8" />
        <Text style={styles.metaText}>Due: {formatDisplayDate(item.due_date)}</Text>
      </View>
    </View>
  </AppCard>
);

export default function HomeworkManagementScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const lastScrollY = useRef(0);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>('');
  
  // Form state
  const [form, setForm] = useState({
    class_name: '',
    section_name: '',
    subject_name: '',
    title: '',
    description: '',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: '',
  });
  
  // Filter state
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');

  // Data state
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  
  // UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Date pickers
  const [showAssignedPicker, setShowAssignedPicker] = useState<boolean>(false);
  const [showDuePicker, setShowDuePicker] = useState<boolean>(false);

  // Modal for filter/creation
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const tid = await getTeacherId();
        if (isMounted.current) {
          setSchoolCode(code);
          setBranchId(bid);
          setTeacherId(tid);
        }
      } catch (error) {
        console.error('Failed to load credentials:', error);
      }
    };
    load();
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;
    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!schoolCode || !branchId || !teacherId) return;
      
      try {
        const res = await API.get(
          `/teacher/marks/teacher-context?teacher_id=${encodeURIComponent(teacherId)}`,
          { headers: { 'x-school-code': schoolCode } }
        );
        
        if (!isMounted.current) return;

        const assignments: Assignment[] = Array.isArray(res.data?.assignments)
          ? res.data.assignments
          : [];
        
        const grouped = new Map<string, Set<string>>();
        assignments.forEach((a) => {
          const className = String(a.class_name || '').trim();
          const sectionName = String(a.section_name || '').trim();
          if (!className || !sectionName) return;
          if (!grouped.has(className)) grouped.set(className, new Set());
          grouped.get(className)!.add(sectionName);
        });
        
        const classOpts: ClassOption[] = Array.from(grouped.entries())
          .map(([className, sections]) => ({
            class_name: className,
            sections: Array.from(sections).sort(),
          }))
          .sort((a, b) => a.class_name.localeCompare(b.class_name));
        
        const teacherData = res.data?.teacher_data || null;
        const canonicalTeacherId = String(teacherData?.teacher_id || teacherId).trim();
        const departmentSubjectsRaw = String(teacherData?.department_subject || '').trim();
        const departmentSubjects = Array.from(
          new Set(
            departmentSubjectsRaw
              .split(/[,/|]+/)
              .map(s => s.trim())
              .filter(Boolean)
          )
        );
        
        setClassOptions(classOpts);
        setTeacherAssignments(assignments);
        setTeacherSubjects(departmentSubjects);
        setResolvedTeacherId(canonicalTeacherId);
      } catch (error: any) {
        if (error?.response?.status === 401) return;
        console.error('Failed to load dropdown data:', error);
      }
    };
    
    loadDropdownData();
  }, [schoolCode, branchId, teacherId]);

  // Update section options when class changes
  useEffect(() => {
    const selectedClass = classOptions.find(c => c.class_name === form.class_name);
    const sections = selectedClass?.sections || [];
    setSectionOptions(sections);

    const className = form.class_name.trim();
    const sectionName = form.section_name.trim();
    
    if (!className || !sectionName) {
      setSubjectOptions([]);
      return;
    }
    
    const assignedSubjects = Array.from(
      new Set(
        teacherAssignments
          .filter(a =>
            a.class_name?.toLowerCase() === className.toLowerCase() &&
            a.section_name?.toLowerCase() === sectionName.toLowerCase()
          )
          .map(a => a.subject_name?.trim())
          .filter(Boolean)
      )
    );
    
    const teacherAllowedSet = new Set(teacherSubjects.map(s => s.toLowerCase()));
    const filteredSubjects = teacherAllowedSet.size
      ? assignedSubjects.filter(s => teacherAllowedSet.has(s.toLowerCase()))
      : assignedSubjects;
    
    setSubjectOptions(filteredSubjects);
  }, [form.class_name, form.section_name, classOptions, teacherAssignments, teacherSubjects]);

  const loadHomework = useCallback(async () => {
    if (!schoolCode || !branchId || !resolvedTeacherId) return;
    if (isMounted.current) setLoading(true);
    try {
      const body: any = {
        school_code: schoolCode,
        branch_id: branchId,
        teacher_id: resolvedTeacherId,
      };
      
      if (filterClass) {
        const match = teacherAssignments.find(a => a.class_name?.toLowerCase() === filterClass.toLowerCase());
        if (match?.class_id) body.class_id = Number(match.class_id);
      }
      
      if (filterClass && filterSection) {
        const sectionMatch = teacherAssignments.find(a =>
          a.class_name?.toLowerCase() === filterClass.toLowerCase() &&
          a.section_name?.toLowerCase() === filterSection.toLowerCase()
        );
        if (sectionMatch?.section_id) body.section_id = Number(sectionMatch.section_id);
      }

      const res = await API.post('/manage/teacher/homework/list', body);
      if (isMounted.current) {
        setItems(res.data?.items || []);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      console.error('Failed to load homework:', err);
      if (isMounted.current) setItems([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [schoolCode, branchId, resolvedTeacherId, filterClass, filterSection, teacherAssignments]);

  useEffect(() => {
    if (schoolCode && branchId && resolvedTeacherId) {
      loadHomework();
    }
  }, [schoolCode, branchId, resolvedTeacherId, loadHomework]);

  const onRefresh = useCallback(async () => {
    if (isMounted.current) setRefreshing(true);
    await loadHomework();
    if (isMounted.current) setRefreshing(false);
  }, [loadHomework]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      class_name: '',
      section_name: '',
      subject_name: '',
      title: '',
      description: '',
      assigned_date: new Date().toISOString().split('T')[0],
      due_date: '',
    });
    setShowFormModal(false);
  };

  const handleSubmit = async () => {
    if (!form.class_name || !form.section_name || !form.subject_name || !form.title.trim() || !form.due_date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (isMounted.current) setSubmitting(true);
    try {
      if (editingId) {
        await API.put('/manage/teacher/homework/update', {
          school_code: schoolCode,
          branch_id: branchId,
          teacher_id: resolvedTeacherId,
          homework_id: editingId,
          title: form.title.trim(),
          description: form.description?.trim() || null,
          assigned_date: form.assigned_date,
          due_date: form.due_date,
        });
        if (isMounted.current) Alert.alert('Success', 'Homework updated successfully');
      } else {
        await API.post('/manage/teacher/homework/create', {
          school_code: schoolCode,
          branch_id: branchId,
          teacher_id: resolvedTeacherId,
          class_name: form.class_name.trim(),
          section_name: form.section_name.trim(),
          subject_name: form.subject_name.trim(),
          title: form.title.trim(),
          description: form.description?.trim() || null,
          assigned_date: form.assigned_date,
          due_date: form.due_date,
        });
        if (isMounted.current) Alert.alert('Success', 'Homework created successfully');
      }
      if (isMounted.current) {
        resetForm();
        loadHomework();
      }
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (isMounted.current) {
        Alert.alert('Error', err?.response?.data?.detail || 'Failed to save homework');
      }
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const handleEdit = (item: HomeworkItem) => {
    setEditingId(item.homework_id);
    setForm({
      class_name: item.class_name || '',
      section_name: item.section_name || '',
      subject_name: item.subject_name || '',
      title: item.title || '',
      description: item.description || '',
      assigned_date: item.assigned_date || '',
      due_date: item.due_date || '',
    });
    setShowFormModal(true);
  };

  const handleDelete = async (homeworkId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this homework item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete('/manage/teacher/homework/delete', {
                data: {
                  school_code: schoolCode,
                  branch_id: branchId,
                  teacher_id: resolvedTeacherId,
                  homework_id: homeworkId,
                },
              });
              if (isMounted.current) {
                Alert.alert('Success', 'Homework deleted successfully');
                loadHomework();
              }
            } catch (err: any) {
              if (err?.response?.status === 401) return;
              if (isMounted.current) {
                Alert.alert('Error', err?.response?.data?.detail || 'Failed to delete homework');
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Navy Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Homework</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFormModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroGreeting}>Assignments</Text>
          <Text style={styles.heroSubtext}>Manage and track student homework</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#001F3F" />}
      >
        {/* Filter Card */}
        <AppCard style={styles.filterCard}>
          <TouchableOpacity
            style={styles.filterSelector}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={18} color="#001F3F" />
            <Text style={styles.filterText}>
              {filterClass ? `Class ${filterClass}` : 'All Classes'}
              {filterSection ? ` • Sec ${filterSection}` : ' • All Sections'}
            </Text>
            <Search size={18} color="#94A3B8" />
          </TouchableOpacity>
          {(filterClass || filterSection) && (
            <TouchableOpacity
              style={styles.clearFilter}
              onPress={() => { setFilterClass(''); setFilterSection(''); }}
            >
              <Text style={styles.clearFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </AppCard>

        {/* List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Homework</Text>
          <TouchableOpacity onPress={onRefresh}>
            <RefreshCw size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}><Loader /></View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No homework assignments found</Text>
            <AppButton
              title="Create First Assignment"
              onPress={() => setShowFormModal(true)}
              style={styles.emptyStateBtn}
            />
          </View>
        ) : (
          <View style={styles.homeworkList}>
            {items.map(item => (
              <HomeworkCard
                key={item.homework_id}
                item={item}
                isEditing={editingId === item.homework_id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Form Modal (Create/Edit) */}
      <Modal visible={showFormModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Homework' : 'New Assignment'}</Text>
              <TouchableOpacity onPress={resetForm} style={styles.modalClose}>
                <XCircle size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {!editingId && (
                <>
                  <Text style={styles.fieldLabel}>Class & Section</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipGroup}>
                      {classOptions.map(cls => (
                        <TouchableOpacity
                          key={cls.class_name}
                          style={[styles.chip, form.class_name === cls.class_name && styles.chipActive]}
                          onPress={() => setForm(prev => ({ ...prev, class_name: cls.class_name, section_name: '', subject_name: '' }))}
                        >
                          <Text style={[styles.chipText, form.class_name === cls.class_name && styles.chipTextActive]}>{cls.class_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {form.class_name !== '' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      <View style={styles.chipGroup}>
                        {sectionOptions.map(sec => (
                          <TouchableOpacity
                            key={sec}
                            style={[styles.chip, form.section_name === sec && styles.chipActive]}
                            onPress={() => setForm(prev => ({ ...prev, section_name: sec, subject_name: '' }))}
                          >
                            <Text style={[styles.chipText, form.section_name === sec && styles.chipTextActive]}>{sec}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  <Text style={styles.fieldLabel}>Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <View style={styles.chipGroup}>
                      {subjectOptions.map(subj => (
                        <TouchableOpacity
                          key={subj}
                          style={[styles.chip, form.subject_name === subj && styles.chipActive]}
                          onPress={() => setForm(prev => ({ ...prev, subject_name: subj }))}
                        >
                          <Text style={[styles.chipText, form.subject_name === subj && styles.chipTextActive]}>{subj}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <Text style={styles.fieldLabel}>Due Date</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDuePicker(true)}>
                <Calendar size={18} color="#94A3B8" />
                <Text style={form.due_date ? styles.dateValue : styles.datePlaceholder}>
                  {form.due_date ? form.due_date : 'Select due date'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Homework title (e.g. Chapter 1 Exercise)"
                value={form.title}
                onChangeText={t => setForm(p => ({ ...p, title: t }))}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Instructions for students..."
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={t => setForm(p => ({ ...p, description: t }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton
                title={submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.submitBtn}
              />
            </View>
          </View>
        </View>

        {showDuePicker && (
          <DateTimePicker
            value={form.due_date ? new Date(form.due_date) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(e, d) => {
              setShowDuePicker(false);
              if (d) setForm(p => ({ ...p, due_date: d.toISOString().split('T')[0] }));
            }}
          />
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Assignments</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <XCircle size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Class</Text>
              <View style={styles.chipGroup}>
                <TouchableOpacity
                  style={[styles.chip, !filterClass && styles.chipActive]}
                  onPress={() => { setFilterClass(''); setFilterSection(''); }}
                >
                  <Text style={[styles.chipText, !filterClass && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {classOptions.map(cls => (
                  <TouchableOpacity
                    key={cls.class_name}
                    style={[styles.chip, filterClass === cls.class_name && styles.chipActive]}
                    onPress={() => { setFilterClass(cls.class_name); setFilterSection(''); }}
                  >
                    <Text style={[styles.chipText, filterClass === cls.class_name && styles.chipTextActive]}>{cls.class_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filterClass !== '' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Section</Text>
                  <View style={styles.chipGroup}>
                    <TouchableOpacity
                      style={[styles.chip, !filterSection && styles.chipActive]}
                      onPress={() => setFilterSection('')}
                    >
                      <Text style={[styles.chipText, !filterSection && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {classOptions.find(c => c.class_name === filterClass)?.sections.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.chip, filterSection === sec && styles.chipActive]}
                        onPress={() => setFilterSection(sec)}
                      >
                        <Text style={[styles.chipText, filterSection === sec && styles.chipTextActive]}>{sec}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
            <View style={styles.modalFooter}>
              <AppButton title="Apply Filters" onPress={() => setShowFilterModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    backgroundColor: '#001F3F',
    height: 200,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroContent: {
    marginTop: 25,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  filterCard: {
    marginTop: -30,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  filterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  clearFilter: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  clearFilterText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  homeworkList: {
    gap: 12,
  },
  homeworkCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  homeworkCardEditing: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  subjectIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  homeworkDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyStateBtn: {
    marginTop: 20,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipScroll: {
    marginBottom: 15,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  chipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  dateValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 0,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#001F3F',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
});