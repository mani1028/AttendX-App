import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { getAssignedClasses } from '../../services/teacherService';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  Assignment,
  HomeworkItem,
  ClassOption,
  HomeworkFormState,
  emptyHomeworkForm,
  getSchoolCode,
  getBranchId,
  getTeacherId,
  normalizeText,
  equalsIgnoreCase,
  homeworkStyles,
  HomeworkCreateSection,
  HomeworkListSection,
} from '../../components/teacher/homework';

export default function HomeworkManagementScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [createExpanded, setCreateExpanded] = useState<boolean>(false);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>('');

  const [form, setForm] = useState<HomeworkFormState>(emptyHomeworkForm);

  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');

  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [showAssignedPicker, setShowAssignedPicker] = useState<boolean>(false);
  const [showDuePicker, setShowDuePicker] = useState<boolean>(false);

  const [, setShowFormModal] = useState<boolean>(false);
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

  const handleFormChange = (patch: Partial<HomeworkFormState>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const handleSelectClass = (className: string) => {
    setForm(prev => ({ ...prev, class_name: className, section_name: '', subject_name: '' }));
    setShowClassDropdown(false);
    setShowSectionDropdown(false);
    setShowSubjectDropdown(false);
  };

  const handleSelectSection = (sectionName: string) => {
    setForm(prev => ({ ...prev, section_name: sectionName, subject_name: '' }));
    setShowSectionDropdown(false);
    setShowSubjectDropdown(false);
  };

  const handleSelectSubject = (subjectName: string) => {
    setForm(prev => ({ ...prev, subject_name: subjectName }));
    setShowSubjectDropdown(false);
  };

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

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const handleScroll = useScrollTabBar();

  useEffect(() => {
    const loadDropdownData = async () => {
      if (!schoolCode || !branchId || !teacherId) { return; }

      try {
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
          if (__DEV__) { console.warn('[Homework] initial staff-context call failed', e); }
        }

        if (!isMounted.current) { return; }

        let assignments: Assignment[] = Array.isArray(resData?.assignments)
          ? resData.assignments.filter(Boolean)
          : [];

        if ((!assignments || assignments.length === 0) && schoolCode && branchId && teacherId) {
          try {
            const fallback = await getAssignedClasses(schoolCode, branchId, teacherId);
            if (Array.isArray(fallback) && fallback.length > 0) { assignments = fallback as Assignment[]; }
          } catch (fallbackErr) {
            if (__DEV__) { console.log('[Homework] fallback getAssignedClasses failed', fallbackErr); }
          }
        }

        const grouped = new Map<string, Set<string>>();
        assignments.forEach((a) => {
          const className = String(a.class_name || a.class_grade || '').trim();
          const sectionName = String(a.section_name || a.section || '').trim();
          if (!className || !sectionName) { return; }

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
        if (error?.response?.status === 401) { return; }
        console.warn('Failed to load dropdown data:', error);
      }
    };

    loadDropdownData();
  }, [schoolCode, branchId, teacherId]);

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
    if (!schoolCode || !branchId || !resolvedTeacherId) { return; }
    if (isMounted.current) { setLoading(true); }
    const body: any = {
      school_code: schoolCode,
      branch_id: branchId,
      employee_id: resolvedTeacherId,
    };
    try {
      if (filterClass) {
        const match = teacherAssignments.find(a => equalsIgnoreCase(a.class_name, filterClass));
        if (match?.class_id) { body.class_id = Number(match.class_id); }
      }

      if (filterClass && filterSection) {
        const sectionMatch = teacherAssignments.find(a =>
          equalsIgnoreCase(a.class_name, filterClass) &&
          equalsIgnoreCase(a.section_name, filterSection)
        );
        if (sectionMatch?.section_id) { body.section_id = Number(sectionMatch.section_id); }
      }

      const res = await API.post('/manage/staff/homework/list', body);
      if (isMounted.current) {
        const payloadItems = Array.isArray(res.data?.items) ? res.data.items : [];
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
      if (err?.response?.status === 401) { return; }
      if (err?.response?.status === 422) {
        console.error('Homework 422 — request body:', JSON.stringify(body), 'response:', JSON.stringify(err?.response?.data));
      } else {
        console.error('Failed to load homework:', err);
      }
      if (isMounted.current) { setItems([]); }
    } finally {
      if (isMounted.current) { setLoading(false); }
    }
  }, [schoolCode, branchId, resolvedTeacherId, filterClass, filterSection, teacherAssignments]);

  useEffect(() => {
    if (schoolCode && branchId && resolvedTeacherId) {
      loadHomework();
    }
  }, [schoolCode, branchId, resolvedTeacherId, loadHomework]);

  const onRefresh = useCallback(async () => {
    if (isMounted.current) { setRefreshing(true); }
    await loadHomework();
    if (isMounted.current) { setRefreshing(false); }
  }, [loadHomework]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyHomeworkForm());
    setShowFormModal(false);
  };

  const handleSubmit = async () => {
    if (!form.class_name || !form.section_name || !form.subject_name || !form.title.trim() || !form.due_date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isMounted.current) { setSubmitting(true); }
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
        if (isMounted.current) { Alert.alert('Success', 'Homework updated successfully'); }
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
        if (isMounted.current) { Alert.alert('Success', 'Homework created successfully'); }
      }
      if (isMounted.current) {
        resetForm();
        loadHomework();
      }
    } catch (err: any) {
      if (err?.response?.status === 401) { return; }
      if (isMounted.current) {
        Alert.alert('Error', err?.response?.data?.detail || 'Failed to save homework');
      }
    } finally {
      if (isMounted.current) { setSubmitting(false); }
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
              if (err?.response?.status === 401) { return; }
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
    <View style={homeworkStyles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, homeworkStyles.scrollContent]}
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
        <View style={[homeworkStyles.pageContent, innerPageLayoutStyles.scrollBody]}>
          <HomeworkCreateSection
            expanded={createExpanded}
            onToggleExpanded={() => setCreateExpanded(prev => !prev)}
            editingId={editingId}
            form={form}
            onFormChange={handleFormChange}
            classOptions={classOptions}
            sectionOptions={sectionOptions}
            subjectOptions={subjectOptions}
            showClassDropdown={showClassDropdown}
            showSectionDropdown={showSectionDropdown}
            showSubjectDropdown={showSubjectDropdown}
            onToggleClassDropdown={toggleClassDropdown}
            onToggleSectionDropdown={toggleSectionDropdown}
            onToggleSubjectDropdown={toggleSubjectDropdown}
            onSelectClass={handleSelectClass}
            onSelectSection={handleSelectSection}
            onSelectSubject={handleSelectSubject}
            showAssignedPicker={showAssignedPicker}
            showDuePicker={showDuePicker}
            onShowAssignedPicker={setShowAssignedPicker}
            onShowDuePicker={setShowDuePicker}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />

          <HomeworkListSection
            loading={loading}
            items={items}
            editingId={editingId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </View>
      </ScrollView>
    </View>
  );
}
