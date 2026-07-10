import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { formatAmount, formatDate } from './helpers';
import { paymentEntryStyles as styles } from './paymentEntryStyles';
import type { Payment } from './types';

interface PaymentHistoryRowProps {
  payment: Payment;
}

export default function PaymentHistoryRow({ payment }: PaymentHistoryRowProps) {
  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentInfo}>
        <AppText style={styles.paymentAmount} weight="bold">{formatAmount(payment.amount)}</AppText>
        <View style={[styles.methodBadge, payment.method === 'cash' ? styles.cashBadge : styles.onlineBadge]}>
          <AppText style={styles.methodText} weight="semibold">{payment.method.toUpperCase()}</AppText>
        </View>
      </View>
      <AppText style={styles.paymentDate}>{formatDate(payment.date)}</AppText>
      {payment.receipt_number ? (
        <AppText style={styles.receiptNumber}>Receipt: {payment.receipt_number}</AppText>
      ) : null}
    </View>
  );
}
