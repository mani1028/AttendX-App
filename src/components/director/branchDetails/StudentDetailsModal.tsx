import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { Theme } from '../../../theme/tokens';
import { GradeBadge, ResultBadge } from './BranchBadges';
import { ExamTrendChart, SubjectBarChart } from './BranchCharts';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { StudentExamData, StudentMarkSummary } from './types';

interface StudentDetailsModalProps {
  student: StudentMarkSummary | null;
  loadingExamsData: boolean;
  studentExamsData: StudentExamData | null;
  showAllExamsChart: boolean;
  onToggleChart: (showTrend: boolean) => void;
  currentSelectedExamId: number | null;
  currentSelectedExamName: string;
  barChartData: Array<{ subject: string; percentage: number }>;
  lineChartData: Array<Record<string, string | number>>;
  allSubjects: string[];
  onClose: () => void;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  loadingExamsData,
  studentExamsData,
  showAllExamsChart,
  onToggleChart,
  currentSelectedExamId,
  currentSelectedExamName,
  barChartData,
  lineChartData,
  allSubjects,
  onClose,
}) => (
  <Modal visible={!!student} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, styles.largeModal]}>
        <View style={styles.modalHeader}>
          <AppText style={styles.modalTitle} weight="bold">{student?.student_name}</AppText>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <AppText style={styles.modalCloseText}>✕</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
          {student && (
            <>
              <View style={styles.studentInfoGrid}>
                <AppText style={styles.studentInfoItem}>Roll: {student.roll_number || '-'}</AppText>
                <AppText style={styles.studentInfoItem}>Class {student.class_grade}-{student.section}</AppText>
                <AppText style={styles.studentInfoItem}>Total: {student.total_marks}/{student.max_possible}</AppText>
                <AppText style={[styles.studentInfoItem, { fontWeight: '700', color: student.percentage >= 60 ? Theme.colors.success : student.percentage >= 35 ? '#f97316' : Theme.colors.error }]}>
                  {student.percentage.toFixed(1)}%
                </AppText>
                <ResultBadge result={student.result} />
              </View>

              {loadingExamsData ? (
                <Loader />
              ) : studentExamsData && studentExamsData.exams && studentExamsData.exams.length > 0 ? (
                <View style={styles.examSection}>
                  <View style={styles.examHeader}>
                    <AppText style={styles.examTitle} weight="bold">📊 Exam Performance</AppText>
                    <View style={styles.examToggle}>
                      <TouchableOpacity
                        style={[styles.examToggleBtn, !showAllExamsChart && styles.examToggleBtnActive]}
                        onPress={() => onToggleChart(false)}
                      >
                        <AppText style={[styles.examToggleText, !showAllExamsChart && styles.examToggleTextActive]}>Single</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.examToggleBtn, showAllExamsChart && styles.examToggleBtnActive]}
                        onPress={() => onToggleChart(true)}
                      >
                        <AppText style={[styles.examToggleText, showAllExamsChart && styles.examToggleTextActive]}>Trend</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!showAllExamsChart ? (
                    currentSelectedExamId && barChartData.length > 0 ? (
                      <SubjectBarChart data={barChartData} title={currentSelectedExamName} />
                    ) : (
                      <AppText style={styles.noDataText}>No data available</AppText>
                    )
                  ) : lineChartData.length > 0 && allSubjects.length > 0 ? (
                    <ExamTrendChart lineChartData={lineChartData} allSubjects={allSubjects} />
                  ) : (
                    <AppText style={styles.noDataText}>No trend data</AppText>
                  )}
                </View>
              ) : null}

              <AppText style={styles.subjectTitle} weight="bold">Subject-wise Marks</AppText>
              {student.marks.map((mark, idx) => (
                <View key={idx} style={styles.subjectRow}>
                  <AppText style={styles.subjectName}>{mark.subject_name}</AppText>
                  <AppText style={styles.subjectMarks}>{mark.marks_obtained}</AppText>
                  <AppText style={styles.subjectMax}>{mark.max_marks}</AppText>
                  <GradeBadge grade={mark.grade} />
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <AppButton title="Close" onPress={onClose} />
        </View>
      </View>
    </View>
  </Modal>
);

export default StudentDetailsModal;
