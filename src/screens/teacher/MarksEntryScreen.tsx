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
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Settings,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Download,
  Search,
  Save,
  BookOpen,
  User,
  LayoutGrid,
  ClipboardList,
  Clock,
  X
} from 'lucide-react-native';
import API from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import { colors } from '../../constants/theme';
import HM_THEME from '../../constants/hmTheme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import CustomPickerModal from '../../components/common/CustomPickerModal';

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

interface PickerOption {
  id: string;
  name: string;
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
  if (!grade) return null;
  return (
    <View style={[styles.gradeBadge, isFail ? styles.gradeBadgeFail : styles.gradeBadgePass]}>
      <AppText weight="bold" style={[styles.gradeText, isFail ? styles.gradeTextFail : styles.gradeTextPass]}>
        {grade}
      </AppText>
    </View>
  );
};

// Roll Tag Component
const RollTag: React.FC<{ roll: string }> = ({ roll }) => (
  <View style={styles.rollTag}>
    <AppText weight="bold" style={styles.rollTagText}>#{roll}</AppText>
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
      <View style={styles.studentInfoCol}>
        <View style={styles.studentMainInfo}>
          <RollTag roll={student.roll_number} />
          <AppText weight="bold" style={styles.studentName} numberOfLines={1}>{student.student_full_name}</AppText>
        </View>
        <AppText weight="semiBold" style={styles.studentId}>ID: {student.student_id}</AppText>
      </View>

      <View style={styles.actionCol}>
        <View style={styles.attendanceToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !student.isAbsent && styles.toggleBtnActive]}
            onPress={() => onAbsentToggle(student.student_id, false)}
          >
            <AppText weight="bold" style={[styles.toggleText, !student.isAbsent && styles.toggleTextActive]}>P</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, student.isAbsent && styles.toggleBtnAbsentActive]}
            onPress={() => onAbsentToggle(student.student_id, true)}
          >
            <AppText weight="bold" style={[styles.toggleText, student.isAbsent && styles.toggleTextAbsentActive]}>A</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.marksContainer}>
          <TextInput
            style={[
              styles.marksInput,
              student.isAbsent && styles.marksInputDisabled,
              isSaved && styles.marksInputSaved,
            ]}
            placeholder="0"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={student.isAbsent ? '0' : student.marks_obtained}
            onChangeText={(value) => onMarksChange(student.student_id, value)}
            editable={!student.isAbsent}
          />
          <GradeBadge grade={student.grade || ''} />
        </View>
      </View>

      {isSaved && (
        <View style={styles.savedIndicator}>
          <CheckCircle2 size={12} color="#15803d" />
        </View>
      )}
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
  onSelectClass,
  onSelectSection,
  onSelectExam,
  onSelectSubject,
  onApply,
  onClose,
}) => {
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; options: { label: string; value: any }[]; selectedValue: any; onValueChange: (value: any) => void } | null>(null);

  const handleOptionSelect = (mode: 'class' | 'section' | 'exam' | 'subject', id: string) => {
    if (mode === 'class') onSelectClass(id);
    else if (mode === 'section') onSelectSection(id);
    else if (mode === 'exam') onSelectExam(id);
    else if (mode === 'subject') onSelectSubject(id);
  };

  const currentSelection = (type: 'class' | 'section' | 'exam' | 'subject') => {
    if (type === 'class') return classes.find(c => c.class_id === selectedClass)?.class_name || 'Select Class';
    if (type === 'section') return sections.find(s => s.section_id === selectedSection)?.section_name || 'Select Section';
    if (type === 'exam') return exams.find(e => e.exam_id === selectedExam)?.exam_name || 'Select Exam';
    if (type === 'subject') return subjects.find(s => s.subject_id === selectedSubject)?.subject_name || 'Select Subject';
    return '';
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText weight="bold" style={styles.modalTitle}>Select Filters</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterGroup}>
              <AppText weight="bold" style={styles.modalLabel}>Class</AppText>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Class',
                  options: classes.map(c => ({ label: c.class_name, value: c.class_id })),
                  selectedValue: selectedClass,
                  onValueChange: (v) => handleOptionSelect('class', v)
                })}
              >
                <AppText style={styles.pickerSelectorText}>{currentSelection('class')}</AppText>
                <ChevronRight size={18} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            {selectedClass && (
              <View style={styles.filterGroup}>
                <AppText weight="bold" style={styles.modalLabel}>Section</AppText>
                <TouchableOpacity
                  style={styles.pickerSelector}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Section',
                    options: sections.map(s => ({ label: s.section_name, value: s.section_id })),
                    selectedValue: selectedSection,
                    onValueChange: (v) => handleOptionSelect('section', v)
                  })}
                >
                  <AppText style={styles.pickerSelectorText}>{currentSelection('section')}</AppText>
                  <ChevronRight size={18} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.filterGroup}>
              <AppText weight="bold" style={styles.modalLabel}>Exam</AppText>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Exam',
                  options: exams.map(e => ({ label: e.exam_name, value: e.exam_id })),
                  selectedValue: selectedExam,
                  onValueChange: (v) => handleOptionSelect('exam', v)
                })}
              >
                <AppText style={styles.pickerSelectorText}>{currentSelection('exam')}</AppText>
                <ChevronRight size={18} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            {selectedClass && (
              <View style={styles.filterGroup}>
                <AppText weight="bold" style={styles.modalLabel}>Subject</AppText>
                <TouchableOpacity
                  style={styles.pickerSelector}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Subject',
                    options: subjects.map(su => ({ label: su.subject_name, value: su.subject_id })),
                    selectedValue: selectedSubject,
                    onValueChange: (v) => handleOptionSelect('subject', v)
                  })}
                >
                  <AppText style={styles.pickerSelectorText}>{currentSelection('subject')}</AppText>
                  <ChevronRight size={18} color="#64748b" style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Apply Filters" onPress={onApply} disabled={!selectedClass || !selectedSection || !selectedExam || !selectedSubject} />
          </View>
        </View>
      </View>

      {pickerModal && (
        <CustomPickerModal
          {...pickerModal}
          onClose={() => setPickerModal(null)}
        />
      )}
    </Modal>
  );
};

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
          <AppText weight="bold" style={styles.modalTitle}>Exam Configuration</AppText>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.configModalBody}>
          <AppText weight="bold" style={styles.modalLabel}>Total Marks</AppText>
          <TextInput
            style={styles.configInput}
            placeholder="Enter total marks"
            keyboardType="numeric"
            value={maxMarks}
            onChangeText={onMaxMarksChange}
          />

          <AppText weight="bold" style={[styles.modalLabel, { marginTop: 16 }]}>Pass Marks</AppText>
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const lastScrollY = useRef(0);
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
      try {
        const code = await getSchoolCode();
        const tid = await getTeacherId();
        if (isMounted.current) {
          setSchoolCode(code);
          setTeacherId(tid);
        }
      } catch (e) {
        console.warn('Failed to load credentials', e);
      }
    };
    load();

    // Ensure tab bar is visible when entering/leaving
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

  // Load teacher assignments and exams
  useEffect(() => {
    const fetchTeacherAssignments = async () => {
      if (!schoolCode || !teacherId) return;

      const cacheKey = `teacher_marks_context_${teacherId}_${schoolCode}`;

      // Try loading from cache first
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          const rawAssignments = Array.isArray(data?.assignments) ? data.assignments.filter(Boolean) : [];
          const teacherData = data?.teacher_data || null;
          const canonicalId = String(teacherData?.teacher_id || teacherId).trim();
          const deptRaw = String(teacherData?.department_subject || '').trim();
          const deptSubjects = Array.from(new Set(deptRaw.split(/[,/|]+/).map((s: any) => String(s || '').trim()).filter(Boolean)));

          if (isMounted.current) {
            setTeacherAssignments(rawAssignments);
            setTeacherSubjects(deptSubjects);
            setResolvedTeacherId(canonicalId);

            const uniqueClasses = Array.from(
              new Map(
                rawAssignments
                  .filter((a: any) => a?.class_id && a?.class_name)
                  .map((a: any) => [String(a.class_name).trim().toLowerCase(), { class_id: String(a.class_id), class_name: a.class_name }])
              ).values()
            ) as ClassItem[];
            setClasses(uniqueClasses);
          }
        }
      } catch (e) {
        console.warn('Failed to load teacher context cache', e);
      }

      if (isMounted.current) setLoadingClasses(true);
      try {
        const res = await API.get('/teacher/marks/teacher-context', {
          params: { teacher_id: teacherId },
          headers: { 'x-school-code': schoolCode },
        });
        
        if (!isMounted.current) return;

        const rawAssignments = Array.isArray(res.data?.assignments) ? res.data.assignments.filter(Boolean) : [];
        const teacherData = res.data?.teacher_data || null;
        const canonicalId = String(teacherData?.teacher_id || teacherId).trim();
        const deptRaw = String(teacherData?.department_subject || '').trim();
        const deptSubjects = Array.from(new Set(deptRaw.split(/[,/|]+/).map((s: any) => String(s || '').trim()).filter(Boolean)));

        setTeacherAssignments(rawAssignments);
        setTeacherSubjects(deptSubjects);
        setResolvedTeacherId(canonicalId);

        const uniqueClasses = Array.from(
          new Map(
            rawAssignments
              .filter((a: any) => a?.class_id && a?.class_name)
              .map((a: any) => [String(a.class_name).trim().toLowerCase(), { class_id: String(a.class_id), class_name: a.class_name }])
          ).values()
        ) as ClassItem[];
        setClasses(uniqueClasses);

        // Save to cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(res.data));
      } catch (err: any) {
        if (err?.response?.status === 401) return;
        if (isMounted.current) {
          setError(err?.response?.data?.detail || 'Failed to load class assignments');
        }
      } finally {
        if (isMounted.current) setLoadingClasses(false);
      }
    };

    const fetchAllExams = async () => {
      const cacheKey = `teacher_exams_${schoolCode}`;

      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMounted.current) {
          setExams(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('Failed to load exams cache', e);
      }

      if (isMounted.current) setLoadingExams(true);
      try {
        const res = await API.get('/teacher/marks/exams', { headers: { 'x-school-code': schoolCode } });
        if (!isMounted.current) return;
        const rawExams = Array.isArray(res.data?.exams) ? res.data.exams.filter(Boolean) : [];
        const uniqueExams = Array.from(
          new Map(rawExams.map((e: any) => [String(e?.exam_id), e])).values()
        );
        setExams(uniqueExams);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(uniqueExams));
      } catch {
        // Keep cached exams if API fails
      } finally {
        if (isMounted.current) setLoadingExams(false);
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
    const assignmentsArray = Array.isArray(teacherAssignments) ? teacherAssignments.filter(Boolean) : [];
    const sectionsData = assignmentsArray
      .filter(a => String(a?.class_id) === String(classId))
      .map(a => ({ section_id: String(a?.section_id), section_name: a?.section_name }))
      .filter(a => a.section_id && a.section_name);
    const uniqueSections = Array.from(new Map(sectionsData.map(x => [String(x.section_id), x])).values()) as SectionItem[];
    setSections(uniqueSections);
    setSectionId('');
    if (isMounted.current) setLoadingSections(false);
  }, [classId, teacherAssignments]);

  // Update subjects when class/section changes
  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId('');
      return;
    }
    setLoadingSubjects(true);
    const assignmentsArray = Array.isArray(teacherAssignments) ? teacherAssignments.filter(Boolean) : [];
    const raw = assignmentsArray
      .filter(a => String(a?.class_id) === String(classId))
      .filter(a => !sectionId || String(a?.section_id) === String(sectionId))
      .map(a => ({ subject_id: String(a?.subject_id), subject_name: a?.subject_name }))
      .filter(a => a.subject_id && a.subject_name);
    
    const unique = Array.from(new Map(raw.map(x => [String(x.subject_id), x])).values()) as SubjectItem[];
    const allowedSet = new Set((Array.isArray(teacherSubjects) ? teacherSubjects : []).filter(Boolean).map(s => String(s || '').toLowerCase()));
    setSubjects(allowedSet.size ? unique.filter(s => allowedSet.has(String(s.subject_name || '').toLowerCase())) : unique);
    setSubjectId('');
    if (isMounted.current) setLoadingSubjects(false);
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

      const cacheKey = `exam_config_${examId}_${subjectId}_${schoolCode}`;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMounted.current) {
          const found = JSON.parse(cached);
          setInputMaxMarks(found.max_marks?.toString() || '');
          setInputPassMarks(found.pass_marks?.toString() || '');
          setExamSubjectId(found.id || true);
        }
      } catch (e) {
        console.warn('Failed to load exam config cache', e);
      }

      try {
        const res = await API.get(`/teacher/marks/exam-subjects/${examId}`, { headers: { 'x-school-code': schoolCode } });
        if (!isMounted.current) return;
        const examSubjectsRaw = Array.isArray(res.data?.exam_subjects) ? res.data.exam_subjects.filter(Boolean) : [];
        const found = examSubjectsRaw.find((s: any) => String(s?.subject_id) === String(subjectId));
        if (found) {
          setInputMaxMarks(found.max_marks?.toString() || '');
          setInputPassMarks(found.pass_marks?.toString() || '');
          setExamSubjectId(found.id || true);
          setIsEditMode(false);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(found));
        } else {
          setInputMaxMarks('');
          setInputPassMarks('');
          setExamSubjectId(null);
          setIsEditMode(false);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) return;
        // If API fails, we keep cached data if available
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

    const cacheKey = `marks_students_${examId}_${subjectId}_${classId}_${sectionId}_${schoolCode}`;

    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMounted.current) {
          setStudents(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('Failed to load students cache', e);
      }
    }

    if (isMounted.current) setLoadingStudents(true);
    try {
      const res = await API.get(
        `/teacher/marks/students/${classId}/${sectionId}/${subjectId}`,
        { params: { teacher_id: resolvedTeacherId }, headers: { 'x-school-code': schoolCode } }
      );

      if (!isMounted.current) return;

      const studentsRaw = Array.isArray(res.data?.students) ? res.data.students.filter(Boolean) : [];
      let rows: StudentMark[] = studentsRaw.map((s: any) => ({
        ...s,
        isAbsent: false,
        marks_obtained: s?.marks_obtained === null || s?.marks_obtained === undefined ? '' : String(s.marks_obtained),
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
        if (isMounted.current) {
          const marksMap: Record<string, any> = {};
          const marksRaw = Array.isArray(marksRes.data?.marks) ? marksRes.data.marks.filter(Boolean) : [];
          marksRaw.forEach((m: any) => {
            if (m?.student_id) marksMap[String(m.student_id)] = m;
          });

          rows = rows.map((s) => {
            const m = marksMap[String(s.student_id)];
            return {
              ...s,
              isAbsent: m ? Boolean(m.is_absent) : false,
              marks_obtained: m?.marks_obtained !== undefined && m?.marks_obtained !== null
                ? String(m.marks_obtained)
                : '',
              mark_id: m?.mark_id || null,
              grade: m?.grade || '',
              status: m?.status || '',
              hasExistingMarks: !!m,
            };
          });
        }
      } catch (e) {
        console.warn('Failed to fetch existing marks');
      }

      if (isMounted.current) {
        setStudents(rows);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(rows));

        if (rows.length === 0) setMsg('No students found for this selection');
        if (isRefresh) {
          Alert.alert('Refreshed', `Student data refreshed. ${rows.length} students loaded.`);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to load students');
      }
    } finally {
      if (isMounted.current) setLoadingStudents(false);
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
      if (!silent) {
        Alert.alert(
          'Exam configuration missing',
          'Exam configuration is not saved. Save default configuration (Total: 100, Pass: 33) and continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save & Continue',
              onPress: async () => {
                try {
                  if (!inputMaxMarks) setInputMaxMarks('100');
                  if (!inputPassMarks) setInputPassMarks('33');
                  await saveExamConfig();
                  // Give state a moment to update then retry saving marks
                  setTimeout(() => {
                    saveMarks(silent);
                  }, 300);
                } catch (e) {
                  // ignore - saveExamConfig handles alerts
                }
              },
            },
          ]
        );
      }
      return false;
    }

    const entries = students.filter(s => s.marks_obtained !== '' && s.marks_obtained !== null);
    if (entries.length === 0) {
      if (!silent && isMounted.current) Alert.alert('Error', 'No marks entered to save');
      return false;
    }

    if (isMounted.current) setSavingMarks(true);
    try {
      const promises = entries.map(student => {
        const formData = new FormData();
        formData.append('student_id', student.student_id);
        formData.append('exam_id', String(examId));
        formData.append('subject_id', String(subjectId));
        formData.append('marks_obtained', student.isAbsent ? '0' : String(student.marks_obtained));
        formData.append('is_absent', student.isAbsent ? 'true' : 'false');
        formData.append('teacher_id', String(resolvedTeacherId));
        return API.post('/teacher/marks/enter', formData, {
          headers: {
            'x-school-code': schoolCode,
            'Content-Type': 'multipart/form-data'
          }
        });
      });

      await Promise.all(promises);

      if (isMounted.current) {
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
      }
      return true;
    } catch (err: any) {
      if (err?.response?.status === 401) return false;
      const errorMsg = formatErrorMessage(err?.response?.data?.detail) || 'Failed to save marks';
      if (!silent && isMounted.current) Alert.alert('Error', errorMsg);
      return false;
    } finally {
      if (isMounted.current) setSavingMarks(false);
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

    // Basic client-side validation
    const max = parseInt(String(inputMaxMarks || '').trim(), 10);
    const pass = parseInt(String(inputPassMarks || '').trim(), 10);
    if (Number.isNaN(max) || Number.isNaN(pass) || max <= 0 || pass < 0) {
      Alert.alert('Error', 'Total Marks and Pass Marks must be valid positive numbers');
      return;
    }
    if (pass > max) {
      Alert.alert('Error', 'Pass Marks cannot be greater than Total Marks');
      return;
    }

    if (isMounted.current) setSavingExamConfig(true);
    try {
      const formData = new FormData();
      formData.append('exam_id', String(examId));
      formData.append('subject_id', String(subjectId));
      formData.append('max_marks', String(max));
      formData.append('pass_marks', String(pass));
      const res = await API.post('/teacher/marks/exam-subject-config', formData, { headers: { 'x-school-code': schoolCode, 'Content-Type': 'multipart/form-data' } });
      if (isMounted.current) {
        // Handle various possible response shapes
        const newId = res.data?.exam_subject_id || res.data?.id || res.data?.exam_subject?.id || true;
        setExamSubjectId(newId);
        setIsEditMode(false);
        setShowConfigModal(false);
        Alert.alert('Success', 'Exam configuration saved successfully', [
          { text: 'OK', onPress: () => loadStudents() }
        ]);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to save exam config');
      }
    } finally {
      if (isMounted.current) setSavingExamConfig(false);
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
    // Load students immediately after applying filters
    setTimeout(() => {
      loadStudents();
    }, 50);
  };

  const totalSaved = students.filter(s => s.hasExistingMarks || s.marks_obtained !== '').length;
  const totalPending = students.filter(s => !s.hasExistingMarks && s.marks_obtained === '' && !s.isAbsent).length;
  const totalAbsent = students.filter(s => s.isAbsent).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={HM_THEME.navy} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HM_THEME.navy} />}
      >
        {/* Navy Standard Header */}
        <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : (navigation as any).navigate('TeacherDashboard')}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <AppText weight="bold" style={styles.headerTitle}>Marks Entry</AppText>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.headerContent}>
            <AppText weight="bold" style={styles.headerGreeting}>Academic Grading</AppText>
            <AppText weight="regular" style={styles.headerSubtext}>Enter and manage student marks for examinations</AppText>
          </View>
        </View>

        {/* Filter Card */}
        <AppCard style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <Filter size={20} color={HM_THEME.navy} />
            <AppText weight="bold" style={styles.cardTitle}>Selection Filters</AppText>
          </View>

          <View style={styles.cardBody}>
            {/* Selected Filters Display */}
            <View style={styles.selectedFilters}>
              {classId ? (
                <View style={styles.filterTag}>
                  <LayoutGrid size={12} color={HM_THEME.navy} />
                  <AppText weight="semiBold" style={styles.filterTagText}>Class {classes.find(c => c.class_id === classId)?.class_name}</AppText>
                </View>
              ) : null}
              {sectionId ? (
                <View style={styles.filterTag}>
                  <BookOpen size={12} color={HM_THEME.navy} />
                  <AppText weight="semiBold" style={styles.filterTagText}>Sec {sections.find(s => s.section_id === sectionId)?.section_name}</AppText>
                </View>
              ) : null}
              {examId ? (
                <View style={styles.filterTag}>
                  <ClipboardList size={12} color={HM_THEME.navy} />
                  <AppText weight="semiBold" style={styles.filterTagText}>{exams.find(e => e.exam_id === examId)?.exam_name}</AppText>
                </View>
              ) : null}
              {subjectId ? (
                <View style={styles.filterTag}>
                  <BookOpen size={12} color={HM_THEME.navy} />
                  <AppText weight="semiBold" style={styles.filterTagText}>{subjects.find(s => s.subject_id === subjectId)?.subject_name}</AppText>
                </View>
              ) : null}
            </View>

            <AppButton
              title="Configure Selection"
              onPress={() => setShowFilterModal(true)}
              icon={<Settings size={18} color="#fff" />}
              style={styles.primaryButton}
            />
          </View>
        </AppCard>

        {/* Exam Config Card */}
        {examId && subjectId && (
          <AppCard style={styles.configCard}>
            <View style={styles.configHeader}>
              <View style={styles.configTitleRow}>
                <Settings size={18} color={HM_THEME.navy} />
                <AppText weight="bold" style={styles.configTitle}>Exam Rules</AppText>
              </View>
              {examSubjectId && !isEditMode && (
                <View style={styles.savedBadge}>
                  <CheckCircle2 size={12} color="#15803d" />
                  <AppText weight="bold" style={styles.savedBadgeText}>Set</AppText>
                </View>
              )}
            </View>

            {(!examSubjectId || isEditMode) ? (
              <View style={styles.configForm}>
                <View style={styles.configRow}>
                  <View style={styles.configInputGroup}>
                    <AppText weight="semiBold" style={styles.configLabel}>Total Marks</AppText>
                    <TextInput
                      style={styles.configInput}
                      placeholder="e.g. 100"
                      keyboardType="numeric"
                      value={inputMaxMarks}
                      onChangeText={setInputMaxMarks}
                    />
                  </View>
                  <View style={styles.configInputGroup}>
                    <AppText weight="semiBold" style={styles.configLabel}>Pass Marks</AppText>
                    <TextInput
                      style={styles.configInput}
                      placeholder="e.g. 33"
                      keyboardType="numeric"
                      value={inputPassMarks}
                      onChangeText={setInputPassMarks}
                    />
                  </View>
                </View>
                <AppButton
                  title={savingExamConfig ? 'Saving...' : 'Confirm Rules'}
                  onPress={saveExamConfig}
                  disabled={savingExamConfig}
                  style={styles.primaryButton}
                />
              </View>
            ) : (
              <View style={styles.configDisplay}>
                <View style={styles.configItem}>
                  <AppText weight="bold" style={styles.configItemLabel}>Total</AppText>
                  <AppText weight="bold" style={styles.configItemValue}>{inputMaxMarks}</AppText>
                </View>
                <View style={styles.configItem}>
                  <AppText weight="bold" style={styles.configItemLabel}>Pass</AppText>
                  <AppText weight="bold" style={styles.configItemValue}>{inputPassMarks}</AppText>
                </View>
                <TouchableOpacity style={styles.editConfigBtn} onPress={() => setIsEditMode(true)}>
                  <RefreshCw size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
          </AppCard>
        )}

        {/* Action Buttons & Stats */}
        {students.length > 0 && (
          <View style={styles.actionBar}>
            <View style={styles.statsRow}>
              <View style={[styles.statChip, styles.statSaved]}>
                <CheckCircle2 size={12} color="#15803d" />
                <AppText weight="bold" style={styles.statText}>{totalSaved} Saved</AppText>
              </View>
              <View style={[styles.statChip, styles.statPending]}>
                <AlertCircle size={12} color="#b45309" />
                <AppText weight="bold" style={styles.statText}>{totalPending} Pending</AppText>
              </View>
              <View style={[styles.statChip, styles.statAbsent]}>
                <XCircle size={12} color="#b91c1c" />
                <AppText weight="bold" style={styles.statText}>{totalAbsent} Absent</AppText>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <AppButton
                title={savingMarks ? 'Saving...' : 'Save Marks'}
                onPress={() => saveMarks(false)}
                disabled={savingMarks}
                icon={<Save size={18} color="#fff" />}
                style={[styles.primaryButton, { flex: 2 }]}
              />
              <TouchableOpacity
                style={[styles.autoSaveBtn, autoSave && styles.autoSaveBtnActive]}
                onPress={() => setAutoSave(!autoSave)}
              >
                <Clock size={16} color={autoSave ? '#fff' : '#64748b'} />
                <AppText weight="bold" style={[styles.autoSaveText, autoSave && styles.autoSaveTextActive]}>
                  {autoSave ? 'Auto ON' : 'Auto OFF'}
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadStudents(true)}>
                <RefreshCw size={16} color={HM_THEME.navy} />
                <AppText weight="semiBold" style={styles.secondaryBtnText}>Refresh</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={exportToCSV}>
                <Download size={16} color={HM_THEME.navy} />
                <AppText weight="semiBold" style={styles.secondaryBtnText}>Export</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Student List */}
        {loadingStudents ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : students.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Search size={48} color="#cbd5e1" />
            <AppText weight="bold" style={styles.emptyTitle}>Ready to grade?</AppText>
            <AppText weight="regular" style={styles.emptyText}>
              Configure filters and exam rules above to load the student list.
            </AppText>
            <AppButton
              title="Select Filters"
              type="secondary"
              onPress={() => setShowFilterModal(true)}
              style={{ marginTop: 16 }}
            />
          </AppCard>
        ) : (
          <View style={styles.listWrapper}>
            <AppText weight="bold" style={styles.listTitle}>Student List ({students.length})</AppText>
            {students.map(student => (
              <StudentRow
                key={student.student_id}
                student={student}
                maxMarks={parseFloat(inputMaxMarks) || 0}
                onAbsentToggle={handleAbsentToggle}
                onMarksChange={handleMarksChange}
              />
            ))}
          </View>
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
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: HM_THEME.navy,
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  headerContent: {
    marginTop: 20,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mainCard: {
    marginTop: -30,
    marginHorizontal: 16,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
    ...Platform.select({

      android: { elevation: 8 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 16,
    color: '#0F172A',
  },
  cardBody: {
    padding: 16,
  },
  selectedFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTagText: {
    fontSize: 12,
    color: HM_THEME.navy,
  },
  primaryButton: {
    backgroundColor: HM_THEME.navy,
    borderRadius: 12,
    height: 48,
  },
  configCard: {
    marginHorizontal: 16,
    borderRadius: 30,
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowOpacity: 0.05,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configTitle: {
    fontSize: 15,
    color: '#0F172A',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savedBadgeText: {
    fontSize: 11,
    color: '#15803d',
    textTransform: 'uppercase',
  },
  configForm: {
    gap: 16,
  },
  configRow: {
    flexDirection: 'row',
    gap: 12,
  },
  configInputGroup: {
    flex: 1,
    gap: 6,
  },
  configLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  configInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  configDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  configItemLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  configItemValue: {
    fontSize: 18,
    color: HM_THEME.navy,
  },
  editConfigBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statSaved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  statAbsent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statText: {
    fontSize: 11,
    color: '#334155',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  autoSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  autoSaveBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  autoSaveText: {
    fontSize: 13,
    color: '#64748b',
  },
  autoSaveTextActive: {
    color: '#fff',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: HM_THEME.navy,
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 40,
    alignItems: 'center',
    borderRadius: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  listWrapper: {
    marginHorizontal: 16,
    gap: 12,
  },
  listTitle: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 4,
    marginLeft: 4,
  },
  studentRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  studentRowAbsent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  studentRowSaved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  studentInfoCol: {
    flex: 1,
    gap: 4,
  },
  studentMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  studentId: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
  rollTag: {
    backgroundColor: HM_THEME.navy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rollTagText: {
    fontSize: 10,
    color: '#fff',
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 3,
    borderRadius: 10,
    gap: 2,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#10b981',
  },
  toggleBtnAbsentActive: {
    backgroundColor: '#ef4444',
  },
  toggleText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  toggleTextActive: {
    color: '#fff',
  },
  marksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marksInput: {
    width: 48,
    height: 40,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 15,
    color: '#0f172a',
  },
  marksInputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    color: '#94a3b8',
  },
  marksInputSaved: {
    borderColor: '#10b981',
  },
  gradeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadgePass: {
    backgroundColor: '#dcfce7',
  },
  gradeBadgeFail: {
    backgroundColor: '#fee2e2',
  },
  gradeText: {
    fontSize: 12,
  },
  gradeTextPass: {
    color: '#15803d',
  },
  gradeTextFail: {
    color: '#b91c1c',
  },
  savedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    paddingBottom: 40,
    width: '100%',
  },
  configModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    width: '100%',
  },
  configModalBody: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    color: '#0f172a',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 13,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  filterGroup: {
    marginBottom: 16,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  pickerSelectorText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerTitle: {
    fontSize: 18,
    color: '#0f172a',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerListContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#334155',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});