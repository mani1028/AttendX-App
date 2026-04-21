import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

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
  }, []);

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
      const detail = err?.response?.data?.detail || err?.message || 'Failed to create exam';
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
      const detail = err?.response?.data?.detail || err?.message || 'Failed to load marks';
      setError(detail);
      Alert.alert('Error', detail);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return '#059669';
      case 'B': return '#2563eb';
      case 'C': return '#d97706';
      case 'D': return '#f59e0b';
      case 'E': return '#f59e0b';
      default: return '#dc2626';
    }
  };

  const renderExamCard = (exam: Exam) => (
    <TouchableOpacity
      key={exam.exam_id}
      style={styles.examCard}
      onPress={() => viewClasswisePerformance(exam.exam_id)}
    >
      <View style={styles.examCardHead}>
        <Text style={styles.examName}>{exam.exam_name}</Text>
        <View style={styles.badgeGroup}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{exam.subject_count} Subjects</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.examInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Academic Year</Text>
          <Text style={styles.infoValue}>{exam.academic_year}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Max Marks</Text>
          <Text style={styles.infoValue}>{exam.total_max_marks || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>{new Date(exam.creation_date).toLocaleDateString()}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.actionBtnSecondary}
        onPress={() => viewClasswisePerformance(exam.exam_id)}
      >
        <Icon name="bar-chart-2" size={14} color="#2563eb" />
        <Text style={styles.actionBtnSecondaryText}>📊 Class-wise Performance</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStudentRow = (student: StudentMarks, index: number) => (
    <View key={student.student_id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
      <View style={styles.tableCellName}>
        <Text style={styles.studentName}>{student.student_name}</Text>
        <Text style={styles.rollNumber}>Roll: {student.roll_number}</Text>
      </View>
      <View style={styles.tableCellClass}>
        <Text style={styles.classText}>{student.class_grade} - {student.section}</Text>
      </View>
      <View style={styles.tableCellSubjects}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {student.subjects.map((subject, idx) => (
            <View key={idx} style={styles.subjectChip}>
              <Text style={styles.subjectName}>{subject.subject_name}</Text>
              <Text style={styles.subjectMarks}>
                {subject.marks_obtained}/{subject.max_marks}
              </Text>
              <Text style={[styles.subjectGrade, { color: getGradeColor(subject.grade) }]}>
                {subject.grade}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.tableCellTotal}>
        <Text style={styles.totalMarks}>
          {student.total_marks}/{student.total_max_marks}
        </Text>
        <Text style={[styles.percentage, { color: getGradeColor(student.overall_grade) }]}>
          {student.overall_percentage}%
        </Text>
        <Text style={[styles.grade, { color: getGradeColor(student.overall_grade) }]}>
          Grade: {student.overall_grade}
        </Text>
      </View>
    </View>
  );

  const renderListTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {loading && exams.length === 0 ? (
        <View style={styles.noData}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.noDataText}>Loading exams...</Text>
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No exams created yet. Create your first exam!</Text>
        </View>
      ) : (
        <View style={styles.examGrid}>
          {exams.map(renderExamCard)}
        </View>
      )}
    </ScrollView>
  );

  const renderAddTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.formPanel}>
        <Text style={styles.formTitle}>Create New Exam</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Exam Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Mid Term, Final, etc."
            value={formData.exam_name}
            onChangeText={(text) => setFormData({ ...formData, exam_name: text })}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Academic Year</Text>
          <TextInput
            style={styles.input}
            placeholder="2024-25"
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
              <Icon name="plus" size={14} color="#fff" />
              <Text style={styles.submitBtnText}>Create Exam</Text>
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
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.noDataText}>Loading performance data...</Text>
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
      <ScrollView style={styles.tabContent}>
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>{marksReport.exam_name}</Text>
          <Text style={styles.infoSubtitle}>Academic Year: {marksReport.academic_year}</Text>
        </View>

        {Object.entries(groupedStudents).map(([classSection, students]) => {
          const [classGrade, section] = classSection.split('-');
          return (
            <View key={classSection} style={styles.classSectionContainer}>
              <View style={styles.classSectionHeader}>
                <Text style={styles.classSectionTitle}>
                  Class {classGrade} - Section {section}
                </Text>
                <Text style={styles.studentCount}>{students.length} Students</Text>
              </View>

              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.headerCellName]}>Student</Text>
                  <Text style={[styles.headerCell, styles.headerCellClass]}>Class</Text>
                  <Text style={[styles.headerCell, styles.headerCellSubjects]}>Subjects</Text>
                  <Text style={[styles.headerCell, styles.headerCellTotal]}>Total/Grade</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Exam Management 📚</Text>
          <Text style={styles.subtitle}>Create exams and view performance analytics</Text>
        </View>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadExams()}>
            <Icon name="refresh-cw" size={14} color="#4a5568" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setActiveTab('add')}>
            <Icon name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>New Exam</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            📋 All Exams
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
            ➕ Create Exam
          </Text>
        </TouchableOpacity>
        {selectedExam && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'classwise' && styles.activeTab]}
            onPress={() => setActiveTab('classwise')}
          >
            <Text style={[styles.tabText, activeTab === 'classwise' && styles.activeTabText]}>
              📈 Class-wise Performance
            </Text>
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
    backgroundColor: '#f0f2f7',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d1b2a',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8898aa',
    marginTop: 4,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e4e9f2',
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
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8898aa',
  },
  activeTabText: {
    color: '#2563eb',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
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
    fontWeight: '700',
    color: '#0d1b2a',
    flex: 1,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: '#7daded',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d1b2a',
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
    fontWeight: '600',
    color: '#8898aa',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d1b2a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f7f9fc',
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    paddingVertical: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  formPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    color: '#0d1b2a',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#8898aa',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f7f9fc',
    color: '#0d1b2a',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  noData: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#8898aa',
    marginTop: 12,
  },
  infoPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#8898aa',
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
    fontWeight: '700',
    color: '#0d1b2a',
  },
  studentCount: {
    fontSize: 12,
    color: '#8898aa',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fc',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  headerCell: {
    fontWeight: '700',
    fontSize: 12,
    color: '#0d1b2a',
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
    borderBottomColor: '#e4e9f2',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCellName: {
    width: '25%',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  rollNumber: {
    fontSize: 11,
    color: '#8898aa',
    marginTop: 2,
  },
  tableCellClass: {
    width: '15%',
    justifyContent: 'center',
  },
  classText: {
    fontSize: 12,
    color: '#4a5568',
  },
  tableCellSubjects: {
    width: '40%',
  },
  subjectChip: {
    backgroundColor: '#f0f2f7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 80,
  },
  subjectName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  subjectMarks: {
    fontSize: 10,
    color: '#4a5568',
    marginTop: 2,
  },
  subjectGrade: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  tableCellTotal: {
    width: '20%',
    alignItems: 'flex-end',
  },
  totalMarks: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  percentage: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  grade: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});

// Import Platform for font family support
import { Platform } from 'react-native';