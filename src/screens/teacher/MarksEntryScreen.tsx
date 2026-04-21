import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Switch,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

// Types
interface ClassItem {
  class_id: string;
  class_name: string;
}

interface SectionItem {
  section_id: string;
  section_name: string;
}

interface ExamItem {
  exam_id: string;
  exam_name: string;
  academic_year: string;
}

interface SubjectItem {
  subject_id: string;
  subject_name: string;
  max_marks?: number;
}

interface StudentMark {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  marks_obtained: string;
  isAbsent: boolean;
  grade?: string;
  status?: string;
  mark_id?: string | null;
  hasExistingMarks: boolean;
}

interface Assignment {
  class_id: number;
  class_name: string;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) ||
         (await AsyncStorage.getItem('user_id')) ||
         (await AsyncStorage.getItem('userId')) ||
         (await AsyncStorage.getItem('employee_id')) ||
         (await AsyncStorage.getItem('employeeId')) || '';
};

// Grade Badge Component
const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const isFail = grade === 'F';
  return (
    <View style={[styles.gradeBadge, isFail ? styles.gradeBadgeFail : styles.gradeBadgePass]}>
      <Text style={[styles.gradeText, isFail ? styles.gradeTextFail : styles.gradeTextPass]}>
        {grade || '-'}
      </Text>
    </View>
  );
};

// Roll Tag Component
const RollTag: React.FC<{ roll: string }> = ({ roll }) => (
  <View style={styles.rollTag}>
    <Text style={styles.rollTagText}>{roll}</Text>
  </View>
);

// Student Row Component
const StudentRow: React.FC<{
  student: StudentMark;
  maxMarks: number;
  onAbsentToggle: (studentId: string, isAbsent: boolean) => void;
  onMarksChange: (studentId: string, value: string) => void;
}> = ({ student, maxMarks, onAbsentToggle, onMarksChange }) => {
  const isSaved = student.hasExistingMarks && student.marks_obtained !== '';
  
  return (
    <View style={[styles.studentRow, student.isAbsent && styles.studentRowAbsent, isSaved && styles.studentRowSaved]}>
      <View style={styles.studentCol}>
        <RollTag roll={student.roll_number} />
      </View>
      <View style={styles.studentCol}>
        <Text style={styles.studentId}>{student.student_id}</Text>
      </View>
      <View style={styles.studentColName}>
        <Text style={styles.studentName}>{student.student_full_name}</Text>
      </View>
      <View style={styles.studentCol}>
        <View style={[styles.statusBadge, isSaved ? styles.statusBadgeSaved : styles.statusBadgeDraft]}>
          <Text style={[styles.statusText, isSaved ? styles.statusTextSaved : styles.statusTextDraft]}>
            {isSaved ? '✓ Saved' : '⚠ Draft'}
          </Text>
        </View>
      </View>
      <View style={styles.studentCol}>
        <View style={styles.attendanceToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !student.isAbsent && styles.toggleBtnActive]}
            onPress={() => onAbsentToggle(student.student_id, false)}
          >
            <Text style={[styles.toggleText, !student.isAbsent && styles.toggleTextActive]}>✓ Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, student.isAbsent && styles.toggleBtnAbsentActive]}
            onPress={() => onAbsentToggle(student.student_id, true)}
          >
            <Text style={[styles.toggleText, student.isAbsent && styles.toggleTextAbsentActive]}>✗ Absent</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.studentCol}>
        <TextInput
          style={[
            styles.marksInput,
            student.isAbsent && styles.marksInputDisabled,
            isSaved && styles.marksInputSaved,
          ]}
          placeholder={maxMarks ? `0-${maxMarks}` : 'Enter marks'}
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={student.isAbsent ? '0' : student.marks_obtained}
          onChangeText={(value) => onMarksChange(student.student_id, value)}
          editable={!student.isAbsent}
        />
      </View>
      <View style={styles.studentCol}>
        <GradeBadge grade={student.grade || ''} />
      </View>
    </View>
  );
};

