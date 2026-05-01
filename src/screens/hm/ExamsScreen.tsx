import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  RefreshCw,
  Plus,
  BarChart2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import { HM_THEME as C } from '../../constants/hmTheme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { formatErrorMessage } from '../../utils/helpers';


// Types
interface Exam {
  exam_id: number;
  exam_name: string;
  academic_year: string;
  subject_count: number;
  total_max_marks?: number;
  creation_date: string;
}

interface SubjectMark {
  subject_name: string;
  max_marks: number;
  marks_obtained: number;
  percentage: number;
  grade: string;
}

interface StudentMarks {
  student_id: number;
  student_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  subjects: SubjectMark[];
  total_marks: number;
  total_max_marks: number;
  overall_percentage: number;
  overall_grade: string;
}

interface MarksReport {
  exam_name: string;
  academic_year: string;
  students: StudentMarks[];
}

export default function ExamsPage() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'classwise'>('list');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [marksReport, setMarksReport] = useState<MarksReport | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ exam_name: '', academic_year: '' });
  const [showClasswiseModal, setShowClasswiseModal] = useState(false);

  // Load credentials from storage
  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
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

  const loadCredentials = async () => {
    try {
      const storedSchoolCode = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';
      
      const storedBranchId = await AsyncStorage.getItem('branch_id') ||
        await AsyncStorage.getItem('branchId') ||
        await AsyncStorage.getItem('branch_code') ||
        await AsyncStorage.getItem('branchCode') || '';

      setSchoolCode(storedSchoolCode);
      setBranchId(storedBranchId);
      
      if (storedSchoolCode && storedBranchId) {
        loadExams(storedSchoolCode, storedBranchId);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  const getHeaders = () => {
    const headers: any = {};
    if (schoolCode) headers['X-School-Code'] = schoolCode;
    if (branchId) headers['X-Branch-Id'] = branchId;
    return headers;
  };

  const loadExams = async (code?: string, branch?: string) => {
    const school = code || schoolCode;
    const branchIdVal = branch || branchId;
    
    if (!school || !branchIdVal) {
      setError('Missing school or branch context. Please login again.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await API.get('/hm/exams/list', { headers: getHeaders() });
      const examsData = res.data?.items || [];
      const processedExams = examsData.map((exam: any) => ({
        ...exam,
        subject_count: exam.subject_count || 0,
      }));
      setExams(processedExams);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to load exams';
      setError(detail);
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    setRefreshing(false);
  };

  const createExam = async () => {
    if (!formData.exam_name.trim() || !formData.academic_year.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await API.post('/hm/exams/create', formData, { headers: getHeaders() });
      setFormData({ exam_name: '', academic_year: '' });
      await loadExams();
      setActiveTab('list');
      Alert.alert('Success', 'Exam created successfully');
    } catch (err: any) {
      const detail = formatErrorMessage(err?.response?.data?.detail) || err?.message || 'Failed to create exam';
      setError(detail);
      Alert.alert('Error', detail);
    } finally {
      setLoading(false);
    }
  };

  const viewClasswisePerformance = async (examId: number) => {
    setLoading(true);
    setError('');
    
    try {
      const res = await API.get(`/hm/exams/${examId}/marks`, { headers: getHeaders() });
      setMarksReport(res.data);
      setSelectedExam(examId);
      setActiveTab('classwise');
    } catch (err: any) {
      const detail = formatErrorMessage(err?.response?.data?.detail) || err?.message || 'Failed to load marks';
      setError(detail);
      Alert.alert('Error', detail);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return C.success;
      case 'B': return C.primary;
      case 'C': return C.warning;
      case 'D': return C.warning;
      case 'E': return C.warning;
      default: return C.error;
    }
  };

  const renderExamCard = (exam: Exam) => (
    <TouchableOpacity
      key={exam.exam_id}
      style={styles.examCard}
      onPress={() => viewClasswisePerformance(exam.exam_id)}
    >
      <View style={styles.examCardHead}>
        <AppText style={styles.examName} weight="bold">{exam.exam_name}</AppText>
        <View style={styles.badgeGroup}>
          <View style={styles.badge}>
            <AppText style={styles.badgeText} weight="bold">{exam.subject_count} Subjects</AppText>
          </View>
        </View>
      </View>
      
      <View style={styles.examInfo}>
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel} weight="semiBold">Academic Year</AppText>
          <AppText style={styles.infoValue} weight="bold">{exam.academic_year}</AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel} weight="semiBold">Total Max Marks</AppText>
          <AppText style={styles.infoValue} weight="bold">{exam.total_max_marks || '—'}</AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel} weight="semiBold">Created</AppText>
          <AppText style={styles.infoValue} weight="bold">{new Date(exam.creation_date).toLocaleDateString()}</AppText>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.actionBtnSecondary}
        onPress={() => viewClasswisePerformance(exam.exam_id)}
      >
        <BarChart2 size={14} color={C.primary} />
        <AppText style={styles.actionBtnSecondaryText} weight="bold">📊 Class-wise Performance</AppText>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStudentRow = (student: StudentMarks, index: number) => (
    <View key={student.student_id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
      <View style={styles.tableCellName}>
        <AppText style={styles.studentName} weight="semiBold">{student.student_name}</AppText>
        <AppText style={styles.rollNumber}>Roll: {student.roll_number}</AppText>
      </View>
      <View style={styles.tableCellClass}>
        <AppText style={styles.classText}>{student.class_grade} - {student.section}</AppText>
      </View>
      <View style={styles.tableCellSubjects}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {student.subjects.map((subject, idx) => (
            <View key={idx} style={styles.subjectChip}>
              <AppText style={styles.subjectName} weight="semiBold">{subject.subject_name}</AppText>
              <AppText style={styles.subjectMarks}>
                {subject.marks_obtained}/{subject.max_marks}
              </AppText>
              <AppText style={[styles.subjectGrade, { color: getGradeColor(subject.grade) }]} weight="bold">
                {subject.grade}
              </AppText>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.tableCellTotal}>
        <AppText style={styles.totalMarks} weight="semiBold">
          {student.total_marks}/{student.total_max_marks}
        </AppText>
        <AppText style={[styles.percentage, { color: getGradeColor(student.overall_grade) }]} weight="bold">
          {student.overall_percentage}%
        </AppText>
        <AppText style={[styles.grade, { color: getGradeColor(student.overall_grade) }]} weight="bold">
          Grade: {student.overall_grade}
        </AppText>
      </View>
    </View>
  );

  const renderListTab = () => (
    <ScrollView 
      style={styles.tabContent}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
      }
    >
      {loading && exams.length === 0 ? (
        <View style={styles.noData}>
          <ActivityIndicator size="large" color={C.primary} />
          <AppText style={styles.noDataText}>Loading exams...</AppText>
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.noData}>
          <AppText style={styles.noDataText}>No exams created yet. Create your first exam!</AppText>
        </View>
      ) : (
        <View style={styles.examGrid}>
          {exams.map(renderExamCard)}
        </View>
      )}
    </ScrollView>
  );

  const renderAddTab = () => (
    <ScrollView
      style={styles.tabContent}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.formPanel}>
        <AppText style={styles.formTitle} weight="bold">Create New Exam</AppText>
        
        <View style={styles.formGroup}>
          <AppText style={styles.label} weight="bold">Exam Name</AppText>
          <TextInput
            style={styles.input}
            placeholder="Mid Term, Final, etc."
            placeholderTextColor={C.textMuted}
            value={formData.exam_name}
            onChangeText={(text) => setFormData({ ...formData, exam_name: text })}
          />
        </View>
        
        <View style={styles.formGroup}>
          <AppText style={styles.label} weight="bold">Academic Year</AppText>
          <TextInput
            style={styles.input}
            placeholder="2024-25"
            placeholderTextColor={C.textMuted}
            value={formData.academic_year}
            onChangeText={(text) => setFormData({ ...formData, academic_year: text })}
          />
        </View>
        
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={createExam}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Plus size={14} color="#fff" />
              <AppText style={styles.submitBtnText} weight="bold">Create Exam</AppText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderClasswiseTab = () => {
    if (!marksReport || !marksReport.students) {
      return (
        <View style={styles.noData}>
          <ActivityIndicator size="large" color={C.primary} />
          <AppText style={styles.noDataText}>Loading performance data...</AppText>
        </View>
      );
    }

    // Group students by class and section
    const groupedStudents: Record<string, StudentMarks[]> = {};
    marksReport.students.forEach(student => {
      const key = `${student.class_grade}-${student.section}`;
      if (!groupedStudents[key]) groupedStudents[key] = [];
      groupedStudents[key].push(student);
    });

    return (
      <ScrollView
        style={styles.tabContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.infoPanel}>
          <AppText style={styles.infoTitle} weight="bold">{marksReport.exam_name}</AppText>
          <AppText style={styles.infoSubtitle}>Academic Year: {marksReport.academic_year}</AppText>
        </View>

        {Object.entries(groupedStudents).map(([classSection, students]) => {
          const [classGrade, section] = classSection.split('-');
          return (
            <View key={classSection} style={styles.classSectionContainer}>
              <View style={styles.classSectionHeader}>
                <AppText style={styles.classSectionTitle} weight="bold">
                  Class {classGrade} - Section {section}
                </AppText>
                <AppText style={styles.studentCount}>{students.length} Students</AppText>
              </View>

              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <AppText style={[styles.headerCell, styles.headerCellName]} weight="bold">Student</AppText>
                  <AppText style={[styles.headerCell, styles.headerCellClass]} weight="bold">Class</AppText>
                  <AppText style={[styles.headerCell, styles.headerCellSubjects]} weight="bold">Subjects</AppText>
                  <AppText style={[styles.headerCell, styles.headerCellTotal]} weight="bold">Total/Grade</AppText>
                </View>

                {/* Table Rows */}
                {students.map((student, idx) => renderStudentRow(student, idx))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HMDashboard' as never))}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Exam Management</AppText>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={() => loadExams()}>
          <RefreshCw size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <AppText style={styles.errorText}>⚠ {error}</AppText>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <AppText style={[styles.tabText, activeTab === 'list' && styles.activeTabText]} weight="semiBold">
            📋 All Exams
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <AppText style={[styles.tabText, activeTab === 'add' && styles.activeTabText]} weight="semiBold">
            ➕ Create Exam
          </AppText>
        </TouchableOpacity>
        {selectedExam && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'classwise' && styles.activeTab]}
            onPress={() => setActiveTab('classwise')}
          >
            <AppText style={[styles.tabText, activeTab === 'classwise' && styles.activeTabText]} weight="semiBold">
              📈 Class-wise Performance
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Content */}
      {activeTab === 'list' && renderListTab()}
      {activeTab === 'add' && renderAddTab()}
      {activeTab === 'classwise' && renderClasswiseTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    color: C.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    fontSize: 12,
    color: '#fff',
  },
  errorContainer: {
    backgroundColor: C.errorSoft,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.error,
  },
  errorText: {
    fontSize: 14,
    color: C.error,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    color: C.textMuted,
  },
  activeTabText: {
    color: C.primary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  examGrid: {
    gap: 16,
    paddingBottom: 20,
  },
  examCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    marginBottom: 16,
  },
  examCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  examName: {
    fontSize: 15,
    color: C.text,
    flex: 1,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: C.primary,
    textTransform: 'uppercase',
  },
  examInfo: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: C.textMuted,
  },
  infoValue: {
    fontSize: 12,
    color: C.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    color: C.primary,
  },
  formPanel: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    marginBottom: 20,
    color: C.text,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: C.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: C.bg,
    color: C.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.success,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    color: '#fff',
  },
  noData: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 12,
  },
  infoPanel: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    color: C.text,
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    color: C.textMuted,
  },
  classSectionContainer: {
    marginBottom: 24,
  },
  classSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  classSectionTitle: {
    fontSize: 16,
    color: C.text,
  },
  studentCount: {
    fontSize: 12,
    color: C.textMuted,
  },
  tableContainer: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCell: {
    fontSize: 12,
    color: C.text,
  },
  headerCellName: {
    width: '25%',
  },
  headerCellClass: {
    width: '15%',
  },
  headerCellSubjects: {
    width: '40%',
  },
  headerCellTotal: {
    width: '20%',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.bg + '50',
  },
  tableCellName: {
    width: '25%',
  },
  studentName: {
    fontSize: 13,
    color: C.text,
  },
  rollNumber: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  tableCellClass: {
    width: '15%',
    justifyContent: 'center',
  },
  classText: {
    fontSize: 12,
    color: C.text,
  },
  tableCellSubjects: {
    width: '40%',
  },
  subjectChip: {
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 80,
  },
  subjectName: {
    fontSize: 11,
    color: C.text,
  },
  subjectMarks: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
  },
  subjectGrade: {
    fontSize: 10,
    marginTop: 2,
  },
  tableCellTotal: {
    width: '20%',
    alignItems: 'flex-end',
  },
  totalMarks: {
    fontSize: 12,
    color: C.text,
  },
  percentage: {
    fontSize: 11,
    marginTop: 2,
  },
  grade: {
    fontSize: 11,
    marginTop: 2,
  },
});
