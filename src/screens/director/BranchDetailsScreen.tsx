import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import API from '../../services/api';
import {
  getBranchTeachers,
  getBranchStudents,
  getClassesSections,
  getBranchLeaves,
  getBranchExams,
  getExamMarks,
  getStudentAttendanceReport,
  getTeacherAttendance,
  getStudentExamsData,
} from '../../services/directorService';
import { colors } from '../../theme/tokens';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import StandardPageHeader from '../../components/layout/StandardPageHeader';

const { width: screenWidth } = Dimensions.get('window');

// Types
interface Teacher {
  teacher_id: string;
  employee_id: string;
  teacher_full_name: string;
  department_subject: string;
  mobile_number: string;
  email_id: string;
  teacher_status: string;
}

interface Student {
  student_id: string;
  roll_number: string;
  admission_number: string;
  student_full_name: string;
  class_grade: string;
  section: string;
  father_guardian_name: string;
}

interface ClassSection {
  class_name: string;
  sections: string[];
}

interface LeaveRequest {
  leave_id: string;
  student_name?: string;
  student_full_name?: string;
  teacher_full_name?: string;
  teacher_name?: string;
  name?: string;
  full_name?: string;
  roll_number?: string;
  roll_no?: string;
  class_grade?: string;
  class_name?: string;
  class?: string;
  section?: string;
  section_name?: string;
  employee_id?: string;
  teacher_id?: string;
  subject?: string;
  department_subject?: string;
  leave_type?: 'student' | 'teacher';
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
  created_at?: string;
}

interface Exam {
  exam_id: string;
  exam_name: string;
  academic_year: string;
}

interface ExamMark {
  student_id: string;
  student_name: string;
  roll_number: string;
  admission_number: string;
  class_grade: string;
  section: string;
  subject_name: string;
  marks_obtained: number;
  grade: string;
  max_marks: number;
  pass_marks: number;
}

interface StudentMarkSummary {
  student_id: string;
  student_name: string;
  roll_number: string;
  admission_number: string;
  class_grade: string;
  section: string;
  marks: Array<{
    subject_name: string;
    marks_obtained: number;
    grade: string;
    max_marks: number;
    pass_marks: number;
    is_passed: boolean;
  }>;
  total_marks: number;
  max_possible: number;
  subjects_count: number;
  failed_subjects: number;
  percentage: number;
  result: 'PASS' | 'FAIL';
}

interface AttendanceRecord {
  roll_number?: string;
  student_full_name?: string;
  name?: string;
  status: string;
}

interface TeacherAttendance {
  employee_id: string;
  teacher_full_name: string;
  status: string;
}

interface StudentExamData {
  exams: Array<{
    exam_id: number;
    exam_name: string;
    subjects: Array<{
      subject_name: string;
      marks_obtained: number;
      max_marks: number;
    }>;
  }>;
  all_subjects: string[];
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const formatDate = (dateString: string): string => {
  if (!dateString) {return '-';}
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <AppText style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </AppText>
    </View>
  );
};

// Attendance Badge Component
const AttendanceBadge: React.FC<{ status: string }> = ({ status }) => {
  const isPresent = status === 'PRESENT';
  return (
    <View style={[styles.attendanceBadge, isPresent ? styles.attendancePresent : styles.attendanceAbsent]}>
      <AppText style={[styles.attendanceText, isPresent ? styles.attendanceTextPresent : styles.attendanceTextAbsent]}>
        {isPresent ? '✓ Present' : '✗ Absent'}
      </AppText>
    </View>
  );
};

// Result Badge Component
const ResultBadge: React.FC<{ result: string }> = ({ result }) => {
  const isPass = result === 'PASS';
  return (
    <View style={[styles.resultBadge, isPass ? styles.resultPass : styles.resultFail]}>
      <AppText style={[styles.resultText, isPass ? styles.resultTextPass : styles.resultTextFail]}>
        {result}
      </AppText>
    </View>
  );
};

// Grade Badge Component
const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const getGradeColor = () => {
    const g = grade?.toUpperCase() || '';
    if (g === 'A+' || g === 'A') {return Theme.colors.success;}
    if (g === 'B') {return Theme.colors.blue;}
    if (g === 'C') {return '#f97316';}
    if (g === 'D') {return '#d97706';}
    return Theme.colors.error;
  };
  return (
    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor() + '20' }]}>
      <AppText style={[styles.gradeText, { color: getGradeColor() }]}>{grade || '-'}</AppText>
    </View>
  );
};

// Leave Status Badge
const LeaveStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const s = status?.toUpperCase() || '';
    if (s === 'APPROVED') {return { bg: '#dcfce7', color: Theme.colors.success, label: 'APPROVED' };}
    if (s === 'REJECTED') {return { bg: '#fee2e2', color: Theme.colors.error, label: 'REJECTED' };}
    return { bg: '#fff7ed', color: '#f97316', label: 'PENDING' };
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.leaveBadge, { backgroundColor: config.bg }]}>
      <AppText style={[styles.leaveText, { color: config.color }]}>{config.label}</AppText>
    </View>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <View style={styles.statCard}>
    <View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statTitle}>{title}</AppText>
    </View>
    <AppText style={styles.statIcon}>{icon}</AppText>
  </View>
);

// Class Card Component
const ClassCard: React.FC<{
  branchClassName: string;
  sections: string[];
  studentCounts: Record<string, number>;
  onSelectSection: (className: string, section: string) => void;
}> = ({ branchClassName, sections, studentCounts, onSelectSection }) => (
  <AppCard style={styles.classCard}>
    <View style={styles.classHeader}>
      <AppText style={styles.classTitle}>Class {branchClassName}</AppText>
    </View>
    <View style={styles.sectionList}>
      {sections.map(section => (
        <TouchableOpacity
          key={section}
          style={styles.sectionBtn}
          onPress={() => onSelectSection(branchClassName, section)}
        >
          <AppText style={styles.sectionName}>Section {section}</AppText>
          <AppText style={styles.sectionCount}>{studentCounts[`${branchClassName}-${section}`] || 0} students →</AppText>
        </TouchableOpacity>
      ))}
    </View>
  </AppCard>
);

