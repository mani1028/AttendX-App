import React from 'react';
import { View } from 'react-native';
import { Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { leaveRequestStyles as styles } from './leaveRequestStyles';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const upperStatus = status?.toUpperCase() || '';
  let bgColor = '#FEF3C7';
  let textColor = '#B45309';
  let icon = <Clock size={14} color="#B45309" />;
  let label = 'Pending';

  if (upperStatus === 'APPROVED') {
    bgColor = '#DCFCE7';
    textColor = '#15803D';
    icon = <CheckCircle2 size={14} color="#15803D" />;
    label = 'Approved';
  } else if (upperStatus === 'REJECTED') {
    bgColor = '#FEE2E2';
    textColor = '#B91C1C';
    icon = <XCircle size={14} color="#B91C1C" />;
    label = 'Rejected';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      {icon}
      <AppText weight="bold" style={[styles.badgeText, { color: textColor }]}>
        {label}
      </AppText>
    </View>
  );
}
