import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight, Zap, PlusCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { colors, Theme } from '../../../theme/tokens';
import { formatBranchLimit } from '../../../utils/pricingPlans';
import { dashboardCardStyles } from './dashboardCardStyles';
import { formatBillingDate } from './helpers';

export interface DirectorBillingOverviewCardProps {
  subscription: any;
  billingLoading: boolean;
  hasPayments: boolean;
  branchCount: number;
  branchLimit: number;
  atBranchLimit: boolean;
  branchSlotsAvailable: boolean;
  onManage: () => void;
  onUpgrade: () => void;
  onAddBranch: () => void;
}

export default function DirectorBillingOverviewCard({
  subscription,
  billingLoading,
  hasPayments,
  branchCount,
  branchLimit,
  atBranchLimit,
  branchSlotsAvailable,
  onManage,
  onUpgrade,
  onAddBranch,
}: DirectorBillingOverviewCardProps) {
  return (
    <AppCard style={styles.billingOverviewCard}>
      <View style={dashboardCardStyles.chartHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={dashboardCardStyles.cardTitle}>Billing Overview</AppText>
          <AppText style={dashboardCardStyles.branchPanelSubtitle}>Plan status and branch usage</AppText>
        </View>
        <TouchableOpacity accessibilityRole="button" style={dashboardCardStyles.viewAllBtn} onPress={onManage}>
          <AppText style={dashboardCardStyles.viewAllBtnText}>Manage</AppText>
          <ChevronRight size={14} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {billingLoading && !hasPayments && !subscription ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: Theme.spacing.md }} />
      ) : (
        <View style={styles.billingSummaryGrid}>
          <View style={styles.billingSummaryItem}>
            <AppText style={styles.billingSummaryLabel}>Current Plan</AppText>
            <AppText style={styles.billingSummaryValue} weight="bold" numberOfLines={1}>
              {subscription?.current_plan_name || subscription?.current_plan || 'No Active Plan'}
            </AppText>
          </View>
          <View style={styles.billingSummaryItem}>
            <AppText style={styles.billingSummaryLabel}>Status</AppText>
            <AppText style={styles.billingSummaryValue} weight="bold" numberOfLines={1}>
              {String(subscription?.subscription_status || subscription?.status || 'Inactive').replace(/_/g, ' ')}
            </AppText>
          </View>
          <View style={styles.billingSummaryItem}>
            <AppText style={styles.billingSummaryLabel}>Valid Until</AppText>
            <AppText style={styles.billingSummaryValue} weight="bold">
              {formatBillingDate(subscription?.subscription_end_at || subscription?.trial_end_at)}
            </AppText>
          </View>
          <View style={styles.billingSummaryItem}>
            <AppText style={styles.billingSummaryLabel}>Branches</AppText>
            <AppText style={[styles.billingSummaryValue, atBranchLimit && styles.billingSummaryValueWarn]} weight="bold">
              {branchCount} / {formatBranchLimit(branchLimit)}
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.billingActionsRow}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.billingActionBtn, styles.billingActionBtnPrimary]}
          onPress={onUpgrade}
        >
          <Zap size={15} color={Theme.colors.card} />
          <AppText style={[styles.billingActionText, styles.billingActionTextOnPrimary]} weight="semibold">
            Upgrade
          </AppText>
        </TouchableOpacity>
        {branchSlotsAvailable ? (
          <TouchableOpacity accessibilityRole="button" style={styles.billingActionBtn} onPress={onAddBranch}>
            <PlusCircle size={15} color={Theme.colors.primary} />
            <AppText style={styles.billingActionText} weight="semibold">Add Branch</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  billingOverviewCard: {
    padding: 18,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
  },
  billingSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  billingSummaryItem: {
    width: '48%',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Theme.spacing.md,
  },
  billingSummaryLabel: {
    fontSize: Theme.typography.label.fontSize,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.xs,
  },
  billingSummaryValue: {
    fontSize: Theme.typography.body.fontSize,
    color: colors.textPrimary,
  },
  billingSummaryValueWarn: {
    color: '#b45309',
  },
  billingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  billingActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Theme.colors.background,
  },
  billingActionBtnPrimary: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  billingActionText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.primary,
  },
  billingActionTextOnPrimary: {
    color: Theme.colors.card,
  },
});
