import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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
  student_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string;
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
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </Text>
    </View>
  );
};

// Attendance Badge Component
const AttendanceBadge: React.FC<{ status: string }> = ({ status }) => {
  const isPresent = status === 'PRESENT';
  return (
    <View style={[styles.attendanceBadge, isPresent ? styles.attendancePresent : styles.attendanceAbsent]}>
      <Text style={[styles.attendanceText, isPresent ? styles.attendanceTextPresent : styles.attendanceTextAbsent]}>
        {isPresent ? '✓ Present' : '✗ Absent'}
      </Text>
    </View>
  );
};

// Result Badge Component
const ResultBadge: React.FC<{ result: string }> = ({ result }) => {
  const isPass = result === 'PASS';
  return (
    <View style={[styles.resultBadge, isPass ? styles.resultPass : styles.resultFail]}>
      <Text style={[styles.resultText, isPass ? styles.resultTextPass : styles.resultTextFail]}>
        {result}
      </Text>
    </View>
  );
};

// Grade Badge Component
const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const getGradeColor = () => {
    const g = grade?.toUpperCase() || '';
    if (g === 'A+' || g === 'A') return '#10b981';
    if (g === 'B') return '#3b82f6';
    if (g === 'C') return '#f97316';
    if (g === 'D') return '#d97706';
    return '#ef4444';
  };
  return (
    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor() + '20' }]}>
      <Text style={[styles.gradeText, { color: getGradeColor() }]}>{grade || '-'}</Text>
    </View>
  );
};

// Leave Status Badge
const LeaveStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const s = status?.toUpperCase() || '';
    if (s === 'APPROVED') return { bg: '#dcfce7', color: '#10b981', label: 'APPROVED' };
    if (s === 'REJECTED') return { bg: '#fee2e2', color: '#ef4444', label: 'REJECTED' };
    return { bg: '#fff7ed', color: '#f97316', label: 'PENDING' };
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.leaveBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.leaveText, { color: config.color }]}>{config.label}</Text>
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
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={styles.statIcon}>{icon}</Text>
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
      <Text style={styles.classTitle}>Class {branchClassName}</Text>
    </View>
    <View style={styles.sectionList}>
      {sections.map(section => (
        <TouchableOpacity
          key={section}
          style={styles.sectionBtn}
          onPress={() => onSelectSection(branchClassName, section)}
        >
          <Text style={styles.sectionName}>Section {section}</Text>
          <Text style={styles.sectionCount}>{studentCounts[`${branchClassName}-${section}`] || 0} students →</Text>
        </TouchableOpacity>
      ))}
    </View>
  </AppCard>
);

// Teacher Card Component
const TeacherCard: React.FC<{ teacher: Teacher }> = ({ teacher }) => (
  <AppCard style={styles.teacherCard}>
    <View style={styles.teacherHeader}>
      <Text style={styles.teacherName}>{teacher.teacher_full_name}</Text>
      <StatusBadge status={teacher.teacher_status} />
    </View>
    <Text style={styles.teacherId}>ID: {teacher.employee_id}</Text>
    <Text style={styles.teacherSubject}>📚 {teacher.department_subject || '—'}</Text>
    <Text style={styles.teacherContact}>📞 {teacher.mobile_number || '—'}</Text>
    <Text style={styles.teacherEmail}>✉️ {teacher.email_id || '—'}</Text>
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
        <Text style={styles.studentName}>{student.student_full_name}</Text>
        <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
      </View>
      <View style={styles.studentDetails}>
        <Text style={styles.studentInfo}>📚 Class {student.class_grade} - Section {student.section}</Text>
        <Text style={styles.studentInfo}>🎫 Adm: {student.admission_number}</Text>
        <Text style={styles.studentInfo}>👨 Father: {student.father_guardian_name}</Text>
      </View>
    </AppCard>
  </TouchableOpacity>
);

