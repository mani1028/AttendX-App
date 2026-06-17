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
  Settings,
  Trash2,
} from 'lucide-react-native';
import API from '../../services/api';
import * as principalService from '../../services/principalService';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Principal_THEME as C } from '../../constants/principalTheme';

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
  const name = t.staff_full_name || t.teacher_full_name || t.name;
  const id = t.employee_id || t.teacher_id || t.id;
  return `${id} - ${name}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PrincipalTeacherAssignmentsScreen() {
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

  // Global Subject Pool State
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [showGlobalPoolManager, setShowGlobalPoolManager] = useState(false);
  const [newGlobalSubject, setNewGlobalSubject] = useState('');
  const [selectedGlobalSubjects, setSelectedGlobalSubjects] = useState<string[]>([]);

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
      const [classesRes, staffRes, poolRes] = await Promise.all([
        API.get('/principal/classes', { headers }),
        principalService.getPrincipalTeachers(headers),
        API.get('/principal/subjects/pool', { headers }).catch(() => ({ data: { ok: false, subjects: [] } }))
      ]);
      
      if (poolRes.data?.ok) {
        setGlobalSubjects(poolRes.data.subjects || []);
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
      setTeachers(Array.isArray(staffRes) ? staffRes : []);

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
      const res = await API.get('/principal/staff-assignments/details', {
        headers, params: { class_grade: cg, section: sec },
      });
      const data = res.data || {};
      const subjectItems = data.subjects || [];
      const subjectMap: Record<string, string> = {};
      subjectItems.forEach((item: any) => {
        subjectMap[item.subject_name] = item.employee_id ? String(item.employee_id) : '';
      });
      setSubjects(subjectItems.map((item: any) => item.subject_name));
      setSubjectTeacherMap(subjectMap);
      setClassTeacherId(data.class_staff?.employee_id ? String(data.class_staff.employee_id) : '');
      setCurrentClassTeacher(data.class_staff || null);
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
      const res = await API.post('/principal/staff-assignments/save-class-staff', {
        class_grade: selectedClass,
        section: selectedSection,
        class_employee_id: classTeacherId || null,
        class_staff_action: action,
      }, { headers });
      setMessage({ type: 'success', text: res.data?.message || 'Class staff saved' });
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
      const res = await API.post('/principal/staff-assignments/save-subject-staff', {
        class_grade: selectedClass,
        section: selectedSection,
        subject_staff: subjects.map(subject => ({
          subject_name: subject,
          employee_id: subjectTeacherMap[subject] || null,
        })),
      }, { headers });
      setMessage({ type: 'success', text: res.data?.message || 'Subject staff saved' });
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
      const res = await API.post('/principal/staff-assignments/add-subject', {
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

  const addSubjectToGlobalPool = async () => {
    const sname = newGlobalSubject.trim();
    if (!sname) return;
    try {
      await API.post('/principal/subjects/pool/add', { subject_name: sname }, { headers });
      const poolRes = await API.get('/principal/subjects/pool', { headers });
      if (poolRes.data?.ok) setGlobalSubjects(poolRes.data.subjects);
      setNewGlobalSubject('');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to add subject: ' + (err.response?.data?.detail || err.message));
    }
  };

  const deleteFromGlobalPool = async (sname: string) => {
    Alert.alert('Confirm', `Delete "${sname}" from global pool?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await API.post('/principal/subjects/pool/delete', { subject_name: sname }, { headers });
          const poolRes = await API.get('/principal/subjects/pool', { headers });
          if (poolRes.data?.ok) setGlobalSubjects(poolRes.data.subjects);
        } catch (err: any) {
          Alert.alert('Error', 'Failed to delete subject: ' + (err.response?.data?.detail || err.message));
        }
      }}
    ]);
  };

  const importToClass = async () => {
    if (selectedGlobalSubjects.length === 0) return;
    setSubjectTeacherSaving(true);
    try {
      await API.post('/principal/subjects/import-to-class', {
        class_grade: selectedClass,
        section: selectedSection,
        subject_names: selectedGlobalSubjects
      }, { headers });
      await loadDetails(selectedClass, selectedSection);
      setSelectedGlobalSubjects([]);
      setShowGlobalPoolManager(false);
      setMessage({ type: 'success', text: 'Subjects imported successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Import failed: ' + (err.response?.data?.detail || err.message) });
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
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

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
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PrincipalDashboard' as never)}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <AppText style={styles.navTitle} weight="bold">Staff Assignment</AppText>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => setShowGlobalPoolManager(true)}>
            <BookOpen size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Header (Section Title) */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.title} weight="bold">Staff Assignment Management</AppText>
              <AppText style={styles.subtitle}>Assign class staff and subject staff for each class-section</AppText>
            </View>
            <TouchableOpacity 
              style={[styles.btnOutline, { height: 40, paddingHorizontal: 12 }]} 
              onPress={() => setShowGlobalPoolManager(true)}
            >
              <BookOpen size={16} color={C.primary} />
              <AppText style={[styles.btnOutlineText, { color: C.primary, fontSize: 12 }]} weight="bold">Global Pool</AppText>
            </TouchableOpacity>
          </View>
        </View>

      {/* Info Bar */}
      {schoolCode || branchId ? (
        <View style={styles.infoBar}>
          {schoolCode ? (
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <School size={16} color={C.primary} />
              </View>
              <View>
                <AppText style={styles.infoLabel}>School</AppText>
                <AppText style={styles.infoValue} weight="bold">{schoolCode}</AppText>
              </View>
            </View>
          ) : null}
          {branchId ? (
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <GitBranch size={16} color={C.primary} />
              </View>
              <View>
                <AppText style={styles.infoLabel}>Branch</AppText>
                <AppText style={styles.infoValue} weight="bold">{branchId}</AppText>
              </View>
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
          {message.type === 'success' ? <CheckCircle2 size={18} color={C.success} /> : <AlertTriangle size={18} color={message.type === 'error' ? C.danger : C.warning} />}
          <AppText style={{ color: message.type === 'success' ? C.success : message.type === 'error' ? C.danger : C.warning, flex: 1 }} weight="bold">
            {message.text}
          </AppText>
          <TouchableOpacity onPress={clearMessage}>
            <X size={18} color={message.type === 'success' ? C.success : message.type === 'error' ? C.danger : C.warning} />
          </TouchableOpacity>
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
                    {/* Class Staff Card */}
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <View>
                          <View style={styles.cardTitleRow}>
                            <User size={18} color={C.text} />
                            <AppText style={styles.cardTitle} weight="bold">Class Staff</AppText>
                          </View>
                          <AppText style={styles.cardSub}>Assign the class staff for this section</AppText>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <AppText style={styles.label} weight="bold">Select Staff</AppText>
                        <TouchableOpacity
                          style={styles.picker}
                          onPress={() => openTeacherPicker('class')}
                          disabled={isBusy}
                        >
                          <AppText style={{ color: classTeacherId ? C.text : C.text3, fontSize: 14 }}>
                            {classTeacherId ? getTeacherName(classTeacherId) : 'Select Staff'}
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
                            The same staff can be assigned as class staff for multiple sections.
                          </AppText>
                        </View>

                        <TouchableOpacity
                          style={[styles.btnPrimary, isBusy && styles.btnDisabled]}
                          onPress={() => saveClassTeacher('normal')}
                          disabled={isBusy}
                        >
                          {classTeacherSaving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <AppText style={styles.btnPrimaryText} weight="bold">Save Class Staff</AppText>}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Subject Staff Card */}
                    <View style={[styles.card]}>
                      <View style={styles.cardHead}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.cardTitleRow}>
                            <BookOpen size={18} color={C.text} />
                            <AppText style={styles.cardTitle} weight="bold">Subject Staff</AppText>
                          </View>
                          <AppText style={styles.cardSub}>Save subject-staff mappings</AppText>
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
                            No subjects found. Use "Global Pool" to import subjects first.
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
                                    {subjectTeacherMap[subject] ? getTeacherName(subjectTeacherMap[subject]) : 'Select Staff'}
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
                                : <AppText style={styles.btnPrimaryText} weight="bold">Save Subject Staff</AppText>}
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
              <AppText style={{ color: C.text3, fontSize: 13 }}>to manage staff assignments</AppText>
            </View>
          )}
        </>
      )}
      </Animated.ScrollView>

      {/* ── Global Pool Manager Modal ────────────────────────────────────── */}
      <Modal visible={showGlobalPoolManager} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: '80%' }]}>
            <View style={styles.modalHead}>
              <View style={styles.cardTitleRow}>
                <BookOpen size={20} color={C.text} />
                <AppText style={styles.modalTitle} weight="bold">Global Subject Pool</AppText>
              </View>
              <TouchableOpacity onPress={() => setShowGlobalPoolManager(false)} style={styles.backButton}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <AppText style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>
                Add subjects here once, then import them into any class/section.
              </AppText>
              
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="New Subject Name" 
                  value={newGlobalSubject} 
                  onChangeText={setNewGlobalSubject} 
                  placeholderTextColor={C.text3}
                />
                <TouchableOpacity 
                  style={[styles.btnPrimary, { height: 58, width: 80, paddingHorizontal: 0 }]} 
                  onPress={addSubjectToGlobalPool}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <AppText style={[styles.label, { marginBottom: 12 }]} weight="bold">
                Import to Class {selectedClass}-{selectedSection || '?'}
              </AppText>
              
              <ScrollView style={{ maxHeight: 300, borderWidth: 1, borderColor: C.borderSoft, borderRadius: 12 }}>
                {globalSubjects.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <AppText style={{ color: C.text3 }}>No global subjects yet.</AppText>
                  </View>
                ) : (
                  globalSubjects.map(s => (
                    <TouchableOpacity 
                      key={s.pool_id} 
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: 16, 
                        borderBottomWidth: 1, 
                        borderBottomColor: C.borderSoft 
                      }}
                      onPress={() => {
                        if (selectedGlobalSubjects.includes(s.subject_name)) {
                          setSelectedGlobalSubjects(prev => prev.filter(x => x !== s.subject_name));
                        } else {
                          setSelectedGlobalSubjects(prev => [...prev, s.subject_name]);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={{ 
                          width: 20, height: 20, borderRadius: 4, borderWidth: 2, 
                          borderColor: selectedGlobalSubjects.includes(s.subject_name) ? C.primary : C.border,
                          backgroundColor: selectedGlobalSubjects.includes(s.subject_name) ? C.primary : 'transparent',
                          justifyContent: 'center', alignItems: 'center'
                        }}>
                          {selectedGlobalSubjects.includes(s.subject_name) && <Plus size={14} color="#fff" />}
                        </View>
                        <AppText style={{ color: C.text }}>{s.subject_name}</AppText>
                      </View>
                      <TouchableOpacity onPress={() => deleteFromGlobalPool(s.subject_name)} style={{ padding: 4 }}>
                        <Trash2 size={16} color={C.danger} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
            <View style={styles.modalFoot}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => { setShowGlobalPoolManager(false); setSelectedGlobalSubjects([]); }}>
                <AppText style={styles.btnOutlineText} weight="bold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnPrimary, (selectedGlobalSubjects.length === 0 || !selectedClass) && styles.btnDisabled]} 
                disabled={selectedGlobalSubjects.length === 0 || !selectedClass} 
                onPress={importToClass}
              >
                <AppText style={styles.btnPrimaryText} weight="bold">Import ({selectedGlobalSubjects.length})</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Teacher Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={teacherPickerVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.pickerModal]}>
            <View style={styles.modalHead}>
              <AppText style={styles.modalTitle} weight="bold">Select Teacher</AppText>
              <TouchableOpacity onPress={() => setTeacherPickerVisible(false)} style={styles.backButton}>
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
                    <View style={styles.pickerIcon}>
                      <User size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.pickerOptionText} weight="bold">{teacher.teacher_full_name}</AppText>
                      <AppText style={styles.pickerOptionSub}>{teacher.employee_id || teacher.teacher_id}</AppText>
                    </View>
                    <ChevronLeft size={18} color={C.text3} style={{ transform: [{ rotate: '180deg' }] }} />
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
              <View style={styles.cardTitleRow}>
                <BookOpen size={20} color={C.text} />
                <AppText style={styles.modalTitle} weight="bold">Add Subject</AppText>
              </View>
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)} style={styles.backButton}>
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
                <AppText style={styles.btnOutlineText} weight="bold">Assign For ALL</AppText>
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
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
    }),
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navTitle: {
    color: '#fff',
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  page: { flex: 1, backgroundColor: C.bg },
  pageContent: { paddingHorizontal: 16, paddingBottom: 120 },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  title: { fontSize: 28, color: C.text, lineHeight: 36, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: C.text2, marginTop: 6, lineHeight: 22 },

  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 20,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: C.text },

  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    gap: 12
  },

  panel: {
    backgroundColor: C.white,
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: C.borderSoft,
  },
  panelHead: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    backgroundColor: C.white,
  },
  panelTitle: { fontSize: 20, color: C.text, letterSpacing: -0.3 },
  panelSub: { fontSize: 14, color: C.text2, marginTop: 4 },
  panelBody: { padding: 20 },

  classGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  classCard: {
    width: '48%',
    borderRadius: 24,
    padding: 20,
    backgroundColor: C.white,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  classCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  className: { fontSize: 18, color: C.text },
  classMeta: { fontSize: 13, color: C.text3, marginTop: 8 },

  sectionWrap: { marginTop: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.borderSoft },
  sectionTitleSmall: {
    fontSize: 16,
    color: C.text,
    marginBottom: 16,
  },
  sectionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionBtn: {
    minWidth: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.borderSoft,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  sectionBtnActive: { borderColor: C.primary, backgroundColor: C.primary },
  sectionBtnText: { color: C.text2, fontSize: 16 },

  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardTitle: { fontSize: 17, color: C.text },
  cardSub: { fontSize: 13, color: C.text2, marginTop: 4 },
  cardBody: { padding: 20 },

  label: { fontSize: 14, color: C.text, marginBottom: 10, marginLeft: 4, opacity: 0.8 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    borderWidth: 1.5,
    borderColor: C.borderSoft,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: C.bgAlt,
    marginBottom: 16
  },
  input: {
    height: 58,
    borderWidth: 1.5,
    borderColor: C.borderSoft,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.bgAlt
  },

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.successSoft,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  currentBadgeText: { fontSize: 13, color: C.success },

  noteBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteText: { fontSize: 13, color: '#92400E', lineHeight: 20 },

  subjectRow: { marginBottom: 20 },
  subjectName: { fontSize: 15, color: C.text, marginBottom: 10, marginLeft: 4 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  emptyTitle: { color: C.text, fontSize: 20 },

  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, letterSpacing: 0.2 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.borderSoft,
    backgroundColor: C.white
  },
  btnOutlineText: { color: C.text, fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    width: '100%',
    backgroundColor: C.white,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  modalTitle: { fontSize: 20, color: C.text, flex: 1 },
  modalBody: { padding: 24 },
  modalFoot: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
  },

  pickerModal: { maxHeight: '85%' },
  pickerScrollView: { flex: 1 },
  pickerOption: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pickerOptionText: { fontSize: 16, color: C.text },
  pickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionSub: { fontSize: 13, color: C.text3, marginTop: 2 },
  emptyPickerList: { padding: 60, justifyContent: 'center', alignItems: 'center' },
  emptyPickerText: { fontSize: 16, color: C.text2 },
});
