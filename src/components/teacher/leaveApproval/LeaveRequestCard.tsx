import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { User, BookOpen, Calendar, Info, ChevronRight, XCircle, CheckCircle2 } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import LeaveApprovalStatusBadge from './LeaveApprovalStatusBadge';
import { formatDate } from './helpers';
import { leaveApprovalStyles as styles } from './leaveApprovalStyles';
import type { LeaveRequest } from './types';

export interface LeaveRequestCardProps {
  request: LeaveRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPress: (request: LeaveRequest) => void;
}

export default function LeaveRequestCard({ request, onApprove, onReject, onPress }: LeaveRequestCardProps) {
  return (
    <AppCard style={styles.requestCard}>
      <TouchableOpacity accessibilityRole="button" onPress={() => onPress(request)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.avatarPlaceholder}>
              <User size={20} color={Theme.colors.textSec} />
            </View>
            <View>
              <AppText weight="bold" style={styles.studentName}>{request.student_full_name}</AppText>
              <AppText style={styles.rollNumber}>Roll No: {request.roll_number}</AppText>
            </View>
          </View>
          <LeaveApprovalStatusBadge status={request.status} />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <BookOpen size={14} color={Theme.colors.textMuted} />
              <AppText weight="semibold" style={styles.detailValue}>{request.class_grade} - {request.section}</AppText>
            </View>
            <View style={styles.detailItem}>
              <Calendar size={14} color={Theme.colors.textMuted} />
              <AppText weight="semibold" style={styles.detailValue}>
                {formatDate(request.from_date)} {request.from_date !== request.to_date ? `to ${formatDate(request.to_date)}` : ''}
              </AppText>
            </View>
          </View>

          <View style={styles.reasonBox}>
            <Info size={14} color={Theme.colors.textSec} style={styles.infoIcon} />
            <View style={styles.reasonCopy}>
              <AppText numberOfLines={2} style={styles.reasonText}>{request.reason || '—'}</AppText>
              <AppText style={styles.reasonTapHint}>Tap to view full details</AppText>
            </View>
            <ChevronRight size={16} color={Theme.colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>

      {request.status === 'PENDING' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(request.leave_id)}
          >
            <XCircle size={16} color="#B91C1C" />
            <AppText weight="bold" style={styles.rejectBtnText}>Reject</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(request.leave_id)}
          >
            <CheckCircle2 size={16} color={Theme.colors.card} />
            <AppText weight="bold" style={styles.approveBtnText}>Approve</AppText>
          </TouchableOpacity>
        </View>
      )}
    </AppCard>
  );
}
