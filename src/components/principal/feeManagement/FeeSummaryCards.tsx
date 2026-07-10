import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { formatAmount } from './helpers';
import type { Fee } from './types';

export interface FeeSummaryCardsProps {
  fees: Fee[];
}

export default function FeeSummaryCards({ fees }: FeeSummaryCardsProps) {
  const totalFees = fees.reduce((sum, fee) => sum + fee.total_fee, 0);
  const collected = fees.reduce((sum, fee) => sum + fee.paid_amount, 0);
  const pending = fees.reduce((sum, fee) => sum + fee.due_amount, 0);

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <AppText style={styles.summaryLabel} weight="semibold">Total Fees</AppText>
        <AppText style={styles.summaryValue} weight="bold">{formatAmount(totalFees)}</AppText>
      </View>
      <View style={[styles.summaryCard, { borderLeftColor: C.success }]}>
        <AppText style={styles.summaryLabel} weight="semibold">Collected</AppText>
        <AppText style={[styles.summaryValue, styles.collectedValue]} weight="bold">{formatAmount(collected)}</AppText>
      </View>
      <View style={[styles.summaryCard, { borderLeftColor: C.error }]}>
        <AppText style={styles.summaryLabel} weight="semibold">Pending</AppText>
        <AppText style={[styles.summaryValue, styles.pendingValue]} weight="bold">{formatAmount(pending)}</AppText>
      </View>
    </View>
  );
}
