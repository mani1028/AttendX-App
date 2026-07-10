import React from 'react';
import { View } from 'react-native';
import { Calendar, FileText } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import StatusBadge from './StatusBadge';
import { leaveRequestStyles as styles } from './leaveRequestStyles';

export interface LeaveRequestItem {
  leave_id: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface LeaveHistoryCardProps {
  request: LeaveRequestItem;
}

export default function LeaveHistoryCard({ request }: LeaveHistoryCardProps) {
  return (
    <AppCard style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.dateRangeContainer}>
          <Calendar size={16} color={Theme.colors.textSec} />
          <AppText weight="semibold" style={styles.dateText}>{formatDate(request.from_date)}</AppText>
          {request.from_date !== request.to_date && (
            <>
              <AppText style={styles.dateArrow}>→</AppText>
              <AppText weight="semibold" style={styles.dateText}>{formatDate(request.to_date)}</AppText>
            </>
          )}
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.reasonContainer}>
        <FileText size={14} color={Theme.colors.textMuted} style={{ marginTop: 2 }} />
        <AppText style={styles.reasonText} numberOfLines={2}>{request.reason}</AppText>
      </View>

      <View style={styles.cardFooter}>
        <AppText style={styles.appliedDate}>
          Applied on {formatDate(request.created_at)}
        </AppText>
      </View>
    </AppCard>
  );
}
