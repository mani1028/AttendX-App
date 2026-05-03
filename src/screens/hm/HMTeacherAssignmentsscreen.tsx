import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, StyleSheet, Alert, StatusBar, Platform,
  NativeSyntheticEvent, NativeScrollEvent, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Bell,
  RefreshCw,
  School,
  GitBranch,
  User,
  BookOpen,
  Plus,
  ChevronDown,
  CheckCircle2,
  X,
  AlertTriangle,
  Home,
  Users,
  Award,
  LogOut,
  Settings
} from 'lucide-react-native';
import API from '../../services/api';
import * as hmService from '../../services/hmService';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { HM_THEME as C } from '../../constants/hmTheme';

// ─── Colors ──────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getSchoolCode() {
  return (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) || '';
}

async function getBranchId() {
  return (await AsyncStorage.getItem('branch_id')) ||
    (await AsyncStorage.getItem('branchId')) || '';
}

function teacherLabel(t: any) {
  if (!t) return '';
  return `${t.employee_id || t.teacher_id} - ${t.teacher_full_name}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HMTeacherAssignmentsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');

  const [loading, setLoading] = useState(false);
  const [classTeacherSaving, setClassTeacherSaving] = useState(false);
  const [subjectTeacherSaving, setSubjectTeacherSaving] = useState(false);

  const [classesMap, setClassesMap] = useState<Record<string, string[]>>({});
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classTeacherId, setClassTeacherId] = useState('');
  const [subjectTeacherMap, setSubjectTeacherMap] = useState<Record<string, string>>({});
  const [currentClassTeacher, setCurrentClassTeacher] = useState<any>(null);

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'create' | 'assign'>('create');
  const [subjectModalSelectedSubject, setSubjectModalSelectedSubject] = useState('');
  const [subjectModalNewSubject, setSubjectModalNewSubject] = useState('');
  const [subjectModalNewTeacher, setSubjectModalNewTeacher] = useState('');
  const [subjectModalTeacherId, setSubjectModalTeacherId] = useState('');
  const [subjectModalError, setSubjectModalError] = useState('');

  const [message, setMessage] = useState({ type: '', text: '' });
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState<any>(null);

  // Teacher picker modal (replaces <select>)
  const [teacherPickerVisible, setTeacherPickerVisible] = useState(false);
  const [teacherPickerTarget, setTeacherPickerTarget] = useState<'class' | string>('class');

  const isBusy = loading || detailsLoading || classTeacherSaving || subjectTeacherSaving;
  const clearMessage = () => setMessage({ type: '', text: '' });

  const headers = useMemo(() => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  }), [schoolCode, branchId]);

  const classNames = useMemo(() =>
    Object.keys(classesMap).sort((a, b) => {
      const an = Number(a), bn = Number(b);
      return (!isNaN(an) && !isNaN(bn)) ? an - bn : a.localeCompare(b);
    }), [classesMap]);

  const subjectOptions = useMemo(() =>
    [...new Set(subjects.map(s => String(s).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [subjects]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const sc = await getSchoolCode();
      const bid = await getBranchId();
      setSchoolCode(sc);
      setBranchId(bid);
    })();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const deltaY = y - lastScrollY.current;
    scrollY.setValue(y);
    if (y > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10 || y < 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = y;
  };

  useEffect(() => {
    if (schoolCode && branchId) loadMeta();
  }, [schoolCode, branchId]);

  useEffect(() => {
    if (selectedClass && selectedSection) loadDetails(selectedClass, selectedSection);
  }, [selectedClass, selectedSection]);

  // ── API calls ───────────────────────────────────────────────────────────────
  const loadMeta = async () => {
    setLoading(true);
    clearMessage();
    try {
      const classesRes = await API.get('/hm/classes', { headers });
      
      let teacherItems: any[] = [];
      try {
        teacherItems = await hmService.getHMTeachers(headers);
      } catch (teacherErr: any) {
        console.warn('Failed to load teachers:', teacherErr?.message);
        // Continue without teachers - show empty state in picker
      }

      const classItems = classesRes.data?.items || [];
      const grouped: Record<string, string[]> = {};

      classItems.forEach((item: any) => {
        const cg = String(item.class_grade || '').trim();
        const sec = String(item.section || '').trim().toUpperCase();
        if (!cg || !sec) return;
        if (!grouped[cg]) grouped[cg] = [];
        if (!grouped[cg].includes(sec)) grouped[cg].push(sec);
      });

      Object.keys(grouped).forEach(cg => {
        grouped[cg] = grouped[cg].sort((a, b) => a.localeCompare(b));
      });

      setClassesMap(grouped);
      setTeachers(Array.isArray(teacherItems) ? teacherItems : []);

      const cls = Object.keys(grouped);
      if (cls.length) {
        const nextClass = selectedClass && grouped[selectedClass] ? selectedClass : cls[0];
        const nextSections = grouped[nextClass] || [];
        const nextSection = selectedSection && nextSections.includes(selectedSection)
          ? selectedSection : nextSections[0] || '';
        setSelectedClass(nextClass);
        setSelectedSection(nextSection);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (cg: string, sec: string) => {
    if (!cg || !sec) return;
    setDetailsLoading(true);
    clearMessage();
    try {
      const res = await API.get('/hm/teacher-assignments/details', {
        headers, params: { class_grade: cg, section: sec },
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
    } catch {
      setSubjects([]);
      setSubjectTeacherMap({});
      setClassTeacherId('');
      setCurrentClassTeacher(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveClassTeacher = async (action = 'normal') => {
    if (!selectedClass || !selectedSection) {
      setMessage({ type: 'error', text: 'Please select class and section' });
      return;
    }
    setClassTeacherSaving(true);
    clearMessage();
    try {
      const res = await API.post('/hm/teacher-assignments/save-class-teacher', {
        class_grade: selectedClass,
        section: selectedSection,
        class_teacher_id: classTeacherId || null,
        class_teacher_action: action,
      }, { headers });
      setMessage({ type: 'success', text: res.data?.message || 'Class teacher saved' });
      setOverrideOpen(false);
      setOverrideConflict(null);
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.conflict_type === 'CLASS_TEACHER_ALREADY_ASSIGNED') {
        setOverrideConflict(err.response.data);
        setOverrideOpen(true);
      } else {
        setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'Failed to save' });
      }
    } finally {
      setClassTeacherSaving(false);
    }
  };

  const saveSubjectTeachers = async () => {
    if (!selectedClass || !selectedSection) {
      setMessage({ type: 'error', text: 'Please select class and section' });
      return;
    }
    setSubjectTeacherSaving(true);
    clearMessage();
    try {
      const res = await API.post('/hm/teacher-assignments/save-subject-teachers', {
        class_grade: selectedClass,
        section: selectedSection,
        subject_teachers: subjects.map(subject => ({
          subject_name: subject,
          teacher_id: subjectTeacherMap[subject] || null,
        })),
      }, { headers });
      setMessage({ type: 'success', text: res.data?.message || 'Subject teachers saved' });
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'Failed to save' });
    } finally {
      setSubjectTeacherSaving(false);
    }
  };

  const handleCreateSubject = async () => {
    const subjectName = subjectModalNewSubject.trim();
    if (!subjectName) { setSubjectModalError('Please enter a subject name.'); return; }
    if (subjects.some(s => s.toLowerCase() === subjectName.toLowerCase())) {
      setSubjectModalError('Subject already exists.'); return;
    }
    setSubjectTeacherSaving(true);
    try {
      const res = await API.post('/hm/teacher-assignments/add-subject', {
        class_grade: selectedClass, section: selectedSection, subject_name: subjectName,
      }, { headers });
      setMessage({ type: 'success', text: res.data?.message || 'Subject added' });
      setSubjectModalOpen(false);
      await loadDetails(selectedClass, selectedSection);
    } catch (err: any) {
      setSubjectModalError(err?.response?.data?.detail || err?.message || 'Failed to add subject');
    } finally {
      setSubjectTeacherSaving(false);
    }
  };

  // ── Teacher picker ──────────────────────────────────────────────────────────
  const openTeacherPicker = (target: 'class' | string) => {
    setTeacherPickerTarget(target);
    setTeacherPickerVisible(true);
  };

  const onPickTeacher = (teacher: any) => {
    const id = String(teacher.teacher_id);
    if (teacherPickerTarget === 'class') {
      setClassTeacherId(id);
    } else if (teacherPickerTarget === 'modal') {
      setSubjectModalTeacherId(id);
    } else {
      setSubjectTeacherMap(prev => ({ ...prev, [teacherPickerTarget]: id }));
    }
    setTeacherPickerVisible(false);
  };

  const getTeacherName = (id: string) => {
    const t = teachers.find(t => String(t.teacher_id) === id);
    return t ? teacherLabel(t) : 'Select Teacher';
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <Animated.ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={[
            styles.navHeader,
            { paddingTop: insets.top + 8 },
            {
              transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 140], outputRange: [0, -100], extrapolate: 'clamp' }) }],
              opacity: scrollY.interpolate({ inputRange: [0, 140], outputRange: [1, 0.92], extrapolate: 'clamp' }),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HMDashboard' as never)}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <AppText style={styles.navTitle} weight="bold">Teacher Assignment</AppText>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => Alert.alert('Notifications', 'No notifications yet')}>
            <Bell size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Header (Section Title) */}
        <View style={styles.header}>
          <View>
            <AppText style={styles.title} weight="bold">Teacher Assignment Management</AppText>
            <AppText style={styles.subtitle}>Assign class teachers and subject teachers for each class-section</AppText>
          </View>
        </View>

      {/* Info Bar */}
      {schoolCode || branchId ? (
        <View style={styles.infoBar}>
          {schoolCode ? (
            <View style={styles.infoItem}>
              <School size={14} color={C.primary} />
              <AppText style={styles.infoText}>School: <AppText style={styles.infoBold} weight="bold">{schoolCode}</AppText></AppText>
            </View>
          ) : null}
          {branchId ? (
            <View style={styles.infoItem}>
              <GitBranch size={14} color={C.primary} />
              <AppText style={styles.infoText}>Branch: <AppText style={styles.infoBold} weight="bold">{branchId}</AppText></AppText>
            </View>
          ) : null}
        </View>
      ) : null}

{/* Message */}
{message.text ? (
<View style={[styles.messageBanner, {
  backgroundColor: message.type === 'success' ? C.successSoft : message.type === 'error' ? C.dangerSoft : C.warningSoft,
  borderColor: message.type === 'success' ? C.success + '40' : message.type === 'error' ? C.danger + '40' : C.warning + '40',
}]}>
  <AppText style={{ color: message.type === 'success' ? C.success : message.type === 'error' ? C.danger : C.warning }} weight="bold">
    {message.text}
  </AppText>
</View>
) : null}

      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Class Selection */}
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <AppText style={styles.panelTitle} weight="bold">Classes & Sections</AppText>
              <AppText style={styles.panelSub}>Select class first, then choose section</AppText>
            </View>
            <View style={styles.panelBody}>
              {classNames.length === 0 ? (
                <AppText style={{ color: C.text3, textAlign: 'center', padding: 20 }}>No classes found</AppText>
              ) : (
                <>
                  <AppText style={styles.sectionTitleSmall} weight="bold">Classes</AppText>
                  <View style={styles.classGrid}>
                    {classNames.map(cls => (
                      <TouchableOpacity
                        key={cls}
                        style={[styles.classCard, selectedClass === cls && styles.classCardActive]}
                        onPress={() => {
                          setSelectedClass(cls);
                          const secs = classesMap[cls] || [];
                          setSelectedSection(secs[0] || '');
                        }}
                      >
                        <AppText style={[styles.className, selectedClass === cls && { color: C.primary }]} weight="bold">
                          Class {cls}
                        </AppText>
                        <AppText style={styles.classMeta}>
                          {(classesMap[cls] || []).length} section(s)
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Section Selection */}
              {selectedClass && classesMap[selectedClass]?.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <AppText style={styles.sectionTitleSmall} weight="bold">Section</AppText>
                  <View style={styles.sectionList}>
                    {(classesMap[selectedClass] || []).map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.sectionBtn, selectedSection === sec && styles.sectionBtnActive]}
                        onPress={() => setSelectedSection(sec)}
                      >
                        <AppText style={[styles.sectionBtnText, selectedSection === sec && { color: C.white }]} weight="bold">
                          {sec}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Right Panel — Assignments */}
          {selectedClass && selectedSection ? (
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <AppText style={styles.panelTitle} weight="bold">Assignment Workspace</AppText>
                <AppText style={styles.panelSub}>Class {selectedClass} — Section {selectedSection}</AppText>
              </View>
              <View style={styles.panelBody}>

                {detailsLoading ? (
                  <ActivityIndicator color={C.primary} style={{ margin: 20 }} />
                ) : (
                  <>
                    {/* Class Teacher Card */}
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <View>
                          <AppText style={styles.cardTitle} weight="bold">
                            <User size={14} color={C.text} /> Class Teacher
                          </AppText>
                          <AppText style={styles.cardSub}>Assign the class teacher for this section</AppText>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <AppText style={styles.label} weight="bold">Select Teacher</AppText>
                        <TouchableOpacity
                          style={styles.picker}
                          onPress={() => openTeacherPicker('class')}
                          disabled={isBusy}
                        >
                          <AppText style={{ color: classTeacherId ? C.text : C.text3, fontSize: 14 }}>
                            {classTeacherId ? getTeacherName(classTeacherId) : 'Select Teacher'}
                          </AppText>
                          <ChevronDown size={16} color={C.text3} />
                        </TouchableOpacity>

                        {currentClassTeacher ? (
                          <View style={styles.currentBadge}>
                            <CheckCircle2 size={14} color={C.success} />
                            <AppText style={styles.currentBadgeText} weight="bold">
                              Current: {teacherLabel(currentClassTeacher)}
                            </AppText>
                          </View>
                        ) : null}

                        <View style={styles.noteBox}>
                          <AppText style={styles.noteText} weight="bold">
                            If the selected teacher is already a class teacher for another section, you will get a warning.
                          </AppText>
                        </View>

                        <TouchableOpacity
                          style={[styles.btnPrimary, isBusy && styles.btnDisabled]}
                          onPress={() => saveClassTeacher('normal')}
                          disabled={isBusy}
                        >
                          {classTeacherSaving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <AppText style={styles.btnPrimaryText} weight="bold">Save Class Teacher</AppText>}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Subject Teachers Card */}
                    <View style={[styles.card]}>
                      <View style={styles.cardHead}>
                        <View style={{ flex: 1 }}>
                          <AppText style={styles.cardTitle} weight="bold">
                            <BookOpen size={14} color={C.text} /> Subject Teachers
                          </AppText>
                          <AppText style={styles.cardSub}>Save only subject-teacher mappings from this container</AppText>
                        </View>
                        <TouchableOpacity
                          style={styles.btnOutline}
                          onPress={() => {
                            setSubjectModalMode('create');
                            setSubjectModalNewSubject('');
                            setSubjectModalError('');
                            setSubjectModalOpen(true);
                          }}
                        >
                          <Plus size={16} color={C.text2} />
                          <AppText style={styles.btnOutlineText} weight="bold">Add</AppText>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cardBody}>
                        {subjects.length === 0 ? (
                          <AppText style={{ color: C.text2, fontSize: 14 }}>
                            No subjects found. Use "Add Subject" to add subjects first.
                          </AppText>
                        ) : (
                          <>
                            {subjects.map(subject => (
                              <View key={subject} style={styles.subjectRow}>
                                <AppText style={styles.subjectName} weight="bold">{subject}</AppText>
                                <TouchableOpacity
                                  style={styles.picker}
                                  onPress={() => openTeacherPicker(subject)}
                                  disabled={isBusy}
                                >
                                  <AppText style={{ color: subjectTeacherMap[subject] ? C.text : C.text3, fontSize: 13, flex: 1 }}>
                                    {subjectTeacherMap[subject] ? getTeacherName(subjectTeacherMap[subject]) : 'Select Teacher'}
                                  </AppText>
                                  <ChevronDown size={16} color={C.text3} />
                                </TouchableOpacity>
                              </View>
                            ))}
                            <TouchableOpacity
                              style={[styles.btnPrimary, { marginTop: 16 }, isBusy && styles.btnDisabled]}
                              onPress={saveSubjectTeachers}
                              disabled={isBusy}
                            >
                              {subjectTeacherSaving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <AppText style={styles.btnPrimaryText} weight="bold">Save Subject Teachers</AppText>}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Home size={40} color={C.text3} />
              <AppText style={styles.emptyTitle} weight="bold">Select a class and section</AppText>
              <AppText style={{ color: C.text3, fontSize: 13 }}>to manage teacher assignments</AppText>
            </View>
          )}
        </>
      )}
      </Animated.ScrollView>

      {/* ── Teacher Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={teacherPickerVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.pickerModal]}>
            <View style={styles.modalHead}>
              <AppText style={styles.modalTitle} weight="bold">Select Teacher</AppText>
              <TouchableOpacity onPress={() => setTeacherPickerVisible(false)}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            {teachers && teachers.length > 0 ? (
              <ScrollView style={styles.pickerScrollView}>
                {teachers.map(teacher => (
                  <TouchableOpacity
                    key={String(teacher.teacher_id)}
                    style={styles.pickerOption}
                    onPress={() => onPickTeacher(teacher)}
                  >
                    <AppText style={styles.pickerOptionText}>{teacherLabel(teacher)}</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyPickerList}>
                <AppText style={styles.emptyPickerText}>No teachers available</AppText>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Add Subject Modal ─────────────────────────────────────────────── */}
      <Modal visible={subjectModalOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <AppText style={styles.modalTitle} weight="bold">
                <BookOpen size={16} color={C.text} /> Add Subject
              </AppText>
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <AppText style={styles.label} weight="bold">Subject Name</AppText>
              <TextInput
                style={styles.input}
                value={subjectModalNewSubject}
                onChangeText={setSubjectModalNewSubject}
                placeholder="Enter subject name"
                placeholderTextColor={C.text3}
              />
              {subjectModalError ? (
                <AppText style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{subjectModalError}</AppText>
              ) : null}
            </View>
            <View style={styles.modalFoot}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setSubjectModalOpen(false)}>
                <AppText style={styles.btnOutlineText} weight="bold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, !subjectModalNewSubject.trim() && styles.btnDisabled]}
                onPress={handleCreateSubject}
                disabled={!subjectModalNewSubject.trim() || subjectTeacherSaving}
              >
                <AppText style={styles.btnPrimaryText} weight="bold">Add Subject</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Override Conflict Modal ───────────────────────────────────────── */}
      <Modal visible={overrideOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <AlertTriangle size={20} color={C.warning} />
              <AppText style={[styles.modalTitle, { marginLeft: 6 }]} weight="bold">Class Teacher Already Assigned</AppText>
            </View>
            <View style={styles.modalBody}>
              <AppText style={{ color: C.text2, lineHeight: 22 }}>
                <AppText style={{ color: C.text }} weight="bold">{overrideConflict?.teacher_name}</AppText> is already
                assigned as class teacher for{' '}
                <AppText style={{ color: C.text }} weight="bold">
                  Class {overrideConflict?.current_class_grade} — Section {overrideConflict?.current_section}
                </AppText>.{'\n\n'}
                Choose how to continue for{' '}
                <AppText style={{ color: C.text }} weight="bold">
                  Class {selectedClass} — Section {selectedSection}
                </AppText>.
              </AppText>
            </View>
            <View style={styles.modalFoot}>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => { setOverrideOpen(false); setOverrideConflict(null); }}
              >
                <AppText style={styles.btnOutlineText} weight="bold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => saveClassTeacher('keep_both')}
                disabled={classTeacherSaving}
              >
                <AppText style={styles.btnOutlineText} weight="bold">Assign Both</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => saveClassTeacher('move')}
                disabled={classTeacherSaving}
              >
                <AppText style={styles.btnPrimaryText} weight="bold">Move</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  navHeader: {
    backgroundColor: '#001F3F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  navTitle: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  page: { flex: 1, backgroundColor: C.bg },
  pageContent: { paddingHorizontal: 16, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 20, color: C.text },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 4 },

  infoBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, color: C.text2 },
  infoBold: { color: C.text },

  messageBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },

  panel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  panelHead: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: C.sidebar },
  panelTitle: { fontSize: 15, color: C.text },
  panelSub: { fontSize: 12, color: C.text2, marginTop: 2 },
  panelBody: { padding: 12 },

  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  classCard: { width: '47%', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 12, backgroundColor: C.white },
  classCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  className: { fontSize: 15, color: C.text },
  classMeta: { fontSize: 11, color: C.text2, marginTop: 4 },

  sectionWrap: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  sectionTitleSmall: { fontSize: 12, color: C.text2, marginBottom: 8, letterSpacing: 0.3 },
  sectionTitle: { fontSize: 11, color: C.text2, marginBottom: 8, letterSpacing: 0.5 },
  sectionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionBtn: { minWidth: 46, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  sectionBtnActive: { borderColor: C.primary, backgroundColor: C.primary },
  sectionBtnText: { color: C.text2 },

  card: { borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: C.sidebar },
  cardTitle: { fontSize: 14, color: C.text, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  cardBody: { padding: 14 },

  label: { fontSize: 12, color: C.text2, marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.white, marginBottom: 8 },
  input: { height: 44, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: C.text, backgroundColor: C.white },

  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.successSoft, alignSelf: 'flex-start', marginBottom: 8 },
  currentBadgeText: { fontSize: 12, color: C.success },

  noteBox: { backgroundColor: C.warningSoft, borderRadius: 12, padding: 10, marginBottom: 12 },
  noteText: { fontSize: 12, color: C.warning },

  subjectRow: { marginBottom: 12 },
  subjectName: { fontSize: 13, color: C.text, marginBottom: 6 },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { color: C.text, fontSize: 15 },

  btnPrimary: { backgroundColor: C.primary, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, flexDirection: 'row', gap: 6 },
  btnPrimaryText: { color: '#fff', fontSize: 14 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  btnOutlineText: { color: C.text2, fontSize: 13 },
  btnDisabled: { opacity: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '100%', backgroundColor: C.white, borderRadius: 18, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: C.sidebar },
  modalTitle: { fontSize: 15, color: C.text, flex: 1 },
  modalBody: { padding: 16 },
  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: C.borderSoft, flexWrap: 'wrap' },

  pickerModal: { maxHeight: '80%', minHeight: 200, flex: 0, flexDirection: 'column' },
  pickerScrollView: { flex: 1 },
  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  pickerOptionText: { fontSize: 14, color: C.text },
  emptyPickerList: { padding: 20, justifyContent: 'center', alignItems: 'center', minHeight: 100 },
  emptyPickerText: { fontSize: 14, color: C.text2 },

  footerTabs: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  footerTabActive: {
    backgroundColor: C.primarySoft,
  },
  footerTabText: {
    fontSize: 11,
    color: C.text2,
  },
  footerTabTextActive: {
    color: C.primary,
  },
});