// Filter Modal Component
const FilterModal: React.FC<{
  visible: boolean;
  classes: ClassItem[];
  sections: SectionItem[];
  exams: ExamItem[];
  subjects: SubjectItem[];
  selectedClass: string;
  selectedSection: string;
  selectedExam: string;
  selectedSubject: string;
  loadingClasses: boolean;
  loadingSections: boolean;
  loadingExams: boolean;
  loadingSubjects: boolean;
  onSelectClass: (classId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onSelectExam: (examId: string) => void;
  onSelectSubject: (subjectId: string) => void;
  onApply: () => void;
  onClose: () => void;
}> = ({
  visible,
  classes,
  sections,
  exams,
  subjects,
  selectedClass,
  selectedSection,
  selectedExam,
  selectedSubject,
  loadingClasses,
  loadingSections,
  loadingExams,
  loadingSubjects,
  onSelectClass,
  onSelectSection,
  onSelectExam,
  onSelectSubject,
  onApply,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Class Filter */}
          <Text style={styles.modalLabel}>Class</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {loadingClasses ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                classes.map(cls => (
                  <TouchableOpacity
                    key={cls.class_id}
                    style={[styles.chip, selectedClass === cls.class_id && styles.chipActive]}
                    onPress={() => onSelectClass(cls.class_id)}
                  >
                    <Text style={[styles.chipText, selectedClass === cls.class_id && styles.chipTextActive]}>
                      {cls.class_name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

          {/* Section Filter */}
          {selectedClass && (
            <>
              <Text style={[styles.modalLabel, { marginTop: 16 }]}>Section</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {loadingSections ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    sections.map(sec => (
                      <TouchableOpacity
                        key={sec.section_id}
                        style={[styles.chip, selectedSection === sec.section_id && styles.chipActive]}
                        onPress={() => onSelectSection(sec.section_id)}
                      >
                        <Text style={[styles.chipText, selectedSection === sec.section_id && styles.chipTextActive]}>
                          {sec.section_name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </ScrollView>
            </>
          )}

          {/* Exam Filter */}
          <Text style={[styles.modalLabel, { marginTop: 16 }]}>Exam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {loadingExams ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                exams.map(exam => (
                  <TouchableOpacity
                    key={exam.exam_id}
                    style={[styles.chip, selectedExam === exam.exam_id && styles.chipActive]}
                    onPress={() => onSelectExam(exam.exam_id)}
                  >
                    <Text style={[styles.chipText, selectedExam === exam.exam_id && styles.chipTextActive]}>
                      {exam.exam_name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

          {/* Subject Filter */}
          {selectedClass && (
            <>
              <Text style={[styles.modalLabel, { marginTop: 16 }]}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {loadingSubjects ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    subjects.map(subj => (
                      <TouchableOpacity
                        key={subj.subject_id}
                        style={[styles.chip, selectedSubject === subj.subject_id && styles.chipActive]}
                        onPress={() => onSelectSubject(subj.subject_id)}
                      >
                        <Text style={[styles.chipText, selectedSubject === subj.subject_id && styles.chipTextActive]}>
                          {subj.subject_name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <AppButton title="Apply Filters" onPress={onApply} />
        </View>
      </View>
    </View>
  </Modal>
);

// Exam Config Modal
const ExamConfigModal: React.FC<{
  visible: boolean;
  maxMarks: string;
  passMarks: string;
  onMaxMarksChange: (value: string) => void;
  onPassMarksChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}> = ({ visible, maxMarks, passMarks, onMaxMarksChange, onPassMarksChange, onSave, onClose, saving }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.configModalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Exam Configuration</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.configModalBody}>
          <Text style={styles.modalLabel}>Total Marks</Text>
          <TextInput
            style={styles.configInput}
            placeholder="Enter total marks"
            keyboardType="numeric"
            value={maxMarks}
            onChangeText={onMaxMarksChange}
          />

          <Text style={[styles.modalLabel, { marginTop: 16 }]}>Pass Marks</Text>
          <TextInput
            style={styles.configInput}
            placeholder="Enter pass marks"
            keyboardType="numeric"
            value={passMarks}
            onChangeText={onPassMarksChange}
          />
        </View>

        <View style={styles.modalFooter}>
          <AppButton title="Cancel" onPress={onClose} type="secondary" />
          <AppButton title={saving ? 'Saving...' : 'Save Config'} onPress={onSave} disabled={saving} />
        </View>
      </View>
    </View>
  </Modal>
);

export default function MarksEntryScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [resolvedTeacherId, setResolvedTeacherId] = useState<string>('');

  // Filters
  const [classId, setClassId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [examId, setExamId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');

  // Exam config
  const [inputMaxMarks, setInputMaxMarks] = useState<string>('');
  const [inputPassMarks, setInputPassMarks] = useState<string>('');
  const [examSubjectId, setExamSubjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [savingExamConfig, setSavingExamConfig] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Data lists
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentMark[]>([]);

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [loadingSections, setLoadingSections] = useState<boolean>(false);
  const [loadingExams, setLoadingExams] = useState<boolean>(false);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [savingMarks, setSavingMarks] = useState<boolean>(false);

  // UI states
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Auto save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const studentsRef = useRef(students);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const tid = await getTeacherId();
      setSchoolCode(code);
      setTeacherId(tid);
    };
    load();
  }, []);

  // Load teacher assignments and exams
  useEffect(() => {
    const fetchTeacherAssignments = async () => {
      if (!schoolCode || !teacherId) return;
      
      setLoadingClasses(true);
      try {
        const res = await API.get('/teacher/marks/teacher-context', {
          params: { teacher_id: teacherId },
          headers: { 'x-school-code': schoolCode },
        });
        
        const assignments = res.data?.assignments || [];
        const teacherData = res.data?.teacher_data || null;
        const canonicalId = String(teacherData?.teacher_id || teacherId).trim();
        const deptRaw = String(teacherData?.department_subject || '').trim();
        const deptSubjects = Array.from(new Set(deptRaw.split(/[,/|]+/).map(s => s.trim()).filter(Boolean)));

        setTeacherAssignments(assignments);
        setTeacherSubjects(deptSubjects);
        setResolvedTeacherId(canonicalId);

        const uniqueClasses = Array.from(
          new Map(
            assignments
              .filter(a => a.class_id && a.class_name)
              .map(a => [String(a.class_name).trim().toLowerCase(), { class_id: String(a.class_id), class_name: a.class_name }])
          ).values()
        );
        setClasses(uniqueClasses);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load class assignments');
      } finally {
        setLoadingClasses(false);
      }
    };

    const fetchAllExams = async () => {
      setLoadingExams(true);
      try {
        const res = await API.get('/teacher/marks/exams', { headers: { 'x-school-code': schoolCode } });
        const uniqueExams = Array.from(
          new Map((res.data?.exams || []).map((e: any) => [String(e.exam_id), e])).values()
        );
        setExams(uniqueExams);
      } catch {
        setExams([]);
      } finally {
        setLoadingExams(false);
      }
    };

    if (schoolCode && teacherId) {
      fetchTeacherAssignments();
      fetchAllExams();
    }
  }, [schoolCode, teacherId]);

  // Update sections when class changes
  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId('');
      return;
    }
    setLoadingSections(true);
    const sectionsData = teacherAssignments
      .filter(a => String(a.class_id) === String(classId))
      .map(a => ({ section_id: String(a.section_id), section_name: a.section_name }))
      .filter(a => a.section_id && a.section_name);
    const uniqueSections = Array.from(new Map(sectionsData.map(x => [String(x.section_id), x])).values());
    setSections(uniqueSections);
    setSectionId('');
    setLoadingSections(false);
  }, [classId, teacherAssignments]);

  // Update subjects when class/section changes
  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId('');
      return;
    }
    setLoadingSubjects(true);
    const raw = teacherAssignments
      .filter(a => String(a.class_id) === String(classId))
      .filter(a => !sectionId || String(a.section_id) === String(sectionId))
      .map(a => ({ subject_id: String(a.subject_id), subject_name: a.subject_name }))
      .filter(a => a.subject_id && a.subject_name);
    
    const unique = Array.from(new Map(raw.map(x => [String(x.subject_id), x])).values());
    const allowedSet = new Set(teacherSubjects.map(s => s.toLowerCase()));
    setSubjects(allowedSet.size ? unique.filter(s => allowedSet.has(s.subject_name.toLowerCase())) : unique);
    setSubjectId('');
    setLoadingSubjects(false);
  }, [classId, sectionId, teacherAssignments, teacherSubjects]);

  // Fetch exam subject config
  useEffect(() => {
    const fetchExamConfig = async () => {
      if (!examId || !subjectId) {
        setInputMaxMarks('');
        setInputPassMarks('');
        setExamSubjectId(null);
        setIsEditMode(false);
        return;
      }
      try {
        const res = await API.get(`/teacher/marks/exam-subjects/${examId}`, { headers: { 'x-school-code': schoolCode } });
        const found = (res.data?.exam_subjects || []).find((s: any) => s.subject_id === parseInt(subjectId));
        if (found) {
          setInputMaxMarks(found.max_marks?.toString() || '');
          setInputPassMarks(found.pass_marks?.toString() || '');
          setExamSubjectId(found.id || true);
          setIsEditMode(false);
        } else {
          setInputMaxMarks('');
          setInputPassMarks('');
          setExamSubjectId(null);
          setIsEditMode(false);
        }
      } catch {
        setInputMaxMarks('');
        setInputPassMarks('');
        setExamSubjectId(null);
        setIsEditMode(false);
      }
    };
    fetchExamConfig();
  }, [examId, subjectId, schoolCode]);

  const loadStudents = async (isRefresh = false) => {
    setMsg('');
    setError('');
    
    if (!classId || !sectionId || !examId || !subjectId) {
      Alert.alert('Error', 'Please select Class, Section, Exam, and Subject');
      return;
    }
    
    if (!examSubjectId) {
      Alert.alert('Error', 'Please save the exam configuration first');
      setShowConfigModal(true);
      return;
    }

    setLoadingStudents(true);
    try {
      const res = await API.get(
        `/teacher/marks/students/${classId}/${sectionId}/${subjectId}`,
        { params: { teacher_id: resolvedTeacherId }, headers: { 'x-school-code': schoolCode } }
      );

      let rows: StudentMark[] = (res.data?.students || []).map((s: any) => ({
        ...s,
        isAbsent: false,
        marks_obtained: s.marks_obtained === null || s.marks_obtained === undefined ? '' : String(s.marks_obtained),
        hasExistingMarks: false,
        grade: '',
        status: '',
        mark_id: null,
      }));

      try {
        const marksRes = await API.get(
          `/teacher/marks/existing/${examId}/${subjectId}/${classId}/${sectionId}`,
          { headers: { 'x-school-code': schoolCode } }
        );
        const marksMap: Record<string, any> = {};
        (marksRes.data?.marks || []).forEach((m: any) => { marksMap[m.student_id] = m; });

        rows = rows.map((s) => ({
          ...s,
          isAbsent: marksMap[s.student_id] ? Boolean(marksMap[s.student_id]?.is_absent) : false,
          marks_obtained: marksMap[s.student_id]?.marks_obtained !== undefined && marksMap[s.student_id]?.marks_obtained !== null
            ? String(marksMap[s.student_id]?.marks_obtained)
            : '',
          mark_id: marksMap[s.student_id]?.mark_id || null,
          grade: marksMap[s.student_id]?.grade || '',
          status: marksMap[s.student_id]?.status || '',
          hasExistingMarks: !!marksMap[s.student_id],
        }));
      } catch (e) {
        console.warn('Failed to fetch existing marks');
      }

      setStudents(rows);
      if (rows.length === 0) setMsg('No students found for this selection');
      if (isRefresh) {
        Alert.alert('Refreshed', `Student data refreshed. ${rows.length} students loaded.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAbsentToggle = (studentId: string, isAbsent: boolean) => {
    setStudents(prev =>
      prev.map(s =>
        s.student_id === studentId
          ? { ...s, isAbsent, marks_obtained: isAbsent ? '0' : '' }
          : s
      )
    );
    
    if (autoSave) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => triggerAutoSave(), 1500);
    }
  };

  const handleMarksChange = (studentId: string, value: string) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.student_id !== studentId) return s;
        if (s.isAbsent) return s;
        if (inputMaxMarks && value !== '') {
          const num = parseFloat(value);
          if (num < 0 || num > parseFloat(inputMaxMarks)) return s;
        }
        return { ...s, marks_obtained: value };
      })
    );
    
    if (autoSave) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => triggerAutoSave(), 2000);
    }
  };

  const saveMarks = async (silent = false) => {
    if (!classId || !sectionId || !examId || !subjectId) {
      if (!silent) Alert.alert('Error', 'Please select filters before saving marks');
      return false;
    }
    if (!examSubjectId) {
      if (!silent) Alert.alert('Error', 'Please save the exam configuration first');
      return false;
    }

    const entries = students.filter(s => s.marks_obtained !== '' && s.marks_obtained !== null);
    if (entries.length === 0) {
      if (!silent) Alert.alert('Error', 'No marks entered to save');
      return false;
    }

    setSavingMarks(true);
    try {
      const promises = entries.map(student => {
        const formData = new FormData();
        formData.append('student_id', student.student_id);
        formData.append('exam_id', Number(examId));
        formData.append('subject_id', Number(subjectId));
        formData.append('marks_obtained', student.isAbsent ? 0 : Number(student.marks_obtained));
        formData.append('is_absent', student.isAbsent ? 'true' : 'false');
        formData.append('teacher_id', resolvedTeacherId);
        return API.post('/teacher/marks/enter', formData, { headers: { 'x-school-code': schoolCode } });
      });

      await Promise.all(promises);

      setStudents(prev =>
        prev.map(s =>
          entries.find(e => e.student_id === s.student_id)
            ? { ...s, hasExistingMarks: true }
            : s
        )
      );

      if (!silent) {
        Alert.alert('Success', `${entries.length} student marks saved successfully.`);
      }
      return true;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || 'Failed to save marks';
      if (!silent) Alert.alert('Error', errorMsg);
      return false;
    } finally {
      setSavingMarks(false);
    }
  };

  const triggerAutoSave = useCallback(() => {
    saveMarks(true);
  }, [classId, sectionId, examId, subjectId, examSubjectId, resolvedTeacherId, schoolCode, studentsRef]);

  const saveExamConfig = async () => {
    if (!examId || !subjectId) {
      Alert.alert('Error', 'Please select Exam and Subject first');
      return;
    }
    if (!inputMaxMarks || !inputPassMarks) {
      Alert.alert('Error', 'Please enter Total Marks and Pass Marks');
      return;
    }

    setSavingExamConfig(true);
    try {
      const formData = new FormData();
      formData.append('exam_id', Number(examId));
      formData.append('subject_id', Number(subjectId));
      formData.append('max_marks', Number(inputMaxMarks));
      formData.append('pass_marks', Number(inputPassMarks));
      const res = await API.post('/teacher/marks/exam-subject-config', formData, { headers: { 'x-school-code': schoolCode } });
      setExamSubjectId(res.data?.exam_subject_id);
      setIsEditMode(false);
      setShowConfigModal(false);
      Alert.alert('Success', 'Exam configuration saved successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save exam config');
    } finally {
      setSavingExamConfig(false);
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) return;

    // For mobile, we'll show share options
    const headers = ['Roll No', 'Student ID', 'Student Name', 'Status', 'Attendance', 'Marks', 'Grade'];
    const rows = students.map(row => [
      row.roll_number,
      row.student_id,
      row.student_full_name,
      row.hasExistingMarks && row.marks_obtained !== '' ? 'Saved' : 'Draft',
      row.isAbsent ? 'Absent' : 'Present',
      row.isAbsent ? 0 : (row.marks_obtained === '' ? '' : row.marks_obtained),
      row.isAbsent ? 'F' : (row.grade || ''),
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Share CSV via email or save
    Alert.alert(
      'Export CSV',
      `${students.length} student records ready to export.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => console.log('Share CSV:', csvContent) },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudents(true);
    setRefreshing(false);
  }, [classId, sectionId, examId, subjectId, examSubjectId]);

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const totalSaved = students.filter(s => s.hasExistingMarks || s.marks_obtained !== '').length;
  const totalPending = students.filter(s => !s.hasExistingMarks && s.marks_obtained === '' && !s.isAbsent).length;
  const totalAbsent = students.filter(s => s.isAbsent).length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>🎓 Marks Entry</Text>
            <Text style={styles.subText}>{students.length} students loaded</Text>
          </View>
        </View>

        {/* Filter Card */}
        <AppCard style={styles.filterCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Marks Filters</Text>
          </View>

          {/* Selected Filters Display */}
          <View style={styles.selectedFilters}>
            {classId && <View style={styles.filterTag}><Text style={styles.filterTagText}>Class: {classes.find(c => c.class_id === classId)?.class_name}</Text></View>}
            {sectionId && <View style={styles.filterTag}><Text style={styles.filterTagText}>Section: {sections.find(s => s.section_id === sectionId)?.section_name}</Text></View>}
            {examId && <View style={styles.filterTag}><Text style={styles.filterTagText}>Exam: {exams.find(e => e.exam_id === examId)?.exam_name}</Text></View>}
            {subjectId && <View style={styles.filterTag}><Text style={styles.filterTagText}>Subject: {subjects.find(s => s.subject_id === subjectId)?.subject_name}</Text></View>}
          </View>

          <AppButton title="🔽 Select Filters" onPress={() => setShowFilterModal(true)} />
        </AppCard>

        {/* Exam Config Card */}
        {examId && subjectId && (
          <AppCard style={styles.configCard}>
            <View style={styles.configHeader}>
              <Text style={styles.configTitle}>Exam Subject Configuration</Text>
              {examSubjectId && !isEditMode && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>✓ Saved</Text>
                </View>
              )}
            </View>

            {(!examSubjectId || isEditMode) ? (
              <View style={styles.configRow}>
                <TextInput
                  style={styles.configInput}
                  placeholder="Total Marks"
                  keyboardType="numeric"
                  value={inputMaxMarks}
                  onChangeText={setInputMaxMarks}
                />
                <TextInput
                  style={styles.configInput}
                  placeholder="Pass Marks"
                  keyboardType="numeric"
                  value={inputPassMarks}
                  onChangeText={setInputPassMarks}
                />
                <AppButton
                  title={savingExamConfig ? 'Saving...' : 'Save Config'}
                  onPress={saveExamConfig}
                  disabled={savingExamConfig}
                />
              </View>
            ) : (
              <View style={styles.configDisplay}>
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>Total Marks</Text>
                  <Text style={styles.configItemValue}>{inputMaxMarks}</Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configItemLabel}>Pass Marks</Text>
                  <Text style={styles.configItemValue}>{inputPassMarks}</Text>
                </View>
                <AppButton title="Edit Config" onPress={() => setIsEditMode(true)} type="secondary" />
              </View>
            )}
          </AppCard>
        )}

        {/* Action Buttons */}
        {students.length > 0 && (
          <View style={styles.actionBar}>
            <View style={styles.statsRow}>
              <View style={[styles.statChip, styles.statSaved]}>
                <Text style={styles.statText}>✓ {totalSaved} Saved</Text>
              </View>
              <View style={[styles.statChip, styles.statPending]}>
                <Text style={styles.statText}>⚠ {totalPending} Pending</Text>
              </View>
              <View style={[styles.statChip, styles.statAbsent]}>
                <Text style={styles.statText}>✗ {totalAbsent} Absent</Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <AppButton title="Save Marks" onPress={() => saveMarks(false)} disabled={savingMarks} />
              <TouchableOpacity
                style={[styles.autoSaveBtn, autoSave && styles.autoSaveBtnActive]}
                onPress={() => setAutoSave(!autoSave)}
              >
                <Text style={[styles.autoSaveText, autoSave && styles.autoSaveTextActive]}>
                  ⏱ Auto Save: {autoSave ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
              <AppButton title="Refresh" onPress={() => loadStudents(true)} type="secondary" />
              {students.length > 0 && (
                <AppButton title="Export CSV" onPress={exportToCSV} type="secondary" />
              )}
            </View>

            {autoSave && (
              <Text style={styles.autoSaveHint}>⚡ Saves automatically 2s after each change</Text>
            )}
          </View>
        )}

        {/* Student List */}
        {loadingStudents ? (
          <Loader />
        ) : students.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Students</Text>
            <Text style={styles.emptyText}>
              Select filters, save exam config, and click Load Students
            </Text>
          </AppCard>
        ) : (
          <AppCard style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colRoll]}>Roll</Text>
              <Text style={[styles.headerText, styles.colId]}>ID</Text>
              <Text style={[styles.headerText, styles.colName]}>Name</Text>
              <Text style={[styles.headerText, styles.colStatus]}>Status</Text>
              <Text style={[styles.headerText, styles.colAttendance]}>Attendance</Text>
              <Text style={[styles.headerText, styles.colMarks]}>Marks</Text>
              <Text style={[styles.headerText, styles.colGrade]}>Grade</Text>
            </View>

            <ScrollView>
              {students.map(student => (
                <StudentRow
                  key={student.student_id}
                  student={student}
                  maxMarks={parseFloat(inputMaxMarks) || 0}
                  onAbsentToggle={handleAbsentToggle}
                  onMarksChange={handleMarksChange}
                />
              ))}
            </ScrollView>
          </AppCard>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        classes={classes}
        sections={sections}
        exams={exams}
        subjects={subjects}
        selectedClass={classId}
        selectedSection={sectionId}
        selectedExam={examId}
        selectedSubject={subjectId}
        loadingClasses={loadingClasses}
        loadingSections={loadingSections}
        loadingExams={loadingExams}
        loadingSubjects={loadingSubjects}
        onSelectClass={setClassId}
        onSelectSection={setSectionId}
        onSelectExam={setExamId}
        onSelectSubject={setSubjectId}
        onApply={handleApplyFilters}
        onClose={() => setShowFilterModal(false)}
      />
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
  filterCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectedFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  filterTagText: {
    fontSize: 12,
    color: '#334155',
  },
  configCard: {
    padding: 16,
    marginBottom: 16,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  savedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  configRow: {
    gap: 12,
  },
  configInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  configDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  configItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  configItemLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  configItemValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionBar: {
    marginBottom: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statSaved: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#15803d',
  },
  statPending: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  statAbsent: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  autoSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  autoSaveBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  autoSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  autoSaveTextActive: {
    color: '#fff',
  },
  autoSaveHint: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
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
  tableCard: {
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  colRoll: { width: 60 },
  colId: { width: 70 },
  colName: { flex: 2 },
  colStatus: { width: 60 },
  colAttendance: { width: 110 },
  colMarks: { width: 80 },
  colGrade: { width: 55 },
  studentRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    alignItems: 'center',
  },
  studentRowAbsent: {
    backgroundColor: '#fff5f5',
  },
  studentRowSaved: {
    backgroundColor: '#f0fdf4',
  },
  studentCol: {
    justifyContent: 'center',
  },
  studentColName: {
    flex: 2,
    justifyContent: 'center',
  },
  rollTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rollTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  studentId: {
    fontSize: 12,
    color: '#475569',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusBadgeSaved: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeDraft: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextSaved: {
    color: '#15803d',
  },
  statusTextDraft: {
    color: '#92400e',
  },
  attendanceToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  toggleBtnActive: {
    backgroundColor: '#dcfce7',
    outlineWidth: 2,
    outlineColor: '#22c55e',
  },
  toggleBtnAbsentActive: {
    backgroundColor: '#fee2e2',
    outlineWidth: 2,
    outlineColor: '#ef4444',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  toggleTextActive: {
    color: '#15803d',
  },
  toggleTextAbsentActive: {
    color: '#b91c1c',
  },
  marksInput: {
    width: 70,
    height: 38,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  marksInputDisabled: {
    backgroundColor: '#fff5f5',
    borderColor: '#fca5a5',
  },
  marksInputSaved: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  gradeBadgePass: {
    backgroundColor: '#dcfce7',
  },
  gradeBadgeFail: {
    backgroundColor: '#fee2e2',
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gradeTextPass: {
    color: '#15803d',
  },
  gradeTextFail: {
    color: '#b91c1c',
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
    borderColor: '#e4e9f2',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#4a5568',
  },
  chipTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  configModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  configModalBody: {
    padding: 16,
  },
});