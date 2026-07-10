import React from 'react';
import { View } from 'react-native';
import { CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { teacherLeaveStyles as styles } from './teacherLeaveStyles';

export default function TeacherLeaveStatusBadge({ status }: { status: string }) {
  const getStatusConfig = () => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return { bg: '#ECFDF5', text: Theme.colors.success, label: 'Approved', icon: CheckCircle2 };
      case 'REJECTED':
        return { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected', icon: XCircle };
      default:
        return { bg: '#FFFBEB', text: '#D97706', label: 'Pending', icon: Clock };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <StatusIcon size={12} color={config.text} style={{ marginRight: Theme.spacing.xs }} />
      <AppText weight="bold" style={[styles.statusBadgeText, { color: config.text }]}>{config.label}</AppText>
    </View>
  );
}
