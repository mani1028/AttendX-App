import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import AvatarBubble from '../../components/common/AvatarBubble';
import { useAuth } from '../../context/AuthContext';

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
      <AppText style={[styles.badgeText, isPass ? styles.badgeTextPass : styles.badgeTextFail]}>
        {status || '-'}
      </AppText>
    </View>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <AppCard style={styles.summaryCard}>
    <AppText style={styles.summaryLabel}>{label}</AppText>
    <AppText style={styles.summaryValue}>{value}</AppText>
  </AppCard>
);

export default function StudentMarksScreen({ navigation }: any) {
  const { userName } = useAuth();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</AppText>
          <AppText style={styles.welcomeSub}>Review your examination results and performance.</AppText>
        </View>
        <View style={styles.dateBadge}>
          <Icon name="calendar" size={12} color={colors.textMuted} />
          <AppText style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </AppText>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText style={styles.title}>🎓 Marks</AppText>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadMarks}>
          <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Exam Selection Card */}
      <AppCard style={styles.card}>
        <View style={styles.filterRow}>
          <View style={styles.examSelectorWrapper}>
            <AppText style={styles.label}>Select Exam</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examScroll}>
              <View style={styles.examChipContainer}>
                {loadingExams ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : exams.length === 0 ? (
                  <AppText style={styles.noExamsText}>No exams available</AppText>
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
                      <AppText
                        style={[
                          styles.examChipText,
                          examId === String(exam.exam_id) && styles.examChipTextActive,
                        ]}
                      >
                        {exam.exam_name}
                      </AppText>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.viewBtn} onPress={loadMarks}>
            <AppText style={styles.viewBtnText}>🔄 View Marks</AppText>
          </TouchableOpacity>
        </View>
      </AppCard>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryGrid}>
          <SummaryCard label="Obtained" value={summary.total_obtained} />
          <SummaryCard label="Max" value={summary.total_max_marks} />
          <SummaryCard label="Percent" value={`${summary.percentage}%`} />
          <SummaryCard label="Result" value={summary.overall_result} />
        </View>
      )}

      {/* Marks Table Card */}
      <AppCard style={styles.tableCard}>
        {loadingMarks ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <AppText style={styles.loaderText}>Loading marks...</AppText>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <AppText style={[styles.tableHeaderText, styles.colSubject]}>Subject</AppText>
                <AppText style={[styles.tableHeaderText, styles.colMaxMarks]}>Max</AppText>
                <AppText style={[styles.tableHeaderText, styles.colPassMarks]}>Pass</AppText>
                <AppText style={[styles.tableHeaderText, styles.colObtained]}>Obtained</AppText>
                <AppText style={[styles.tableHeaderText, styles.colGrade]}>Grade</AppText>
                <AppText style={[styles.tableHeaderText, styles.colResult]}>Result</AppText>
              </View>

              {/* Table Body */}
              {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <AppText style={styles.emptyText}>No marks found</AppText>
                </View>
              ) : (
                items.map((row) => (
                  <View key={row.mark_id} style={styles.tableRow}>
                    <AppText style={[styles.tableCell, styles.colSubject]}>{row.subject_name}</AppText>
                    <AppText style={[styles.tableCell, styles.colMaxMarks]}>{row.max_marks}</AppText>
                    <AppText style={[styles.tableCell, styles.colPassMarks]}>{row.pass_marks}</AppText>
                    <AppText style={[styles.tableCell, styles.colObtained]}>{row.marks_obtained}</AppText>
                    <AppText style={[styles.tableCell, styles.colGrade]}>{row.grade || '-'}</AppText>
                    <View style={styles.colResult}>
                      <ResultBadge status={row.result_status} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  refreshBtn: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshBtnText: {
    display: 'none',
  },
  card: {
    marginBottom: 20,
  },
  tableCard: {
    marginBottom: 20,
    padding: 0,
    overflow: 'hidden',
  },
  filterRow: {
    padding: 16,
  },
  examSelectorWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
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
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  examChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  examChipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  examChipTextActive: {
    color: '#ffffff',
  },
  noExamsText: {
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: 8,
  },
  viewBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewBtnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 6,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: 14,
    color: colors.textPrimary,
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
    alignItems: 'center',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgePass: {
    backgroundColor: 'rgba(21, 128, 61, 0.2)',
  },
  badgeFail: {
    backgroundColor: 'rgba(185, 28, 28, 0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextPass: {
    color: colors.success,
  },
  badgeTextFail: {
    color: colors.error,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
