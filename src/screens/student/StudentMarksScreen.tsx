import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { getStudentMarks, getStudentExams } from '../../services/studentService';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

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

// grading removed: grade UI omitted for students

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

export default function StudentMarksScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { userName, setTabBarVisible } = useAuth();

  const lastScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };
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
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number>(0);

  // Load stored credentials and cached data
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [code, id] = await Promise.all([getSchoolCode(), getStudentId()]);

        if (!isMounted) return;

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

    if (!activeSchoolCode || !activeStudentId) return;
    
    if (showLoading) setLoadingExams(true);
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
          setSelectedSubjectIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      if (showLoading) setLoadingExams(false);
    }
  };

  const loadMarks = async (
    showLoading = true,
    targetExamId: string = examId,
    targetStudentId: string = studentId,
  ) => {
    if (!targetExamId) return;
    
    if (showLoading) setLoadingMarks(true);
    try {
      const res = await getStudentMarks(targetExamId);
      const mItems = res.items || [];
      const mSummary = res.summary || null;

      setItems(mItems);
      setSummary(mSummary);
      setSelectedSubjectIndex(0);

      // Cache marks for this specific exam
      await AsyncStorage.setItem(
        `marks_data_cache_${targetStudentId}_${targetExamId}`,
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
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const averagePercentage = summary?.percentage || 0;
  const performanceLevel = averagePercentage >= 75 ? 'Excellent' : 
                          averagePercentage >= 60 ? 'Good' : 
                          averagePercentage >= 45 ? 'Average' : 'Needs Improvement';

  const currentSubject = items[selectedSubjectIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle}>Marks & Results</AppText>
        </View>
        <TouchableOpacity
          style={styles.notificationIcon}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Icon name="bell" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
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
              <Icon name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewMarksButton}
              onPress={() => loadMarks()}
            >
              {loadingMarks ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="refresh-cw" size={16} color="#fff" style={styles.refreshIcon} />
                  <AppText style={styles.viewMarksText}>View Marks</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {items.length > 0 && (
            <View style={styles.subjectSelectorContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={item.mark_id}
                    style={[
                      styles.subjectChip,
                      selectedSubjectIndex === index && styles.subjectChipActive
                    ]}
                    onPress={() => setSelectedSubjectIndex(index)}
                  >
                    <AppText style={[
                      styles.subjectChipText,
                      selectedSubjectIndex === index && styles.subjectChipTextActive
                    ]}>
                      {item.subject_name}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {items.length > 0 && currentSubject ? (
            <View style={styles.marksGrid}>
              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <AppText style={styles.gridLabel}>Subject</AppText>
                  <AppText style={styles.gridValue} numberOfLines={1}>{currentSubject.subject_name}</AppText>
                </View>
                <View style={styles.gridItem}>
                  <AppText style={styles.gridLabel}>Total Max Marks</AppText>
                  <AppText style={styles.gridValue}>{currentSubject.max_marks}</AppText>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <AppText style={styles.gridLabel}>Pass Marks</AppText>
                  <AppText style={styles.gridValue}>{currentSubject.pass_marks}</AppText>
                </View>
                <View style={styles.gridItem}>
                  <AppText style={styles.gridLabel}>Obtained Marks</AppText>
                  <AppText style={styles.gridValue}>{currentSubject.marks_obtained}</AppText>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <AppText style={styles.gridLabel}>Grade</AppText>
                  <AppText style={styles.gridValue}>{currentSubject.grade || 'N/A'}</AppText>
                </View>
                <View style={styles.gridItem}>
                  <AppText style={styles.gridLabel}>Result</AppText>
                  <ResultBadge status={currentSubject.result_status} />
                </View>
              </View>
            </View>
          ) : !loadingMarks && (
            <View style={styles.emptyResults}>
              <Icon name="info" size={48} color="#cbd5e1" />
              <AppText style={styles.emptyResultsText}>No marks to display. Please select an exam and click View Marks.</AppText>
            </View>
          )}
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
                <Icon name="x" size={24} color="#0f172a" />
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
                    examId === String(exam.exam_id) && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    handleExamSelect(String(exam.exam_id), exam.exam_name);
                    setShowExamModal(false);
                  }}
                >
                  <AppText style={[
                    styles.modalItemText,
                    examId === String(exam.exam_id) && styles.modalItemTextSelected
                  ]}>
                    {exam.exam_name}
                  </AppText>
                  {examId === String(exam.exam_id) && (
                    <Icon name="check" size={20} color="#3b82f6" />
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#001F3F',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
    paddingTop: 16,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    minHeight: 200,
    marginTop: 10,
  },
  selectLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
  },
  viewMarksButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  viewMarksText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refreshIcon: {
    marginRight: 8,
  },
  subjectSelectorContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  subjectScroll: {
    flexDirection: 'row',
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  subjectChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
  },
  marksGrid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  gridLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginBottom: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgePass: {
    backgroundColor: '#dcfce7',
  },
  badgeFail: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextPass: {
    color: '#15803d',
  },
  badgeTextFail: {
    color: '#b91c1c',
  },
  // grading styles removed
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyResultsText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemSelected: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});