// Leave Card Component
const LeaveCard: React.FC<{ leave: LeaveRequest }> = ({ leave }) => (
  <AppCard style={styles.leaveCard}>
    <View style={styles.leaveHeader}>
      <Text style={styles.leaveStudent}>{leave.student_name}</Text>
      <LeaveStatusBadge status={leave.status} />
    </View>
    <Text style={styles.leaveDetails}>Roll: {leave.roll_number} | Class {leave.class_grade}-{leave.section}</Text>
    <Text style={styles.leaveDates}>📅 {formatDate(leave.from_date)} → {formatDate(leave.to_date)}</Text>
    <Text style={styles.leaveReason}>📝 {leave.reason}</Text>
  </AppCard>
);

// Marks Row Component
const MarksRow: React.FC<{
  student: StudentMarkSummary;
  onPress: (student: StudentMarkSummary) => void;
}> = ({ student, onPress }) => (
  <TouchableOpacity style={styles.marksRow} onPress={() => onPress(student)}>
    <View style={styles.marksRowHeader}>
      <Text style={styles.marksStudentName}>{student.student_name}</Text>
      <ResultBadge result={student.result} />
    </View>
    <View style={styles.marksRowDetails}>
      <Text style={styles.marksInfo}>Roll: {student.roll_number || '-'}</Text>
      <Text style={styles.marksInfo}>Class {student.class_grade}-{student.section}</Text>
      <Text style={[styles.marksPercentage, { color: student.percentage >= 60 ? '#10b981' : student.percentage >= 35 ? '#f97316' : '#ef4444' }]}>
        {student.percentage.toFixed(1)}%
      </Text>
    </View>
  </TouchableOpacity>
);

// Pass/Fail Pie Chart Component
const PassFailChart: React.FC<{ passed: number; failed: number; title: string }> = ({ passed, failed, title }) => {
  const total = passed + failed;
  if (total === 0) return null;
  
  const data = [
    { name: 'Passed', population: passed, color: '#10b981', legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Failed', population: failed, color: '#ef4444', legendFontColor: '#333', legendFontSize: 12 },
  ];
  
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
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
          <Text style={[styles.chartStatValue, { color: '#10b981' }]}>{passed}</Text>
          <Text style={styles.chartStatLabel}>Passed</Text>
        </View>
        <View style={styles.chartStat}>
          <Text style={[styles.chartStatValue, { color: '#ef4444' }]}>{failed}</Text>
          <Text style={styles.chartStatLabel}>Failed</Text>
        </View>
        <View style={styles.chartStat}>
          <Text style={styles.chartStatValue}>{total}</Text>
          <Text style={styles.chartStatLabel}>Total</Text>
        </View>
      </View>
    </View>
  );
};

