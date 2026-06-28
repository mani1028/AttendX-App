import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';
import { getStudentMarks, getStudentExams } from '../../services/studentService';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RefreshCw } from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';

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
        name={isPass ? 'check-circle' : 'x-circle'}
        size={12}
        color={isPass ? C.colors.success : C.colors.error}
      />
      <AppText style={[styles.badgeText, isPass ? styles.badgeTextPass : styles.badgeTextFail]}>
        {status || 'FAIL'}
      </AppText>
    </View>
  );
};

// grading removed: grade UI omitted for students

// Summary Card Component
const SummaryCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Icon>['name'];
  trend?: number;
}> = ({ label, value, icon, trend }) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryIconContainer}>
      <Icon name={icon} size={20} color={C.colors.blue} />
    </View>
    <View style={styles.summaryContent}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Icon
            name={trend >= 0 ? 'arrow-up' : 'arrow-down'}
            size={10}
            color={trend >= 0 ? C.colors.success : C.colors.error}
          />
          <AppText style={[styles.trendText, { color: trend >= 0 ? C.colors.success : C.colors.error }]}>
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
    if (percentage >= 75) {return C.colors.success;}
    if (percentage >= 60) {return C.colors.blue;}
    if (percentage >= 45) {return C.colors.warning;}
    return C.colors.error;
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
        {/* grading removed */}
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
                { width: `${percentage}%`, backgroundColor: getProgressColor() },
              ]}
            />
          </View>
          <AppText style={styles.percentageText}>{percentage.toFixed(1)}%</AppText>
        </View>

        <View style={styles.resultContainer}>
          <ResultBadge status={mark.result_status} />
          {mark.remarks && (
            <View style={styles.remarksContainer}>
              <Icon name="message-circle" size={12} color={C.colors.textMuted} />
              <AppText style={styles.remarksText}>{mark.remarks}</AppText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default function StudentMarksScreen() {
  const navigation = useNavigation<any>();
  const { userName, setTabBarVisible } = useAuth();
  const handleScroll = useScrollTabBar();

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
  const [showExamModal, setShowExamModal] = useState<boolean>(false);

  // Load stored credentials and cached data
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [code, id] = await Promise.all([getSchoolCode(), getStudentId()]);

        if (!isMounted) {return;}

        setSchoolCode(code);
        setStudentId(id);

        let cachedExamId = '';
        let hasCachedMarks = false;

        if (id) {
          const cachedExams = await AsyncStorage.getItem(`marks_exams_cache_${id}`);
          if (cachedExams) {
            const parsedExams = JSON.parse(cachedExams);
            setExams(parsedExams);

            if (parsedExams.length > 0) {
              cachedExamId = String(parsedExams[0].exam_id);
              setExamId(cachedExamId);
              setSelectedExamName(parsedExams[0].exam_name);

              const cachedMarks = await AsyncStorage.getItem(`marks_data_cache_${id}_${parsedExams[0].exam_id}`);
              if (cachedMarks) {
                const { items: mItems, summary: mSummary } = JSON.parse(cachedMarks);
                setItems(mItems);
                setSummary(mSummary);
                hasCachedMarks = true;
              }
            }
          }
        }

        if (code && id) {
          void loadExams(false, code, id, cachedExamId);

          if (cachedExamId && !hasCachedMarks) {
            void loadMarks(false, cachedExamId, id);
          }
        }
      } catch (e) {
        console.log('Failed to load cached marks');
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadExams = async (
    showLoading = true,
    schoolCodeOverride?: string,
    studentIdOverride?: string,
    preferredExamId?: string,
  ) => {
    const activeSchoolCode = schoolCodeOverride || schoolCode;
    const activeStudentId = studentIdOverride || studentId;

    if (!activeSchoolCode || !activeStudentId) {return;}

    if (showLoading) {setLoadingExams(true);}
    try {
      const nextExams = await getStudentExams();
      setExams(nextExams);

      // Cache exams
      await AsyncStorage.setItem(`marks_exams_cache_${activeStudentId}`, JSON.stringify(nextExams));

      const resolvedExamId = preferredExamId || examId;
      const resolvedExam =
        nextExams.find((exam) => String(exam.exam_id) === String(resolvedExamId)) ||
        nextExams[0];

      if (resolvedExam) {
        const nextExamId = String(resolvedExam.exam_id);
        if (nextExamId !== examId) {
          setExamId(nextExamId);
          setSelectedExamName(resolvedExam.exam_name);
        }
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      if (showLoading) {setLoadingExams(false);}
    }
  };

  const loadMarks = async (
    showLoading = true,
    targetExamId: string = examId,
    targetStudentId: string = studentId,
  ) => {
    if (!targetExamId) {return;}

    if (showLoading) {setLoadingMarks(true);}
    try {
      const res = await getStudentMarks(targetExamId);
      const mItems = res.items || [];
      const mSummary = res.summary || null;

      setItems(mItems);
      setSummary(mSummary);

      // Cache marks for this specific exam
      await AsyncStorage.setItem(
        `marks_data_cache_${targetStudentId}_${targetExamId}`,
        JSON.stringify({ items: mItems, summary: mSummary })
      );
    } catch (error) {
      console.error('Failed to load marks:', error);
    } finally {
      if (showLoading) {setLoadingMarks(false);}
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadExams(false, schoolCode, studentId, examId),
        examId ? loadMarks(false, examId, studentId) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExamSelect = (selectedExamId: string, examName: string) => {
    setExamId(selectedExamId);
    setSelectedExamName(examName);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {return 'Morning';}
    if (hour < 17) {return 'Afternoon';}
    return 'Evening';
  };

  const averagePercentage = summary?.percentage || 0;
  const performanceLevel = averagePercentage >= 75 ? 'Excellent' :
                          averagePercentage >= 60 ? 'Good' :
                          averagePercentage >= 45 ? 'Average' : 'Needs Improvement';

  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Marks & Results"
        subtitle={selectedExamName || 'Select an exam to view marks'}
        onBackPress={() => (canGoBack ? navigation.goBack() : navigation.navigate('MainTabs'))}
        showBack={canGoBack}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Refresh marks"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />
        }
      >
        <View style={[innerPageLayoutStyles.contentFront, styles.pageBody]}>
        <View style={styles.mainCard}>
          <AppText style={styles.selectLabel}>Select Exam</AppText>
          <View style={styles.examSelectionRow}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowExamModal(true)}
            >
              <AppText style={[styles.dropdownText, !selectedExamName && styles.dropdownPlaceholder]}>
                {selectedExamName || 'Select Exam'}
              </AppText>
              <Icon name="chevron-down" size={20} color={C.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewMarksButton}
              onPress={() => loadMarks()}
            >
              {loadingMarks ? (
                <ActivityIndicator size="small" color={C.colors.card} />
              ) : (
                <>
                  <Icon name="refresh-cw" size={16} color={C.colors.card} style={styles.refreshIcon} />
                  <AppText style={styles.viewMarksText}>View Marks</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {items.length > 0 ? (
            <View style={styles.subjectListContainer}>
              <View style={styles.subjectListHeader}>
                <AppText style={[styles.subjectListHeaderCell, styles.subjectCol]}>Subject</AppText>
                <AppText style={[styles.subjectListHeaderCell, styles.maxCol]}>Max</AppText>
                <AppText style={[styles.subjectListHeaderCell, styles.passCol]}>Pass</AppText>
                <AppText style={[styles.subjectListHeaderCell, styles.obtainedCol]}>Obt.</AppText>
                <AppText style={[styles.subjectListHeaderCell, styles.resultCol]}>Result</AppText>
              </View>

              {items.map((item, index) => (
                <View
                  key={item.mark_id || `${item.subject_name}-${index}`}
                  style={[
                    styles.subjectListRow,
                    index % 2 === 1 && styles.subjectListRowAlt,
                  ]}
                >
                  <AppText style={[styles.subjectListCell, styles.subjectCol]} numberOfLines={1}>
                    {item.subject_name}
                  </AppText>
                  <AppText style={[styles.subjectListCell, styles.maxCol]}>{item.max_marks}</AppText>
                  <AppText style={[styles.subjectListCell, styles.passCol]}>{item.pass_marks}</AppText>
                  <AppText style={[styles.subjectListCell, styles.obtainedCol]}>{item.marks_obtained}</AppText>
                  <View style={[styles.resultCol, styles.resultCellWrap]}>
                    <ResultBadge status={item.result_status} />
                  </View>
                </View>
              ))}
            </View>
          ) : !loadingMarks && (
            <View style={styles.emptyResults}>
              <Icon name="info" size={48} color={C.colors.border} />
              <AppText style={styles.emptyResultsText}>No marks to display. Please select an exam and click View Marks.</AppText>
            </View>
          )}
        </View>
        </View>
      </ScrollView>

      {/* Exam Selection Modal */}
      <Modal
        visible={showExamModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Select Examination</AppText>
              <TouchableOpacity onPress={() => setShowExamModal(false)}>
                <Icon name="x" size={24} color={C.colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalScrollContainer}>
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                bounces={true}
              >
              {exams.map((exam) => (
                <TouchableOpacity
                  key={exam.exam_id}
                  style={[
                    styles.modalItem,
                    examId === String(exam.exam_id) && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleExamSelect(String(exam.exam_id), exam.exam_name);
                    setShowExamModal(false);
                  }}
                >
                  <AppText style={[
                    styles.modalItemText,
                    examId === String(exam.exam_id) && styles.modalItemTextSelected,
                  ]}>
                    {exam.exam_name}
                  </AppText>
                  {examId === String(exam.exam_id) && (
                    <Icon name="check" size={20} color={C.colors.blue} />
                  )}
                </TouchableOpacity>
              ))}
              </ScrollView>
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
    backgroundColor: C.colors.background,
  },
  pageBody: {
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: C.colors.primary,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.colors.card,
    ...Theme.typography.h3,
    textAlign: 'center',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: Theme.spacing.md,
  },
  mainCard: {
    backgroundColor: C.colors.card,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 12,
    ...C.shadow.sm,
    minHeight: 200,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: C.colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...C.shadow.sm,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: C.colors.textSec,
    marginBottom: 2,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    color: C.colors.primary,
    fontWeight: '700',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
    gap: 4,
  },
  trendText: {
    ...Theme.typography.label,
    fontWeight: '700',
  },
  selectLabel: {
    ...Theme.typography.caption,
    color: C.colors.textSec,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  examSelectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dropdownButton: {
    flex: 1,
    height: 44,
    backgroundColor: C.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dropdownText: {
    ...Theme.typography.body,
    color: C.colors.primary,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: C.colors.textMuted,
  },
  viewMarksButton: {
    backgroundColor: C.colors.blue,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  viewMarksText: {
    color: C.colors.card,
    ...Theme.typography.body,
    fontWeight: 'bold',
  },
  refreshIcon: {
    marginRight: Theme.spacing.sm,
  },
  subjectListContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  subjectListHeader: {
    flexDirection: 'row',
    backgroundColor: C.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.border,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.sm,
  },
  subjectListHeaderCell: {
    ...Theme.typography.label,
    textTransform: 'uppercase',
    color: C.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subjectListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.backgroundAlt,
  },
  subjectListRowAlt: {
    backgroundColor: C.colors.cardAlt,
  },
  subjectListCell: {
    fontSize: 13,
    color: C.colors.primary,
    fontWeight: '600',
  },
  subjectCol: {
    flex: 2.2,
  },
  maxCol: {
    flex: 1,
    textAlign: 'center',
  },
  passCol: {
    flex: 1,
    textAlign: 'center',
  },
  obtainedCol: {
    flex: 1,
    textAlign: 'center',
  },
  resultCol: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  resultCellWrap: {
    justifyContent: 'center',
  },
  marksGrid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Theme.spacing.sm,
  },
  gridItem: {
    flex: 1,
    backgroundColor: C.colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: C.colors.backgroundAlt,
  },
  gridLabel: {
    fontSize: 9,
    color: C.colors.textMuted,
    marginBottom: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridValue: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: C.colors.primary,
  },
  marksCard: {
    backgroundColor: C.colors.card,
    borderRadius: 12,
    padding: 12,
    ...C.shadow.sm,
  },
  marksCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  subjectIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subjectName: {
    ...Theme.typography.bodyMd,
    color: C.colors.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  marksDetails: {
    gap: 12,
  },
  marksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  marksItem: {
    flex: 1,
    backgroundColor: C.colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: C.colors.backgroundAlt,
  },
  marksLabel: {
    fontSize: 9,
    color: C.colors.textMuted,
    marginBottom: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  marksValue: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: C.colors.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: C.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  percentageText: {
    width: 52,
    textAlign: 'right',
    ...Theme.typography.caption,
    fontWeight: '700',
    color: C.colors.textSec,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  remarksContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remarksText: {
    flex: 1,
    ...Theme.typography.caption,
    color: C.colors.textSec,
  },
  resultBadgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgePass: {
    backgroundColor: C.colors.successBg,
  },
  badgeFail: {
    backgroundColor: C.colors.errorBg,
  },
  badgeText: {
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  badgeTextPass: {
    color: C.colors.success,
  },
  badgeTextFail: {
    color: C.colors.error,
  },
  // grading styles removed
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyResultsText: {
    ...Theme.typography.body,
    color: C.colors.textMuted,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.borderLight,
    backgroundColor: C.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    ...Theme.typography.h3,
    color: C.colors.primary,
  },
  modalScrollContainer: {
    flex: 1,
    maxHeight: 600,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  modalList: {
    flexGrow: 0,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.background,
  },
  modalItemSelected: {
    backgroundColor: C.colors.blueLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  modalItemText: {
    fontSize: 16,
    color: C.colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  modalItemTextSelected: {
    color: C.colors.blue,
    fontWeight: 'bold',
  },
});
