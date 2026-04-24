import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/ionicons';
import API from '../../services/api';
import { colors } from '../../constants/theme';

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  primary: colors.primary,
  primarySoft: colors.primary + '15',
  success: colors.success,
  successSoft: colors.successSoft,
  danger: colors.error,
  dangerSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
  bg: colors.bg,
  white: colors.surface,
  text: colors.textPrimary,
  text2: colors.textPrimary + 'CC',
  text3: colors.textMuted,
  border: colors.border,
  borderSoft: colors.border + '60',
  sidebar: colors.surface,
};

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
  }, []);

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
      const [classesRes, teachersRes] = await Promise.all([
        API.get('/hm/classes', { headers }),
        API.get('/hm/teachers', { headers }),
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
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Teacher Assignments</Text>
          <Text style={styles.subtitle}>Assign class teachers and subject teachers</Text>
        </View>
        <TouchableOpacity style={styles.btnOutline} onPress={loadMeta} disabled={isBusy}>
          <Icon name="refresh-outline" size={16} color={C.text2} />
          <Text style={styles.btnOutlineText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Info Bar */}
      {schoolCode || branchId ? (
        <View style={styles.infoBar}>
          {schoolCode ? (
            <View style={styles.infoItem}>
              <Icon name="school-outline" size={14} color={C.primary} />
              <Text style={styles.infoText}>School: <Text style={styles.infoBold}>{schoolCode}</Text></Text>
            </View>
          ) : null}
          {branchId ? (
            <View style={styles.infoItem}>
              <Icon name="git-branch-outline" size={14} color={C.primary} />
              <Text style={styles.infoText}>Branch: <Text style={styles.infoBold}>{branchId}</Text></Text>
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
          <Text style={{ color: message.type === 'success' ? C.success : message.type === 'error' ? C.danger : C.warning, fontWeight: '700' }}>
            {message.text}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Class Selection */}
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Select Class</Text>
              <Text style={styles.panelSub}>Tap a class then choose a section</Text>
            </View>
            <View style={styles.panelBody}>
              {classNames.length === 0 ? (
                <Text style={{ color: C.text3, textAlign: 'center', padding: 20 }}>No classes found</Text>
              ) : (
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
                      <Text style={[styles.className, selectedClass === cls && { color: C.primary }]}>
                        Class {cls}
                      </Text>
                      <Text style={styles.classMeta}>
                        {(classesMap[cls] || []).length} section(s)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Section Selection */}
              {selectedClass && classesMap[selectedClass]?.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>SECTIONS</Text>
                  <View style={styles.sectionList}>
                    {(classesMap[selectedClass] || []).map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.sectionBtn, selectedSection === sec && styles.sectionBtnActive]}
                        onPress={() => setSelectedSection(sec)}
                      >
                        <Text style={[styles.sectionBtnText, selectedSection === sec && { color: C.white }]}>
                          {sec}
                        </Text>
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
                <Text style={styles.panelTitle}>Class {selectedClass} — Section {selectedSection}</Text>
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
                          <Text style={styles.cardTitle}>
                            <Icon name="person-outline" size={14} /> Class Teacher
                          </Text>
                          <Text style={styles.cardSub}>Assign the class teacher for this section</Text>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.label}>Select Teacher</Text>
                        <TouchableOpacity
                          style={styles.picker}
                          onPress={() => openTeacherPicker('class')}
                          disabled={isBusy}
                        >
                          <Text style={{ color: classTeacherId ? C.text : C.text3, fontSize: 14 }}>
                            {classTeacherId ? getTeacherName(classTeacherId) : 'Select Teacher'}
                          </Text>
                          <Icon name="chevron-down-outline" size={16} color={C.text3} />
                        </TouchableOpacity>

                        {currentClassTeacher ? (
                          <View style={styles.currentBadge}>
                            <Icon name="checkmark-circle-outline" size={14} color={C.success} />
                            <Text style={styles.currentBadgeText}>
                              Current: {teacherLabel(currentClassTeacher)}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.noteBox}>
                          <Text style={styles.noteText}>
                            If the selected teacher is already a class teacher for another section, you will get a warning.
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.btnPrimary, isBusy && styles.btnDisabled]}
                          onPress={() => saveClassTeacher('normal')}
                          disabled={isBusy}
                        >
                          {classTeacherSaving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.btnPrimaryText}>Save Class Teacher</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Subject Teachers Card */}
                    <View style={[styles.card, { marginTop: 12 }]}>
                      <View style={styles.cardHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>
                            <Icon name="book-outline" size={14} /> Subject Teachers
                          </Text>
                          <Text style={styles.cardSub}>Assign teachers to each subject</Text>
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
                          <Icon name="add-outline" size={16} color={C.text2} />
                          <Text style={styles.btnOutlineText}>Add Subject</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.cardBody}>
                        {subjects.length === 0 ? (
                          <Text style={{ color: C.text2, fontSize: 14 }}>
                            No subjects found. Use "Add Subject" to add subjects first.
                          </Text>
                        ) : (
                          <>
                            {subjects.map(subject => (
                              <View key={subject} style={styles.subjectRow}>
                                <Text style={styles.subjectName}>{subject}</Text>
                                <TouchableOpacity
                                  style={styles.picker}
                                  onPress={() => openTeacherPicker(subject)}
                                  disabled={isBusy}
                                >
                                  <Text style={{ color: subjectTeacherMap[subject] ? C.text : C.text3, fontSize: 13, flex: 1 }}>
                                    {subjectTeacherMap[subject] ? getTeacherName(subjectTeacherMap[subject]) : 'Select Teacher'}
                                  </Text>
                                  <Icon name="chevron-down-outline" size={16} color={C.text3} />
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
                                : <Text style={styles.btnPrimaryText}>Save Subject Teachers</Text>}
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
              <Icon name="school-outline" size={40} color={C.text3} />
              <Text style={styles.emptyTitle}>Select a class and section</Text>
              <Text style={{ color: C.text3, fontSize: 13 }}>to manage teacher assignments</Text>
            </View>
          )}
        </>
      )}

      {/* ── Teacher Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={teacherPickerVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: '80%' }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Select Teacher</Text>
              <TouchableOpacity onPress={() => setTeacherPickerVisible(false)}>
                <Icon name="close-outline" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {teachers.map(teacher => (
                <TouchableOpacity
                  key={String(teacher.teacher_id)}
                  style={styles.pickerOption}
                  onPress={() => onPickTeacher(teacher)}
                >
                  <Text style={styles.pickerOptionText}>{teacherLabel(teacher)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Subject Modal ─────────────────────────────────────────────── */}
      <Modal visible={subjectModalOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                <Icon name="book-outline" size={16} /> Add Subject
              </Text>
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)}>
                <Icon name="close-outline" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Subject Name</Text>
              <TextInput
                style={styles.input}
                value={subjectModalNewSubject}
                onChangeText={setSubjectModalNewSubject}
                placeholder="Enter subject name"
                placeholderTextColor={C.text3}
              />
              {subjectModalError ? (
                <Text style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{subjectModalError}</Text>
              ) : null}
            </View>
            <View style={styles.modalFoot}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setSubjectModalOpen(false)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, !subjectModalNewSubject.trim() && styles.btnDisabled]}
                onPress={handleCreateSubject}
                disabled={!subjectModalNewSubject.trim() || subjectTeacherSaving}
              >
                <Text style={styles.btnPrimaryText}>Add Subject</Text>
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
              <Icon name="warning-outline" size={20} color={C.warning} />
              <Text style={[styles.modalTitle, { marginLeft: 6 }]}>Class Teacher Already Assigned</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={{ color: C.text2, lineHeight: 22 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{overrideConflict?.teacher_name}</Text> is already
                assigned as class teacher for{' '}
                <Text style={{ fontWeight: '700', color: C.text }}>
                  Class {overrideConflict?.current_class_grade} — Section {overrideConflict?.current_section}
                </Text>.{'\n\n'}
                Choose how to continue for{' '}
                <Text style={{ fontWeight: '700', color: C.text }}>
                  Class {selectedClass} — Section {selectedSection}
                </Text>.
              </Text>
            </View>
            <View style={styles.modalFoot}>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => { setOverrideOpen(false); setOverrideConflict(null); }}
              >
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => saveClassTeacher('keep_both')}
                disabled={classTeacherSaving}
              >
                <Text style={styles.btnOutlineText}>Assign Both</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => saveClassTeacher('move')}
                disabled={classTeacherSaving}
              >
                <Text style={styles.btnPrimaryText}>Move</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 4 },

  infoBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, color: C.text2 },
  infoBold: { fontWeight: '700', color: C.text },

  messageBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },

  panel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  panelHead: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: C.sidebar },
  panelTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  panelSub: { fontSize: 12, color: C.text2, marginTop: 2 },
  panelBody: { padding: 12 },

  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  classCard: { width: '47%', borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 12, backgroundColor: C.white },
  classCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  className: { fontSize: 15, fontWeight: '800', color: C.text },
  classMeta: { fontSize: 11, color: C.text2, marginTop: 4 },

  sectionWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.text2, marginBottom: 8, letterSpacing: 0.5 },
  sectionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionBtn: { minWidth: 46, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  sectionBtnActive: { borderColor: C.primary, backgroundColor: C.primary },
  sectionBtnText: { fontWeight: '800', color: C.text2 },

  card: { borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: C.sidebar },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  cardSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  cardBody: { padding: 12 },

  label: { fontSize: 12, fontWeight: '800', color: C.text2, marginBottom: 6 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.white, marginBottom: 8 },
  input: { height: 44, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: C.text, backgroundColor: C.white },

  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.successSoft, alignSelf: 'flex-start', marginBottom: 8 },
  currentBadgeText: { fontSize: 12, fontWeight: '700', color: C.success },

  noteBox: { backgroundColor: C.warningSoft, borderRadius: 12, padding: 10, marginBottom: 12 },
  noteText: { fontSize: 12, fontWeight: '700', color: C.warning },

  subjectRow: { marginBottom: 12 },
  subjectName: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 6 },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontWeight: '800', color: C.text, fontSize: 15 },

  btnPrimary: { backgroundColor: C.primary, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, flexDirection: 'row', gap: 6 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  btnOutlineText: { color: C.text2, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '100%', backgroundColor: C.white, borderRadius: 18, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: C.sidebar },
  modalTitle: { fontSize: 15, fontWeight: '800', color: C.text, flex: 1 },
  modalBody: { padding: 16 },
  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: C.borderSoft, flexWrap: 'wrap' },

  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  pickerOptionText: { fontSize: 14, color: C.text },
});