export default function BranchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { branchId, branchName, hmName, hmEmail, branchStatus } = route.params as any;

  const [schoolCode, setSchoolCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'attendance' | 'leaves' | 'marks'>('teachers');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Data states
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
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

  // Load school code
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      setSchoolCode(code);
    };
    load();
  }, []);

  // Fetch data
  const fetchTeachers = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await API.get(`/principal/branch/${branchId}/teachers`);
      setTeachers(res.data.teachers || []);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  }, [branchId]);

  const fetchStudents = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await API.get(`/principal/branch/${branchId}/students`);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  }, [branchId]);

  const fetchClassSections = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await API.get(`/manage/classes-sections?branch_id=${branchId}`);
      setClassSections(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch class sections:', err);
    }
  }, [branchId]);

  const fetchLeaveRequests = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await API.get(`/principal/branch/${branchId}/leaves`);
      setLeaveRequests(res.data.leaves || []);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  }, [branchId]);

  const fetchExams = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await API.get(`/principal/branch/${branchId}/exams`);
      setExams(res.data?.exams || []);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      setExams([]);
    }
  }, [branchId]);

  const fetchExamMarks = useCallback(async (examId: string, classGrade: string, section: string) => {
    if (!examId || !branchId) return;
    setLoading(true);
    try {
      let url = `/principal/branch/${branchId}/exam/${examId}/marks`;
      const params = [];
      if (classGrade) params.push(`class_grade=${encodeURIComponent(classGrade)}`);
      if (section) params.push(`section=${encodeURIComponent(section)}`);
      if (params.length) url += `?${params.join('&')}`;
      const res = await API.get(url);
      setExamMarks(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch exam marks:', err);
      setExamMarks([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const fetchStudentAttendance = useCallback(async (className: string, sectionName: string, date: string) => {
    try {
      const res = await API.post('/manage/attendance/student/fetch-report', {
        school_code: schoolCode,
        branch_id: branchId,
        class_grade: className,
        section: sectionName,
        attendance_date: date,
      });
      const data = res.data || { present: [], absent: [] };
      const allStudents = [
        ...(data.present || []).map(s => ({ ...s, status: 'PRESENT' })),
        ...(data.absent || []).map(s => ({ ...s, status: 'ABSENT' })),
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
    try {
      const res = await API.get(`/principal/branch/${branchId}/teachers/attendance?date=${date}`);
      setTeacherAttendanceData(res.data?.items || []);
      setTeacherAttendanceSummary(res.data?.summary || { total: 0, present: 0, absent: 0, attendance_pct: 0 });
    } catch (err) {
      console.error('Failed to fetch teacher attendance:', err);
    } finally {
      setTeacherAttendanceLoading(false);
    }
  }, [branchId]);

  const fetchStudentExamsData = useCallback(async (studentId: string) => {
    setLoadingExamsData(true);
    try {
      const res = await API.get(`/principal/student/${studentId}/exams-data`);
      setStudentExamsData(res.data);
    } catch (err) {
      console.error('Failed to fetch student exam data:', err);
    } finally {
      setLoadingExamsData(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (branchId) {
      fetchTeachers();
      fetchStudents();
      fetchClassSections();
      fetchLeaveRequests();
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
      if (!isPassed) student.failed_subjects++;
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
    if (resultFilter !== 'ALL') filtered = filtered.filter(s => s.result === resultFilter);
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'percentage') cmp = a.percentage - b.percentage;
      else if (sortBy === 'name') cmp = a.student_name.localeCompare(b.student_name);
      else if (sortBy === 'roll') cmp = (a.roll_number || '').localeCompare(b.roll_number || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [processedStudentData, resultFilter, sortBy, sortOrder]);

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    if (!searchTerm) return teachers;
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
    if (selectedClass) filtered = filtered.filter(s => s.class_grade === selectedClass);
    if (selectedSection) filtered = filtered.filter(s => s.section === selectedSection);
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
    if (attendanceFilter === 'ALL') return attendanceData;
    return attendanceData.filter(s => s.status === attendanceFilter);
  }, [attendanceData, attendanceFilter]);

  // Filter teacher attendance
  const filteredTeacherAttendance = useMemo(() => {
    if (teacherAttendanceFilter === 'ALL') return teacherAttendanceData;
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
      fetchLeaveRequests(),
      fetchExams(),
    ]);
    setRefreshing(false);
  }, [fetchTeachers, fetchStudents, fetchClassSections, fetchLeaveRequests, fetchExams]);

  const handleSort = (column: 'percentage' | 'name' | 'roll') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'percentage' ? 'desc' : 'asc');
    }
  };

  const handleStudentClick = async (student: StudentMarkSummary) => {
    setSelectedStudent(student);
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
    if (!studentExamsData || !currentSelectedExamId) return [];
    const exam = studentExamsData.exams?.find(e => e.exam_id === currentSelectedExamId);
    if (!exam || !exam.subjects) return [];
    return exam.subjects.map(subj => ({
      subject: subj.subject_name,
      percentage: (subj.marks_obtained / subj.max_marks) * 100,
      marks_obtained: subj.marks_obtained,
      max_marks: subj.max_marks,
    }));
  }, [studentExamsData, currentSelectedExamId]);

  const lineChartData = useMemo(() => {
    if (!studentExamsData || !studentExamsData.exams) return [];
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
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
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
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{branchName || 'Branch Details'}</Text>
            <Text style={styles.subtitle}>Branch ID: {branchId}</Text>
          </View>
          <StatusBadge status={branchStatus || 'ACTIVE'} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Teachers" value={teachers.length} icon="👨‍🏫" color="#3b82f6" />
          <StatCard title="Total Students" value={students.length} icon="👨‍🎓" color="#10b981" />
          <StatCard title="Classes" value={classSections.length} icon="📚" color="#f97316" />
          <StatCard title="Pending Leaves" value={leaveRequests.filter(l => l.status === 'PENDING').length} icon="⏳" color="#ef4444" />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {['teachers', 'students', 'attendance', 'leaves', 'marks'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'teachers' && '👨‍🏫 Teachers'}
                {tab === 'students' && '👨‍🎓 Students'}
                {tab === 'attendance' && '📊 Attendance'}
                {tab === 'leaves' && '📋 Leaves'}
                {tab === 'marks' && '📝 Marks'}
              </Text>
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
                <Text style={styles.emptyIcon}>👨‍🏫</Text>
                <Text style={styles.emptyTitle}>No teachers found</Text>
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
                <Text style={styles.filterLabel}>Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity
                      style={[styles.chip, !selectedClass && styles.chipActive]}
                      onPress={() => { setSelectedClass(''); setSelectedSection(''); }}
                    >
                      <Text style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {classSections.map(cls => (
                      <TouchableOpacity
                        key={cls.class_name}
                        style={[styles.chip, selectedClass === cls.class_name && styles.chipActive]}
                        onPress={() => { setSelectedClass(cls.class_name); setSelectedSection(''); }}
                      >
                        <Text style={[styles.chipText, selectedClass === cls.class_name && styles.chipTextActive]}>
                          Class {cls.class_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedClass && (
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Section</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      <TouchableOpacity
                        style={[styles.chip, !selectedSection && styles.chipActive]}
                        onPress={() => setSelectedSection('')}
                      >
                        <Text style={[styles.chipText, !selectedSection && styles.chipTextActive]}>All</Text>
                      </TouchableOpacity>
                      {classSections.find(c => c.class_name === selectedClass)?.sections.map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, selectedSection === sec && styles.chipActive]}
                          onPress={() => setSelectedSection(sec)}
                        >
                          <Text style={[styles.chipText, selectedSection === sec && styles.chipTextActive]}>
                            Section {sec}
                          </Text>
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
                <Text style={styles.emptyIcon}>👨‍🎓</Text>
                <Text style={styles.emptyTitle}>No students found</Text>
              </AppCard>
            ) : (
              filteredStudents.map(student => (
                <StudentCard key={student.student_id} student={student} onPress={() => {}} />
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
                  <Text style={[styles.attendanceTypeText, attendanceType === 'student' && styles.attendanceTypeTextActive]}>
                    📚 Student Attendance
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.attendanceTypeBtn, attendanceType === 'teacher' && styles.attendanceTypeBtnActive]}
                  onPress={() => setAttendanceType('teacher')}
                >
                  <Text style={[styles.attendanceTypeText, attendanceType === 'teacher' && styles.attendanceTypeTextActive]}>
                    👩‍🏫 Teacher Attendance
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.attendanceDateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateText}>📅 {attendanceDate}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(attendanceDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) handleAttendanceDateChange(date);
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
                  <Text style={styles.emptyIcon}>👩‍🏫</Text>
                  <Text style={styles.emptyTitle}>No teacher attendance data</Text>
                  <Text style={styles.emptyText}>Select a date and click "Fetch Attendance"</Text>
                </AppCard>
              ) : (
                <>
                  <View style={styles.attendanceSummary}>
                    <Text style={styles.attendanceSummaryText}>
                      Present: {teacherAttendanceSummary.present} / {teacherAttendanceSummary.total} ({teacherAttendanceSummary.attendance_pct}%)
                    </Text>
                    <View style={styles.attendanceFilterRow}>
                      {['ALL', 'PRESENT', 'ABSENT'].map(filter => (
                        <TouchableOpacity
                          key={filter}
                          style={[styles.filterChip, teacherAttendanceFilter === filter && styles.filterChipActive]}
                          onPress={() => setTeacherAttendanceFilter(filter as any)}
                        >
                          <Text style={[styles.filterChipText, teacherAttendanceFilter === filter && styles.filterChipTextActive]}>
                            {filter === 'ALL' ? 'All' : filter === 'PRESENT' ? 'Present' : 'Absent'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {filteredTeacherAttendance.map((teacher, idx) => (
                    <AppCard key={idx} style={styles.teacherAttendanceCard}>
                      <Text style={styles.teacherAttendanceName}>{teacher.teacher_full_name}</Text>
                      <Text style={styles.teacherAttendanceId}>ID: {teacher.employee_id}</Text>
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
          leaveRequests.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No leave requests</Text>
            </AppCard>
          ) : (
            leaveRequests.map(leave => <LeaveCard key={leave.leave_id} leave={leave} />)
          )
        )}

        {/* Marks Tab */}
        {activeTab === 'marks' && (
          <>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity
                      style={[styles.chip, !selectedClass && styles.chipActive]}
                      onPress={() => { setSelectedClass(''); setSelectedSection(''); setSelectedExam(''); }}
                    >
                      <Text style={[styles.chipText, !selectedClass && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {classSections.map(cls => (
                      <TouchableOpacity
                        key={cls.class_name}
                        style={[styles.chip, selectedClass === cls.class_name && styles.chipActive]}
                        onPress={() => { setSelectedClass(cls.class_name); setSelectedSection(''); setSelectedExam(''); }}
                      >
                        <Text style={[styles.chipText, selectedClass === cls.class_name && styles.chipTextActive]}>
                          Class {cls.class_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedClass && (
                <View style={styles.filterField}>
                  <Text style={styles.filterLabel}>Section</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      <TouchableOpacity
                        style={[styles.chip, !selectedSection && styles.chipActive]}
                        onPress={() => { setSelectedSection(''); setSelectedExam(''); }}
                      >
                        <Text style={[styles.chipText, !selectedSection && styles.chipTextActive]}>All</Text>
                      </TouchableOpacity>
                      {classSections.find(c => c.class_name === selectedClass)?.sections.map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, selectedSection === sec && styles.chipActive]}
                          onPress={() => { setSelectedSection(sec); setSelectedExam(''); }}
                        >
                          <Text style={[styles.chipText, selectedSection === sec && styles.chipTextActive]}>
                            Section {sec}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Exam</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {exams.map(exam => (
                      <TouchableOpacity
                        key={exam.exam_id}
                        style={[styles.chip, selectedExam === exam.exam_id && styles.chipActive]}
                        onPress={() => setSelectedExam(exam.exam_id)}
                      >
                        <Text style={[styles.chipText, selectedExam === exam.exam_id && styles.chipTextActive]}>
                          {exam.exam_name}
                        </Text>
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
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>Select an exam to view marks</Text>
              </AppCard>
            ) : processedStudentData.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No exam data found</Text>
              </AppCard>
            ) : (
              <>
                {/* Summary Stats */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Students</Text>
                    <Text style={styles.summaryValue}>{overallStats.total}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Passed</Text>
                    <Text style={[styles.summaryValue, { color: '#a7f3d0' }]}>{overallStats.passed}</Text>
                    <Text style={styles.summarySub}>{overallStats.total > 0 ? ((overallStats.passed / overallStats.total) * 100).toFixed(1) : 0}%</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Failed</Text>
                    <Text style={[styles.summaryValue, { color: '#fecaca' }]}>{overallStats.failed}</Text>
                    <Text style={styles.summarySub}>{overallStats.total > 0 ? ((overallStats.failed / overallStats.total) * 100).toFixed(1) : 0}%</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average</Text>
                    <Text style={styles.summaryValue}>{overallStats.avgPercentage.toFixed(1)}%</Text>
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
                        <Text style={[styles.filterChipText, resultFilter === filter && styles.filterChipTextActive]}>
                          {filter === 'ALL' ? 'All' : filter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    {(['percentage', 'name', 'roll'] as const).map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.sortBtn, sortBy === opt && styles.sortBtnActive]}
                        onPress={() => handleSort(opt)}
                      >
                        <Text style={[styles.sortBtnText, sortBy === opt && styles.sortBtnTextActive]}>
                          {opt === 'percentage' ? 'Score' : opt === 'name' ? 'Name' : 'Roll'}
                          {sortBy === opt && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </Text>
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
              <Text style={styles.modalTitle}>
                Attendance - Class {selectedClassForAttendance} Section {selectedSectionForAttendance}
              </Text>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.attendanceFilterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, attendanceFilter === 'ALL' && styles.filterChipActive]}
                  onPress={() => setAttendanceFilter('ALL')}
                >
                  <Text style={[styles.filterChipText, attendanceFilter === 'ALL' && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, attendanceFilter === 'PRESENT' && styles.filterChipActive]}
                  onPress={() => setAttendanceFilter('PRESENT')}
                >
                  <Text style={[styles.filterChipText, attendanceFilter === 'PRESENT' && styles.filterChipTextActive]}>Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, attendanceFilter === 'ABSENT' && styles.filterChipActive]}
                  onPress={() => setAttendanceFilter('ABSENT')}
                >
                  <Text style={[styles.filterChipText, attendanceFilter === 'ABSENT' && styles.filterChipTextActive]}>Absent</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                {filteredAttendance.map((item, idx) => (
                  <View key={idx} style={styles.attendanceRow}>
                    <Text style={styles.attendanceRoll}>{item.roll_number || '-'}</Text>
                    <Text style={styles.attendanceName}>{item.student_full_name || item.name || '-'}</Text>
                    <AttendanceBadge status={item.status} />
                  </View>
                ))}
                {filteredAttendance.length === 0 && (
                  <Text style={styles.emptyText}>No attendance data found</Text>
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
              <Text style={styles.modalTitle}>{selectedStudent?.student_name}</Text>
              <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedStudent && (
                <>
                  <View style={styles.studentInfoGrid}>
                    <Text style={styles.studentInfoItem}>Roll: {selectedStudent.roll_number || '-'}</Text>
                    <Text style={styles.studentInfoItem}>Class {selectedStudent.class_grade}-{selectedStudent.section}</Text>
                    <Text style={styles.studentInfoItem}>Total: {selectedStudent.total_marks}/{selectedStudent.max_possible}</Text>
                    <Text style={[styles.studentInfoItem, { fontWeight: '700', color: selectedStudent.percentage >= 60 ? '#10b981' : selectedStudent.percentage >= 35 ? '#f97316' : '#ef4444' }]}>
                      {selectedStudent.percentage.toFixed(1)}%
                    </Text>
                    <ResultBadge result={selectedStudent.result} />
                  </View>

                  {/* Exam Performance Section */}
                  {loadingExamsData ? (
                    <Loader />
                  ) : studentExamsData && studentExamsData.exams && studentExamsData.exams.length > 0 ? (
                    <View style={styles.examSection}>
                      <View style={styles.examHeader}>
                        <Text style={styles.examTitle}>📊 Exam Performance</Text>
                        <View style={styles.examToggle}>
                          <TouchableOpacity
                            style={[styles.examToggleBtn, !showAllExamsChart && styles.examToggleBtnActive]}
                            onPress={() => setShowAllExamsChart(false)}
                          >
                            <Text style={[styles.examToggleText, !showAllExamsChart && styles.examToggleTextActive]}>Single Exam</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.examToggleBtn, showAllExamsChart && styles.examToggleBtnActive]}
                            onPress={() => setShowAllExamsChart(true)}
                          >
                            <Text style={[styles.examToggleText, showAllExamsChart && styles.examToggleTextActive]}>All Exams</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {!showAllExamsChart ? (
                        currentSelectedExamId && barChartData.length > 0 ? (
                          <View style={styles.chartContainer}>
                            <Text style={styles.chartSubtitle}>{currentSelectedExamName} - Subject-wise Percentage</Text>
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
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
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
                          <Text style={styles.noDataText}>No data available for the selected exam</Text>
                        )
                      ) : lineChartData.length > 0 && allSubjects.length > 0 ? (
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartSubtitle}>Percentage Trend Across Exams</Text>
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
                              backgroundColor: '#ffffff',
                              backgroundGradientFrom: '#ffffff',
                              backgroundGradientTo: '#ffffff',
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
                        <Text style={styles.noDataText}>No data available for trend analysis</Text>
                      )}
                    </View>
                  ) : null}

                  {/* Subject-wise Marks Table */}
                  <Text style={styles.subjectTitle}>Subject-wise Marks</Text>
                  {selectedStudent.marks.map((mark, idx) => (
                    <View key={idx} style={styles.subjectRow}>
                      <Text style={styles.subjectName}>{mark.subject_name}</Text>
                      <Text style={styles.subjectMarks}>{mark.marks_obtained}</Text>
                      <Text style={styles.subjectMax}>{mark.max_marks}</Text>
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
    backgroundColor: '#f3f6fb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: '#0f172a',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  statTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statIcon: {
    fontSize: 28,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  filterRow: {
    marginBottom: 16,
    gap: 12,
  },
  filterField: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
  },
  chipTextActive: {
    color: '#fff',
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
  teacherCard: {
    padding: 16,
    marginBottom: 12,
  },
  teacherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  teacherId: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  teacherSubject: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  teacherContact: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  teacherEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  studentCard: {
    padding: 16,
    marginBottom: 12,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  studentRoll: {
    fontSize: 12,
    color: '#64748b',
  },
  studentDetails: {
    gap: 4,
  },
  studentInfo: {
    fontSize: 12,
    color: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
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
    paddingVertical: 4,
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
    fontSize: 11,
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
    paddingVertical: 4,
    borderRadius: 20,
  },
  resultPass: {
    backgroundColor: '#dcfce7',
  },
  resultFail: {
    backgroundColor: '#fee2e2',
  },
  resultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultTextPass: {
    color: '#15803d',
  },
  resultTextFail: {
    color: '#b91c1c',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leaveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  leaveText: {
    fontSize: 11,
    fontWeight: '600',
  },
  leaveCard: {
    padding: 16,
    marginBottom: 12,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveStudent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  leaveDetails: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  leaveDates: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  leaveReason: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  classCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  classHeader: {
    backgroundColor: '#3b82f6',
    padding: 14,
  },
  classTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
    borderBottomColor: '#e2e8f0',
  },
  sectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748b',
  },
  attendanceControls: {
    marginBottom: 16,
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  attendanceTypeBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  attendanceTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  attendanceTypeTextActive: {
    color: '#fff',
  },
  attendanceDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  dateText: {
    fontSize: 13,
    color: '#0f172a',
  },
  attendanceSummary: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  attendanceSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  attendanceFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  teacherAttendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
  },
  teacherAttendanceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  teacherAttendanceId: {
    fontSize: 11,
    color: '#64748b',
    marginHorizontal: 8,
  },
  marksRow: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  marksRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marksStudentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  marksRowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marksInfo: {
    fontSize: 12,
    color: '#64748b',
  },
  marksPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  marksControls: {
    marginBottom: 16,
    gap: 12,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  sortBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  summaryCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: 'linear-gradient(135deg, #667eea, #764ba2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  summarySub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  chartStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  attendanceRoll: {
    width: 60,
    fontSize: 12,
    color: '#64748b',
  },
  attendanceName: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  studentInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  studentInfoItem: {
    fontSize: 13,
    color: '#0f172a',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  examToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  examToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  examToggleBtnActive: {
    backgroundColor: '#3b82f6',
  },
  examToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  examToggleTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#64748b',
    padding: 20,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subjectName: {
    flex: 2,
    fontSize: 13,
    color: '#0f172a',
  },
  subjectMarks: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  subjectMax: {
    width: 60,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});