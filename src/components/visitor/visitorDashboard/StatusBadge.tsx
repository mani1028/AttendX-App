import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { Theme, colors } from '../../../theme/tokens';
import { visitorDashboardStyles as styles } from './visitorDashboardStyles';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return { bg: 'rgba(217, 119, 6, 0.15)', color: Theme.colors.warning, label: 'PENDING' };
      case 'checked_in':
        return { bg: 'rgba(5, 150, 105, 0.15)', color: Theme.colors.success, label: 'CHECKED IN' };
      case 'checked_out':
        return { bg: 'rgba(37, 99, 235, 0.15)', color: Theme.colors.primaryLight, label: 'CHECKED OUT' };
      case 'rejected':
        return { bg: 'rgba(220, 38, 38, 0.15)', color: Theme.colors.error, label: 'REJECTED' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', color: colors.textMuted, label: status?.toUpperCase() || 'UNKNOWN' };
    }
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <AppText style={[styles.badgeText, { color: config.color }]}>{config.label}</AppText>
    </View>
  );
}
