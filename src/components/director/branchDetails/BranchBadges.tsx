import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { branchDetailsStyles as styles } from './branchDetailsStyles';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <AppText style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </AppText>
    </View>
  );
};

export const AttendanceBadge: React.FC<{ status: string }> = ({ status }) => {
  const isPresent = status === 'PRESENT';
  return (
    <View style={[styles.attendanceBadge, isPresent ? styles.attendancePresent : styles.attendanceAbsent]}>
      <AppText style={[styles.attendanceText, isPresent ? styles.attendanceTextPresent : styles.attendanceTextAbsent]}>
        {isPresent ? '✓ Present' : '✗ Absent'}
      </AppText>
    </View>
  );
};

export const ResultBadge: React.FC<{ result: string }> = ({ result }) => {
  const isPass = result === 'PASS';
  return (
    <View style={[styles.resultBadge, isPass ? styles.resultPass : styles.resultFail]}>
      <AppText style={[styles.resultText, isPass ? styles.resultTextPass : styles.resultTextFail]}>
        {result}
      </AppText>
    </View>
  );
};

export const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const getGradeColor = () => {
    const g = grade?.toUpperCase() || '';
    if (g === 'A+' || g === 'A') { return Theme.colors.success; }
    if (g === 'B') { return Theme.colors.blue; }
    if (g === 'C') { return '#f97316'; }
    if (g === 'D') { return Theme.colors.warning; }
    return Theme.colors.error;
  };
  const color = getGradeColor();
  return (
    <View style={[styles.gradeBadge, { backgroundColor: color + '20' }]}>
      <AppText style={[styles.gradeText, { color }]}>{grade || '-'}</AppText>
    </View>
  );
};

export const LeaveStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const s = status?.toUpperCase() || '';
    if (s === 'APPROVED') { return { bg: '#dcfce7', color: Theme.colors.success, label: 'APPROVED' }; }
    if (s === 'REJECTED') { return { bg: Theme.colors.redLight, color: Theme.colors.error, label: 'REJECTED' }; }
    return { bg: '#fff7ed', color: '#f97316', label: 'PENDING' };
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.leaveBadge, { backgroundColor: config.bg }]}>
      <AppText style={[styles.leaveText, { color: config.color }]}>{config.label}</AppText>
    </View>
  );
};
