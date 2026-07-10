import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, CreditCard } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { colors, Theme } from '../../../theme/tokens';
import { dashboardCardStyles } from './dashboardCardStyles';
import { formatBillingDate, getPaymentStatusLabel } from './helpers';

export interface DirectorPaymentHistoryCardProps {
  payments: any[];
  recentPayments: any[];
  onViewAll: () => void;
  onPaymentPress: () => void;
}

export default function DirectorPaymentHistoryCard({
  payments,
  recentPayments,
  onViewAll,
  onPaymentPress,
}: DirectorPaymentHistoryCardProps) {
  return (
    <AppCard style={styles.paymentHistoryCard}>
      <View style={dashboardCardStyles.chartHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={dashboardCardStyles.cardTitle}>Payment History</AppText>
          <AppText style={dashboardCardStyles.branchPanelSubtitle}>
            {payments.length} transaction{payments.length === 1 ? '' : 's'} recorded
          </AppText>
        </View>
        <TouchableOpacity accessibilityRole="button" style={dashboardCardStyles.viewAllBtn} onPress={onViewAll}>
          <AppText style={dashboardCardStyles.viewAllBtnText}>View All</AppText>
          <ChevronRight size={14} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {recentPayments.length === 0 ? (
        <View style={dashboardCardStyles.branchEmptyState}>
          <CreditCard size={24} color={colors.textMuted} />
          <AppText style={dashboardCardStyles.branchEmptyTitle} weight="semibold">No payments yet</AppText>
          <AppText style={dashboardCardStyles.branchEmptyText}>
            Renewal and upgrade payments will appear here.
          </AppText>
        </View>
      ) : (
        <View style={styles.paymentPreviewList}>
          {recentPayments.map((payment, index) => (
            <TouchableOpacity
              key={payment.id || index}
              accessibilityRole="button"
              style={[styles.paymentPreviewRow, index > 0 && styles.paymentPreviewRowBorder]}
              onPress={onPaymentPress}
            >
              <View style={{ flex: 1 }}>
                <AppText style={styles.paymentPreviewTitle} weight="semibold" numberOfLines={1}>
                  {payment.plan_name || 'Subscription Payment'}
                </AppText>
                <AppText style={styles.paymentPreviewMeta}>
                  {formatBillingDate(payment.paid_at || payment.created_at)} · {getPaymentStatusLabel(payment.status)}
                </AppText>
              </View>
              <AppText style={styles.paymentPreviewAmount} weight="bold">
                ₹{payment.amount || '0'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  paymentHistoryCard: {
    padding: 18,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
  },
  paymentPreviewList: {
    gap: 0,
  },
  paymentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  paymentPreviewRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentPreviewTitle: {
    fontSize: Theme.typography.body.fontSize,
    color: colors.textPrimary,
  },
  paymentPreviewMeta: {
    fontSize: Theme.typography.caption.fontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentPreviewAmount: {
    fontSize: Theme.typography.bodyMd.fontSize,
    color: Theme.colors.primary,
  },
});
