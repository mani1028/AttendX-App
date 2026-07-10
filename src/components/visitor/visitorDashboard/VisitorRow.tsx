import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import StatusBadge from './StatusBadge';
import { visitorDashboardStyles as styles } from './visitorDashboardStyles';
import type { Visitor } from './types';

interface VisitorRowProps {
  visitor: Visitor;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCheckout: (id: string) => void;
}

export default function VisitorRow({ visitor, onApprove, onReject, onCheckout }: VisitorRowProps) {
  const isPending = visitor.status === 'pending';
  const isCheckedIn = visitor.status === 'checked_in';

  return (
    <AppCard style={styles.visitorRow}>
      <View style={styles.visitorHeader}>
        <AppText style={styles.visitorNo}>{visitor.visitor_no?.slice(0, 8) || '-'}</AppText>
        <StatusBadge status={visitor.status} />
      </View>

      <View style={styles.visitorInfo}>
        <View style={styles.visitorName}>
          <AppText style={styles.visitorNameText}>{visitor.full_name}</AppText>
          <AppText style={styles.visitorPhone}>{visitor.phone}</AppText>
        </View>
        <View style={styles.visitorStudent}>
          <AppText style={styles.visitorStudentName}>{visitor.student_name}</AppText>
          <AppText style={styles.visitorClass}>
            {visitor.class_name} {visitor.class_grade ? `(${visitor.class_grade})` : ''}
          </AppText>
        </View>
      </View>

      <View style={styles.visitorDetails}>
        <AppText style={styles.visitorPurpose}>Purpose: {visitor.purpose}</AppText>
      </View>

      <View style={styles.visitorActions}>
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => onApprove(visitor.id)}
            >
              <AppText style={styles.actionBtnText}>✓ Approve</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => onReject(visitor.id)}
            >
              <AppText style={styles.actionBtnText}>✗ Reject</AppText>
            </TouchableOpacity>
          </View>
        )}
        {isCheckedIn && (
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.actionBtn, styles.checkoutBtn]}
            onPress={() => onCheckout(visitor.id)}
          >
            <AppText style={styles.actionBtnText}>Checkout</AppText>
          </TouchableOpacity>
        )}
      </View>
    </AppCard>
  );
}
