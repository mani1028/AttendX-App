import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
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
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import API from '../../services/api';
import * as principalService from '../../services/principalService';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import AppButton from '../../components/common/AppButton';
import { teacherAssignmentsStyles as styles } from '../../components/principal/teacherAssignments/teacherAssignmentsStyles';
import TeacherAssignmentsPanel from '../../components/principal/teacherAssignments/TeacherAssignmentsPanel';
import TeacherAssignmentsModals from '../../components/principal/teacherAssignments/TeacherAssignmentsModals';





// ─── Colors ──────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { getSchoolCode, getBranchId, teacherLabel } from '../../components/principal/teacherAssignments/helpers';

export default function PrincipalTeacherAssignmentsScreen() {
  const navigation = useNavigation();
  const tabBarScrollPadding = useTabBarScrollPadding();
  const { setTabBarVisible } = useAuth();

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
  const [teacherSearchText, setTeacherSearchText] = useState('');

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

  const filteredTeachers = useMemo(() => {
    if (!teacherSearchText.trim()) {return teachers;}
    const query = teacherSearchText.toLowerCase();
    return teachers.filter(t => {
      const name = (t.staff_full_name || t.teacher_full_name || t.name || '').toLowerCase();
      const id = String(t.employee_id || t.teacher_id || t.id || '').toLowerCase();
      return name.includes(query) || id.includes(query);
    });
  }, [teachers, teacherSearchText]);

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

  const handleScroll = useScrollTabBar();

  useEffect(() => {
    if (schoolCode && branchId) {loadMeta();}
  }, [schoolCode, branchId]);

  useEffect(() => {
    if (selectedClass && selectedSection) {loadDetails(selectedClass, selectedSection);}
  }, [selectedClass, selectedSection]);

  // ── API calls ───────────────────────────────────────────────────────────────
  const loadMeta = async () => {
    setLoading(true);
    clearMessage();
    try {
      const [classesRes, staffRes, poolRes] = await Promise.all([
        API.get('/principal/classes', { headers }),
        principalService.getPrincipalTeachers(headers),
        API.get('/principal/subjects/pool', { headers }).catch(() => ({ data: { ok: false, subjects: [] } })),
      ]);

      if (poolRes.data?.ok) {
        setGlobalSubjects(poolRes.data.subjects || []);
      }

      const classItems = classesRes.data?.items || [];
      const grouped: Record<string, string[]> = {};

      classItems.forEach((item: any) => {
        const cg = String(item.class_grade || '').trim();
        const sec = String(item.section || '').trim().toUpperCase();
        if (!cg || !sec) {return;}
        if (!grouped[cg]) {grouped[cg] = [];}
        if (!grouped[cg].includes(sec)) {grouped[cg].push(sec);}
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
    if (!cg || !sec) {return;}
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
      setSubjects(subjectItems.map((item: any) => item.subject_name).filter(Boolean));
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
    if (!sname) {return;}
    try {
      await API.post('/principal/subjects/pool/add', { subject_name: sname }, { headers });
      const poolRes = await API.get('/principal/subjects/pool', { headers });
      if (poolRes.data?.ok) {setGlobalSubjects(poolRes.data.subjects);}
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
          if (poolRes.data?.ok) {setGlobalSubjects(poolRes.data.subjects);}
        } catch (err: any) {
          Alert.alert('Error', 'Failed to delete subject: ' + (err.response?.data?.detail || err.message));
        }
      }},
    ]);
  };

  const importToClass = async () => {
    if (selectedGlobalSubjects.length === 0) {return;}
    setSubjectTeacherSaving(true);
    try {
      await API.post('/principal/subjects/import-to-class', {
        class_grade: selectedClass,
        section: selectedSection,
        subject_names: selectedGlobalSubjects,
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
    setTeacherSearchText('');
    setTeacherPickerVisible(true);
  };

  const onPickTeacher = (teacher: any) => {
    const id = teacher.employee_id || String(teacher.teacher_id);
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
    const t = teachers.find(t => String(t.teacher_id) === id || String(t.employee_id) === id);
    return t ? teacherLabel(t) : 'Select Teacher';
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.pageContent, innerPageLayoutStyles.scrollPageContent, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          title="Staff Assignment"
          onBackPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PrincipalDashboard' as never)}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightIcon={<BookOpen size={20} color={Theme.colors.card} />}
          onRightIconPress={() => setShowGlobalPoolManager(true)}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        <View style={styles.header}>
          <AppText style={styles.title} weight="bold">Staff Assignment Management</AppText>
          <AppText style={styles.subtitle}>Assign class staff and subject staff for each class-section</AppText>
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
          <TouchableOpacity accessibilityRole="button" onPress={clearMessage}>
            <X size={18} color={message.type === 'success' ? C.success : message.type === 'error' ? C.danger : C.warning} />
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ScreenSkeleton variant="list" />
      ) : (
        <>
          <TeacherAssignmentsPanel
            classNames={classNames}
            classesMap={classesMap}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            detailsLoading={detailsLoading}
            classTeacherId={classTeacherId}
            openTeacherPicker={openTeacherPicker}
            isBusy={isBusy}
            getTeacherName={getTeacherName}
            currentClassTeacher={currentClassTeacher}
            saveClassTeacher={saveClassTeacher}
            classTeacherSaving={classTeacherSaving}
            setSubjectModalMode={setSubjectModalMode}
            setSubjectModalNewSubject={setSubjectModalNewSubject}
            setSubjectModalError={setSubjectModalError}
            setSubjectModalOpen={setSubjectModalOpen}
            subjects={subjects}
            subjectTeacherMap={subjectTeacherMap}
            saveSubjectTeachers={saveSubjectTeachers}
            subjectTeacherSaving={subjectTeacherSaving}
          />
        </>
      )}
        </View>
      </ScrollView>
      <TeacherAssignmentsModals
        showGlobalPoolManager={showGlobalPoolManager}
        setShowGlobalPoolManager={setShowGlobalPoolManager}
        newGlobalSubject={newGlobalSubject}
        setNewGlobalSubject={setNewGlobalSubject}
        globalSubjects={globalSubjects}
        addGlobalSubject={addSubjectToGlobalPool}
        deleteGlobalSubject={deleteFromGlobalPool}
        teacherPickerVisible={teacherPickerVisible}
        setTeacherPickerVisible={setTeacherPickerVisible}
        teachers={teachers}
        onPickTeacher={onPickTeacher}
        subjectModalOpen={subjectModalOpen}
        setSubjectModalOpen={setSubjectModalOpen}
        subjectModalNewSubject={subjectModalNewSubject}
        setSubjectModalNewSubject={setSubjectModalNewSubject}
        subjectModalError={subjectModalError}
        subjectTeacherSaving={subjectTeacherSaving}
        addSubjectToClass={handleCreateSubject}
        teacherSearchText={teacherSearchText}
        setTeacherSearchText={setTeacherSearchText}
        filteredTeachers={filteredTeachers}
        handleCreateSubject={handleCreateSubject}
        overrideOpen={overrideOpen}
        setOverrideOpen={setOverrideOpen}
        overrideConflict={overrideConflict}
        setOverrideConflict={setOverrideConflict}
        classTeacherSaving={classTeacherSaving}
        saveClassTeacher={saveClassTeacher}
        selectedClass={selectedClass}
        selectedSection={selectedSection}
        selectedGlobalSubjects={selectedGlobalSubjects}
        setSelectedGlobalSubjects={setSelectedGlobalSubjects}
        addSubjectToGlobalPool={addSubjectToGlobalPool}
        deleteFromGlobalPool={deleteFromGlobalPool}
        importToClass={importToClass}
      />
    </View>
  );
}

