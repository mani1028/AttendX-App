import React from 'react';
import { View } from 'react-native';
import { CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { leaveApprovalStyles as styles } from './leaveApprovalStyles';

export default function LeaveApprovalStatusBadge({ status }: { status: string }) {
  const upperStatus = status?.toUpperCase() || '';

  let bgColor = '#FEF3C7';
  let textColor = '#B45309';
  let icon = <Clock size={12} color="#B45309" />;
  let label = 'Pending';

  if (upperStatus === 'APPROVED') {
    bgColor = '#DCFCE7';
    textColor = '#15803D';
    icon = <CheckCircle2 size={12} color="#15803D" />;
    label = 'Approved';
  } else if (upperStatus === 'REJECTED') {
    bgColor = '#FEE2E2';
    textColor = '#B91C1C';
    icon = <XCircle size={12} color="#B91C1C" />;
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
