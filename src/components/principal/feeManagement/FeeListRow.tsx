import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { formatAmount, formatDate, getStatusStyle, getStatusText } from './helpers';
import type { Fee } from './types';

export interface FeeListRowProps {
  fee: Fee;
  onPress: () => void;
  onPayPress: () => void;
}

export default function FeeListRow({ fee, onPress, onPayPress }: FeeListRowProps) {
  const statusStyle = getStatusStyle(fee.status);
  const roll = fee.roll_number || fee.roll_no;

  return (
    <TouchableOpacity accessibilityRole="button" style={styles.feeRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.feeInfo}>
        <AppText style={styles.studentName} weight="bold">
          {fee.student_name || 'N/A'}
          {roll ? ` (Roll: ${roll})` : ''}
        </AppText>
        <View style={styles.feeDetails}>
          <AppText style={styles.feeAmount} weight="semibold">Total: {formatAmount(fee.total_fee)}</AppText>
          <AppText style={styles.paidAmount} weight="semibold">Paid: {formatAmount(fee.paid_amount)}</AppText>
          <AppText style={styles.dueAmount} weight="bold">Due: {formatAmount(fee.due_amount)}</AppText>
        </View>
        <View style={styles.feeMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
              {getStatusText(fee.status)}
            </AppText>
          </View>
          <AppText style={styles.dueDate} weight="semibold">Due: {formatDate(fee.due_date)}</AppText>
        </View>
      </View>
      {fee.status !== 'paid' && (
        <View style={styles.paymentButtonContainer}>
          <TouchableOpacity accessibilityRole="button" style={styles.paymentButton} onPress={onPayPress}>
            <CreditCard size={16} color={Theme.colors.card} />
            <AppText style={styles.paymentButtonText} weight="bold">Pay</AppText>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}
