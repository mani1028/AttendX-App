import { useScrollTabBar } from '../../hooks/useScrollTabBar';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
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
  Users,
  LayoutGrid,
  ClipboardList,
  Clock,
  X,
} from 'lucide-react-native';
import API from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import { Theme } from '../../theme/tokens';
const colors = Theme.colors;


import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';

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
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) ||
         (await AsyncStorage.getItem('user_id')) ||
         (await AsyncStorage.getItem('userId')) ||
         (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
         (await storage.getString(StorageKeys.EMPLOYEE_ID)) || '';
};

// grading removed: grade UI intentionally omitted

const validateDecimalWithHalfStep = (value: string) => {
  return /^(0|[1-9]\d*)(\.[5]?)?$/.test(value);
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
        <AppText weight="semibold" style={styles.studentId}>ID: {student.student_id}</AppText>
      </View>

      <View style={styles.actionCol}>
        <View style={styles.attendanceToggle}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.toggleBtn, !student.isAbsent && styles.toggleBtnActive]}
            onPress={() => onAbsentToggle(student.student_id, false)}
          >
            <AppText weight="bold" style={[styles.toggleText, !student.isAbsent && styles.toggleTextActive]}>P</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
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
          {/* grading removed */}
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
    if (mode === 'class') {onSelectClass(id);}
    else if (mode === 'section') {onSelectSection(id);}
    else if (mode === 'exam') {onSelectExam(id);}
    else if (mode === 'subject') {onSelectSubject(id);}
  };

  const currentSelection = (type: 'class' | 'section' | 'exam' | 'subject') => {
    if (type === 'class') {return classes.find(c => c.class_id === selectedClass)?.class_name || 'Select Class';}
    if (type === 'section') {return sections.find(s => s.section_id === selectedSection)?.section_name || 'Select Section';}
    if (type === 'exam') {return exams.find(e => e.exam_id === selectedExam)?.exam_name || 'Select Exam';}
    if (type === 'subject') {return subjects.find(s => s.subject_id === selectedSubject)?.subject_name || 'Select Subject';}
    return '';
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText weight="bold" style={styles.modalTitle}>Select Filters</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={20} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterGroup}>
              <AppText weight="bold" style={styles.modalLabel}>Class</AppText>
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerSelector}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Class',
                  options: classes.map(c => ({ label: c.class_name, value: c.class_id })),
                  selectedValue: selectedClass,
                  onValueChange: (v) => handleOptionSelect('class', v),
                })}
              >
                <AppText style={styles.pickerSelectorText}>{currentSelection('class')}</AppText>
                <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            {selectedClass && (
              <View style={styles.filterGroup}>
                <AppText weight="bold" style={styles.modalLabel}>Section</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.pickerSelector}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Section',
                    options: sections.map(s => ({ label: s.section_name, value: s.section_id })),
                    selectedValue: selectedSection,
                    onValueChange: (v) => handleOptionSelect('section', v),
                  })}
                >
                  <AppText style={styles.pickerSelectorText}>{currentSelection('section')}</AppText>
                  <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.filterGroup}>
              <AppText weight="bold" style={styles.modalLabel}>Exam</AppText>
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerSelector}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Exam',
                  options: exams.map(e => ({ label: e.exam_name, value: e.exam_id })),
                  selectedValue: selectedExam,
                  onValueChange: (v) => handleOptionSelect('exam', v),
                })}
              >
                <AppText style={styles.pickerSelectorText}>{currentSelection('exam')}</AppText>
                <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            {selectedClass && (
              <View style={styles.filterGroup}>
                <AppText weight="bold" style={styles.modalLabel}>Subject</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.pickerSelector}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Subject',
                    options: subjects.map(su => ({ label: su.subject_name, value: su.subject_id })),
                    selectedValue: selectedSubject,
                    onValueChange: (v) => handleOptionSelect('subject', v),
                  })}
                >
                  <AppText style={styles.pickerSelectorText}>{currentSelection('subject')}</AppText>
                  <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
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
          <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
            <X size={20} color={Theme.colors.textSec} />
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

          <AppText weight="bold" style={[styles.modalLabel, { marginTop: Theme.spacing.md }]}>Pass Marks</AppText>
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
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
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
  const [inlinePickerModal, setInlinePickerModal] = useState<{
    visible: boolean;
    title: string;
    options: { label: string; value: any }[];
    selectedValue: any;
    onValueChange: (value: any) => void;
  } | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Auto save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const bid = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId') || '';
        if (isMounted.current) {
          setSchoolCode(code);
          setTeacherId(tid);
          setBranchId(bid);
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
  const handleScroll = useScrollTabBar();


  // Load teacher assignments and exams
  useEffect(() => {
    const fetchTeacherAssignments = async () => {
      if (!schoolCode || !teacherId) {return;}

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

      if (isMounted.current) {setLoadingClasses(true);}
      try {
        const res = await API.get('/staff/marks/staff-context', {
          params: {
            school_code: schoolCode,
            branch_id: branchId,
            teacher_id: teacherId,
            employee_id: teacherId,
          },
        });

        if (!isMounted.current) {return;}

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
              .filter((a: any) => a?.class_id && (a?.class_name || a?.class_grade))
              .map((a: any) => {
                const name = String(a?.class_name || a?.class_grade || '').trim();
                return [name.toLowerCase(), { class_id: String(a.class_id), class_name: name }];
              })
          ).values()
        ) as ClassItem[];
        setClasses(uniqueClasses);

        // Save to cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(res.data));
      } catch (err: any) {
        if (err?.response?.status === 401) {return;}
        if (isMounted.current) {
          setError(err?.response?.data?.detail || 'Failed to load class assignments');
        }
      } finally {
        if (isMounted.current) {setLoadingClasses(false);}
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

      if (isMounted.current) {setLoadingExams(true);}
      try {
        const res = await API.get('/teacher/marks/exams', { headers: { 'x-school-code': schoolCode } });
        if (!isMounted.current) {return;}
        const rawExams = Array.isArray(res.data?.exams) ? res.data.exams.filter(Boolean) : [];
        const uniqueExams = Array.from(
          new Map(rawExams.map((e: any) => [String(e?.exam_id), e])).values()
        ) as ExamItem[];
        setExams(uniqueExams);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(uniqueExams));
      } catch {
        // Keep cached exams if API fails
      } finally {
        if (isMounted.current) {setLoadingExams(false);}
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
      .map(a => ({ section_id: String(a?.section_id), section_name: String(a?.section_name || '') }))
      .filter(a => a.section_id && a.section_name);
    const uniqueSections = Array.from(new Map(sectionsData.map(x => [String(x.section_id), x])).values()) as SectionItem[];
    setSections(uniqueSections);
    setSectionId('');
    if (isMounted.current) {setLoadingSections(false);}
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
    if (isMounted.current) {setLoadingSubjects(false);}
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
        if (!isMounted.current) {return;}
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
        if (err?.response?.status === 401) {return;}
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
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((s: any, idx: number) => ({
              ...s,
              student_id: String(s.student_id || s.id || s.student_code || s.roll_number || `std-${idx}`).trim(),
              student_full_name: String(s.student_full_name || s.student_name || s.name || s.full_name || `Student ${idx + 1}`).trim(),
              roll_number: String(s.roll_number || s.roll || idx + 1).trim(),
            }));
            setStudents(normalized);
          }
        }
      } catch (e) {
        console.warn('Failed to load students cache', e);
      }
    }

    if (isMounted.current) {setLoadingStudents(true);}
    try {
      const res = await API.get(
        `/teacher/marks/students/${classId}/${sectionId}/${subjectId}`,
        { params: { teacher_id: resolvedTeacherId }, headers: { 'x-school-code': schoolCode } }
      );

      if (!isMounted.current) {return;}

      const studentsRaw = Array.isArray(res.data?.students) ? res.data.students.filter(Boolean) : [];
      let rows: StudentMark[] = studentsRaw.map((s: any, idx: number) => {
        const studentId = String(s.student_id || s.id || s.student_code || s.roll_number || `std-${idx}`).trim();
        const studentName = String(s.student_full_name || s.student_name || s.name || s.full_name || `Student ${idx + 1}`).trim();
        const rollNumber = String(s.roll_number || s.roll || idx + 1).trim();
        return {
          ...s,
          student_id: studentId,
          student_full_name: studentName,
          roll_number: rollNumber,
          isAbsent: false,
          marks_obtained: s?.marks_obtained === null || s?.marks_obtained === undefined ? '' : String(s.marks_obtained),
          hasExistingMarks: false,
          grade: '',
          status: '',
          mark_id: null,
        };
      });

      try {
        const marksRes = await API.get(
          `/teacher/marks/existing/${examId}/${subjectId}/${classId}/${sectionId}`,
          { headers: { 'x-school-code': schoolCode } }
        );
        if (isMounted.current) {
          const marksMap: Record<string, any> = {};
          const marksRaw = Array.isArray(marksRes.data?.marks) ? marksRes.data.marks.filter(Boolean) : [];
          marksRaw.forEach((m: any) => {
            if (m?.student_id) {marksMap[String(m.student_id)] = m;}
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

        if (rows.length === 0) {setMsg('No students found for this selection');}
        if (isRefresh) {
          Alert.alert('Refreshed', `Student data refreshed. ${rows.length} students loaded.`);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {return;}
      if (isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to load students');
      }
    } finally {
      if (isMounted.current) {setLoadingStudents(false);}
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
      if (autoSaveTimerRef.current) {clearTimeout(autoSaveTimerRef.current);}
      autoSaveTimerRef.current = setTimeout(() => triggerAutoSave(), 1500);
    }
  };

  const handleMarksChange = (studentId: string, value: string) => {
    if (value === '') {
      setStudents(prev =>
        prev.map(s => {
          if (s.student_id !== studentId) {return s;}
          if (s.isAbsent) {return s;}
          return { ...s, marks_obtained: value };
        })
      );
      return;
    }

    const validFormat = validateDecimalWithHalfStep(value);
    if (!validFormat) {return;}

    if (!value.endsWith('.')) {
      const numValue = parseFloat(value);
      if (inputMaxMarks) {
        const maxValue = parseFloat(inputMaxMarks);
        if (numValue < 0 || numValue > maxValue) {return;}
      }
    }

    setStudents(prev =>
      prev.map(s => {
        if (s.student_id !== studentId) {return s;}
        if (s.isAbsent) {return s;}
        return { ...s, marks_obtained: value };
      })
    );

    if (autoSave) {
      if (autoSaveTimerRef.current) {clearTimeout(autoSaveTimerRef.current);}
      autoSaveTimerRef.current = setTimeout(() => triggerAutoSave(), 2000);
    }
  };

  const handleMaxMarksChange = (value: string) => {
    if (value === '') { setInputMaxMarks(''); return; }
    if (validateDecimalWithHalfStep(value)) {setInputMaxMarks(value);}
  };

  const handlePassMarksChange = (value: string) => {
    if (value === '') { setInputPassMarks(''); return; }
    if (validateDecimalWithHalfStep(value)) {setInputPassMarks(value);}
  };

  const saveMarks = async (silent = false) => {
    if (!classId || !sectionId || !examId || !subjectId) {
      if (!silent) {Alert.alert('Error', 'Please select filters before saving marks');}
      return false;
    }
    if (!examSubjectId) {
      if (!silent) {
        Alert.alert(
          'Exam configuration missing',
          'Exam configuration is not saved. You can open Exam Configuration to save values, or continue without configuration.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Config', onPress: () => setShowConfigModal(true) },
            {
              text: 'Continue Without Config',
              onPress: async () => {
                // Mark as intentionally unset and proceed to save
                setExamSubjectId(true as any);
                // Give state a moment to update then retry saving marks
                setTimeout(() => {
                  saveMarks(silent);
                }, 100);
              },
            },
          ]
        );
      }
      return false;
    }

    const entries = students.filter(s => s.marks_obtained !== '' && s.marks_obtained !== null);
    if (entries.length === 0) {
      if (!silent && isMounted.current) {Alert.alert('Error', 'No marks entered to save');}
      return false;
    }

    if (isMounted.current) {setSavingMarks(true);}
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
            'Content-Type': 'multipart/form-data',
          },
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
      if (err?.response?.status === 401) {return false;}
      const errorMsg = formatErrorMessage(err?.response?.data?.detail) || 'Failed to save marks';
      if (!silent && isMounted.current) {Alert.alert('Error', errorMsg);}
      return false;
    } finally {
      if (isMounted.current) {setSavingMarks(false);}
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
    const max = parseFloat(String(inputMaxMarks || '').trim());
    const pass = parseFloat(String(inputPassMarks || '').trim());
    if (Number.isNaN(max) || Number.isNaN(pass) || max <= 0 || pass < 0) {
      Alert.alert('Error', 'Total Marks and Pass Marks must be valid positive numbers');
      return;
    }
    // Allow pass marks to be any non-negative number (teachers may set custom pass thresholds)

    if (isMounted.current) {setSavingExamConfig(true);}
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
          { text: 'OK', onPress: () => loadStudents() },
        ]);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {return;}
      if (isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to save exam config');
      }
    } finally {
      if (isMounted.current) {setSavingExamConfig(false);}
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) {return;}

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

  const openInlinePicker = (mode: 'class' | 'section' | 'exam' | 'subject') => {
    if (mode === 'section' && !classId) {
      Alert.alert('Select class first', 'Choose a class before selecting a section.');
      return;
    }
    if (mode === 'subject' && !classId) {
      Alert.alert('Select class first', 'Choose a class before selecting a subject.');
      return;
    }

    const config = {
      class: {
        title: 'Select Class',
        options: classes.map(c => ({ label: c.class_name, value: c.class_id })),
        selectedValue: classId,
        onValueChange: (value: string) => setClassId(String(value)),
      },
      section: {
        title: 'Select Section',
        options: sections.map(s => ({ label: s.section_name, value: s.section_id })),
        selectedValue: sectionId,
        onValueChange: (value: string) => setSectionId(String(value)),
      },
      exam: {
        title: 'Select Exam',
        options: exams.map(e => ({ label: e.exam_name, value: e.exam_id })),
        selectedValue: examId,
        onValueChange: (value: string) => setExamId(String(value)),
      },
      subject: {
        title: 'Select Subject',
        options: subjects.map(s => ({ label: s.subject_name, value: s.subject_id })),
        selectedValue: subjectId,
        onValueChange: (value: string) => setSubjectId(String(value)),
      },
    }[mode];

    if (config.options.length === 0) {
      const title = mode === 'section' ? 'No sections available' : mode === 'subject' ? 'No subjects available' : `No ${mode}s available`;
      Alert.alert(title, 'Please try another selection.');
      return;
    }

    setInlinePickerModal({
      visible: true,
      title: config.title,
      options: config.options,
      selectedValue: config.selectedValue,
      onValueChange: (value: any) => {
        config.onValueChange(value);
        setInlinePickerModal(null);
      },
    });
  };

  const totalSaved = students.filter(s => s.hasExistingMarks || s.marks_obtained !== '').length;
  const totalPending = students.filter(s => !s.hasExistingMarks && s.marks_obtained === '' && !s.isAbsent).length;
  const totalAbsent = students.filter(s => s.isAbsent).length;

  return (
    <View style={styles.container}>


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {/* Navy Standard Header */}
        <StandardPageHeader title="Marks Entry" onBackPress={() => navigation.goBack()} />

        {/* Filter Card */}
        <AppCard style={styles.mainCard} elevated={false}>
          <View style={styles.selectionRow}>
            <View style={[styles.selectionField, { marginRight: 10 }]}>
              <AppText weight="bold" style={styles.selectionLabel}>Class</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.selectionDropdown} onPress={() => openInlinePicker('class')}>
                <Users size={18} color={Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
                <AppText weight="semibold" style={styles.selectionDropdownText} numberOfLines={1}>
                  {classId ? `Class ${classes.find(c => c.class_id === classId)?.class_name || classId}` : 'Select Class'}
                </AppText>
                <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              <AppText style={styles.selectionHelperText}>
                {loadingClasses ? 'Loading classes...' : 'Tap to choose a class'}
              </AppText>
            </View>

            <View style={styles.selectionField}>
              <AppText weight="bold" style={styles.selectionLabel}>Section</AppText>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.selectionDropdown, !classId && styles.selectionDropdownDisabled]}
                onPress={() => openInlinePicker('section')}
                disabled={!classId}
              >
                <LayoutGrid size={18} color={Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
                <AppText weight="semibold" style={styles.selectionDropdownText} numberOfLines={1}>
                  {sectionId ? `Section ${sections.find(s => s.section_id === sectionId)?.section_name || sectionId}` : 'Select Section'}
                </AppText>
                <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              <AppText style={styles.selectionHelperText}>
                {classId ? `${sections.length} section${sections.length === 1 ? '' : 's'} available` : 'Pick a class first'}
              </AppText>
            </View>
          </View>

          <View style={styles.selectionRow}>
            <View style={[styles.selectionField, { marginRight: 10 }]}>
              <AppText weight="bold" style={styles.selectionLabel}>Exam</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.selectionDropdown} onPress={() => openInlinePicker('exam')}>
                <ClipboardList size={18} color={Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
                <AppText weight="semibold" style={styles.selectionDropdownText} numberOfLines={1}>
                  {examId ? exams.find(e => e.exam_id === examId)?.exam_name || examId : 'Select Exam'}
                </AppText>
                <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              <AppText style={styles.selectionHelperText}>
                {loadingExams ? 'Loading exams...' : `${exams.length} exam${exams.length === 1 ? '' : 's'} available`}
              </AppText>
            </View>

            <View style={styles.selectionField}>
              <AppText weight="bold" style={styles.selectionLabel}>Subject</AppText>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.selectionDropdown, !classId && styles.selectionDropdownDisabled]}
                onPress={() => openInlinePicker('subject')}
                disabled={!classId}
              >
                <BookOpen size={18} color={Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
                <AppText weight="semibold" style={styles.selectionDropdownText} numberOfLines={1}>
                  {subjectId ? subjects.find(s => s.subject_id === subjectId)?.subject_name || subjectId : 'Select Subject'}
                </AppText>
                <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              <AppText style={styles.selectionHelperText}>
                {classId ? `${subjects.length} subject${subjects.length === 1 ? '' : 's'} available` : 'Pick a class first'}
              </AppText>
            </View>
          </View>

          <AppButton
            title={loadingStudents ? 'Searching...' : 'Search Marks'}
            onPress={() => loadStudents()}
            disabled={loadingStudents || !classId || !sectionId || !examId || !subjectId}
            style={styles.selectionSearchBtn}
          />
        </AppCard>

        {/* Exam Config Card */}
        {examId && subjectId && (
          <AppCard style={styles.configCard} elevated={false}>
            <View style={styles.configHeader}>
              <View style={styles.configTitleRow}>
                <Settings size={18} color={Theme.colors.primary} />
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
                    <AppText weight="semibold" style={styles.configLabel}>Total Marks</AppText>
                    <TextInput
                      style={styles.configInput}
                      placeholder="e.g. 100"
                      keyboardType="numeric"
                      value={inputMaxMarks}
                      onChangeText={handleMaxMarksChange}
                    />
                  </View>
                  <View style={styles.configInputGroup}>
                    <AppText weight="semibold" style={styles.configLabel}>Pass Marks</AppText>
                    <TextInput
                      style={styles.configInput}
                      placeholder="e.g. 33"
                      keyboardType="numeric"
                      value={inputPassMarks}
                      onChangeText={handlePassMarksChange}
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
                <TouchableOpacity accessibilityRole="button" style={styles.editConfigBtn} onPress={() => setIsEditMode(true)}>
                  <RefreshCw size={16} color={Theme.colors.text} />
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
                style={StyleSheet.flatten([styles.primaryButton, { flex: 2 }])}
              />
              <TouchableOpacity accessibilityRole="button"
                style={[styles.autoSaveBtn, autoSave && styles.autoSaveBtnActive]}
                onPress={() => setAutoSave(!autoSave)}
              >
                <Clock size={16} color={autoSave ? Theme.colors.card : Theme.colors.textSec} />
                <AppText weight="bold" style={[styles.autoSaveText, autoSave && styles.autoSaveTextActive]}>
                  {autoSave ? 'Auto ON' : 'Auto OFF'}
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={() => loadStudents(true)}>
                <RefreshCw size={16} color={Theme.colors.primary} />
                <AppText weight="semibold" style={styles.secondaryBtnText}>Refresh</AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={exportToCSV}>
                <Download size={16} color={Theme.colors.primary} />
                <AppText weight="semibold" style={styles.secondaryBtnText}>Export</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Student List */}
        {loadingStudents ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : students.length === 0 ? (
          <AppCard style={styles.emptyCard} elevated={false}>
            <Search size={80} color={Theme.colors.border} strokeWidth={1.5} />
            <AppText weight="bold" style={styles.emptyTitle}>Ready to grade?</AppText>
            <AppText weight="regular" style={styles.emptyText}>
              Configure filters and exam rules above to load the student list.
            </AppText>
            <TouchableOpacity accessibilityRole="button"
              style={styles.emptyButton}
              onPress={() => openInlinePicker('class')}
            >
              <AppText weight="bold" style={styles.emptyButtonText}>Select Filters</AppText>
            </TouchableOpacity>
          </AppCard>
        ) : (
          <View style={styles.listWrapper}>
            <AppText weight="bold" style={styles.listTitle}>Student List ({students.length})</AppText>
            {students.map((student, idx) => (
              <StudentRow
                key={student.student_id || `std-row-${idx}`}
                student={student}
                maxMarks={parseFloat(inputMaxMarks) || 0}
                onAbsentToggle={handleAbsentToggle}
                onMarksChange={handleMarksChange}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {inlinePickerModal && (
        <CustomPickerModal
          {...inlinePickerModal}
          onClose={() => setInlinePickerModal(null)}
        />
      )}
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
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: 110,
    ...Platform.select({
      android: { elevation: 0 },
      ios: { shadowOpacity: 0 },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 0 : 10,
    position: 'relative',
    height: 40,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
  },
  headerTitle: {
    color: Theme.colors.card,
    fontSize: 17,
    fontWeight: '700',
  },
  headerContent: {
    marginTop: 25,
  },
  headerGreeting: {
    color: Theme.colors.card,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.8,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.bodyMd,
    marginTop: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mainCard: {
    marginTop: -80,
    marginHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.lg,
    ...Platform.select({
      android: { elevation: 15 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
    }),
    marginBottom: 25,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  cardTitle: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  cardBody: {
    padding: Theme.spacing.md,
  },
  selectionRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  selectionField: {
    flex: 1,
  },
  selectionLabel: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
    fontWeight: '700',
  },
  selectionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.background,
    borderRadius: 18,
    paddingHorizontal: Theme.spacing.md,
    height: 56,
  },
  selectionDropdownDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.5,
  },
  selectionDropdownText: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  selectionHelperText: {
    marginTop: 10,
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  selectionSearchBtn: {
    height: 58,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.primary,
    marginTop: 25,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  selectionConfigureWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  selectionConfigureText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  selectedFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterTagText: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 16,
    height: 52,
  },
  configCard: {
    marginHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    padding: 20,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.background,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
    }),
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configTitle: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  savedBadgeText: {
    ...Theme.typography.label,
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
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  configInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 14,
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
  },
  configDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configItem: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Theme.colors.background,
  },
  configItemLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  configItemValue: {
    fontSize: 18,
    color: Theme.colors.primary,
  },
  editConfigBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    marginHorizontal: Theme.spacing.md,
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
    paddingVertical: Theme.spacing.sm,
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
    ...Theme.typography.label,
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
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  autoSaveBtnActive: {
    backgroundColor: Theme.colors.success,
    borderColor: Theme.colors.success,
  },
  autoSaveText: {
    fontSize: 13,
    color: Theme.colors.textSec,
  },
  autoSaveTextActive: {
    color: Theme.colors.card,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.xs,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: Theme.colors.primary,
  },
  emptyCard: {
    marginHorizontal: Theme.spacing.md,
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.background,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 22,
    color: Theme.colors.text,
    marginTop: 20,
    marginBottom: Theme.spacing.sm,
  },
  emptyText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.textSec,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  emptyButton: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Theme.colors.background,
    marginTop: 10,
    ...Theme.shadow.sm,
  },
  emptyButtonText: {
    color: Theme.colors.text,
    ...Theme.typography.bodyMd,
    fontWeight: '700',
  },
  listWrapper: {
    marginHorizontal: Theme.spacing.md,
    gap: 12,
  },
  listTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    marginLeft: Theme.spacing.xs,
  },
  studentRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.xxl,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.background,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
    marginBottom: 12,
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
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  studentId: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
    marginLeft: Theme.spacing.xs,
  },
  rollTag: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rollTagText: {
    fontSize: 10,
    color: Theme.colors.card,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attendanceToggle: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
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
    backgroundColor: Theme.colors.success,
  },
  toggleBtnAbsentActive: {
    backgroundColor: Theme.colors.error,
  },
  toggleText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  toggleTextActive: {
    color: Theme.colors.card,
  },
  toggleTextAbsentActive: {
    color: Theme.colors.card,
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
    borderColor: Theme.colors.border,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    textAlign: 'center',
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
  },
  marksInputDisabled: {
    backgroundColor: Theme.colors.background,
    borderColor: '#cbd5e1',
    color: '#94a3b8',
  },
  marksInputSaved: {
    borderColor: Theme.colors.success,
  },
  // grading styles removed
  savedIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Theme.colors.background,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    paddingBottom: 40,
    width: '100%',
  },
  configModalContent: {
    backgroundColor: Theme.colors.background,
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
    borderBottomColor: Theme.colors.background,
  },
  modalTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: Theme.colors.textSec,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 13,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  filterGroup: {
    marginBottom: Theme.spacing.md,
  },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  pickerSelectorText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  pickerTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  pickerCloseBtn: {
    padding: Theme.spacing.xs,
  },
  pickerListContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#334155',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
  },
});
