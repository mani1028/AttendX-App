import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  BookOpen,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  ChevronRight,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Layout,
  X,
  Bell,
} from 'lucide-react-native';
import API from '../../services/api';
import { getAssignedClasses } from '../../services/teacherService';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';

const { width } = Dimensions.get('window');

// Types
interface Assignment {
  class_name: string;
  section_name: string;
  subject_name: string;
  class_grade?: string;
  section?: string;
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

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const formatDisplayDate = (dateInput: unknown): string => {
  const raw = String(dateInput ?? '').trim();
  if (!raw) {return '-';}
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {return '-';}
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_SHORT[date.getMonth()] || '-';
  return `${day} ${month}`;
};

// Homework Card Component
const HomeworkCard: React.FC<{
  item: HomeworkItem;
  isEditing: boolean;
  onEdit: (item: HomeworkItem) => void;
  onDelete: (id: string) => void;
}> = ({ item, isEditing, onEdit, onDelete }) => (
  <AppCard style={StyleSheet.flatten([styles.homeworkCard, isEditing && styles.homeworkCardEditing])}>
    <View style={styles.cardHeader}>
      <View style={styles.subjectContainer}>
        <View style={styles.subjectIcon}>
          <BookOpen size={16} color={Theme.colors.blue} />
        </View>
        <AppText weight="bold" style={styles.subjectText}>{item.subject_name}</AppText>
      </View>
      <View style={styles.actionIcons}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
          <Edit3 size={18} color={Theme.colors.textSec} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item.homework_id)} style={styles.iconBtn}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>

    <AppText weight="bold" style={styles.homeworkTitle}>{item.title}</AppText>
    <AppText style={styles.homeworkDesc} numberOfLines={2}>
      {item.description || 'No description provided.'}
    </AppText>

    <View style={styles.cardFooter}>
      <View style={styles.metaItem}>
        <Layout size={14} color={Theme.colors.textMuted} />
        <AppText weight="semibold" style={styles.metaText}>{item.class_name} - {item.section_name}</AppText>
      </View>
      <View style={styles.metaItem}>
        <Calendar size={14} color={Theme.colors.textMuted} />
        <AppText weight="semibold" style={styles.metaText}>Due: {formatDisplayDate(item.due_date)}</AppText>
      </View>
    </View>

  </AppCard>
);

