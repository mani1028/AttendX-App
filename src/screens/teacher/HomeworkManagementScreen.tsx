import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Subject Tag Component
const SubjectTag: React.FC<{ subject: string }> = ({ subject }) => (
  <View style={styles.subjectTag}>
    <Text style={styles.subjectTagText}>{subject || '-'}</Text>
  </View>
);

// Homework Card Component
const HomeworkCard: React.FC<{
  item: HomeworkItem;
  isEditing: boolean;
  onEdit: (item: HomeworkItem) => void;
}> = ({ item, isEditing, onEdit }) => (
  <AppCard style={[styles.homeworkCard, isEditing && styles.homeworkCardEditing]}>
    <View style={styles.cardHeader}>
      <SubjectTag subject={item.subject_name} />
      {isEditing && (
        <View style={styles.editingBadge}>
          <Text style={styles.editingBadgeText}>EDITING</Text>
        </View>
      )}
    </View>
    
    <Text style={styles.homeworkTitle}>{item.title}</Text>
    <Text style={styles.homeworkDesc} numberOfLines={2}>
      {item.description || '-'}
    </Text>
    
    <View style={styles.homeworkMeta}>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Class:</Text>
        <Text style={styles.metaValue}>{item.class_name}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Section:</Text>
        <Text style={styles.metaValue}>{item.section_name}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Assigned:</Text>
        <Text style={styles.metaValue}>{formatDisplayDate(item.assigned_date)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Due:</Text>
        <Text style={styles.metaValue}>{formatDisplayDate(item.due_date)}</Text>
      </View>
    </View>
    
    <TouchableOpacity 
      style={[styles.editBtn, isEditing && styles.editBtnActive]} 
      onPress={() => onEdit(item)}
    >
      <Text style={[styles.editBtnText, isEditing && styles.editBtnTextActive]}>
        ✏️ {isEditing ? 'Editing' : 'Edit'}
      </Text>
    </TouchableOpacity>
  </AppCard>
);

export default function HomeworkManagementScreen() {
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
    assigned_date: '',
    due_date: '',
  });
  
  // Filter state
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  
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
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Date pickers
  const [showAssignedPicker, setShowAssignedPicker] = useState<boolean>(false);
  const [showDuePicker, setShowDuePicker] = useState<boolean>(false);
  const [showFilterDatePicker, setShowFilterDatePicker] = useState<boolean>(false);
  
  // Modal for filter
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const tid = await getTeacherId();
      setSchoolCode(code);
      setBranchId(bid);
      setTeacherId(tid);
    };
    load();
  }, []);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!schoolCode || !branchId || !teacherId) return;
      
      try {
        const res = await API.get(
          `/teacher/marks/teacher-context?teacher_id=${encodeURIComponent(teacherId)}`,
          { headers: { 'x-school-code': schoolCode } }
        );
        
        const assignments: Assignment[] = Array.isArray(res.data?.assignments)
          ? res.data.assignments
          : [];
        
        // Group assignments by class
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
      } catch (error) {
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
    
    if (form.section_name && !sections.includes(form.section_name)) {
      setForm(prev => ({ ...prev, section_name: '', subject_name: '' }));
      setSubjectOptions([]);
      return;
    }
    
    const className = form.class_name.trim();
    const sectionName = form.section_name.trim();
    
    if (!className || !sectionName) {
      setSubjectOptions([]);
      if (form.subject_name) setForm(prev => ({ ...prev, subject_name: '' }));
      return;
    }
    
    // Get subjects for selected class/section
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
    
    if (form.subject_name) {
      const isValid = filteredSubjects.some(
        s => s.toLowerCase() === form.subject_name.toLowerCase()
      );
      if (!isValid) setForm(prev => ({ ...prev, subject_name: '' }));
    }
  }, [form.class_name, form.section_name, classOptions, teacherAssignments, teacherSubjects]);

  // Load homework
  const loadHomework = useCallback(async () => {
    if (!schoolCode || !branchId || !resolvedTeacherId) return;
    
    setLoading(true);
    setMsg('');
    setError('');
    
    try {
      const body: any = {
        school_code: schoolCode,
        branch_id: branchId,
        teacher_id: resolvedTeacherId,
      };
      
      if (filterClass) {
        const match = teacherAssignments.find(
          a => a.class_name?.toLowerCase() === filterClass.toLowerCase()
        );
        if (match?.class_id) body.class_id = Number(match.class_id);
      }
      
      if (filterClass && filterSection) {
        const sectionMatch = teacherAssignments.find(
          a =>
            a.class_name?.toLowerCase() === filterClass.toLowerCase() &&
            a.section_name?.toLowerCase() === filterSection.toLowerCase()
        );
        if (sectionMatch?.section_id) body.section_id = Number(sectionMatch.section_id);
      }
      
      if (filterSubject) {
        const subjectMatch = teacherAssignments.find(a => {
          const classOk = !filterClass || a.class_name?.toLowerCase() === filterClass.toLowerCase();
          const sectionOk = !filterSection || a.section_name?.toLowerCase() === filterSection.toLowerCase();
          const subjectOk = a.subject_name?.toLowerCase() === filterSubject.toLowerCase();
          return classOk && sectionOk && subjectOk;
        });
        if (subjectMatch?.subject_id) body.subject_id = Number(subjectMatch.subject_id);
      }
      
      if (filterDate) body.assigned_date = filterDate;
      
      const res = await API.post('/manage/teacher/homework/list', body);
      setItems(res.data?.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load homework');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, branchId, resolvedTeacherId, filterClass, filterSection, filterSubject, filterDate, teacherAssignments]);

  // Initial load
  useEffect(() => {
    if (schoolCode && branchId && resolvedTeacherId) {
      loadHomework();
    }
  }, [schoolCode, branchId, resolvedTeacherId, loadHomework]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomework();
    setRefreshing(false);
  }, [loadHomework]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      class_name: '',
      section_name: '',
      subject_name: '',
      title: '',
      description: '',
      assigned_date: '',
      due_date: '',
    });
    setSectionOptions([]);
    setSubjectOptions([]);
  };

  const handleSubmit = async () => {
    if (!schoolCode || !branchId || !resolvedTeacherId) {
      Alert.alert('Error', 'Session missing. Please login again.');
      return;
    }
    
    if (!form.class_name.trim()) {
      Alert.alert('Error', 'Please select Class');
      return;
    }
    
    if (!form.section_name.trim()) {
      Alert.alert('Error', 'Please select Section');
      return;
    }
    
    if (!form.subject_name.trim()) {
      Alert.alert('Error', 'Please select Subject');
      return;
    }
    
    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter homework title');
      return;
    }
    
    setSubmitting(true);
    setMsg('');
    setError('');
    
    try {
      if (editingId) {
        await API.put('/manage/teacher/homework/update', {
          school_code: schoolCode,
          branch_id: branchId,
          teacher_id: resolvedTeacherId,
          homework_id: editingId,
          title: form.title.trim(),
          description: form.description?.trim() || null,
          assigned_date: form.assigned_date || null,
          due_date: form.due_date || null,
        });
        Alert.alert('Success', 'Homework updated successfully');
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
          assigned_date: form.assigned_date || null,
          due_date: form.due_date || null,
        });
        Alert.alert('Success', 'Homework created successfully');
      }
      
      resetForm();
      loadHomework();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save homework');
    } finally {
      setSubmitting(false);
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
    // Scroll to top
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
              Alert.alert('Success', 'Homework deleted successfully');
              loadHomework();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail || 'Failed to delete homework');
            }
          },
        },
      ]
    );
  };

  const handleViewClassHomework = () => {
    if (!form.class_name || !form.section_name) {
      Alert.alert('Error', 'Please select class and section to view homework');
      return;
    }
    setFilterClass(form.class_name);
    setFilterSection(form.section_name);
    setFilterSubject('');
    setFilterDate('');
    setShowFilterModal(false);
    loadHomework();
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    loadHomework();
  };

  const resetFilters = () => {
    setFilterClass('');
    setFilterSection('');
    setFilterSubject('');
    setFilterDate('');
    setShowFilterModal(false);
    loadHomework();
  };

  // Filter options for modal
  const filterClassOptions = useMemo(() => classOptions.map(c => c.class_name), [classOptions]);
  const filterSectionOptions = useMemo(() => {
    if (!filterClass) return [];
    const classOpt = classOptions.find(c => c.class_name === filterClass);
    return classOpt?.sections || [];
  }, [filterClass, classOptions]);
  
  const filterSubjectOptions = useMemo(() => {
    if (!filterClass) return [];
    const subjects = Array.from(
      new Set(
        teacherAssignments
          .filter(a => {
            const classMatch = a.class_name?.toLowerCase() === filterClass.toLowerCase();
            const sectionMatch = !filterSection || a.section_name?.toLowerCase() === filterSection.toLowerCase();
            return classMatch && sectionMatch;
          })
          .map(a => a.subject_name?.trim())
          .filter(Boolean)
      )
    );
    return subjects;
  }, [filterClass, filterSection, teacherAssignments]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>📚 Homework Management</Text>
            <Text style={styles.subText}>{items.length} records</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadHomework}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Create/Edit Form Card */}
        <AppCard style={[styles.formCard, editingId && styles.formCardEditing]}>
          <View style={[styles.cardHeader, editingId && styles.cardHeaderEditing]}>
            <Text style={[styles.cardTitle, editingId && styles.cardTitleEditing]}>
              {editingId ? '✏️ Edit Homework' : '➕ Create Homework'}
            </Text>
            {editingId && (
              <View style={styles.editModeBadge}>
                <Text style={styles.editModeBadgeText}>EDIT MODE</Text>
              </View>
            )}
          </View>
          
          <View style={styles.cardBody}>
            {/* Class Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>Class Name</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {classOptions.map(cls => (
                    <TouchableOpacity
                      key={cls.class_name}
                      style={[styles.chip, form.class_name === cls.class_name && styles.chipActive]}
                      onPress={() => {
                        setForm(prev => ({ ...prev, class_name: cls.class_name, section_name: '', subject_name: '' }));
                      }}
                    >
                      <Text style={[styles.chipText, form.class_name === cls.class_name && styles.chipTextActive]}>
                        {cls.class_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Section Selection */}
            {form.class_name && (
              <View style={styles.field}>
                <Text style={styles.label}>Section Name</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {sectionOptions.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.chip, form.section_name === sec && styles.chipActive]}
                        onPress={() => setForm(prev => ({ ...prev, section_name: sec, subject_name: '' }))}
                      >
                        <Text style={[styles.chipText, form.section_name === sec && styles.chipTextActive]}>
                          {sec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Subject Selection */}
            {form.section_name && (
              <View style={styles.field}>
                <Text style={styles.label}>Subject Name</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {subjectOptions.map(subj => (
                      <TouchableOpacity
                        key={subj}
                        style={[styles.chip, form.subject_name === subj && styles.chipActive]}
                        onPress={() => setForm(prev => ({ ...prev, subject_name: subj }))}
                      >
                        <Text style={[styles.chipText, form.subject_name === subj && styles.chipTextActive]}>
                          {subj}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Assigned Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Assigned Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowAssignedPicker(true)}>
                <Text style={styles.dateText}>{form.assigned_date || 'Select date'}</Text>
              </TouchableOpacity>
              {showAssignedPicker && (
                <DateTimePicker
                  value={form.assigned_date ? new Date(form.assigned_date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowAssignedPicker(false);
                    if (date) setForm(prev => ({ ...prev, assigned_date: date.toISOString().split('T')[0] }));
                  }}
                />
              )}
            </View>

            {/* Due Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDuePicker(true)}>
                <Text style={styles.dateText}>{form.due_date || 'Select date'}</Text>
              </TouchableOpacity>
              {showDuePicker && (
                <DateTimePicker
                  value={form.due_date ? new Date(form.due_date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDuePicker(false);
                    if (date) setForm(prev => ({ ...prev, due_date: date.toISOString().split('T')[0] }));
                  }}
                />
              )}
            </View>

            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Homework title"
                placeholderTextColor="#94a3b8"
                value={form.title}
                onChangeText={text => setForm(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Homework description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <AppButton
                title={submitting ? 'Saving...' : (editingId ? 'Update Homework' : 'Create Homework')}
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.submitBtn}
              />
              <AppButton
                title="View Class Homework"
                onPress={handleViewClassHomework}
                type="secondary"
                disabled={!form.class_name || !form.section_name}
              />
              {editingId && (
                <AppButton title="Cancel" onPress={resetForm} type="secondary" />
              )}
            </View>
          </View>
        </AppCard>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Text style={styles.filterBtnText}>🔽 Filter</Text>
          </TouchableOpacity>
          {(filterClass || filterSection || filterSubject || filterDate) && (
            <TouchableOpacity style={styles.resetFilterBtn} onPress={resetFilters}>
              <Text style={styles.resetFilterText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filters */}
        {(filterClass || filterSection || filterSubject || filterDate) && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>Active:</Text>
            {filterClass && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Class: {filterClass}</Text>
              </View>
            )}
            {filterSection && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Section: {filterSection}</Text>
              </View>
            )}
            {filterSubject && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Subject: {filterSubject}</Text>
              </View>
            )}
            {filterDate && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Date: {formatDisplayDate(filterDate)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Homework List */}
        {loading ? (
          <Loader />
        ) : items.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No homework found</Text>
            <Text style={styles.emptyText}>
              Create homework assignments or adjust filters
            </Text>
          </AppCard>
        ) : (
          items.map(item => (
            <HomeworkCard
              key={item.homework_id}
              item={item}
              isEditing={editingId === item.homework_id}
              onEdit={handleEdit}
            />
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Homework</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Class Filter */}
              <Text style={styles.modalLabel}>Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  <TouchableOpacity
                    style={[styles.chip, !filterClass && styles.chipActive]}
                    onPress={() => {
                      setFilterClass('');
                      setFilterSection('');
                      setFilterSubject('');
                    }}
                  >
                    <Text style={[styles.chipText, !filterClass && styles.chipTextActive]}>All Classes</Text>
                  </TouchableOpacity>
                  {filterClassOptions.map(cls => (
                    <TouchableOpacity
                      key={cls}
                      style={[styles.chip, filterClass === cls && styles.chipActive]}
                      onPress={() => {
                        setFilterClass(cls);
                        setFilterSection('');
                        setFilterSubject('');
                      }}
                    >
                      <Text style={[styles.chipText, filterClass === cls && styles.chipTextActive]}>{cls}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Section Filter */}
              {filterClass && (
                <>
                  <Text style={[styles.modalLabel, { marginTop: 16 }]}>Section</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      <TouchableOpacity
                        style={[styles.chip, !filterSection && styles.chipActive]}
                        onPress={() => setFilterSection('')}
                      >
                        <Text style={[styles.chipText, !filterSection && styles.chipTextActive]}>All Sections</Text>
                      </TouchableOpacity>
                      {filterSectionOptions.map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, filterSection === sec && styles.chipActive]}
                          onPress={() => setFilterSection(sec)}
                        >
                          <Text style={[styles.chipText, filterSection === sec && styles.chipTextActive]}>{sec}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Subject Filter */}
              {filterClass && (
                <>
                  <Text style={[styles.modalLabel, { marginTop: 16 }]}>Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      <TouchableOpacity
                        style={[styles.chip, !filterSubject && styles.chipActive]}
                        onPress={() => setFilterSubject('')}
                      >
                        <Text style={[styles.chipText, !filterSubject && styles.chipTextActive]}>All Subjects</Text>
                      </TouchableOpacity>
                      {filterSubjectOptions.map(subj => (
                        <TouchableOpacity
                          key={subj}
                          style={[styles.chip, filterSubject === subj && styles.chipActive]}
                          onPress={() => setFilterSubject(subj)}
                        >
                          <Text style={[styles.chipText, filterSubject === subj && styles.chipTextActive]}>{subj}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Date Filter */}
              <Text style={[styles.modalLabel, { marginTop: 16 }]}>Assigned Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFilterDatePicker(true)}>
                <Text style={styles.dateText}>{filterDate ? formatDisplayDate(filterDate) : 'All Dates'}</Text>
              </TouchableOpacity>
              {showFilterDatePicker && (
                <DateTimePicker
                  value={filterDate ? new Date(filterDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowFilterDatePicker(false);
                    if (date) setFilterDate(date.toISOString().split('T')[0]);
                    else setFilterDate('');
                  }}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton title="Reset" onPress={resetFilters} type="secondary" />
              <AppButton title="Apply Filters" onPress={applyFilters} />
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
    backgroundColor: '#f3f6fb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subText: {
    color: '#64748b',
    fontSize: 14,
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  formCard: {
    marginBottom: 20,
    overflow: 'hidden',
  },
  formCardEditing: {
    borderWidth: 2.5,
    borderColor: '#f59e0b',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  cardHeaderEditing: {
    backgroundColor: '#fffbeb',
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardTitleEditing: {
    color: '#b45309',
  },
  editModeBadge: {
    position: 'absolute',
    right: 16,
    top: 12,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  editModeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  cardBody: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
  },
  chipTextActive: {
    color: '#fff',
  },
  dateBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateText: {
    fontSize: 14,
    color: '#0f172a',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  submitBtn: {
    flex: 2,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  filterBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  resetFilterBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  resetFilterText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTag: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  filterTagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  homeworkCard: {
    marginBottom: 12,
    padding: 16,
  },
  homeworkCardEditing: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  subjectTag: {
    backgroundColor: '#eff6ff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  subjectTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  editingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  homeworkDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  homeworkMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    width: 70,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  editBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    alignItems: 'center',
  },
  editBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  editBtnTextActive: {
    color: '#fff',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
});