// Teacher Card Component
const TeacherCard: React.FC<{ teacher: Teacher }> = ({ teacher }) => (
  <AppCard style={styles.teacherCard}>
    <View style={styles.teacherHeader}>
      <AppText style={styles.teacherName}>{teacher.teacher_full_name}</AppText>
      <StatusBadge status={teacher.teacher_status} />
    </View>
    <AppText style={styles.teacherId}>ID: {teacher.employee_id}</AppText>
    <AppText style={styles.teacherSubject}>📚 {teacher.department_subject || '—'}</AppText>
    <AppText style={styles.teacherContact}>📞 {teacher.mobile_number || '—'}</AppText>
    <AppText style={styles.teacherEmail}>✉️ {teacher.email_id || '—'}</AppText>
  </AppCard>
);

// Student Card Component
const StudentCard: React.FC<{
  student: Student;
  onPress: (student: Student) => void;
}> = ({ student, onPress }) => (
  <TouchableOpacity onPress={() => onPress(student)}>
    <AppCard style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <AppText style={styles.studentName}>{student.student_full_name}</AppText>
        <AppText style={styles.studentRoll}>Roll: {student.roll_number}</AppText>
      </View>
      <View style={styles.studentDetails}>
        <AppText style={styles.studentInfo}>📚 Class {student.class_grade} - Section {student.section}</AppText>
        <AppText style={styles.studentInfo}>🎫 Adm: {student.admission_number}</AppText>
        <AppText style={styles.studentInfo}>👨 Father: {student.father_guardian_name}</AppText>
      </View>
    </AppCard>
  </TouchableOpacity>
);

// Leave Card Component
const LeaveCard: React.FC<{ leave: LeaveRequest }> = ({ leave }) => {
  const isTeacher = leave.leave_type === 'teacher' || (!leave.roll_number && !leave.roll_no);
  const name = isTeacher
    ? (leave.teacher_full_name || leave.teacher_name || leave.name || leave.full_name || 'Staff Member')
    : (leave.student_full_name || leave.student_name || 'Student');

  let detailsText = '';
  if (isTeacher) {
    const empId = leave.employee_id || leave.teacher_id || '—';
    const subj = leave.subject || leave.department_subject || 'Teacher';
    detailsText = `Staff ID: ${empId} | Subject: ${subj}`;
  } else {
    const roll = leave.roll_number || leave.roll_no || '—';
    const cls = leave.class_grade || leave.class_name || leave.class || '—';
    const sec = leave.section || leave.section_name || '—';
    detailsText = `Roll: ${roll} | Class ${cls}-${sec}`;
  }

  return (
    <AppCard style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <View style={{ flex: 1, marginRight: Theme.spacing.sm }}>
          <AppText style={styles.leaveStudent}>{name}</AppText>
          <AppText style={{ fontSize: 10, color: isTeacher ? Theme.colors.blue : Theme.colors.success, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 3 }}>
            {isTeacher ? 'Staff Leave Request' : 'Student Leave Request'}
          </AppText>
        </View>
        <LeaveStatusBadge status={leave.status} />
      </View>
      <AppText style={styles.leaveDetails}>{detailsText}</AppText>
      <AppText style={styles.leaveDates}>📅 {formatDate(leave.from_date)} → {formatDate(leave.to_date)}</AppText>
      <AppText style={styles.leaveReason}>📝 {leave.reason}</AppText>
    </AppCard>
  );
};

// Marks Row Component
const MarksRow: React.FC<{
  student: StudentMarkSummary;
  onPress: (student: StudentMarkSummary) => void;
}> = ({ student, onPress }) => (
  <TouchableOpacity style={styles.marksRow} onPress={() => onPress(student)}>
    <View style={styles.marksRowHeader}>
      <AppText style={styles.marksStudentName}>{student.student_name}</AppText>
      <ResultBadge result={student.result} />
    </View>
    <View style={styles.marksRowDetails}>
      <AppText style={styles.marksInfo}>Roll: {student.roll_number || '-'}</AppText>
      <AppText style={styles.marksInfo}>Class {student.class_grade}-{student.section}</AppText>
      <AppText style={[styles.marksPercentage, { color: student.percentage >= 60 ? Theme.colors.success : student.percentage >= 35 ? '#f97316' : Theme.colors.error }]}>
        {student.percentage.toFixed(1)}%
      </AppText>
    </View>
  </TouchableOpacity>
);

