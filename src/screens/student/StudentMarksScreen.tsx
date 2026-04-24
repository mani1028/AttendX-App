import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Types
interface Exam {
  exam_id: string;
  exam_name: string;
  exam_date?: string;
  term?: string;
}

interface Mark {
  mark_id: string;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
  marks_obtained: number;
  grade: string;
  result_status: string;
  remarks?: string;
}

interface Summary {
  total_obtained: number;
  total_max_marks: number;
  percentage: number;
  overall_result: string;
  rank?: number;
  total_students?: number;
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
      <Icon 
        name={isPass ? "check-circle" : "x-circle"} 
        size={12} 
        color={isPass ? "#22c55e" : "#ef4444"} 
      />
      <AppText style={[styles.badgeText, isPass ? styles.badgeTextPass : styles.badgeTextFail]}>
        {status || 'FAIL'}
      </AppText>
    </View>
  );
};

// Grade Badge Component
const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const getGradeColor = () => {
    const gradeUpper = grade?.toUpperCase() || '';
    if (gradeUpper === 'A+' || gradeUpper === 'A') return '#10b981';
    if (gradeUpper === 'B+' || gradeUpper === 'B') return '#3b82f6';
    if (gradeUpper === 'C+' || gradeUpper === 'C') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor() + '15' }]}>
      <AppText style={[styles.gradeText, { color: getGradeColor() }]}>
        {grade || '-'}
      </AppText>
    </View>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{ 
  label: string; 
  value: string | number;
  icon: string;
  trend?: number;
}> = ({ label, value, icon, trend }) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryIconContainer}>
      <Icon name={icon} size={20} color="#3b82f6" />
    </View>
    <View style={styles.summaryContent}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Icon 
            name={trend >= 0 ? "trending-up" : "trending-down"} 
            size={10} 
            color={trend >= 0 ? "#10b981" : "#ef4444"} 
          />
          <AppText style={[styles.trendText, { color: trend >= 0 ? "#10b981" : "#ef4444" }]}>
            {Math.abs(trend)}%
          </AppText>
        </View>
      )}
    </View>
  </View>
);

