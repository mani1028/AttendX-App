import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

interface Teacher {
  teacher_id: string;
  employee_id?: string;
  teacher_full_name: string;
  designation?: string;
}

interface ClassTeacher {
  teacher_id: string;
  teacher_full_name: string;
  employee_id?: string;
}

interface SubjectItem {
  subject_name: string;
  teacher_id: string | null;
}

interface ClassSection {
  class_grade: string;
  section: string;
}

interface OverrideConflict {
  teacher_name: string;
  current_class_grade: string;
  current_section: string;
}

const C = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: '#dbeafe',
  success: '#059669',
  successSoft: '#d1fae5',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  bg: '#f0f2f7',
  white: '#ffffff',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',
  sidebar: '#f8fafc',
};

export default function HMTeacherAssignments() {
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [classTeacherSaving, setClassTeacherSaving] = useState(false);
  const [subjectTeacherSaving, setSubjectTeacherSaving] = useState(false);
  const [classesMap, setClassesMap] = useState<Record<string, string[]>>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classTeacherId, setClassTeacherId] = useState('');
  const [subjectTeacherMap, setSubjectTeacherMap] = useState<Record<string, string>>({});
  const [currentClassTeacher, setCurrentClassTeacher] = useState<ClassTeacher | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'create' | 'assign'>('create');
  const [subjectModalSelectedSubject, setSubjectModalSelectedSubject] = useState('');
  const [subjectModalNewSubject, setSubjectModalNewSubject] = useState('');
  const [subjectModalNewTeacher, setSubjectModalNewTeacher] = useState('');
  const [subjectModalTeacherId, setSubjectModalTeacherId] = useState('');
  const [subjectModalError, setSubjectModalError] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState<OverrideConflict | null>(null);

  // Load credentials
  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    if (schoolCode && branchId) {
      loadMeta();
    }
  }, [schoolCode, branchId]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      loadDetails(selectedClass, selectedSection);
    }
  }, [selectedClass, selectedSection]);

  const loadCredentials = async () => {
    try {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';
      
      const branch = await AsyncStorage.getItem('branch_id') ||
        await AsyncStorage.getItem('branchId') ||
        await AsyncStorage.getItem('branch_code') ||
        await AsyncStorage.getItem('branchCode') || '';
      
      setSchoolCode(code);
      setBranchId(branch);
    } catch (error) {
      console.error('Error loading credentials:', error);
      showMessage('error', 'Failed to load credentials');
    }
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  });

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000);
  };

  const fetchNextEmployeeId = async () => {
    try {
      const res = await API.get('/hm/next-employee-id', { headers: getHeaders() });
      return res.data?.employee_id;
    } catch (err) {
      throw new Error('Failed to generate employee ID');
    }
  };

  const loadMeta = async () => {
    if (!schoolCode || !branchId) {
      showMessage('error', 'School code or branch id missing');
      return;
    }

    setLoading(true);
    setRefreshing(true);

    try {
      const [classesRes, teachersRes] = await Promise.all([
        API.get('/hm/classes', { headers: getHeaders() }),
        API.get('/hm/teachers', { headers: getHeaders() }),
      ]);

      const classItems = classesRes.data?.items || [];
      const teacherItems = teachersRes.data?.items || [];

      const grouped: Record<string, string[]> = {};

      classItems.forEach((item: any) => {
        const cg = String(item.class_grade || '').trim();
        const sec = String(item.section || '').trim().toUpperCase();

        if (!cg || !sec) return;

        if (!grouped[cg]) grouped[cg] = [];
        if (!grouped[cg].includes(sec)) grouped[cg].push(sec);
      });

      Object.keys(grouped).forEach((cg) => {
        grouped[cg] = grouped[cg].sort();
      });

      setClassesMap(grouped);
      setTeachers(Array.isArray(teacherItems) ? teacherItems : []);

      const cls = Object.keys(grouped);
      if (cls.length) {
        const nextClass = selectedClass && grouped[selectedClass] ? selectedClass : cls[0];
        const nextSections = grouped[nextClass] || [];
        const nextSection = selectedSection && nextSections.includes(selectedSection)
          ? selectedSection
          : nextSections[0] || '';

        setSelectedClass(nextClass);
        setSelectedSection(nextSection);
      } else {
        setSelectedClass('');
        setSelectedSection('');
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.detail;
      const networkMsg = err?.message || '';
      showMessage('error', serverMsg || networkMsg || 'Failed to load classes and teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetails = async (cg: string, sec: string) => {
    if (!cg || !sec) return;

    setDetailsLoading(true);

    try {
      const res = await API.get('/hm/teacher-assignments/details', {
        headers: getHeaders(),
        params: { class_grade: cg, section: sec },
      });

      const data = res.data || {};
      const subjectItems = data.subjects || [];
      const subjectMap: Record<string, string> = {};

      subjectItems.forEach((item: any) => {
        subjectMap[item.subject_name] = item.teacher_id ? String(item.teacher_id) : '';
      });

      setSubjects(subjectItems.map((item: any) => item.subject_name));
      setSubjectTeacherMap(subjectMap);
      setClassTeacherId(data.class_teacher?.teacher_id ? String(data.class_teacher.teacher_id) : '');
      setCurrentClassTeacher(data.class_teacher || null);
    } catch (err: any) {
      setSubjects([]);
      setSubjectTeacherMap({});
      setClassTeacherId('');
      setCurrentClassTeacher(null);
      showMessage('error', err?.response?.data?.detail || err?.message || 'Failed to load assignment details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveClassTeacher = async (action: string = 'normal') => {
    if (!selectedClass || !selectedSection) {
      showMessage('error', 'Please select class and section');
      return;
    }

    setClassTeacherSaving(true);

    try {
      const res = await API.post(
        '/hm/teacher-assignments/save-class-teacher',
        {
          class_grade: selectedClass,
          section: selectedSection,
          class_teacher_id: classTeacherId || null,
          class_teacher_action: action,
        },
        { headers: getHeaders() }
      );

      showMessage('success', res.data?.message || 'Class teacher saved successfully');
      setOverrideOpen(false);
      setOverrideConflict(null);
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.conflict_type === 'CLASS_TEACHER_ALREADY_ASSIGNED') {
        setOverrideConflict(err.response.data);
        setOverrideOpen(true);
      } else {
        const detail = err?.response?.data?.detail;
        showMessage('error', typeof detail === 'string' ? detail : err?.message || 'Failed to save class teacher');
      }
    } finally {
      setClassTeacherSaving(false);
    }
  };

  const saveSubjectTeachers = async () => {
    if (!selectedClass || !selectedSection) {
      showMessage('error', 'Please select class and section');
      return;
    }

    setSubjectTeacherSaving(true);

    try {
      const res = await API.post(
        '/hm/teacher-assignments/save-subject-teachers',
        {
          class_grade: selectedClass,
          section: selectedSection,
          subject_teachers: subjects.map((subject) => ({
            subject_name: subject,
            teacher_id: subjectTeacherMap[subject] || null,
          })),
        },
        { headers: getHeaders() }
      );

      showMessage('success', res.data?.message || 'Subject teachers saved successfully');
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      showMessage('error', typeof detail === 'string' ? detail : err?.message || 'Failed to save subject teachers');
    } finally {
      setSubjectTeacherSaving(false);
    }
  };

  const handleCreateSubject = async () => {
    const subjectName = String(subjectModalNewSubject || '').trim();
    if (!subjectName) {
      setSubjectModalError('Please enter a subject name.');
      return;
    }

    const exists = subjects.some(s => String(s).toLowerCase() === subjectName.toLowerCase());
    if (exists) {
      setSubjectModalError('This subject already exists for this class.');
      return;
    }

    if (!selectedClass || !selectedSection) {
      setSubjectModalError('Please select class and section first.');
      return;
    }

    setSubjectTeacherSaving(true);

    try {
      const res = await API.post(
        '/hm/teacher-assignments/add-subject',
        {
          class_grade: selectedClass,
          section: selectedSection,
          subject_name: subjectName,
        },
        { headers: getHeaders() }
      );

      showMessage('success', res.data?.message || 'Subject added successfully');
      setSubjectModalOpen(false);
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      setSubjectModalError(err?.response?.data?.detail || err?.message || 'Failed to add subject');
    } finally {
      setSubjectTeacherSaving(false);
    }
  };

  const handleAssignTeacherModal = async () => {
    let chosenSubject = String(subjectModalSelectedSubject || '').trim();
    let teacherId = String(subjectModalTeacherId || '').trim();
    let createdTeacherPassword = '';

    if (!chosenSubject && subjectModalNewSubject) {
      const subjectName = String(subjectModalNewSubject).trim();
      if (!subjectName) {
        setSubjectModalError('Please select a subject or enter a new subject name.');
        return;
      }

      const exists = subjects.some(s => String(s).toLowerCase() === subjectName.toLowerCase());
      if (exists) {
        setSubjectModalError('This subject already exists for this class.');
        return;
      }

      try {
        await API.post(
          '/hm/teacher-assignments/add-subject',
          {
            class_grade: selectedClass,
            section: selectedSection,
            subject_name: subjectName,
          },
          { headers: getHeaders() }
        );
        chosenSubject = subjectName;
        setSubjects(prev => [...prev, subjectName].sort());
      } catch (err: any) {
        setSubjectModalError('Failed to add subject: ' + (err?.response?.data?.detail || err?.message));
        return;
      }
    }

    if (!chosenSubject) {
      setSubjectModalError('Please select or add a subject.');
      return;
    }

    if (!teacherId && subjectModalNewTeacher) {
      const teacherName = String(subjectModalNewTeacher).trim();
      if (!teacherName) {
        setSubjectModalError('Please select a teacher or enter a new teacher name.');
        return;
      }

      try {
        const employeeId = await fetchNextEmployeeId();
        const res = await API.post(
          '/hm/teachers/register',
          {
            branch_id: branchId,
            employee_id: employeeId,
            teacher_full_name: teacherName,
            designation: 'Teacher',
            department_subject: '',
            date_of_joining: new Date().toISOString().split('T')[0],
            teacher_status: 'ACTIVE',
          },
          { headers: getHeaders() }
        );
        teacherId = res.data?.teacher_id;
        createdTeacherPassword = String(res.data?.temporary_password || '').trim();
        const newTeacher: Teacher = {
          teacher_id: teacherId,
          teacher_full_name: teacherName,
          employee_id: employeeId,
        };
        setTeachers(prev => [...prev, newTeacher]);
      } catch (err: any) {
        setSubjectModalError('Failed to add teacher: ' + (err?.response?.data?.detail || err?.message));
        return;
      }
    }

    if (!teacherId) {
      setSubjectModalError('Please select or add a teacher.');
      return;
    }

    const nextMap = { ...subjectTeacherMap, [chosenSubject]: teacherId };
    setSubjectTeacherMap(nextMap);
    setSubjectModalError('');
    setSubjectModalOpen(false);

    setSubjectTeacherSaving(true);

    try {
      const payload = {
        class_grade: selectedClass,
        section: selectedSection,
        subject_teachers: subjects.map((subject) => ({
          subject_name: subject,
          teacher_id: nextMap[subject] || null,
        })),
      };

      const res = await API.post('/hm/teacher-assignments/save-subject-teachers', payload, { headers: getHeaders() });

      const successMsg = createdTeacherPassword
        ? `${res.data?.message || 'Subject teacher assigned successfully'}. Temporary password for new teacher: ${createdTeacherPassword}`
        : (res.data?.message || 'Subject teacher assigned successfully');

      showMessage('success', successMsg);
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      showMessage('error', err?.response?.data?.detail || err?.message || 'Failed to assign teacher');
    } finally {
      setSubjectTeacherSaving(false);
    }
  };

  const classNames = useMemo(() => {
    return Object.keys(classesMap).sort((a, b) => {
      const an = Number(a);
      const bn = Number(b);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return String(a).localeCompare(String(b));
    });
  }, [classesMap]);

  const subjectOptions = useMemo(() => {
    return [...new Set(subjects.map(s => String(s).trim()).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [subjects]);

  const teacherLabel = (teacher: Teacher) => {
    if (!teacher) return '';
    return `${teacher.employee_id || teacher.teacher_id} - ${teacher.teacher_full_name}`;
  };

  const availableSections = classesMap[selectedClass] || [];

  const isBusy = loading || detailsLoading || classTeacherSaving || subjectTeacherSaving;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMeta} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Teacher Assignment Management</Text>
            <Text style={styles.subtitle}>
              Assign class teacher and subject teachers for each class-section
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => {
                setSubjectModalMode('create');
                setSubjectModalNewSubject('');
                setSubjectModalError('');
                setSubjectModalOpen(true);
              }}
              disabled={isBusy || !selectedClass || !selectedSection}
            >
              <Icon name="book" size={14} color={C.text2} />
              <Text style={styles.btnText}>Add Subject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={loadMeta}
              disabled={isBusy}
            >
              <Icon name="refresh-cw" size={14} color={C.text2} />
              <Text style={styles.btnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Icon name="home" size={14} color={C.primary} />
            <Text style={styles.infoText}>School: <Text style={styles.infoStrong}>{schoolCode || '-'}</Text></Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="git-branch" size={14} color={C.primary} />
            <Text style={styles.infoText}>Branch: <Text style={styles.infoStrong}>{branchId || '-'}</Text></Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="users" size={14} color={C.primary} />
            <Text style={styles.infoText}>Teachers: <Text style={styles.infoStrong}>{teachers.length}</Text></Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="grid" size={14} color={C.primary} />
            <Text style={styles.infoText}>Classes: <Text style={styles.infoStrong}>{classNames.length}</Text></Text>
          </View>
        </View>

        {/* Message */}
        {message.text ? (
          <View style={[styles.message, message.type === 'success' ? styles.successMessage : styles.errorMessage]}>
            <Icon name={message.type === 'success' ? 'check-circle' : 'alert-triangle'} size={16} color={message.type === 'success' ? C.success : C.danger} />
            <Text style={[styles.messageText, message.type === 'success' ? styles.successText : styles.errorText]}>
              {message.text}
            </Text>
          </View>
        ) : null}

        {/* Main Content */}
        <View style={styles.main}>
          {/* Left Panel - Classes */}
          <View style={styles.leftPanel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Classes & Sections</Text>
              <Text style={styles.panelSub}>Select class first, then choose section</Text>
            </View>
            <View style={styles.leftBody}>
              <View style={styles.classGrid}>
                {classNames.map((cls) => (
                  <TouchableOpacity
                    key={`class-${cls}`}
                    style={[styles.classCard, selectedClass === cls && styles.classCardActive]}
                    onPress={() => {
                      setSelectedClass(cls);
                      const secs = classesMap[cls] || [];
                      setSelectedSection(secs[0] || '');
                    }}
                  >
                    <Text style={[styles.className, selectedClass === cls && styles.classNameActive]}>
                      Class {cls}
                    </Text>
                    <Text style={styles.classMeta}>{(classesMap[cls] || []).length} section(s)</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedClass ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>Sections for Class {selectedClass}</Text>
                  <View style={styles.sectionList}>
                    {availableSections.map((sec) => (
                      <TouchableOpacity
                        key={`section-${selectedClass}-${sec}`}
                        style={[styles.sectionBtn, selectedSection === sec && styles.sectionBtnActive]}
                        onPress={() => setSelectedSection(sec)}
                      >
                        <Text style={[styles.sectionBtnText, selectedSection === sec && styles.sectionBtnTextActive]}>
                          {sec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Right Panel - Assignment Workspace */}
          <View style={styles.rightPanel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Assignment Workspace</Text>
              <Text style={styles.panelSub}>Manage class teacher and subject-wise teacher mapping</Text>
            </View>

            <View style={styles.rightBody}>
              {!selectedClass || !selectedSection ? (
                <View style={styles.emptyState}>
                  <Icon name="book-open" size={28} color={C.text3} />
                  <Text style={styles.emptyTitle}>Select a class and section</Text>
                  <Text style={styles.emptyText}>After selection, assignment controls will appear here.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.selectedBanner}>
                    <Text style={styles.selectedBannerText}>
                      Selected: Class {selectedClass} - Section {selectedSection}
                    </Text>
                  </View>

                  <View style={styles.grid}>
                    {/* Class Teacher Card */}
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <View>
                          <Text style={styles.cardTitle}>
                            <Icon name="user" size={14} /> Class Teacher
                          </Text>
                          <Text style={styles.cardSub}>Save only class teacher from this container</Text>
                        </View>
                      </View>

                      <View style={styles.cardBody}>
                        <Text style={styles.label}>Select class teacher</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teacherScroll}>
                          <View style={styles.teacherContainer}>
                            <TouchableOpacity
                              style={[styles.teacherOption, !classTeacherId && styles.teacherOptionSelected]}
                              onPress={() => setClassTeacherId('')}
                            >
                              <Text style={[styles.teacherOptionText, !classTeacherId && styles.teacherOptionTextSelected]}>
                                -- Select Teacher --
                              </Text>
                            </TouchableOpacity>
                            {teachers.map((teacher, idx) => (
                              <TouchableOpacity
                                key={`class-teacher-option-${teacher.teacher_id || teacher.employee_id || 'na'}-${idx}`}
                                style={[styles.teacherOption, classTeacherId === teacher.teacher_id && styles.teacherOptionSelected]}
                                onPress={() => setClassTeacherId(teacher.teacher_id)}
                              >
                                <Text style={[styles.teacherOptionText, classTeacherId === teacher.teacher_id && styles.teacherOptionTextSelected]}>
                                  {teacherLabel(teacher)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>

                        {currentClassTeacher ? (
                          <View style={styles.currentBadge}>
                            <Icon name="user-check" size={12} color={C.success} />
                            <Text style={styles.currentBadgeText}>
                              Current: {teacherLabel(currentClassTeacher as Teacher)}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.note}>
                          <Icon name="info" size={12} color={C.warning} />
                          <Text style={styles.noteText}>
                            The same teacher can be assigned as class teacher for multiple class-sections.
                          </Text>
                        </View>

                        <View style={styles.inlineActions}>
                          <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={() => saveClassTeacher('normal')}
                            disabled={detailsLoading || classTeacherSaving}
                          >
                            <Icon name="check-circle" size={14} color="#fff" />
                            <Text style={[styles.btnText, styles.btnPrimaryText]}>
                              {classTeacherSaving ? 'Saving...' : 'Save Class Teacher'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Subject Teachers Card */}
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <View>
                          <Text style={styles.cardTitle}>
                            <Icon name="book" size={14} /> Subject Teachers
                          </Text>
                          <Text style={styles.cardSub}>Save only subject-teacher mappings from this container</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.btn, styles.btnPrimary, styles.smallBtn]}
                          onPress={() => {
                            setSubjectModalMode('assign');
                            setSubjectModalSelectedSubject(subjectOptions[0] || '');
                            setSubjectModalNewSubject('');
                            setSubjectModalTeacherId('');
                            setSubjectModalNewTeacher('');
                            setSubjectModalError('');
                            setSubjectModalOpen(true);
                          }}
                          disabled={detailsLoading || subjectTeacherSaving || subjects.length === 0}
                        >
                          <Icon name="user-plus" size={14} color="#fff" />
                          <Text style={[styles.btnText, styles.btnPrimaryText]}>Assign Teacher</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cardBody}>
                        {detailsLoading ? (
                          <ActivityIndicator size="large" color={C.primary} />
                        ) : subjects.length === 0 ? (
                          <Text style={styles.emptySubjectsText}>
                            No subjects found for this class. Use the Add Subject button above to add subjects first.
                          </Text>
                        ) : (
                          <>
                            <View style={styles.subjectTable}>
                              {subjects.map((subject) => (
                                <View key={`subject-${selectedClass}-${selectedSection}-${subject}`} style={styles.subjectRow}>
                                  <Text style={styles.subjectName}>{subject}</Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teacherScrollSmall}>
                                    <View style={styles.teacherContainerSmall}>
                                      <TouchableOpacity
                                        style={[styles.teacherOptionSmall, !subjectTeacherMap[subject] && styles.teacherOptionSelected]}
                                        onPress={() => setSubjectTeacherMap(prev => ({ ...prev, [subject]: '' }))}
                                      >
                                        <Text style={[styles.teacherOptionTextSmall, !subjectTeacherMap[subject] && styles.teacherOptionTextSelected]}>
                                          -- Select Teacher --
                                        </Text>
                                      </TouchableOpacity>
                                      {teachers.map((teacher, idx) => (
                                        <TouchableOpacity
                                          key={`subject-teacher-option-${subject}-${teacher.teacher_id || teacher.employee_id || 'na'}-${idx}`}
                                          style={[styles.teacherOptionSmall, subjectTeacherMap[subject] === teacher.teacher_id && styles.teacherOptionSelected]}
                                          onPress={() => setSubjectTeacherMap(prev => ({ ...prev, [subject]: teacher.teacher_id }))}
                                        >
                                          <Text style={[styles.teacherOptionTextSmall, subjectTeacherMap[subject] === teacher.teacher_id && styles.teacherOptionTextSelected]}>
                                            {teacherLabel(teacher)}
                                          </Text>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </ScrollView>
                                </View>
                              ))}
                            </View>

                            <View style={styles.inlineActions}>
                              <TouchableOpacity
                                style={[styles.btn, styles.btnPrimary]}
                                onPress={saveSubjectTeachers}
                                disabled={detailsLoading || subjectTeacherSaving}
                              >
                                <Icon name="check-circle" size={14} color="#fff" />
                                <Text style={[styles.btnText, styles.btnPrimaryText]}>
                                  {subjectTeacherSaving ? 'Saving...' : 'Save Subject Teachers'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>

            {selectedClass && selectedSection ? (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => loadDetails(selectedClass, selectedSection)}
                  disabled={isBusy}
                >
                  <Icon name="refresh-cw" size={14} color={C.text2} />
                  <Text style={styles.btnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Subject Modal */}
      <Modal
        visible={subjectModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSubjectModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                <Icon name="book" size={16} /> {subjectModalMode === 'assign' ? 'Assign Teacher to Subject' : 'Add Subject'}
              </Text>
            </View>

            <View style={styles.modalBody}>
              {subjectModalMode === 'assign' ? (
                <>
                  <View>
                    <Text style={styles.label}>Select subject</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                      <View style={styles.subjectContainer}>
                        <TouchableOpacity
                          style={[styles.subjectOption, !subjectModalSelectedSubject && styles.subjectOptionSelected]}
                          onPress={() => setSubjectModalSelectedSubject('')}
                        >
                          <Text style={[styles.subjectOptionText, !subjectModalSelectedSubject && styles.subjectOptionTextSelected]}>
                            -- Select Subject --
                          </Text>
                        </TouchableOpacity>
                        {subjectOptions.map((subject) => (
                          <TouchableOpacity
                            key={`modal-subject-${subject}`}
                            style={[styles.subjectOption, subjectModalSelectedSubject === subject && styles.subjectOptionSelected]}
                            onPress={() => setSubjectModalSelectedSubject(subject)}
                          >
                            <Text style={[styles.subjectOptionText, subjectModalSelectedSubject === subject && styles.subjectOptionTextSelected]}>
                              {subject}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Text style={[styles.label, { marginTop: 12 }]}>Or add new subject</Text>
                    <TextInput
                      style={styles.input}
                      value={subjectModalNewSubject}
                      onChangeText={setSubjectModalNewSubject}
                      placeholder="Type new subject name"
                    />
                  </View>
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Select teacher</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teacherScroll}>
                      <View style={styles.teacherContainer}>
                        <TouchableOpacity
                          style={[styles.teacherOption, !subjectModalTeacherId && styles.teacherOptionSelected]}
                          onPress={() => setSubjectModalTeacherId('')}
                        >
                          <Text style={[styles.teacherOptionText, !subjectModalTeacherId && styles.teacherOptionTextSelected]}>
                            -- Select Teacher --
                          </Text>
                        </TouchableOpacity>
                        {teachers.map((teacher, idx) => (
                          <TouchableOpacity
                            key={`modal-teacher-option-${teacher.teacher_id || teacher.employee_id || 'na'}-${idx}`}
                            style={[styles.teacherOption, subjectModalTeacherId === teacher.teacher_id && styles.teacherOptionSelected]}
                            onPress={() => setSubjectModalTeacherId(teacher.teacher_id)}
                          >
                            <Text style={[styles.teacherOptionText, subjectModalTeacherId === teacher.teacher_id && styles.teacherOptionTextSelected]}>
                              {teacherLabel(teacher)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Text style={[styles.label, { marginTop: 12 }]}>Or add new teacher</Text>
                    <TextInput
                      style={styles.input}
                      value={subjectModalNewTeacher}
                      onChangeText={setSubjectModalNewTeacher}
                      placeholder="Type new teacher name"
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalInfoText}>Existing subjects: {subjects.length}</Text>
                  <Text style={styles.label}>Subject name</Text>
                  <TextInput
                    style={styles.input}
                    value={subjectModalNewSubject}
                    onChangeText={setSubjectModalNewSubject}
                    placeholder="Type subject name"
                  />
                </>
              )}

              {subjectModalError ? (
                <View style={[styles.message, styles.errorMessage, { marginTop: 16 }]}>
                  <Icon name="alert-triangle" size={14} color={C.danger} />
                  <Text style={[styles.messageText, styles.errorText]}>{subjectModalError}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.modalFoot}>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setSubjectModalOpen(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              {subjectModalMode === 'assign' ? (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleAssignTeacherModal}
                  disabled={(!subjectModalSelectedSubject && !subjectModalNewSubject.trim()) || (!subjectModalTeacherId && !subjectModalNewTeacher.trim())}
                >
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>Assign Teacher</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleCreateSubject}
                  disabled={!subjectModalNewSubject.trim()}
                >
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>Add Subject</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Override Modal */}
      <Modal
        visible={overrideOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setOverrideOpen(false);
          setOverrideConflict(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                <Icon name="alert-triangle" size={16} color={C.warning} />
                Class Teacher Already Assigned
              </Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalBodyText}>
                <Text style={styles.modalBodyStrong}>{overrideConflict?.teacher_name}</Text> is already assigned as class teacher for
                <Text style={styles.modalBodyStrong}> Class {overrideConflict?.current_class_grade} - Section {overrideConflict?.current_section}</Text>.
              </Text>
              <Text style={[styles.modalBodyText, { marginTop: 12 }]}>
                Choose how you want to continue for
                <Text style={styles.modalBodyStrong}> Class {selectedClass} - Section {selectedSection}</Text>.
              </Text>
            </View>

            <View style={styles.modalFoot}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => {
                  setOverrideOpen(false);
                  setOverrideConflict(null);
                }}
              >
                <Text style={styles.btn