import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
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
import { useAuth } from '../../context/AuthContext';
import {
  getSchoolCode,
  LEAVES_INITIAL_COUNT,
  type AttendanceRecord,
  type BranchTab,
  type ClassSection,
  type Exam,
  type ExamMark,
  type FilterPickerState,
  type LeaveRequest,
  type Student,
  type StudentExamData,
  type StudentMarkSummary,
  type Teacher,
  type TeacherAttendance,
} from '../../components/director/branchDetails';

export function useBranchDetails() {
  const route = useRoute();
  const { branchId, branchStatus } = route.params as {
    branchId: string;
    branchName?: string;
    principalName?: string;
    principalEmail?: string;
    branchStatus?: string;
  };
  const { setTabBarVisible } = useAuth();

  const [schoolCode, setSchoolCode] = useState('');
  const [activeTab, setActiveTab] = useState<BranchTab>('teachers');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showAllLeaves, setShowAllLeaves] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPicker, setFilterPicker] = useState<FilterPickerState | null>(null);

  const [examMarks, setExamMarks] = useState<ExamMark[]>([]);
  const [processedStudentData, setProcessedStudentData] = useState<StudentMarkSummary[]>([]);
  const [resultFilter, setResultFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [sortBy, setSortBy] = useState<'percentage' | 'name' | 'roll'>('percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState('');
  const [selectedSectionForAttendance, setSelectedSectionForAttendance] = useState('');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [attendanceType, setAttendanceType] = useState<'student' | 'teacher'>('student');
  const [teacherAttendanceData, setTeacherAttendanceData] = useState<TeacherAttendance[]>([]);
  const [teacherAttendanceSummary, setTeacherAttendanceSummary] = useState({ total: 0, present: 0, absent: 0, attendance_pct: 0 });
  const [teacherAttendanceFilter, setTeacherAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [teacherAttendanceLoading, setTeacherAttendanceLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentMarkSummary | null>(null);
  const [studentExamsData, setStudentExamsData] = useState<StudentExamData | null>(null);
  const [loadingExamsData, setLoadingExamsData] = useState(false);
  const [showAllExamsChart, setShowAllExamsChart] = useState(false);
  const [currentSelectedExamId, setCurrentSelectedExamId] = useState<number | null>(null);
  const [currentSelectedExamName, setCurrentSelectedExamName] = useState('');

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const loadCachedData = useCallback(async () => {
    if (!branchId) { return; }
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
        if (!value) { return; }
        const data = JSON.parse(value);
        if (key.includes('teachers')) { setTeachers(data); }
        else if (key.includes('students')) { setStudents(data); }
        else if (key.includes('classes')) { setClassSections(data); }
        else if (key.includes('leaves')) { setLeaveRequests(data); }
        else if (key.includes('exams')) { setExams(data); }
      });
    } catch (err) {
      console.error('Failed to load cached branch data:', err);
    }
  }, [branchId]);

  useEffect(() => {
    const load = async () => {
      setSchoolCode(await getSchoolCode());
      await loadCachedData();
    };
    load();
  }, [loadCachedData]);

  const fetchTeachers = useCallback(async () => {
    if (!branchId) { return; }
    const data = await getBranchTeachers(branchId);
    setTeachers(data);
    await AsyncStorage.setItem(`branch_teachers_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchStudents = useCallback(async () => {
    if (!branchId) { return; }
    const data = await getBranchStudents(branchId);
    setStudents(data);
    await AsyncStorage.setItem(`branch_students_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchClassSections = useCallback(async () => {
    if (!branchId) { return; }
    const data = await getClassesSections(branchId);
    setClassSections(data);
    await AsyncStorage.setItem(`branch_classes_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchLeaveRequests = useCallback(async (limit?: number) => {
    if (!branchId) { return; }
    setLoading(true);
    const data = await getBranchLeaves(branchId, limit);
    setLeaveRequests(data);
    if (!limit || limit === LEAVES_INITIAL_COUNT) {
      await AsyncStorage.setItem(`branch_leaves_${branchId}`, JSON.stringify(data));
    }
    setLoading(false);
  }, [branchId]);

  const fetchExams = useCallback(async () => {
    if (!branchId) { return; }
    const data = await getBranchExams(branchId);
    setExams(data);
    await AsyncStorage.setItem(`branch_exams_${branchId}`, JSON.stringify(data));
  }, [branchId]);

  const fetchExamMarks = useCallback(async (examId: string, classGrade: string, section: string) => {
    if (!examId || !branchId) { return; }
    setLoading(true);
    const data = await getExamMarks(branchId, examId, classGrade, section);
    setExamMarks(data);
    setLoading(false);
  }, [branchId]);

  const fetchStudentAttendance = useCallback(async (className: string, sectionName: string, date: string) => {
    try {
      const data = await getStudentAttendanceReport(schoolCode, branchId, className, sectionName, date);
      const allStudents = [
        ...(data.present || []).map((s: AttendanceRecord) => ({ ...s, status: 'PRESENT' })),
        ...(data.absent || []).map((s: AttendanceRecord) => ({ ...s, status: 'ABSENT' })),
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
    if (data) { setStudentExamsData(data); }
    setLoadingExamsData(false);
  }, []);

  useEffect(() => {
    if (branchId) {
      fetchTeachers();
      fetchStudents();
      fetchClassSections();
      fetchLeaveRequests(LEAVES_INITIAL_COUNT);
      fetchExams();
    }
  }, [branchId, fetchTeachers, fetchStudents, fetchClassSections, fetchLeaveRequests, fetchExams]);

  useEffect(() => {
    if (selectedExam) {
      fetchExamMarks(selectedExam, selectedClass, selectedSection);
    }
  }, [selectedExam, selectedClass, selectedSection, fetchExamMarks]);

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
      if (!isPassed) { student.failed_subjects++; }
    });

    const processed = Array.from(studentMap.values()).map(student => {
      const percentage = student.max_possible > 0 ? (student.total_marks / student.max_possible) * 100 : 0;
      const result: 'PASS' | 'FAIL' = student.failed_subjects === 0 ? 'PASS' : 'FAIL';
      return { ...student, percentage, result };
    });
    setProcessedStudentData(processed);
  }, [examMarks]);

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = [...processedStudentData];
    if (resultFilter !== 'ALL') { filtered = filtered.filter(s => s.result === resultFilter); }
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'percentage') { cmp = a.percentage - b.percentage; }
      else if (sortBy === 'name') { cmp = a.student_name.localeCompare(b.student_name); }
      else if (sortBy === 'roll') { cmp = (a.roll_number || '').localeCompare(b.roll_number || ''); }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [processedStudentData, resultFilter, sortBy, sortOrder]);

  const filteredTeachers = useMemo(() => {
    if (!searchTerm) { return teachers; }
    const term = searchTerm.toLowerCase();
    return teachers.filter(t =>
      t.teacher_full_name.toLowerCase().includes(term) ||
      t.employee_id?.toLowerCase().includes(term) ||
      t.department_subject?.toLowerCase().includes(term),
    );
  }, [teachers, searchTerm]);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    if (selectedClass) { filtered = filtered.filter(s => s.class_grade === selectedClass); }
    if (selectedSection) { filtered = filtered.filter(s => s.section === selectedSection); }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.student_full_name.toLowerCase().includes(term) ||
        s.roll_number?.toLowerCase().includes(term) ||
        s.admission_number?.toLowerCase().includes(term),
      );
    }
    return filtered;
  }, [students, selectedClass, selectedSection, searchTerm]);

  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'ALL') { return attendanceData; }
    return attendanceData.filter(s => s.status === attendanceFilter);
  }, [attendanceData, attendanceFilter]);

  const filteredTeacherAttendance = useMemo(() => {
    if (teacherAttendanceFilter === 'ALL') { return teacherAttendanceData; }
    return teacherAttendanceData.filter(t => t.status === teacherAttendanceFilter);
  }, [teacherAttendanceData, teacherAttendanceFilter]);

  const overallStats = useMemo(() => {
    const total = processedStudentData.length;
    const passed = processedStudentData.filter(s => s.result === 'PASS').length;
    const failed = total - passed;
    const avgPercentage = total > 0 ? processedStudentData.reduce((sum, s) => sum + s.percentage, 0) / total : 0;
    return { total, passed, failed, avgPercentage };
  }, [processedStudentData]);

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
    if ('student_full_name' in student) {
      setSelectedStudent({
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
      });
    } else {
      setSelectedStudent(student);
    }

    const currentExam = exams.find(e => e.exam_id === selectedExam);
    setCurrentSelectedExamId(selectedExam ? parseInt(selectedExam, 10) : null);
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
    if (!studentExamsData || !currentSelectedExamId) { return []; }
    const exam = studentExamsData.exams?.find(e => e.exam_id === currentSelectedExamId);
    if (!exam?.subjects) { return []; }
    return exam.subjects.map(subj => ({
      subject: subj.subject_name,
      percentage: (subj.marks_obtained / subj.max_marks) * 100,
      marks_obtained: subj.marks_obtained,
      max_marks: subj.max_marks,
    }));
  }, [studentExamsData, currentSelectedExamId]);

  const lineChartData = useMemo(() => {
    if (!studentExamsData?.exams) { return []; }
    return studentExamsData.exams.map(exam => {
      const examRow: Record<string, string | number> = { exam_name: exam.exam_name };
      exam.subjects?.forEach(subj => {
        examRow[subj.subject_name] = (subj.marks_obtained / subj.max_marks) * 100;
      });
      return examRow;
    });
  }, [studentExamsData]);

  const allSubjects = studentExamsData?.all_subjects || [];
  const currentExam = exams.find(e => e.exam_id === selectedExam);

  const classOptions = useMemo(
    () => [
      { label: 'All Classes', value: '' },
      ...classSections.map(cls => ({ label: `Class ${cls.class_name}`, value: cls.class_name })),
    ],
    [classSections],
  );

  const sectionOptions = useMemo(() => {
    if (!selectedClass) { return []; }
    const sections = classSections.find(c => c.class_name === selectedClass)?.sections ?? [];
    return [
      { label: 'All Sections', value: '' },
      ...sections.map(sec => ({ label: `Section ${sec}`, value: sec })),
    ];
  }, [classSections, selectedClass]);

  const examOptions = useMemo(
    () => exams.map(exam => ({ label: exam.exam_name, value: exam.exam_id })),
    [exams],
  );

  const classLabel = selectedClass ? `Class ${selectedClass}` : 'All Classes';
  const sectionLabel = selectedSection ? `Section ${selectedSection}` : 'All Sections';
  const examLabel = currentExam?.exam_name || 'Select Exam';

  const openClassPicker = (resetExam = false) => {
    setFilterPicker({
      visible: true,
      title: 'Select Class',
      options: classOptions,
      selectedValue: selectedClass,
      onValueChange: (value) => {
        setSelectedClass(value);
        setSelectedSection('');
        if (resetExam) { setSelectedExam(''); }
      },
    });
  };

  const openSectionPicker = (resetExam = false) => {
    setFilterPicker({
      visible: true,
      title: 'Select Section',
      options: sectionOptions,
      selectedValue: selectedSection,
      onValueChange: (value) => {
        setSelectedSection(value);
        if (resetExam) { setSelectedExam(''); }
      },
    });
  };

  const openExamPicker = () => {
    setFilterPicker({
      visible: true,
      title: 'Select Exam',
      options: examOptions,
      selectedValue: selectedExam,
      onValueChange: setSelectedExam,
    });
  };

  return {
    branchId,
    branchStatus,
    activeTab,
    setActiveTab,
    loading,
    refreshing,
    onRefresh,
    teachers,
    students,
    classSections,
    leaveRequests,
    showAllLeaves,
    setShowAllLeaves,
    fetchLeaveRequests,
    searchTerm,
    setSearchTerm,
    filterPicker,
    setFilterPicker,
    selectedClass,
    selectedSection,
    selectedExam,
    classLabel,
    sectionLabel,
    examLabel,
    openClassPicker,
    openSectionPicker,
    openExamPicker,
    filteredTeachers,
    filteredStudents,
    filteredAndSortedStudents,
    overallStats,
    processedStudentData,
    resultFilter,
    setResultFilter,
    sortBy,
    sortOrder,
    handleSort,
    handleStudentClick,
    showAttendanceModal,
    setShowAttendanceModal,
    selectedClassForAttendance,
    selectedSectionForAttendance,
    attendanceFilter,
    setAttendanceFilter,
    filteredAttendance,
    attendanceDate,
    showDatePicker,
    setShowDatePicker,
    attendanceType,
    setAttendanceType,
    handleAttendanceDateChange,
    handleViewStudentAttendance,
    handleFetchTeacherAttendance,
    studentCounts,
    teacherAttendanceLoading,
    teacherAttendanceData,
    teacherAttendanceSummary,
    teacherAttendanceFilter,
    setTeacherAttendanceFilter,
    filteredTeacherAttendance,
    selectedStudent,
    setSelectedStudent,
    studentExamsData,
    loadingExamsData,
    showAllExamsChart,
    setShowAllExamsChart,
    currentSelectedExamId,
    currentSelectedExamName,
    barChartData,
    lineChartData,
    allSubjects,
    currentExam,
  };
}