// Marks Card Component for better visual
const MarksCard: React.FC<{ mark: Mark }> = ({ mark }) => {
  const percentage = (mark.marks_obtained / mark.max_marks) * 100;
  const isPass = mark.result_status?.toUpperCase() === 'PASS';
  
  const getProgressColor = () => {
    if (percentage >= 75) return '#10b981';
    if (percentage >= 60) return '#3b82f6';
    if (percentage >= 45) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={styles.marksCard}>
      <View style={styles.marksCardHeader}>
        <View style={styles.subjectContainer}>
          <View style={[styles.subjectIcon, { backgroundColor: getProgressColor() + '20' }]}>
            <Icon name="book-open" size={16} color={getProgressColor()} />
          </View>
          <AppText style={styles.subjectName}>{mark.subject_name}</AppText>
        </View>
        <GradeBadge grade={mark.grade} />
      </View>
      
      <View style={styles.marksDetails}>
        <View style={styles.marksRow}>
          <View style={styles.marksItem}>
            <AppText style={styles.marksLabel}>Obtained</AppText>
            <AppText style={styles.marksValue}>{mark.marks_obtained}</AppText>
          </View>
          <View style={styles.marksItem}>
            <AppText style={styles.marksLabel}>Max Marks</AppText>
            <AppText style={styles.marksValue}>{mark.max_marks}</AppText>
          </View>
          <View style={styles.marksItem}>
            <AppText style={styles.marksLabel}>Pass Marks</AppText>
            <AppText style={styles.marksValue}>{mark.pass_marks}</AppText>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${percentage}%`, backgroundColor: getProgressColor() }
              ]} 
            />
          </View>
          <AppText style={styles.percentageText}>{percentage.toFixed(1)}%</AppText>
        </View>
        
        <View style={styles.resultContainer}>
          <ResultBadge status={mark.result_status} />
          {mark.remarks && (
            <View style={styles.remarksContainer}>
              <Icon name="message-circle" size={12} color="#64748b" />
              <AppText style={styles.remarksText}>{mark.remarks}</AppText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

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
  const [selectedExamName, setSelectedExamName] = useState<string>('');

  // Load stored credentials and cached data
  useEffect(() => {
    const loadInitialData = async () => {
      const code = await getSchoolCode();
      const id = await getStudentId();
      setSchoolCode(code);
      setStudentId(id);

      // Load cached exams and marks
      try {
        const cachedExams = await AsyncStorage.getItem(`marks_exams_cache_${id}`);
        if (cachedExams) {
          const parsedExams = JSON.parse(cachedExams);
          setExams(parsedExams);
          if (parsedExams.length > 0) {
            setExamId(String(parsedExams[0].exam_id));
            setSelectedExamName(parsedExams[0].exam_name);

            // Load cached marks for first exam
            const cachedMarks = await AsyncStorage.getItem(`marks_data_cache_${id}_${parsedExams[0].exam_id}`);
            if (cachedMarks) {
              const { items: mItems, summary: mSummary } = JSON.parse(cachedMarks);
              setItems(mItems);
              setSummary(mSummary);
            }
          }
        }
      } catch (e) {
        console.log('Failed to load cached marks');
      }
    };
    loadInitialData();
  }, []);

  // Load exams when credentials are ready
  useEffect(() => {
    if (schoolCode && studentId) {
      loadExams(exams.length === 0);
    }
  }, [schoolCode, studentId]);

  // Load marks when exam is selected
  useEffect(() => {
    if (schoolCode && studentId && examId) {
      loadMarks(items.length === 0);
    }
  }, [schoolCode, studentId, examId]);

  const loadExams = async (showLoading = true) => {
    if (!schoolCode || !studentId) return;
    
    if (showLoading) setLoadingExams(true);
    try {
      const res = await API.get('/manage/student-dashboard/marks/exams', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
        },
      });
      const nextExams = res.data?.items || res.data?.exams || [];
      setExams(nextExams);

      // Cache exams
      await AsyncStorage.setItem(`marks_exams_cache_${studentId}`, JSON.stringify(nextExams));

      if (!examId && nextExams.length > 0) {
        setExamId(String(nextExams[0].exam_id));
        setSelectedExamName(nextExams[0].exam_name);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      if (showLoading) setLoadingExams(false);
    }
  };

  const loadMarks = async (showLoading = true) => {
    if (!examId) return;
    
    if (showLoading) setLoadingMarks(true);
    try {
      const res = await API.get('/manage/student-dashboard/marks', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
          exam_id: examId,
        },
      });
      const mItems = res.data?.items || [];
      const mSummary = res.data?.summary || null;

      setItems(mItems);
      setSummary(mSummary);

      // Cache marks for this specific exam
      await AsyncStorage.setItem(
        `marks_data_cache_${studentId}_${examId}`,
        JSON.stringify({ items: mItems, summary: mSummary })
      );
    } catch (error) {
      console.error('Failed to load marks:', error);
    } finally {
      if (showLoading) setLoadingMarks(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    if (examId) await loadMarks();
    setRefreshing(false);
  };

  const handleExamSelect = (selectedExamId: string, examName: string) => {
    setExamId(selectedExamId);
    setSelectedExamName(examName);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const averagePercentage = summary?.percentage || 0;
  const performanceLevel = averagePercentage >= 75 ? 'Excellent' : 
                          averagePercentage >= 60 ? 'Good' : 
                          averagePercentage >= 45 ? 'Average' : 'Needs Improvement';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <View>
                <AppText style={styles.welcomeGreeting}>Good {getGreeting()}! 👋</AppText>
                <AppText style={styles.welcomeTitle}>Marks & Results</AppText>
                <AppText style={styles.welcomeSub}>Track your academic performance</AppText>
              </View>
              <View style={styles.statsRing}>
                <View style={styles.ringContent}>
                  <AppText style={styles.ringPercentage}>{averagePercentage.toFixed(0)}%</AppText>
                  <AppText style={styles.ringLabel}>Avg Score</AppText>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Exam Selection */}
        <View style={styles.examSection}>
          <View style={styles.examHeader}>
            <AppText style={styles.sectionTitle}>Select Examination</AppText>
            <AppText style={styles.examCount}>{exams.length} exams</AppText>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examScroll}>
            <View style={styles.examChipContainer}>
              {loadingExams ? (
                <ActivityIndicator size="large" color="#3b82f6" />
              ) : exams.length === 0 ? (
                <View style={styles.noExamsContainer}>
                  <Icon name="file-text" size={32} color="#cbd5e1" />
                  <AppText style={styles.noExamsText}>No exams available</AppText>
                </View>
              ) : (
                exams.map((exam) => (
                  <TouchableOpacity
                    key={exam.exam_id}
                    style={[
                      styles.examChip,
                      examId === String(exam.exam_id) && styles.examChipActive,
                    ]}
                    onPress={() => handleExamSelect(String(exam.exam_id), exam.exam_name)}
                  >
                    <Icon 
                      name="award" 
                      size={16} 
                      color={examId === String(exam.exam_id) ? "#ffffff" : "#64748b"} 
                    />
                    <AppText
                      style={[
                        styles.examChipText,
                        examId === String(exam.exam_id) && styles.examChipTextActive,
                      ]}
                    >
                      {exam.exam_name}
                    </AppText>
                    {examId === String(exam.exam_id) && (
                      <Icon name="check" size={14} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>

        {/* Selected Exam Info */}
        {selectedExamName && !loadingMarks && items.length > 0 && (
          <View style={styles.examInfoCard}>
            <Icon name="calendar" size={14} color="#64748b" />
            <AppText style={styles.examInfoText}>{selectedExamName} Examination</AppText>
            <View style={styles.examInfoBadge}>
              <AppText style={styles.examInfoBadgeText}>{items.length} Subjects</AppText>
            </View>
          </View>
        )}

        {/* Summary Cards */}
        {summary && (
          <View style={styles.summarySection}>
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <AppText style={styles.performanceTitle}>Performance Summary</AppText>
                <View style={styles.performanceLevelBadge}>
                  <AppText style={styles.performanceLevelText}>{performanceLevel}</AppText>
                </View>
              </View>
              
              <View style={styles.summaryGrid}>
                <SummaryCard 
                  label="Total Obtained" 
                  value={summary.total_obtained} 
                  icon="check-circle"
                />
                <SummaryCard 
                  label="Total Max" 
                  value={summary.total_max_marks} 
                  icon="target"
                />
                <SummaryCard 
                  label="Percentage" 
                  value={`${summary.percentage.toFixed(1)}%`} 
                  icon="percent"
                  trend={summary.percentage > 60 ? 5 : -2}
                />
                <SummaryCard 
                  label="Overall Result" 
                  value={summary.overall_result} 
                  icon="trophy"
                />
              </View>
              
              {summary.rank && (
                <View style={styles.rankContainer}>
                  <Icon name="users" size={16} color="#64748b" />
                  <AppText style={styles.rankText}>
                    Rank: {summary.rank} out of {summary.total_students || 'N/A'} students
                  </AppText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Marks Cards */}
        <View style={styles.marksSection}>
          <View style={styles.marksHeader}>
            <AppText style={styles.sectionTitle}>Subject-wise Marks</AppText>
            <AppText style={styles.marksCount}>{items.length} subjects</AppText>
          </View>

          {loadingMarks ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <AppText style={styles.loaderText}>Loading marks...</AppText>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="file-text" size={48} color="#cbd5e1" />
              </View>
              <AppText style={styles.emptyTitle}>No Marks Found</AppText>
              <AppText style={styles.emptyText}>
                No examination results available for the selected exam
              </AppText>
            </View>
          ) : (
            items.map((mark) => (
              <MarksCard key={mark.mark_id} mark={mark} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  gradientHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#bfdbfe',
  },
  statsRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  ringContent: {
    alignItems: 'center',
  },
  ringPercentage: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  ringLabel: {
    fontSize: 9,
    color: '#bfdbfe',
  },
  examSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  examCount: {
    fontSize: 12,
    color: '#64748b',
  },
  examScroll: {
    flexDirection: 'row',
  },
  examChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  examChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 10,
  },
  examChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  examChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  examChipTextActive: {
    color: '#ffffff',
  },
  noExamsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: width - 32,
  },
  noExamsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  examInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  examInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },
  examInfoBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  examInfoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  summarySection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  performanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  performanceLevelBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  performanceLevelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 10,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '600',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  rankText: {
    fontSize: 12,
    color: '#64748b',
  },
  marksSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  marksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  marksCount: {
    fontSize: 12,
    color: '#64748b',
  },
  marksCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  marksCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subjectIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  marksDetails: {
    gap: 12,
  },
  marksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marksItem: {
    flex: 1,
  },
  marksLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  marksValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 45,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  remarksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  remarksText: {
    fontSize: 11,
    color: '#64748b',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  badgePass: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  badgeFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPass: {
    color: '#22c55e',
  },
  badgeTextFail: {
    color: '#ef4444',
  },
  loaderContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});