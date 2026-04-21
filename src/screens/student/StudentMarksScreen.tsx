import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

// Types
interface Exam {
  exam_id: string;
  exam_name: string;
}

interface Mark {
  mark_id: string;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
  marks_obtained: number;
  grade: string;
  result_status: string;
}

interface Summary {
  total_obtained: number;
  total_max_marks: number;
  percentage: number;
  overall_result: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getStudentId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('student_id');
  return id || (await AsyncStorage.getItem('studentId')) || '';
};

// Result Badge Component
const ResultBadge: React.FC<{ status: string }> = ({ status }) => {
  const isPass = status?.toUpperCase() === 'PASS';
  return (
    <View style={[styles.badge, isPass ? styles.badgePass : styles.badgeFail]}>
      <Text style={[styles.badgeText, isPass ? styles.badgeTextPass : styles.badgeTextFail]}>
        {status || '-'}
      </Text>
    </View>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

export default function StudentMarksScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<string>('');
  const [items, setItems] = useState<Mark[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingExams, setLoadingExams] = useState<boolean>(false);
  const [loadingMarks, setLoadingMarks] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load stored credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const id = await getStudentId();
      setSchoolCode(code);
      setStudentId(id);
    };
    loadCredentials();
  }, []);

  // Load exams when credentials are ready
  useEffect(() => {
    if (schoolCode && studentId) {
      loadExams();
    }
  }, [schoolCode, studentId]);

  // Load marks when exam is selected
  useEffect(() => {
    if (schoolCode && studentId && examId) {
      loadMarks();
    }
  }, [schoolCode, studentId, examId]);

  const loadExams = async () => {
    if (!schoolCode || !studentId) return;
    
    setLoadingExams(true);
    try {
      const res = await API.get('/manage/student-dashboard/marks/exams', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
        },
      });
      const nextExams = res.data?.items || res.data?.exams || [];
      setExams(nextExams);
      
      // Auto-select first exam if none selected and exams exist
      if (!examId && nextExams.length > 0) {
        setExamId(String(nextExams[0].exam_id));
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const loadMarks = async () => {
    if (!examId) return;
    
    setLoadingMarks(true);
    try {
      const res = await API.get('/manage/student-dashboard/marks', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
          exam_id: examId,
        },
      });
      setItems(res.data?.items || []);
      setSummary(res.data?.summary || null);
    } catch (error) {
      console.error('Failed to load marks:', error);
      setItems([]);
      setSummary(null);
    } finally {
      setLoadingMarks(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    if (examId) await loadMarks();
    setRefreshing(false);
  };

  const handleExamSelect = (selectedExamId: string) => {
    setExamId(selectedExamId);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>🎓 Marks</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadMarks}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Exam Selection Card */}
      <View style={styles.card}>
        <View style={styles.filterRow}>
          <View style={styles.examSelectorWrapper}>
            <Text style={styles.label}>Select Exam</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examScroll}>
              <View style={styles.examChipContainer}>
                {loadingExams ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : exams.length === 0 ? (
                  <Text style={styles.noExamsText}>No exams available</Text>
                ) : (
                  exams.map((exam) => (
                    <TouchableOpacity
                      key={exam.exam_id}
                      style={[
                        styles.examChip,
                        examId === String(exam.exam_id) && styles.examChipActive,
                      ]}
                      onPress={() => handleExamSelect(String(exam.exam_id))}
                    >
                      <Text
                        style={[
                          styles.examChipText,
                          examId === String(exam.exam_id) && styles.examChipTextActive,
                        ]}
                      >
                        {exam.exam_name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.viewBtn} onPress={loadMarks}>
            <Text style={styles.viewBtnText}>🔄 View Marks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryGrid}>
          <SummaryCard label="Total Obtained" value={summary.total_obtained} />
          <SummaryCard label="Total Max Marks" value={summary.total_max_marks} />
          <SummaryCard label="Percentage" value={`${summary.percentage}%`} />
          <SummaryCard label="Overall Result" value={summary.overall_result} />
        </View>
      )}

      {/* Marks Table Card */}
      <View style={styles.card}>
        {loadingMarks ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loaderText}>Loading marks...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colSubject]}>Subject</Text>
                <Text style={[styles.tableHeaderText, styles.colMaxMarks]}>Max</Text>
                <Text style={[styles.tableHeaderText, styles.colPassMarks]}>Pass</Text>
                <Text style={[styles.tableHeaderText, styles.colObtained]}>Obtained</Text>
                <Text style={[styles.tableHeaderText, styles.colGrade]}>Grade</Text>
                <Text style={[styles.tableHeaderText, styles.colResult]}>Result</Text>
              </View>

              {/* Table Body */}
              {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No marks found</Text>
                </View>
              ) : (
                items.map((row) => (
                  <View key={row.mark_id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colSubject]}>{row.subject_name}</Text>
                    <Text style={[styles.tableCell, styles.colMaxMarks]}>{row.max_marks}</Text>
                    <Text style={[styles.tableCell, styles.colPassMarks]}>{row.pass_marks}</Text>
                    <Text style={[styles.tableCell, styles.colObtained]}>{row.marks_obtained}</Text>
                    <Text style={[styles.tableCell, styles.colGrade]}>{row.grade || '-'}</Text>
                    <View style={styles.colResult}>
                      <ResultBadge status={row.result_status} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  refreshBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 3,
  },
  filterRow: {
    padding: 18,
  },
  examSelectorWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
  },
  examScroll: {
    flexDirection: 'row',
  },
  examChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  examChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    marginRight: 8,
    marginBottom: 8,
  },
  examChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  examChipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  examChipTextActive: {
    color: '#ffffff',
  },
  noExamsText: {
    color: '#94a3b8',
    fontSize: 14,
    paddingVertical: 8,
  },
  viewBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 18,
    padding: 20,
    width: '23%',
    minWidth: 100,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableCell: {
    fontSize: 14,
    color: '#0f172a',
  },
  colSubject: {
    width: 120,
  },
  colMaxMarks: {
    width: 60,
    textAlign: 'center',
  },
  colPassMarks: {
    width: 60,
    textAlign: 'center',
  },
  colObtained: {
    width: 70,
    textAlign: 'center',
  },
  colGrade: {
    width: 60,
    textAlign: 'center',
  },
  colResult: {
    width: 80,
    textAlign: 'center',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgePass: {
    backgroundColor: '#dcfce7',
  },
  badgeFail: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeTextPass: {
    color: '#15803d',
  },
  badgeTextFail: {
    color: '#b91c1c',
  },
  loaderContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
});