// Pass/Fail Pie Chart Component
const PassFailChart: React.FC<{ passed: number; failed: number; title: string }> = ({ passed, failed, title }) => {
  const total = passed + failed;
  if (total === 0) {return null;}

  const data = [
    { name: 'Passed', population: passed, color: Theme.colors.success, legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Failed', population: failed, color: Theme.colors.error, legendFontColor: '#333', legendFontSize: 12 },
  ];

  return (
    <View style={styles.chartCard}>
      <AppText style={styles.chartTitle}>{title}</AppText>
      <PieChart
        data={data}
        width={screenWidth - 80}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
      <View style={styles.chartStats}>
        <View style={styles.chartStat}>
          <AppText style={[styles.chartStatValue, { color: Theme.colors.success }]}>{passed}</AppText>
          <AppText style={styles.chartStatLabel}>Passed</AppText>
        </View>
        <View style={styles.chartStat}>
          <AppText style={[styles.chartStatValue, { color: Theme.colors.error }]}>{failed}</AppText>
          <AppText style={styles.chartStatLabel}>Failed</AppText>
        </View>
        <View style={styles.chartStat}>
          <AppText style={styles.chartStatValue}>{total}</AppText>
          <AppText style={styles.chartStatLabel}>Total</AppText>
        </View>
      </View>
    </View>
  );
};

export default function BranchDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { branchId, branchName, principalName, principalEmail, branchStatus } = route.params as any;
  const { setTabBarVisible } = useAuth();

  const [schoolCode, setSchoolCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'attendance' | 'leaves' | 'marks'>('teachers');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Scroll visibility logic
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  // Data states
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showAllLeaves, setShowAllLeaves] = useState<boolean>(false);
  const LEAVES_INITIAL_COUNT = 5;
  const [exams, setExams] = useState<Exam[]>([]);

  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Marks states
  const [examMarks, setExamMarks] = useState<ExamMark[]>([]);
  const [processedStudentData, setProcessedStudentData] = useState<StudentMarkSummary[]>([]);
  const [resultFilter, setResultFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [sortBy, setSortBy] = useState<'percentage' | 'name' | 'roll'>('percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Attendance states
  const [showAttendanceModal, setShowAttendanceModal] = useState<boolean>(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string>('');
  const [selectedSectionForAttendance, setSelectedSectionForAttendance] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Teacher attendance states
  const [attendanceType, setAttendanceType] = useState<'student' | 'teacher'>('student');
  const [teacherAttendanceData, setTeacherAttendanceData] = useState<TeacherAttendance[]>([]);
  const [teacherAttendanceSummary, setTeacherAttendanceSummary] = useState({ total: 0, present: 0, absent: 0, attendance_pct: 0 });
  const [teacherAttendanceFilter, setTeacherAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [teacherAttendanceLoading, setTeacherAttendanceLoading] = useState<boolean>(false);

  // Student detail modal states
  const [selectedStudent, setSelectedStudent] = useState<StudentMarkSummary | null>(null);
  const [studentExamsData, setStudentExamsData] = useState<StudentExamData | null>(null);
  const [loadingExamsData, setLoadingExamsData] = useState<boolean>(false);
  const [showAllExamsChart, setShowAllExamsChart] = useState<boolean>(false);
  const [currentSelectedExamId, setCurrentSelectedExamId] = useState<number | null>(null);
  const [currentSelectedExamName, setCurrentSelectedExamName] = useState<string>('');

  // Cache loading
  const loadCachedData = useCallback(async () => {
    if (!branchId) {return;}
    try {
      const keys = [
        `branch_teachers_${branchId}`,
        `branch_students_${branchId}`,
        `branch_classes_${branchId}`,
        `branch_leaves_${branchId}`,
        `branch_exams_${branchId}`,
      ];
      const cached = await AsyncStorage.multiGet(keys);
      cached.forEach(([key, value]) => {
        if (!value) {return;}
        const data = JSON.parse(value);
        if (key.includes('teachers')) {setTeachers(data);}
        else if (key.includes('students')) {setStudents(data);}
        else if (key.includes('classes')) {setClassSections(data);}
        else if (key.includes('leaves')) {setLeaveRequests(data);}
        else if (key.includes('exams')) {setExams(data);}
      });
    } catch (err) {
      console.error('Failed to load cached branch data:', err);
    }
  }, [branchId]);

  // Load school code
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      setSchoolCode(code);
      await loadCachedData();
    };
    load();
  }, [loadCachedData]);

  // Fetch data
  const fetchTeachers = useCallback(async () => {
    if (!branchId) {return;}
    const data = await getBranchTeachers(branchId);
    setTeachers(data);
    await AsyncStorage.setItem(`branch_teachers_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchStudents = useCallback(async () => {
    if (!branchId) {return;}
    const data = await getBranchStudents(branchId);
    setStudents(data);
    await AsyncStorage.setItem(`branch_students_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchClassSections = useCallback(async () => {
    if (!branchId) {return;}
    const data = await getClassesSections(branchId);
    setClassSections(data);
    await AsyncStorage.setItem(`branch_classes_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchLeaveRequests = useCallback(async (limit?: number) => {
    if (!branchId) {return;}
    setLoading(true);
    const data = await getBranchLeaves(branchId, limit);
    setLeaveRequests(data);
    if (!limit || limit === LEAVES_INITIAL_COUNT) {
      await AsyncStorage.setItem(`branch_leaves_${branchId}`, JSON.stringify(data));
    }
    setLoading(false);
  }, [branchId]);

  const fetchExams = useCallback(async () => {
    if (!branchId) {return;}
    const data = await getBranchExams(branchId);
    setExams(data);
    await AsyncStorage.setItem(`branch_exams_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchExamMarks = useCallback(async (examId: string, classGrade: string, section: string) => {
    if (!examId || !branchId) {return;}
    setLoading(true);
    const data = await getExamMarks(branchId, examId, classGrade, section);
    setExamMarks(data);
    setLoading(false);
  }, [branchId]);

  const fetchStudentAttendance = useCallback(async (className: string, sectionName: string, date: string) => {
    try {
      const data = await getStudentAttendanceReport(schoolCode, branchId, className, sectionName, date);
      const allStudents = [
        ...(data.present || []).map((s: any) => ({ ...s, status: 'PRESENT' })),
        ...(data.absent || []).map((s: any) => ({ ...s, status: 'ABSENT' })),
      ];
      setAttendanceData(allStudents);
      setShowAttendanceModal(true);
    } catch (err) {
      console.error('Failed to fetch student attendance:', err);
      Alert.alert('Error', 'Failed to fetch attendance data');
    }
  }, [branchId, schoolCode]);

  const fetchTeacherAttendance = useCallback(async (date: string) => {
    setTeacherAttendanceLoading(true);
    const data = await getTeacherAttendance(branchId, date);
    setTeacherAttendanceData(data?.items || []);
    setTeacherAttendanceSummary(data?.summary || { total: 0, present: 0, absent: 0, attendance_pct: 0 });
    setTeacherAttendanceLoading(false);
  }, [branchId]);

  const fetchStudentExamsData = useCallback(async (studentId: string) => {
    setLoadingExamsData(true);
    const data = await getStudentExamsData(studentId);
    if (data) {setStudentExamsData(data);}
    setLoadingExamsData(false);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (branchId) {
      fetchTeachers();
      fetchStudents();
      fetchClassSections();
      fetchLeaveRequests(LEAVES_INITIAL_COUNT);
      fetchExams();
    }
  }, [branchId]);

  // Fetch exam marks when selection changes
  useEffect(() => {
    if (selectedExam) {
      fetchExamMarks(selectedExam, selectedClass, selectedSection);
    }
  }, [selectedExam, selectedClass, selectedSection]);

  // Process exam marks data
  useEffect(() => {
    const studentMap = new Map<string, StudentMarkSummary>();
    examMarks.forEach(mark => {
      const studentId = mark.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_name: mark.student_name,
          roll_number: mark.roll_number,
          admission_number: mark.admission_number,
          class_grade: mark.class_grade,
          section: mark.section,
          marks: [],
          total_marks: 0,
          max_possible: 0,
          subjects_count: 0,
          failed_subjects: 0,
          percentage: 0,
          result: 'PASS',
        });
      }
      const student = studentMap.get(studentId)!;
      const marksObtained = parseFloat(String(mark.marks_obtained)) || 0;
      const maxMarks = parseFloat(String(mark.max_marks)) || 100;
      const passMarks = parseFloat(String(mark.pass_marks)) || 35;
      const isPassed = marksObtained >= passMarks;

      student.marks.push({
        subject_name: mark.subject_name,
        marks_obtained: marksObtained,
        grade: mark.grade,
        max_marks: maxMarks,
        pass_marks: passMarks,
        is_passed: isPassed,
      });
      student.total_marks += marksObtained;
      student.max_possible += maxMarks;
      student.subjects_count++;
      if (!isPassed) {student.failed_subjects++;}
    });

    const processed = Array.from(studentMap.values()).map(student => {
      const percentage = student.max_possible > 0 ? (student.total_marks / student.max_possible) * 100 : 0;
      const result: 'PASS' | 'FAIL' = student.failed_subjects === 0 ? 'PASS' : 'FAIL';
      return { ...student, percentage, result };
    });
    setProcessedStudentData(processed);
  }, [examMarks]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = [...processedStudentData];
    if (resultFilter !== 'ALL') {filtered = filtered.filter(s => s.result === resultFilter);}
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'percentage') {cmp = a.percentage - b.percentage;}
      else if (sortBy === 'name') {cmp = a.student_name.localeCompare(b.student_name);}
      else if (sortBy === 'roll') {cmp = (a.roll_number || '').localeCompare(b.roll_number || '');}
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [processedStudentData, resultFilter, sortBy, sortOrder]);

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    if (!searchTerm) {return teachers;}
    const term = searchTerm.toLowerCase();
    return teachers.filter(t =>
      t.teacher_full_name.toLowerCase().includes(term) ||
      t.employee_id?.toLowerCase().includes(term) ||
      t.department_subject?.toLowerCase().includes(term)
    );
  }, [teachers, searchTerm]);

  // Filter students for list
  const filteredStudents = useMemo(() => {
    let filtered = students;
    if (selectedClass) {filtered = filtered.filter(s => s.class_grade === selectedClass);}
    if (selectedSection) {filtered = filtered.filter(s => s.section === selectedSection);}
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.student_full_name.toLowerCase().includes(term) ||
        s.roll_number?.toLowerCase().includes(term) ||
        s.admission_number?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [students, selectedClass, selectedSection, searchTerm]);

  // Filter attendance
  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'ALL') {return attendanceData;}
    return attendanceData.filter(s => s.status === attendanceFilter);
  }, [attendanceData, attendanceFilter]);

  // Filter teacher attendance
  const filteredTeacherAttendance = useMemo(() => {
    if (teacherAttendanceFilter === 'ALL') {return teacherAttendanceData;}
    return teacherAttendanceData.filter(t => t.status === teacherAttendanceFilter);
  }, [teacherAttendanceData, teacherAttendanceFilter]);

  // Overall stats for marks
  const overallStats = useMemo(() => {
    const total = processedStudentData.length;
    const passed = processedStudentData.filter(s => s.result === 'PASS').length;
    const failed = total - passed;
    const avgPercentage = total > 0 ? processedStudentData.reduce((sum, s) => sum + s.percentage, 0) / total : 0;
    return { total, passed, failed, avgPercentage };
  }, [processedStudentData]);

  // Student counts by class-section
  const studentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const key = `${s.class_grade}-${s.section}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [students]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTeachers(),
      fetchStudents(),
      fetchClassSections(),
      fetchLeaveRequests(showAllLeaves ? 50 : LEAVES_INITIAL_COUNT),
      fetchExams(),
    ]);
    setRefreshing(false);
  }, [fetchTeachers, fetchStudents, fetchClassSections, fetchLeaveRequests, fetchExams, showAllLeaves]);

  const handleSort = (column: 'percentage' | 'name' | 'roll') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'percentage' ? 'desc' : 'asc');
    }
  };

  const handleStudentClick = async (student: Student | StudentMarkSummary) => {
    // If it's a raw Student object, create a partial summary
    if (student && 'student_full_name' in student) {
      const summary: StudentMarkSummary = {
        student_id: student.student_id,
        student_name: student.student_full_name,
        roll_number: student.roll_number,
        admission_number: student.admission_number,
        class_grade: student.class_grade,
        section: student.section,
        marks: [],
        total_marks: 0,
        max_possible: 0,
        subjects_count: 0,
        failed_subjects: 0,
        percentage: 0,
        result: 'PASS',
      };
      setSelectedStudent(summary);
    } else {
      setSelectedStudent(student);
    }

    const currentExam = exams.find(e => e.exam_id === selectedExam);
    setCurrentSelectedExamId(selectedExam ? parseInt(selectedExam) : null);
    setCurrentSelectedExamName(currentExam ? currentExam.exam_name : '');
    setShowAllExamsChart(false);
    await fetchStudentExamsData(student.student_id);
  };

  const handleViewStudentAttendance = (className: string, sectionName: string) => {
    setSelectedClassForAttendance(className);
    setSelectedSectionForAttendance(sectionName);
    setAttendanceType('student');
    fetchStudentAttendance(className, sectionName, attendanceDate);
  };

  const handleFetchTeacherAttendance = () => {
    setAttendanceType('teacher');
    fetchTeacherAttendance(attendanceDate);
    setShowAttendanceModal(true);
  };

  const handleAttendanceDateChange = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setAttendanceDate(dateStr);
    if (attendanceType === 'teacher') {
      fetchTeacherAttendance(dateStr);
    }
  };

  const barChartData = useMemo(() => {
    if (!studentExamsData || !currentSelectedExamId) {return [];}
    const exam = studentExamsData.exams?.find(e => e.exam_id === currentSelectedExamId);
    if (!exam || !exam.subjects) {return [];}
    return exam.subjects.map(subj => ({
      subject: subj.subject_name,
      percentage: (subj.marks_obtained / subj.max_marks) * 100,
      marks_obtained: subj.marks_obtained,
      max_marks: subj.max_marks,
    }));
  }, [studentExamsData, currentSelectedExamId]);

  const lineChartData = useMemo(() => {
    if (!studentExamsData || !studentExamsData.exams) {return [];}
    return studentExamsData.exams.map(exam => {
      const examRow: any = { exam_name: exam.exam_name };
      if (exam.subjects) {
        exam.subjects.forEach(subj => {
          examRow[subj.subject_name] = (subj.marks_obtained / subj.max_marks) * 100;
        });
      }
      return examRow;
    });
  }, [studentExamsData]);

  const allSubjects = studentExamsData?.all_subjects || [];

  const getSubjectColor = (subject: string, index: number): string => {
    const colors = [Theme.colors.blue, Theme.colors.success, '#f59e0b', Theme.colors.error, '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = ((hash << 5) - hash) + subject.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const currentExam = exams.find(e => e.exam_id === selectedExam);

  return (
    <View style={styles.container}>

      {/* Header */}
      <StandardPageHeader title="Branch Details" onBackPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.contentContainer, { marginTop: -20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.branchSubHeader}>
          <AppText style={styles.subtitle}>Branch ID: {branchId}</AppText>
          <StatusBadge status={branchStatus || 'ACTIVE'} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Teachers" value={teachers.length} icon="👨‍🏫" color={Theme.colors.blue} />
          <StatCard title="Total Students" value={students.length} icon="👨‍🎓" color={Theme.colors.success} />
          <StatCard title="Classes" value={classSections.length} icon="📚" color="#f97316" />
          <StatCard title="Pending Leaves" value={leaveRequests.filter(l => l.status === 'PENDING').length} icon="⏳" color={Theme.colors.error} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {['teachers', 'students', 'attendance', 'leaves', 'marks'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <AppText style={[styles.tabText, activeTab === tab && styles.tabTextActive]} weight="regular">
                {tab === 'teachers' && 'Teachers'}
                {tab === 'students' && 'Students'}
                {tab === 'attendance' && 'Attendance'}
                {tab === 'leaves' && 'Leaves'}
                {tab === 'marks' && 'Marks'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, employee ID, subject..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            {filteredTeachers.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <AppText style={styles.emptyIcon}>👨‍🏫</AppText>
                <AppText style={styles.emptyTitle}>No teachers found</AppText>
              </AppCard>
            ) : (
              filteredTeachers.map(teacher => <TeacherCard key={teacher.teacher_id} teacher={teacher} />)
            )}
          </>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <AppText style={styles.filterLabel}>Class</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity
                      style={[styles.chip, !selectedClass && styles.chipActive]}
                      onPress={() => { setSelectedClass(''); setSelectedSection(''); }}
                    >
                      <AppText style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All</AppText>
                    </TouchableOpacity>
                    {classSections.map(cls => (
                      <TouchableOpacity
                        key={cls.class_name}
                        style={[styles.chip, selectedClass === cls.class_name && styles.chipActive]}
                        onPress={() => { setSelectedClass(cls.class_name); setSelectedSection(''); }}
                      >
                        <AppText style={[styles.chipText, selectedClass === cls.class_name && styles.chipTextActive]}>
                          Class {cls.class_name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedClass && (
                <View style={styles.filterField}>
                  <AppText style={styles.filterLabel}>Section</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      <TouchableOpacity
                        style={[styles.chip, !selectedSection && styles.chipActive]}
                        onPress={() => setSelectedSection('')}
                      >
                        <AppText style={[styles.chipText, !selectedSection && styles.chipTextActive]}>All</AppText>
                      </TouchableOpacity>
                      {classSections.find(c => c.class_name === selectedClass)?.sections.map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, selectedSection === sec && styles.chipActive]}
                          onPress={() => setSelectedSection(sec)}
                        >
                          <AppText style={[styles.chipText, selectedSection === sec && styles.chipTextActive]}>
                            Section {sec}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, roll number..."
                  placeholderTextColor="#94a3b8"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>
            </View>

            {filteredStudents.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <AppText style={styles.emptyIcon}>👨‍🎓</AppText>
                <AppText style={styles.emptyTitle}>No students found</AppText>
              </AppCard>
            ) : (
              filteredStudents.map(student => (
                <StudentCard key={student.student_id} student={student} onPress={handleStudentClick} />
              ))
            )}
          </>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <>
            <View style={styles.attendanceControls}>
              <View style={styles.attendanceTypeRow}>
                <TouchableOpacity
                  style={[styles.attendanceTypeBtn, attendanceType === 'student' && styles.attendanceTypeBtnActive]}
                  onPress={() => setAttendanceType('student')}
                >
                  <AppText style={[styles.attendanceTypeText, attendanceType === 'student' && styles.attendanceTypeTextActive]}>
                    📚 Student
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.attendanceTypeBtn, attendanceType === 'teacher' && styles.attendanceTypeBtnActive]}
                  onPress={() => setAttendanceType('teacher')}
                >
                  <AppText style={[styles.attendanceTypeText, attendanceType === 'teacher' && styles.attendanceTypeTextActive]}>
                    👩‍🏫 Teacher
                  </AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.attendanceDateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <AppText style={styles.dateText}>📅 {attendanceDate}</AppText>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(attendanceDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {handleAttendanceDateChange(date);}
                    }}
                  />
                )}
                {attendanceType === 'teacher' && (
                  <AppButton title="Fetch Attendance" onPress={handleFetchTeacherAttendance} />
                )}
              </View>
            </View>

            {attendanceType === 'student' ? (
              <View>
                {classSections.map(cls => (
                  <ClassCard
                    key={cls.class_name}
                    branchClassName={cls.class_name}
                    sections={cls.sections}
                    studentCounts={studentCounts}
                    onSelectSection={handleViewStudentAttendance}
                  />
                ))}
              </View>
            ) : (
              teacherAttendanceLoading ? (
                <Loader />
              ) : teacherAttendanceData.length === 0 ? (
                <AppCard style={styles.emptyCard}>
                  <AppText style={styles.emptyIcon}>👩‍🏫</AppText>
                  <AppText style={styles.emptyTitle}>No teacher attendance data</AppText>
                  <AppText style={styles.emptyText}>Select a date and click "Fetch Attendance"</AppText>
                </AppCard>
              ) : (
                <>
                  <View style={styles.attendanceSummary}>
                    <AppText style={styles.attendanceSummaryText}>
                      Present: {teacherAttendanceSummary.present} / {teacherAttendanceSummary.total} ({teacherAttendanceSummary.attendance_pct}%)
                    </AppText>
                    <View style={styles.attendanceFilterRow}>
                      {['ALL', 'PRESENT', 'ABSENT'].map(filter => (
                        <TouchableOpacity
                          key={filter}
                          style={[styles.filterChip, teacherAttendanceFilter === filter && styles.filterChipActive]}
                          onPress={() => setTeacherAttendanceFilter(filter as any)}
                        >
                          <AppText style={[styles.filterChipText, teacherAttendanceFilter === filter && styles.filterChipTextActive]}>
                            {filter === 'ALL' ? 'All' : filter === 'PRESENT' ? 'Present' : 'Absent'}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {filteredTeacherAttendance.map((teacher, idx) => (
                    <AppCard key={idx} style={styles.teacherAttendanceCard}>
                      <AppText style={styles.teacherAttendanceName}>{teacher.teacher_full_name}</AppText>
                      <AppText style={styles.teacherAttendanceId}>ID: {teacher.employee_id}</AppText>
                      <AttendanceBadge status={teacher.status} />
                    </AppCard>
                  ))}
                </>
              )
            )}
          </>
        )}

        {/* Leaves Tab */}
        {activeTab === 'leaves' && (
          loading && leaveRequests.length === 0 ? (
            <Loader />
          ) : leaveRequests.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <AppText style={styles.emptyIcon}>📋</AppText>
              <AppText style={styles.emptyTitle}>No leave requests</AppText>
            </AppCard>
          ) : (
            <>
              {leaveRequests.map(leave => (
                <LeaveCard key={leave.leave_id} leave={leave} />
              ))}

              {loading && leaveRequests.length > 0 && (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
              )}

              {!showAllLeaves && leaveRequests.length >= LEAVES_INITIAL_COUNT && (
                <TouchableOpacity
                  style={styles.viewAllLeavesBtn}
                  onPress={() => {
                    setShowAllLeaves(true);
                    fetchLeaveRequests(50);
                  }}
                  disabled={loading}
                >
                  <AppText style={styles.viewAllLeavesText}>
                    {loading ? 'Fetching...' : 'View All Recent Requests →'}
                  </AppText>
                </TouchableOpacity>
              )}

              {showAllLeaves && (
                <TouchableOpacity
                  style={styles.viewAllLeavesBtn}
                  onPress={() => {
                    setShowAllLeaves(false);
                    fetchLeaveRequests(LEAVES_INITIAL_COUNT);
                  }}
                  disabled={loading}
                >
                  <AppText style={styles.viewAllLeavesText}>
                    {loading ? 'Fetching...' : 'Show Less'}
                  </AppText>
                </TouchableOpacity>
              )}
            </>
          )
        )}

        {/* Marks Tab */}
        {activeTab === 'marks' && (
          <>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <AppText style={styles.filterLabel}>Class</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity
                      style={[styles.chip, !selectedClass && styles.chipActive]}
                      onPress={() => { setSelectedClass(''); setSelectedSection(''); setSelectedExam(''); }}
                    >
                      <AppText style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All</AppText>
                    </TouchableOpacity>
                    {classSections.map(cls => (
                      <TouchableOpacity
                        key={cls.class_name}
                        style={[styles.chip, selectedClass === cls.class_name && styles.chipActive]}
                        onPress={() => { setSelectedClass(cls.class_name); setSelectedSection(''); setSelectedExam(''); }}
                      >
                        <AppText style={[styles.chipText, selectedClass === cls.class_name && styles.chipTextActive]}>
                          Class {cls.class_name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedClass && (
                <View style={styles.filterField}>
                  <AppText style={styles.filterLabel}>Section</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      <TouchableOpacity
                        style={[styles.chip, !selectedSection && styles.chipActive]}
                        onPress={() => { setSelectedSection(''); setSelectedExam(''); }}
                      >
                        <AppText style={[styles.chipText, !selectedSection && styles.chipTextActive]}>All</AppText>
                      </TouchableOpacity>
                      {classSections.find(c => c.class_name === selectedClass)?.sections.map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, selectedSection === sec && styles.chipActive]}
                          onPress={() => { setSelectedSection(sec); setSelectedExam(''); }}
                        >
                          <AppText style={[styles.chipText, selectedSection === sec && styles.chipTextActive]}>
                            Section {sec}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.filterField}>
                <AppText style={styles.filterLabel}>Exam</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {exams.map(exam => (
                      <TouchableOpacity
                        key={exam.exam_id}
                        style={[styles.chip, selectedExam === exam.exam_id && styles.chipActive]}
                        onPress={() => setSelectedExam(exam.exam_id)}
                      >
                        <AppText style={[styles.chipText, selectedExam === exam.exam_id && styles.chipTextActive]}>
                          {exam.exam_name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {loading ? (
              <Loader />
            ) : !selectedExam ? (
              <AppCard style={styles.emptyCard}>
                <AppText style={styles.emptyIcon}>📝</AppText>
                <AppText style={styles.emptyTitle}>Select an exam to view marks</AppText>
              </AppCard>
            ) : processedStudentData.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <AppText style={styles.emptyIcon}>📊</AppText>
                <AppText style={styles.emptyTitle}>No exam data found</AppText>
              </AppCard>
            ) : (
              <>
                {/* Summary Stats */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryItem}>
                    <AppText style={styles.summaryLabel}>Total Students</AppText>
                    <AppText style={styles.summaryValue}>{overallStats.total}</AppText>
                  </View>
                  <View style={styles.summaryItem}>
                    <AppText style={styles.summaryLabel}>Passed</AppText>
                    <AppText style={[styles.summaryValue, { color: '#a7f3d0' }]}>{overallStats.passed}</AppText>
                    <AppText style={styles.summarySub}>{overallStats.total > 0 ? ((overallStats.passed / overallStats.total) * 100).toFixed(1) : 0}%</AppText>
                  </View>
                  <View style={styles.summaryItem}>
                    <AppText style={styles.summaryLabel}>Failed</AppText>
                    <AppText style={[styles.summaryValue, { color: '#fecaca' }]}>{overallStats.failed}</AppText>
                    <AppText style={styles.summarySub}>{overallStats.total > 0 ? ((overallStats.failed / overallStats.total) * 100).toFixed(1) : 0}%</AppText>
                  </View>
                  <View style={styles.summaryItem}>
                    <AppText style={styles.summaryLabel}>Average</AppText>
                    <AppText style={styles.summaryValue}>{overallStats.avgPercentage.toFixed(1)}%</AppText>
                  </View>
                </View>

                {/* Pass/Fail Chart */}
                <PassFailChart
                  passed={overallStats.passed}
                  failed={overallStats.failed}
                  title={`${currentExam?.exam_name || 'Exam'} · Class ${selectedClass || 'All'} · Section ${selectedSection || 'All'}`}
                />

                {/* Filter and Sort Controls */}
                <View style={styles.marksControls}>
                  <View style={styles.filterRow}>
                    {['ALL', 'PASS', 'FAIL'].map(filter => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.filterChip, resultFilter === filter && styles.filterChipActive]}
                        onPress={() => setResultFilter(filter as any)}
                      >
                        <AppText style={[styles.filterChipText, resultFilter === filter && styles.filterChipTextActive]}>
                          {filter === 'ALL' ? 'All' : filter}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.sortRow}>
                    <AppText style={styles.sortLabel}>Sort by:</AppText>
                    {(['percentage', 'name', 'roll'] as const).map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.sortBtn, sortBy === opt && styles.sortBtnActive]}
                        onPress={() => handleSort(opt)}
                      >
                        <AppText style={[styles.sortBtnText, sortBy === opt && styles.sortBtnTextActive]}>
                          {opt === 'percentage' ? 'Score' : opt === 'name' ? 'Name' : 'Roll'}
                          {sortBy === opt && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Student List */}
                {filteredAndSortedStudents.map(student => (
                  <MarksRow key={student.student_id} student={student} onPress={handleStudentClick} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Student Attendance Modal */}
      <Modal visible={showAttendanceModal && attendanceType === 'student'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">
                Attendance - Class {selectedClassForAttendance} Section {selectedSectionForAttendance}
              </AppText>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)} style={styles.modalClose}>
                <AppText style={styles.modalCloseText}>✕</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.attendanceFilterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, attendanceFilter === 'ALL' && styles.filterChipActive]}
                  onPress={() => setAttendanceFilter('ALL')}
                >
                  <AppText style={[styles.filterChipText, attendanceFilter === 'ALL' && styles.filterChipTextActive]}>All</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, attendanceFilter === 'PRESENT' && styles.filterChipActive]}
                  onPress={() => setAttendanceFilter('PRESENT')}
                >
                  <AppText style={[styles.filterChipText, attendanceFilter === 'PRESENT' && styles.filterChipTextActive]}>Present</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, attendanceFilter === 'ABSENT' && styles.filterChipActive]}
                  onPress={() => setAttendanceFilter('ABSENT')}
                >
                  <AppText style={[styles.filterChipText, attendanceFilter === 'ABSENT' && styles.filterChipTextActive]}>Absent</AppText>
                </TouchableOpacity>
              </View>

              <ScrollView>
                {filteredAttendance.map((item, idx) => (
                  <View key={idx} style={styles.attendanceRow}>
                    <AppText style={styles.attendanceRoll}>{item.roll_number || '-'}</AppText>
                    <AppText style={styles.attendanceName}>{item.student_full_name || item.name || '-'}</AppText>
                    <AttendanceBadge status={item.status} />
                  </View>
                ))}
                {filteredAttendance.length === 0 && (
                  <AppText style={styles.emptyText}>No attendance data found</AppText>
                )}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setShowAttendanceModal(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Details Modal */}
      <Modal visible={!!selectedStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.largeModal]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">{selectedStudent?.student_name}</AppText>
              <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.modalClose}>
                <AppText style={styles.modalCloseText}>✕</AppText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedStudent && (
                <>
                  <View style={styles.studentInfoGrid}>
                    <AppText style={styles.studentInfoItem}>Roll: {selectedStudent.roll_number || '-'}</AppText>
                    <AppText style={styles.studentInfoItem}>Class {selectedStudent.class_grade}-{selectedStudent.section}</AppText>
                    <AppText style={styles.studentInfoItem}>Total: {selectedStudent.total_marks}/{selectedStudent.max_possible}</AppText>
                    <AppText style={[styles.studentInfoItem, { fontWeight: '700', color: selectedStudent.percentage >= 60 ? Theme.colors.success : selectedStudent.percentage >= 35 ? '#f97316' : Theme.colors.error }]}>
                      {selectedStudent.percentage.toFixed(1)}%
                    </AppText>
                    <ResultBadge result={selectedStudent.result} />
                  </View>

                  {/* Exam Performance Section */}
                  {loadingExamsData ? (
                    <Loader />
                  ) : studentExamsData && studentExamsData.exams && studentExamsData.exams.length > 0 ? (
                    <View style={styles.examSection}>
                      <View style={styles.examHeader}>
                        <AppText style={styles.examTitle} weight="bold">📊 Exam Performance</AppText>
                        <View style={styles.examToggle}>
                          <TouchableOpacity
                            style={[styles.examToggleBtn, !showAllExamsChart && styles.examToggleBtnActive]}
                            onPress={() => setShowAllExamsChart(false)}
                          >
                            <AppText style={[styles.examToggleText, !showAllExamsChart && styles.examToggleTextActive]}>Single</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.examToggleBtn, showAllExamsChart && styles.examToggleBtnActive]}
                            onPress={() => setShowAllExamsChart(true)}
                          >
                            <AppText style={[styles.examToggleText, showAllExamsChart && styles.examToggleTextActive]}>Trend</AppText>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {!showAllExamsChart ? (
                        currentSelectedExamId && barChartData.length > 0 ? (
                          <View style={styles.chartContainer}>
                            <AppText style={styles.chartSubtitle}>{currentSelectedExamName}</AppText>
                            <BarChart
                              data={{
                                labels: barChartData.map(d => d.subject),
                                datasets: [{ data: barChartData.map(d => d.percentage) }],
                              }}
                              width={screenWidth - 80}
                              height={250}
                              yAxisLabel=""
                              yAxisSuffix="%"
                              chartConfig={{
                                backgroundColor: Theme.colors.background,
                                backgroundGradientFrom: Theme.colors.card,
                                backgroundGradientTo: Theme.colors.card,
                                decimalPlaces: 1,
                                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                                style: { borderRadius: 16 },
                              }}
                              verticalLabelRotation={45}
                              showValuesOnTopOfBars
                            />
                          </View>
                        ) : (
                          <AppText style={styles.noDataText}>No data available</AppText>
                        )
                      ) : lineChartData.length > 0 && allSubjects.length > 0 ? (
                        <View style={styles.chartContainer}>
                          <AppText style={styles.chartSubtitle}>Trend Across Exams</AppText>
                          <LineChart
                            data={{
                              labels: lineChartData.map(d => d.exam_name),
                              datasets: allSubjects.map((subject, idx) => ({
                                data: lineChartData.map(d => d[subject] || 0),
                                color: (opacity = 1) => getSubjectColor(subject, idx),
                                strokeWidth: 2,
                              })),
                              legend: allSubjects,
                            }}
                            width={screenWidth - 80}
                            height={300}
                            chartConfig={{
                              backgroundColor: Theme.colors.background,
                              backgroundGradientFrom: Theme.colors.card,
                              backgroundGradientTo: Theme.colors.card,
                              decimalPlaces: 1,
                              color: (opacity = 1, index = 0) => getSubjectColor(allSubjects[index] || '', index),
                              labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                              style: { borderRadius: 16 },
                            }}
                            bezier
                            style={styles.chart}
                          />
                        </View>
                      ) : (
                        <AppText style={styles.noDataText}>No trend data</AppText>
                      )}
                    </View>
                  ) : null}

                  {/* Subject-wise Marks Table */}
                  <AppText style={styles.subjectTitle} weight="bold">Subject-wise Marks</AppText>
                  {selectedStudent.marks.map((mark, idx) => (
                    <View key={idx} style={styles.subjectRow}>
                      <AppText style={styles.subjectName}>{mark.subject_name}</AppText>
                      <AppText style={styles.subjectMarks}>{mark.marks_obtained}</AppText>
                      <AppText style={styles.subjectMax}>{mark.max_marks}</AppText>
                      <GradeBadge grade={mark.grade} />
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setSelectedStudent(null)} />
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
    backgroundColor: Theme.colors.background,
  },
  contentContainer: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Theme.colors.background,
    borderRadius: 16,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  statValue: {
    ...Theme.typography.h1,
    color: Theme.colors.text,
  },
  statTitle: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  statIcon: {
    fontSize: 28,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: 16,
    padding: Theme.spacing.xs,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Theme.colors.primary,
  },
  tabText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  tabTextActive: {
    color: Theme.colors.card,
  },
  searchContainer: {
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  filterRow: {
    marginBottom: Theme.spacing.md,
    gap: 12,
  },
  filterField: {
    marginBottom: Theme.spacing.sm,
  },
  filterLabel: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
  teacherCard: {
    padding: Theme.spacing.md,
    marginBottom: 12,
  },
  teacherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  teacherId: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  teacherSubject: {
    fontSize: 13,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  teacherContact: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: 2,
  },
  teacherEmail: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  studentCard: {
    padding: Theme.spacing.md,
    marginBottom: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  studentName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  studentRoll: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  studentDetails: {
    gap: 4,
  },
  studentInfo: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#15803d',
  },
  statusTextInactive: {
    color: '#b91c1c',
  },
  attendanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  attendancePresent: {
    backgroundColor: '#dcfce7',
  },
  attendanceAbsent: {
    backgroundColor: '#fee2e2',
  },
  attendanceText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  attendanceTextPresent: {
    color: '#15803d',
  },
  attendanceTextAbsent: {
    color: '#b91c1c',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 20,
  },
  resultPass: {
    backgroundColor: '#dcfce7',
  },
  resultFail: {
    backgroundColor: '#fee2e2',
  },
  resultText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  resultTextPass: {
    color: '#15803d',
  },
  resultTextFail: {
    color: '#b91c1c',
  },
  gradeBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 12,
  },
  gradeText: {
    ...Theme.typography.label,
    fontWeight: '700',
  },
  leaveBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 20,
  },
  leaveText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  leaveCard: {
    padding: Theme.spacing.md,
    marginBottom: 12,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  leaveStudent: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  leaveDetails: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  leaveDates: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xs,
  },
  leaveReason: {
    fontSize: 13,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  classCard: {
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },
  classHeader: {
    backgroundColor: Theme.colors.primary,
    padding: 14,
  },
  classTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  sectionList: {
    padding: 12,
  },
  sectionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  sectionName: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: '#334155',
  },
  sectionCount: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  attendanceControls: {
    marginBottom: Theme.spacing.md,
    gap: 12,
  },
  attendanceTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attendanceTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  attendanceTypeBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  attendanceTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  attendanceTypeTextActive: {
    color: Theme.colors.card,
  },
  attendanceDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 13,
    color: Theme.colors.text,
  },
  attendanceSummary: {
    backgroundColor: Theme.colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: Theme.spacing.md,
  },
  attendanceSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  attendanceFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterChipText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  filterChipTextActive: {
    color: Theme.colors.card,
  },
  teacherAttendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: Theme.spacing.sm,
  },
  teacherAttendanceName: {
    flex: 1,
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  teacherAttendanceId: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginHorizontal: Theme.spacing.sm,
  },
  marksRow: {
    backgroundColor: Theme.colors.background,
    padding: 14,
    borderRadius: 12,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  marksRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  marksStudentName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  marksRowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marksInfo: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  marksPercentage: {
    ...Theme.typography.body,
    fontWeight: '700',
  },
  marksControls: {
    marginBottom: Theme.spacing.md,
    gap: 12,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  sortBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sortBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  sortBtnText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  sortBtnTextActive: {
    color: Theme.colors.card,
  },
  summaryCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: Theme.colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  summaryLabel: {
    ...Theme.typography.label,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Theme.spacing.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.card,
  },
  summarySub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Theme.spacing.md,
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  chartStatLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
  },
  largeModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: Theme.spacing.md,
  },
  modalFooter: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: 12,
  },
  attendanceRoll: {
    width: 60,
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  attendanceName: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.text,
  },
  studentInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: 12,
    marginBottom: 20,
  },
  studentInfoItem: {
    fontSize: 13,
    color: Theme.colors.text,
  },
  examSection: {
    marginBottom: 20,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  examTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  examToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  examToggleBtn: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: Theme.colors.background,
  },
  examToggleBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  examToggleText: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  examToggleTextActive: {
    color: Theme.colors.card,
  },
  chartContainer: {
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  chartSubtitle: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: Theme.colors.textSec,
    padding: 20,
  },
  subjectTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  subjectName: {
    flex: 2,
    fontSize: 13,
    color: Theme.colors.text,
  },
  subjectMarks: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  subjectMax: {
    width: 60,
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
  branchSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  viewAllLeavesBtn: {
    backgroundColor: Theme.colors.background,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
  },
  viewAllLeavesText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
});
