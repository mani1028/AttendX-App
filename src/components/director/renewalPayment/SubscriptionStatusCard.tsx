import React from 'react';
import { View, Text } from 'react-native';
import { CreditCard, GitBranch } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import { formatBranchLimit } from '../../../utils/pricingPlans';
import { renewalPaymentStyles as styles } from './renewalPaymentStyles';
import { fmtDate, formatStatus } from './helpers';

export interface SubscriptionInfo {
  school_name?: string;
  director_name?: string;
  billing_cycle?: string;
  auto_renew?: boolean;
  status?: string;
  current_plan?: string;
  days_remaining?: number;
  subscription_end_at?: string;
  trial_end_at?: string;
  total_branches?: number;
  last_payment_at?: string;
  last_payment_amount?: number;
}

export interface SubscriptionStatusCardProps {
  subInfo: SubscriptionInfo;
  branchCount: number;
  branchLimit: number;
  atBranchLimit: boolean;
  upgradeMode: string | null;
}

export default function SubscriptionStatusCard({
  subInfo,
  branchCount,
  branchLimit,
  atBranchLimit,
  upgradeMode,
}: SubscriptionStatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.statusHeader}>
        <CreditCard size={20} color={Theme.colors.card} />
        <View style={{ marginLeft: Theme.spacing.sm }}>
          <Text style={styles.statusHeaderTitle}>Subscription Status</Text>
          <Text style={styles.statusHeaderSub}>{subInfo.school_name || 'Your School'}</Text>
        </View>
      </View>
      <View style={styles.statusBody}>
        <Text style={styles.label}>Plan</Text>
        <Text style={styles.value}>{subInfo.current_plan || 'No Active Plan'}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{formatStatus(subInfo.status)}</Text>
        <Text style={styles.label}>Auto-Renewal</Text>
        <Text style={styles.value}>{subInfo.auto_renew ? 'Enabled' : 'Disabled'}</Text>
        <Text style={styles.label}>Valid Until</Text>
        <Text style={styles.value}>{fmtDate(subInfo.subscription_end_at || subInfo.trial_end_at)}</Text>
        <View style={styles.branchRow}>
          <GitBranch size={16} color={Theme.colors.primary} />
          <Text style={styles.branchRowLabel}>Active Branches</Text>
          <Text style={[styles.branchRowValue, atBranchLimit && styles.branchRowValueLimit]}>
            {branchCount} / {formatBranchLimit(branchLimit)}
          </Text>
        </View>
        {branchCount > 0 ? (
          <Text style={styles.branchHint}>
            Plans are billed per branch. Your total updates with each active branch.
          </Text>
        ) : null}
        {upgradeMode === 'branch' ? (
          <View style={styles.branchUpgradeCard}>
            <Text style={styles.branchUpgradeTitle}>Adding a Branch</Text>
            <Text style={styles.branchUpgradeBody}>
              {branchCount} of {formatBranchLimit(branchLimit)} branches active. Choose a plan below with more branch slots, complete payment, then return to the dashboard and tap Add Branch.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
