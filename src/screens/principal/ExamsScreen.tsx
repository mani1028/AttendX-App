import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import {
  RefreshCw,
  Plus,
  BarChart2,
  ClipboardList,
  TrendingUp,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';

import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
  SCROLL_PAGE_GUTTER,
} from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { examsStyles as styles } from '../../components/principal/exams/examsStyles';
import type { StudentMarks } from '../../components/principal/exams';






import { getCurrentAcademicYearStart, formatAcademicYear, type Exam, type MarksReport } from '../../components/principal/exams';



export default function ExamsPage() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'classwise'>('list');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [marksReport, setMarksReport] = useState<MarksReport | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    exam_name: '',
    academic_year: formatAcademicYear(getCurrentAcademicYearStart()),
  });
  const [showClasswiseModal, setShowClasswiseModal] = useState(false);

  const currentAcademicYearStart = getCurrentAcademicYearStart();

  // Load credentials from storage
  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  const loadCredentials = async () => {
    try {
      const storedSchoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';

      const storedBranchId = await storage.getString(StorageKeys.BRANCH_ID) ||
        await storage.getString(StorageKeys.BRANCH_ID) ||
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

  const buildHeaders = (code?: string, branch?: string) => {
    const headers: any = {};
    const resolvedSchool = code || schoolCode;
    const resolvedBranch = branch || branchId;
    if (resolvedSchool) {headers['X-School-Code'] = resolvedSchool;}
    if (resolvedBranch) {headers['X-Branch-Id'] = resolvedBranch;}
    return headers;
  };

  const getHeaders = () => {
    return buildHeaders();
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
      const res = await API.get('/principal/exams/list', { headers: buildHeaders(school, branchIdVal) });
      const examsData = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
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
      Alert.alert('Error', 'Exam name and academic year are required');
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(formData.academic_year.trim())) {
      Alert.alert('Error', 'Academic year must be in YYYY-YY format');
      return;
    }

    const startYear = Number(formData.academic_year.slice(0, 4));
    if (!Number.isFinite(startYear) || startYear < currentAcademicYearStart) {
      Alert.alert('Error', 'Academic year can only be current year or future years');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await API.post('/principal/exams/create', formData, { headers: getHeaders() });
      setFormData({
        exam_name: '',
        academic_year: formatAcademicYear(currentAcademicYearStart),
      });
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
      const res = await API.get(`/principal/exams/${examId}/marks`, { headers: getHeaders() });
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
    <TouchableOpacity accessibilityRole="button"
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
          <AppText style={styles.infoLabel} weight="semibold">Academic Year</AppText>
          <AppText style={styles.infoValue} weight="bold">{exam.academic_year}</AppText>
        </View>
        {exam.class_grade ? (
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel} weight="semibold">Class</AppText>
            <AppText style={styles.infoValue} weight="bold">{exam.class_grade}</AppText>
          </View>
        ) : null}
        {exam.section ? (
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel} weight="semibold">Section</AppText>
            <AppText style={styles.infoValue} weight="bold">{exam.section}</AppText>
          </View>
        ) : null}
        {exam.subject_name ? (
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel} weight="semibold">Subject</AppText>
            <AppText style={styles.infoValue} weight="bold">{exam.subject_name}</AppText>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel} weight="semibold">Total Max Marks</AppText>
          <AppText style={styles.infoValue} weight="bold">{exam.total_max_marks || '—'}</AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText style={styles.infoLabel} weight="semibold">Created</AppText>
          <AppText style={styles.infoValue} weight="bold">{new Date(exam.creation_date).toLocaleDateString()}</AppText>
        </View>
      </View>

      <TouchableOpacity accessibilityRole="button"
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
        <AppText style={styles.studentName} weight="semibold">{student.student_name}</AppText>
        <AppText style={styles.rollNumber}>Roll: {student.roll_number}</AppText>
      </View>
      <View style={styles.tableCellClass}>
        <AppText style={styles.classText}>{student.class_grade} - {student.section}</AppText>
      </View>
      <View style={styles.tableCellSubjects}>
        <ScrollView style={innerPageLayoutStyles.scrollViewFront} horizontal showsHorizontalScrollIndicator={false}>
          {student.subjects.map((subject: any, idx: number) => (
            <View key={idx} style={styles.subjectChip}>
              <AppText style={styles.subjectName} weight="semibold">{subject.subject_name}</AppText>
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
        <AppText style={styles.totalMarks} weight="semibold">
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

  const renderStudentCard = (student: StudentMarks, index: number) => (
    <View key={student.student_id} style={styles.studentCardMobile}>
      <View style={styles.studentCardMobileHeader}>
        <View style={{ flex: 1, paddingRight: Theme.spacing.sm }}>
          <AppText style={styles.studentCardMobileName} weight="bold">
            {student.student_name}
          </AppText>
          <AppText style={styles.studentCardMobileRoll}>
            Roll: {student.roll_number} • Class {student.class_grade} - {student.section}
          </AppText>
        </View>
        <View style={[styles.studentCardMobileBadge, { backgroundColor: getGradeColor(student.overall_grade) + '15' }]}>
          <AppText style={[styles.studentCardMobileBadgeText, { color: getGradeColor(student.overall_grade) }]} weight="bold">
            {student.overall_percentage}% ({student.overall_grade})
          </AppText>
        </View>
      </View>

      <View style={styles.studentCardMobileDivider} />

      <ScrollView style={innerPageLayoutStyles.scrollViewFront} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentCardMobileScroll}>
        {student.subjects.map((subject: any, idx: number) => (
          <View key={idx} style={styles.subjectChipMobile}>
            <AppText style={styles.subjectChipMobileName} weight="semibold">
              {subject.subject_name}
            </AppText>
            <AppText style={styles.subjectChipMobileMarks}>
              {subject.marks_obtained}/{subject.max_marks}
            </AppText>
            <View style={[styles.subjectChipMobileGradeBg, { backgroundColor: getGradeColor(subject.grade) + '15' }]}>
              <AppText style={[styles.subjectChipMobileGrade, { color: getGradeColor(subject.grade) }]} weight="bold">
                {subject.grade}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.studentCardMobileFooter}>
        <AppText style={styles.studentCardMobileFooterText}>
          Total: <AppText weight="bold" style={{ color: C.text }}>{student.total_marks}/{student.total_max_marks}</AppText>
        </AppText>
      </View>
    </View>
  );

  const renderListTab = () => (
    <ScrollView
     style={[styles.tabContent, innerPageLayoutStyles.scrollViewFront]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
      }
    >
      {loading && exams.length === 0 ? (
        <View style={styles.noData}>
          <ScreenSkeleton variant="list" />
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
     style={[styles.tabContent, innerPageLayoutStyles.scrollViewFront]}
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
            placeholder="2026-27"
            placeholderTextColor={C.textMuted}
            value={formData.academic_year}
            onChangeText={(text) => setFormData(prev => ({ ...prev, academic_year: text }))}
          />
        </View>

        <TouchableOpacity accessibilityRole="button"
          style={styles.submitBtn}
          onPress={createExam}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Theme.colors.card} />
          ) : (
            <>
              <Plus size={14} color={Theme.colors.card} />
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
          <ScreenSkeleton variant="list" />
          <AppText style={styles.noDataText}>Loading performance data...</AppText>
        </View>
      );
    }

    // Group students by class and section
    const studentsList = Array.isArray(marksReport.students) ? marksReport.students.filter(Boolean) : [];
    const groupedStudents: Record<string, StudentMarks[]> = {};
    studentsList.forEach(student => {
      const key = `${student.class_grade}-${student.section}`;
      if (!groupedStudents[key]) {groupedStudents[key] = [];}
      groupedStudents[key].push(student);
    });

    const isMobile = width < 768;

    return (
      <ScrollView
       style={[styles.tabContent, innerPageLayoutStyles.scrollViewFront]}
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

              {isMobile ? (
                <View style={styles.mobileCardsContainer}>
                  {students.map((student, idx) => renderStudentCard(student, idx))}
                </View>
              ) : (
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
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Exams & Performance"
          subtitle="Manage examinations and track student results"
          onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={() => loadExams()}
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

        {error ? (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>⚠ {error}</AppText>
          </View>
        ) : null}

        <View style={[styles.body, innerPageLayoutStyles.contentFront]}>
        <View style={[innerPageLayoutStyles.contentFront, styles.tabBarWrap]}>
          <View style={innerPageLayoutStyles.segmentedControl}>
            <TouchableOpacity accessibilityRole="button"
              style={[innerPageLayoutStyles.segmentedTab, activeTab === 'list' && innerPageLayoutStyles.segmentedTabActive]}
              onPress={() => setActiveTab('list')}
              activeOpacity={0.8}
            >
              <ClipboardList size={16} color={segmentedControlIconColor(activeTab === 'list')} />
              <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'list' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
                All Exams
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[innerPageLayoutStyles.segmentedTab, activeTab === 'add' && innerPageLayoutStyles.segmentedTabActive]}
              onPress={() => setActiveTab('add')}
              activeOpacity={0.8}
            >
              <Plus size={16} color={segmentedControlIconColor(activeTab === 'add')} />
              <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'add' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
                Create Exam
              </AppText>
            </TouchableOpacity>
            {selectedExam ? (
              <TouchableOpacity accessibilityRole="button"
                style={[innerPageLayoutStyles.segmentedTab, activeTab === 'classwise' && innerPageLayoutStyles.segmentedTabActive]}
                onPress={() => setActiveTab('classwise')}
                activeOpacity={0.8}
              >
                <TrendingUp size={16} color={segmentedControlIconColor(activeTab === 'classwise')} />
                <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'classwise' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
                  Performance
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.tabBody}>
          {activeTab === 'list' && renderListTab()}
          {activeTab === 'add' && renderAddTab()}
          {activeTab === 'classwise' && renderClasswiseTab()}
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
