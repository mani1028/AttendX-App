import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import BranchFilterDropdown from './BranchFilterDropdown';
import { MarksRow } from './BranchCards';
import { PassFailChart } from './BranchCharts';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { StudentMarkSummary } from './types';

interface BranchMarksTabProps {
  loading: boolean;
  selectedClass: string;
  selectedSection: string;
  selectedExam: string;
  classLabel: string;
  sectionLabel: string;
  examLabel: string;
  onOpenClassPicker: () => void;
  onOpenSectionPicker: () => void;
  onOpenExamPicker: () => void;
  overallStats: { total: number; passed: number; failed: number; avgPercentage: number };
  examTitle: string;
  resultFilter: 'ALL' | 'PASS' | 'FAIL';
  onResultFilterChange: (filter: 'ALL' | 'PASS' | 'FAIL') => void;
  sortBy: 'percentage' | 'name' | 'roll';
  sortOrder: 'asc' | 'desc';
  onSort: (column: 'percentage' | 'name' | 'roll') => void;
  students: StudentMarkSummary[];
  onStudentPress: (student: StudentMarkSummary) => void;
  hasProcessedData: boolean;
}

const BranchMarksTab: React.FC<BranchMarksTabProps> = ({
  loading,
  selectedClass,
  selectedSection,
  selectedExam,
  classLabel,
  sectionLabel,
  examLabel,
  onOpenClassPicker,
  onOpenSectionPicker,
  onOpenExamPicker,
  overallStats,
  examTitle,
  resultFilter,
  onResultFilterChange,
  sortBy,
  sortOrder,
  onSort,
  students,
  onStudentPress,
  hasProcessedData,
}) => (
  <>
    <View style={styles.filterRow}>
      <BranchFilterDropdown label="Class" displayValue={classLabel} onPress={onOpenClassPicker} />
      {selectedClass && (
        <BranchFilterDropdown label="Section" displayValue={sectionLabel} onPress={onOpenSectionPicker} />
      )}
      <BranchFilterDropdown label="Exam" displayValue={examLabel} onPress={onOpenExamPicker} />
    </View>

    {loading ? (
      <Loader />
    ) : !selectedExam ? (
      <AppCard style={styles.emptyCard}>
        <AppText style={styles.emptyIcon}>📝</AppText>
        <AppText style={styles.emptyTitle}>Select an exam to view marks</AppText>
      </AppCard>
    ) : !hasProcessedData ? (
      <AppCard style={styles.emptyCard}>
        <AppText style={styles.emptyIcon}>📊</AppText>
        <AppText style={styles.emptyTitle}>No exam data found</AppText>
      </AppCard>
    ) : (
      <>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryLabel}>Total Students</AppText>
            <AppText style={styles.summaryValue}>{overallStats.total}</AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryLabel}>Passed</AppText>
            <AppText style={[styles.summaryValue, { color: '#a7f3d0' }]}>{overallStats.passed}</AppText>
            <AppText style={styles.summarySub}>
              {overallStats.total > 0 ? ((overallStats.passed / overallStats.total) * 100).toFixed(1) : 0}%
            </AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryLabel}>Failed</AppText>
            <AppText style={[styles.summaryValue, { color: '#fecaca' }]}>{overallStats.failed}</AppText>
            <AppText style={styles.summarySub}>
              {overallStats.total > 0 ? ((overallStats.failed / overallStats.total) * 100).toFixed(1) : 0}%
            </AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryLabel}>Average</AppText>
            <AppText style={styles.summaryValue}>{overallStats.avgPercentage.toFixed(1)}%</AppText>
          </View>
        </View>

        <PassFailChart
          passed={overallStats.passed}
          failed={overallStats.failed}
          title={`${examTitle} · Class ${selectedClass || 'All'} · Section ${selectedSection || 'All'}`}
        />

        <View style={styles.marksControls}>
          <View style={styles.filterRow}>
            {(['ALL', 'PASS', 'FAIL'] as const).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, resultFilter === filter && styles.filterChipActive]}
                onPress={() => onResultFilterChange(filter)}
              >
                <AppText style={[styles.filterChipText, resultFilter === filter && styles.filterChipTextActive]}>
                  {filter === 'ALL' ? 'All' : filter}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.sortRow}>
            <AppText style={styles.sortLabel}>Sort by:</AppText>
            {(['percentage', 'name', 'roll'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortBtn, sortBy === opt && styles.sortBtnActive]}
                onPress={() => onSort(opt)}
              >
                <AppText style={[styles.sortBtnText, sortBy === opt && styles.sortBtnTextActive]}>
                  {opt === 'percentage' ? 'Score' : opt === 'name' ? 'Name' : 'Roll'}
                  {sortBy === opt && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {students.map(student => (
          <MarksRow key={student.student_id} student={student} onPress={onStudentPress} />
        ))}
      </>
    )}
  </>
);

export default BranchMarksTab;
