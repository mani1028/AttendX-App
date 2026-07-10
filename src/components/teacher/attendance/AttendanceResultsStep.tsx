import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Save, XCircle } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import AttendanceStatsRow, { RESULT_STAT_COLORS } from './AttendanceStatsRow';
import StudentAttendanceRow from './StudentAttendanceRow';
import { AttendanceForm, AttendanceResult, ManualCounts, ManualFilter, StudentWithStatus } from './types';
import { attendanceStyles as styles } from './styles';

interface AttendanceResultsStepProps {
  result: AttendanceResult;
  form: AttendanceForm;
  attendanceRate: number;
  manualFilter: ManualFilter;
  manualCounts: ManualCounts;
  manualHasChanges: boolean;
  manualSaving: boolean;
  isClassTeacher: boolean;
  isCurrentSessionMarked: boolean;
  filteredRows: StudentWithStatus[];
  onFilterChange: (filter: ManualFilter) => void;
  onStatusChange: (studentId: string, status: 'PRESENT' | 'ABSENT') => void;
  onResetChanges: () => void;
  onSave: () => void;
  onRescan: () => void;
  onResetFlow: () => void;
}

export default function AttendanceResultsStep({
  result,
  form,
  attendanceRate,
  manualFilter,
  manualCounts,
  manualHasChanges,
  manualSaving,
  isClassTeacher,
  isCurrentSessionMarked,
  filteredRows,
  onFilterChange,
  onStatusChange,
  onResetChanges,
  onSave,
  onRescan,
  onResetFlow,
}: AttendanceResultsStepProps) {
  const filters: ManualFilter[] = ['review', 'all', 'present', 'absent', 'changed'];

  return (
    <>
      <AttendanceStatsRow
        stats={[
          { label: 'Total', value: result.summary.total_students, borderColor: RESULT_STAT_COLORS.total },
          { label: 'Present', value: result.summary.present_count, borderColor: RESULT_STAT_COLORS.present },
          { label: 'Absent', value: result.summary.absent_count, borderColor: RESULT_STAT_COLORS.absent },
          { label: 'Rate', value: `${attendanceRate}%`, borderColor: RESULT_STAT_COLORS.rate },
        ]}
      />

      <AppCard style={styles.mainCard}>
        <View style={styles.cardHeader}>
          <AlertCircle size={20} color={Theme.colors.warning} />
          <AppText style={styles.cardTitle}>Attendance Results & Review</AppText>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.manualStrip}>
            <AppText style={styles.manualStripText}>
              {manualHasChanges
                ? `${manualCounts.changed} student(s) changed manually. Save to store the edits.`
                : 'No manual changes detected. Save to store the scanned attendance.'}
            </AppText>
            <View style={styles.miniChipContainer}>
              <View style={[styles.miniChip, styles.miniChipSuccess]}>
                <CheckCircle2 size={12} color={Theme.colors.green} />
                <AppText style={[styles.miniChipText, { color: Theme.colors.green }]}>Present {manualCounts.present}</AppText>
              </View>
              <View style={[styles.miniChip, styles.miniChipDanger]}>
                <XCircle size={12} color={Theme.colors.error} />
                <AppText style={[styles.miniChipText, { color: Theme.colors.error }]}>Absent {manualCounts.absent}</AppText>
              </View>
              <View style={[styles.miniChip, styles.miniChipWarning]}>
                <Clock size={12} color={Theme.colors.warning} />
                <AppText style={[styles.miniChipText, { color: Theme.colors.warning }]}>Changed {manualCounts.changed}</AppText>
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, manualFilter === filter && styles.filterChipActive]}
                onPress={() => onFilterChange(filter)}
              >
                <AppText style={[styles.filterChipText, manualFilter === filter && styles.filterChipTextActive]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)} ({manualCounts[filter]})
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.buttonRowInline}>
            <TouchableOpacity
              style={[styles.resetBtn, !manualHasChanges && styles.resetBtnDisabled]}
              onPress={onResetChanges}
              disabled={!manualHasChanges}
            >
              <RefreshCw size={16} color={manualHasChanges ? Theme.colors.primary : Theme.colors.textMuted} />
              <AppText style={[styles.resetBtnText, !manualHasChanges && { color: Theme.colors.textMuted }]}>
                Reset to Scan Result
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.tableWrapper}>
            <View style={styles.tHeader}>
              <AppText style={[styles.tHead, { width: 40 }]}>#</AppText>
              <AppText style={[styles.tHead, { flex: 1 }]}>Student Name</AppText>
              <AppText style={[styles.tHead, { width: 80, textAlign: 'center' }]}>Status</AppText>
            </View>

            {filteredRows.map((item, idx) => (
              <StudentAttendanceRow
                key={item.student_id || `row-${idx}`}
                item={item}
                index={idx}
                onStatusChange={onStatusChange}
              />
            ))}
          </View>

          <View style={styles.resultNote}>
            <AppText style={styles.resultNoteText}>
              Date: <AppText style={{ fontWeight: 'bold' }}>{result?.date || form.attendance_date}</AppText>
              {' • '}
              Unknown Faces: <AppText style={{ fontWeight: 'bold' }}>{result?.summary?.unknown_faces_count || 0}</AppText>
              {' • '}
              Faces Detected: <AppText style={{ fontWeight: 'bold' }}>{result?.summary?.total_faces_detected || 0}</AppText>
            </AppText>
          </View>

          <View style={styles.buttonRow}>
            <AppButton
              title={manualSaving ? 'Saving...' : 'Save Attendance'}
              onPress={onSave}
              disabled={manualSaving || (isClassTeacher && isCurrentSessionMarked)}
              style={StyleSheet.flatten([styles.primaryButton, { flex: 1 }])}
            />
            <TouchableOpacity style={styles.retryBtn} onPress={onRescan}>
              <RefreshCw size={20} color={Theme.colors.textSec} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={onResetFlow}>
              <Save size={20} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>
        </View>
      </AppCard>
    </>
  );
}