export default function HomeworkManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [createExpanded, setCreateExpanded] = useState<boolean>(false);
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
  const [showClassDropdown, setShowClassDropdown] = useState<boolean>(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState<boolean>(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState<boolean>(false);

  const toggleClassDropdown = () => {
    setShowClassDropdown(prev => {
      const next = !prev;
      if (next) {
        setShowSectionDropdown(false);
        setShowSubjectDropdown(false);
      }
      return next;
    });
  };

  const toggleSectionDropdown = () => {
    setShowSectionDropdown(prev => {
      const next = !prev;
      if (next) {
        setShowClassDropdown(false);
        setShowSubjectDropdown(false);
      }
      return next;
    });
  };

  const toggleSubjectDropdown = () => {
    setShowSubjectDropdown(prev => {
      const next = !prev;
      if (next) {
        setShowClassDropdown(false);
        setShowSectionDropdown(false);
      }
      return next;
    });
  };

  const normalizeText = (value: unknown): string => String(value ?? '').trim();
  const equalsIgnoreCase = (a: unknown, b: unknown): boolean =>
    normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();

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

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const handleScroll = useScrollTabBar();


  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!schoolCode || !branchId || !teacherId) {return;}

      try {
        // Try the teacher-context endpoint first
        let resData: any = null;
        try {
          const res = await API.get(
            'staff/marks/staff-context',
            {
              params: {
                school_code: schoolCode,
                branch_id: branchId,
                teacher_id: teacherId,
                employee_id: teacherId,
              },
            }
          );
          resData = res.data;
        } catch (e) {
          if (__DEV__) {console.warn('[Homework] initial staff-context call failed', e);}
        }

        if (!isMounted.current) {return;}

        let assignments: Assignment[] = Array.isArray(resData?.assignments)
          ? resData.assignments.filter(Boolean)
          : [];

        // Fallback: if API didn't return assignments, try service helper which
        // handles multiple shapes and normalization used across the app.
        if ((!assignments || assignments.length === 0) && schoolCode && branchId && teacherId) {
          try {
            const fallback = await getAssignedClasses(schoolCode, branchId, teacherId);
            if (Array.isArray(fallback) && fallback.length > 0) {assignments = fallback as Assignment[];}
          } catch (fallbackErr) {
            // ignore fallback failure, we'll continue with whatever we have
            if (__DEV__) {console.log('[Homework] fallback getAssignedClasses failed', fallbackErr);}
          }
        }

        const grouped = new Map<string, Set<string>>();
        assignments.forEach((a) => {
          const className = String(a.class_name || a.class_grade || '').trim();
          const sectionName = String(a.section_name || a.section || '').trim();
          if (!className || !sectionName) {return;}

          if (!grouped.has(className)) {
            grouped.set(className, new Set());
          }
          grouped.get(className)?.add(sectionName);
        });

        const classOpts: ClassOption[] = Array.from(grouped.entries())
          .map(([className, sections]) => ({
            class_name: className,
            sections: Array.from(sections).sort(),
          }))
          .sort((a, b) => a.class_name.localeCompare(b.class_name));

        const teacherData = resData?.teacher_data || null;
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
        if (error?.response?.status === 401) {return;}
        console.warn('Failed to load dropdown data:', error);
      }
    };

    loadDropdownData();
  }, [schoolCode, branchId, teacherId]);

  // Update section options when class changes
  useEffect(() => {
    const selectedClass = classOptions.find(c => equalsIgnoreCase(c.class_name, form.class_name));
    const sections = selectedClass?.sections || [];
    setSectionOptions(sections);

    const className = normalizeText(form.class_name);
    const sectionName = normalizeText(form.section_name);

    if (!className || !sectionName) {
      setSubjectOptions([]);
      return;
    }

    const assignedSubjects = Array.from(
      new Set(
        teacherAssignments
          .filter(a =>
            equalsIgnoreCase(a.class_name, className) &&
            equalsIgnoreCase(a.section_name, sectionName)
          )
          .map(a => normalizeText(a.subject_name))
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
    if (!schoolCode || !branchId || !resolvedTeacherId) {return;}
    if (isMounted.current) {setLoading(true);}
    const body: any = {
      school_code: schoolCode,
      branch_id: branchId,
      employee_id: resolvedTeacherId,
    };
    try {

      if (filterClass) {
        const match = teacherAssignments.find(a => equalsIgnoreCase(a.class_name, filterClass));
        if (match?.class_id) {body.class_id = Number(match.class_id);}
      }

      if (filterClass && filterSection) {
        const sectionMatch = teacherAssignments.find(a =>
          equalsIgnoreCase(a.class_name, filterClass) &&
          equalsIgnoreCase(a.section_name, filterSection)
        );
        if (sectionMatch?.section_id) {body.section_id = Number(sectionMatch.section_id);}
      }

      const res = await API.post('/manage/staff/homework/list', body);
      if (isMounted.current) {
        const payloadItems = Array.isArray(res.data?.items) ? res.data.items : [];
        // Normalize list payload so render paths never receive unexpected shapes.
        const normalizedItems: HomeworkItem[] = payloadItems
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any) => ({
            homework_id: String(item.homework_id ?? ''),
            class_name: String(item.class_name ?? ''),
            section_name: String(item.section_name ?? ''),
            subject_name: String(item.subject_name ?? ''),
            title: String(item.title ?? ''),
            description: String(item.description ?? ''),
            assigned_date: String(item.assigned_date ?? ''),
            due_date: String(item.due_date ?? ''),
          }))
          .filter((item: HomeworkItem) => item.homework_id.length > 0 || item.title.length > 0);
        setItems(normalizedItems);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {return;}
      if (err?.response?.status === 422) {
        console.error('Homework 422 — request body:', JSON.stringify(body), 'response:', JSON.stringify(err?.response?.data));
      } else {
        console.error('Failed to load homework:', err);
      }
      if (isMounted.current) {setItems([]);}
    } finally {
      if (isMounted.current) {setLoading(false);}
    }
  }, [schoolCode, branchId, resolvedTeacherId, filterClass, filterSection, teacherAssignments]);

  useEffect(() => {
    if (schoolCode && branchId && resolvedTeacherId) {
      loadHomework();
    }
  }, [schoolCode, branchId, resolvedTeacherId, loadHomework]);

  const onRefresh = useCallback(async () => {
    if (isMounted.current) {setRefreshing(true);}
    await loadHomework();
    if (isMounted.current) {setRefreshing(false);}
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

    if (isMounted.current) {setSubmitting(true);}
    try {
      if (editingId) {
        await API.put('/manage/staff/homework/update', {
          school_code: schoolCode,
          branch_id: branchId,
          employee_id: resolvedTeacherId,
          homework_id: editingId,
          title: form.title.trim(),
          description: form.description?.trim() || null,
          assigned_date: form.assigned_date,
          due_date: form.due_date,
        });
        if (isMounted.current) {Alert.alert('Success', 'Homework updated successfully');}
      } else {
        await API.post('/manage/staff/homework/create', {
          school_code: schoolCode,
          branch_id: branchId,
          employee_id: resolvedTeacherId,
          class_name: form.class_name.trim(),
          section_name: form.section_name.trim(),
          subject_name: form.subject_name.trim(),
          title: form.title.trim(),
          description: form.description?.trim() || null,
          assigned_date: form.assigned_date,
          due_date: form.due_date,
        });
        if (isMounted.current) {Alert.alert('Success', 'Homework created successfully');}
      }
      if (isMounted.current) {
        resetForm();
        loadHomework();
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {return;}
      if (isMounted.current) {
        Alert.alert('Error', err?.response?.data?.detail || 'Failed to save homework');
      }
    } finally {
      if (isMounted.current) {setSubmitting(false);}
    }
  };

  const handleEdit = (item: HomeworkItem) => {
    console.log('[Homework] handleEdit called for', item?.homework_id);
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
    setCreateExpanded(true);
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
              await API.delete('/manage/staff/homework/delete', {
                data: {
                  school_code: schoolCode,
                  branch_id: branchId,
      employee_id: resolvedTeacherId,
                  homework_id: homeworkId,
                },
              });
              if (isMounted.current) {
                Alert.alert('Success', 'Homework deleted successfully');
                loadHomework();
              }
            } catch (err: any) {
              if (err?.response?.status === 401) {return;}
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
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.scrollContent]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <StandardPageHeader
          title="Homework Management"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={[styles.pageContent, innerPageLayoutStyles.scrollBody]}>
          {/* Create Homework Card */}
          <View style={styles.createSection}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setCreateExpanded(prev => !prev);
            }}>
              <AppCard style={styles.createCard}>
                <View style={styles.createCardInner}>
                  <View style={styles.createIconWrapper}>
                    <Plus size={24} color={Theme.colors.violet} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold" style={styles.createTitle}>Create Homework</AppText>
                    <AppText style={styles.createSubtitle}>Create and assign homework to students</AppText>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <AppText style={{ color: Theme.colors.textSec }}>{createExpanded ? 'Hide' : 'Create'}</AppText>
                  </View>
                </View>
              </AppCard>
            </TouchableOpacity>

            {createExpanded && (
              <>
                {/* Form Title */}
                <AppText weight="bold" style={styles.formSectionTitle}>{editingId ? 'Edit Homework' : 'Create Homework'}</AppText>

                {/* Class Name */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Class Name</AppText>
                  <TouchableOpacity
                    style={[styles.dropdown, editingId && styles.disabledDropdown]}
                    onPress={() => !editingId && toggleClassDropdown()}
                    disabled={!!editingId}
                  >
                    <AppText style={[styles.dropdownText, form.class_name && styles.dropdownValueText]}>
                      {form.class_name || 'Select Class'}
                    </AppText>
                    <ChevronRight size={20} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                  {!editingId && showClassDropdown && Array.isArray(classOptions) && classOptions.length > 0 && (
                    <View style={styles.dropdownMenu}>
                      {classOptions.map((cls, idx) => (
                        <TouchableOpacity
                          key={cls?.class_name || `cls-${idx}`}
                          style={styles.dropdownItem}
                          onPress={() => {
                            if (cls?.class_name) {
                              setForm(prev => ({ ...prev, class_name: cls.class_name, section_name: '', subject_name: '' }));
                              setShowClassDropdown(false);
                              setShowSectionDropdown(false);
                              setShowSubjectDropdown(false);
                            }
                          }}
                        >
                          <AppText style={styles.dropdownItemText}>{cls?.class_name || 'Unknown Class'}</AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Section Name */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Section Name</AppText>
                  <TouchableOpacity
                    style={[styles.dropdown, editingId && styles.disabledDropdown]}
                    onPress={() => !editingId && form.class_name ? toggleSectionDropdown() : null}
                    disabled={!!editingId || !form.class_name}
                  >
                    <AppText style={[styles.dropdownText, form.section_name && styles.dropdownValueText]}>
                      {form.section_name || (form.class_name ? 'Select Section' : 'Select Class First')}
                    </AppText>
                    <ChevronRight size={20} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                  {!editingId && showSectionDropdown && Array.isArray(sectionOptions) && sectionOptions.length > 0 && (
                    <View style={styles.dropdownMenu}>
                      {sectionOptions.map((sec, idx) => (
                        <TouchableOpacity
                          key={sec || `sec-${idx}`}
                          style={styles.dropdownItem}
                          onPress={() => {
                            if (sec) {
                              setForm(prev => ({ ...prev, section_name: sec, subject_name: '' }));
                              setShowSectionDropdown(false);
                              setShowSubjectDropdown(false);
                            }
                          }}
                        >
                          <AppText style={styles.dropdownItemText}>{sec || 'Unknown Section'}</AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Subject Name */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Subject Name</AppText>
                  <TouchableOpacity
                    style={[styles.dropdown, editingId && styles.disabledDropdown]}
                    onPress={() => !editingId && form.section_name ? toggleSubjectDropdown() : null}
                    disabled={!!editingId || !form.section_name}
                  >
                    <AppText style={[styles.dropdownText, form.subject_name && styles.dropdownValueText]}>
                      {form.subject_name || (form.section_name ? 'Select Subject' : 'Select Section first')}
                    </AppText>
                    <ChevronRight size={20} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                  {!editingId && showSubjectDropdown && Array.isArray(subjectOptions) && subjectOptions.length > 0 && (
                    <View style={styles.dropdownMenu}>
                      {subjectOptions.map((subj, idx) => (
                        <TouchableOpacity
                          key={subj || `subj-${idx}`}
                          style={styles.dropdownItem}
                          onPress={() => {
                            if (subj) {
                              setForm(prev => ({ ...prev, subject_name: subj }));
                              setShowSubjectDropdown(false);
                            }
                          }}
                        >
                          <AppText style={styles.dropdownItemText}>{subj || 'Unknown Subject'}</AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Assigned Date */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Assigned date</AppText>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setShowAssignedPicker(true)}>
                    <AppText style={[styles.dropdownText, form.assigned_date && styles.dropdownValueText]}>
                      {form.assigned_date || 'select assigned date'}
                    </AppText>
                    <Calendar size={20} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Due Date */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Due Date</AppText>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setShowDuePicker(true)}>
                    <AppText style={[styles.dropdownText, form.due_date && styles.dropdownValueText]}>
                      {form.due_date || 'select due date'}
                    </AppText>
                    <Calendar size={20} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Title</AppText>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter title"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={form.title}
                    onChangeText={t => setForm(p => ({ ...p, title: t }))}
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <AppText weight="semibold" style={styles.formLabel}>Description</AppText>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter description"
                    placeholderTextColor={Theme.colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={form.description}
                    onChangeText={t => setForm(p => ({ ...p, description: t }))}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <AppButton
                    title={editingId ? 'Update' : 'Create +'}
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={styles.createButton}
                  />
                  {editingId && (
                    <AppButton
                      title="Cancel"
                      type="secondary"
                      onPress={resetForm}
                      style={styles.cancelButton}
                    />
                  )}
                </View>
              </>
            )}
          </View>

          {/* Existing Homework List */}
          <View style={styles.sectionHeader}>
            <AppText weight="bold" style={styles.sectionTitle}>Homework List</AppText>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <Loader />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyState}>
              <AppText style={styles.emptyStateText}>No homework found for selected criteria.</AppText>
            </View>
          ) : (
            <View style={styles.homeworkList}>
              {Array.isArray(items) && items.map((item, idx) => (
                item && (
                  <HomeworkCard
                    key={item.homework_id || `hw-${idx}`}
                    item={item}
                    isEditing={editingId === item.homework_id}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )
              ))}
            </View>
          )}

          {showAssignedPicker && (
            <DateTimePicker
              value={form.assigned_date ? new Date(form.assigned_date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(e, d) => {
                setShowAssignedPicker(false);
                if (d) {setForm(p => ({ ...p, assigned_date: d.toISOString().split('T')[0] }));}
              }}
            />
          )}

          {showDuePicker && (
            <DateTimePicker
              value={form.due_date ? new Date(form.due_date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(e, d) => {
                setShowDuePicker(false);
                if (d) {setForm(p => ({ ...p, due_date: d.toISOString().split('T')[0] }));}
              }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingBottom: 30,
    ...Platform.select({

      android: { elevation: 10 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: Theme.colors.card,
    ...Theme.typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroGreeting: {
    color: Theme.colors.card,
    ...Theme.typography.h1,
    letterSpacing: -0.5,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  pageContent: {},
  createSection: {
    marginTop: 0,
  },
  createCard: {
    borderRadius: 20,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  createCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Theme.colors.violetLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: 2,
  },
  createSubtitle: {
    fontSize: 13,
    color: Theme.colors.textSec,
  },
  createBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  createBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
  },
  formSectionTitle: {
    fontSize: 18,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    letterSpacing: -0.5,
  },
  formGroup: {
    marginBottom: Theme.spacing.md,
  },
  formLabel: {
    fontSize: 13,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  disabledDropdown: {
    backgroundColor: Theme.colors.background,
    opacity: 0.6,
  },
  dropdownText: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
    flex: 1,
  },
  dropdownValueText: {
    color: Theme.colors.text,
  },
  dropdownMenu: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    marginTop: Theme.spacing.sm,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  textInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.lg,
  },
  createButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  cancelButton: {
    flex: 0.5,
    height: 50,
    borderRadius: 12,
  },
  viewButton: {
    flex: 0.8,
    height: 50,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterCard: {
        borderRadius: 24,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  filterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterText: {
    flex: 1,
    ...Theme.typography.body,
    color: '#334155',
  },
  clearFilter: {
    marginTop: Theme.spacing.sm,
    alignSelf: 'flex-end',
  },
  clearFilterText: {
    ...Theme.typography.caption,
    color: Theme.colors.blue,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeworkList: {
    gap: 12,
  },
  homeworkCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: Theme.colors.card,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  homeworkCardEditing: {
    borderWidth: 2,
    borderColor: Theme.colors.blue,
    backgroundColor: '#F8FAFF',
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
    backgroundColor: Theme.colors.blueLight,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  subjectIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectText: {
    ...Theme.typography.caption,
    color: Theme.colors.blue,
    textTransform: 'uppercase',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: Theme.spacing.xs,
  },
  homeworkTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  homeworkDesc: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
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
    color: Theme.colors.textMuted,
    ...Theme.typography.body,
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
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  modalTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  modalClose: {
    padding: Theme.spacing.xs,
  },
  modalBody: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 13,
    color: Theme.colors.textSec,
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
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  dateValue: {
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  datePlaceholder: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
  },
  input: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginBottom: 20,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 0,
  },
});
