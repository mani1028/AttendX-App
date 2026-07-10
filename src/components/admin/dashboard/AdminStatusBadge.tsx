import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { colors } from '../../../theme/tokens';
import { modalStyles as styles } from './modalStyles';

interface AdminStatusBadgeProps {
  status: string;
  type?: 'school' | 'subscription';
}

export default function AdminStatusBadge({ status, type = 'school' }: AdminStatusBadgeProps) {
  if (type === 'school') {
    const isActive = status?.toLowerCase() === 'active';
    return (
      <View style={[styles.statusBadge, isActive ? { backgroundColor: colors.successSoft } : { backgroundColor: colors.errorSoft }]}>
        <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.error }]} />
        <AppText style={[styles.statusText, { color: isActive ? colors.success : colors.error }]}>
          {isActive ? 'Active' : 'Inactive'}
        </AppText>
      </View>
    );
  }

  const s = status?.toLowerCase() || '';
  const config = s === 'active_paid'
    ? { color: colors.success, bg: colors.successSoft, label: 'Active Paid' }
    : s === 'trial_active'
      ? { color: colors.primary, bg: 'rgba(99, 102, 241, 0.1)', label: 'Trial Active' }
      : s === 'payment_due'
        ? { color: colors.warning, bg: colors.warningSoft, label: 'Payment Due' }
        : { color: colors.error, bg: colors.errorSoft, label: status || 'Unknown' };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <AppText style={[styles.statusText, { color: config.color }]}>{config.label}</AppText>
    </View>
  );
}
