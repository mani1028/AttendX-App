import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, Zap } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { Theme } from '../../../theme/tokens';
import { formatBranchLimit } from '../../../utils/pricingPlans';

export interface DirectorBranchLimitBannerProps {
  branchCount: number;
  branchLimit: number;
  planName?: string;
  onUpgrade: () => void;
}

export default function DirectorBranchLimitBanner({
  branchCount,
  branchLimit,
  planName,
  onUpgrade,
}: DirectorBranchLimitBannerProps) {
  return (
    <AppCard style={styles.branchLimitBanner}>
      <View style={styles.branchLimitTop}>
        <AlertTriangle size={20} color="#b45309" />
        <View style={{ flex: 1 }}>
          <AppText style={styles.branchLimitTitle} weight="bold">Branch Limit Reached</AppText>
          <AppText style={styles.branchLimitText}>
            You have used all {branchCount} of {formatBranchLimit(branchLimit)} branch slots on your{' '}
            {planName || 'current'} plan.
          </AppText>
        </View>
      </View>
      <TouchableOpacity accessibilityRole="button" style={styles.branchLimitBtn} onPress={onUpgrade}>
        <Zap size={16} color={Theme.colors.card} />
        <AppText style={styles.branchLimitBtnText} weight="bold">Upgrade</AppText>
      </TouchableOpacity>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  branchLimitBanner: {
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  branchLimitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.md,
    marginBottom: 14,
  },
  branchLimitTitle: {
    fontSize: Theme.typography.bodyMd.fontSize,
    color: '#92400e',
    marginBottom: Theme.spacing.xs,
  },
  branchLimitText: {
    fontSize: Theme.typography.caption.fontSize,
    color: '#b45309',
    lineHeight: 18,
  },
  branchLimitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
  },
  branchLimitBtnText: {
    color: Theme.colors.card,
    fontSize: Theme.typography.body.fontSize,
  },
});
