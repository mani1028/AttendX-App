import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import {
  PlusCircle,
  Zap,
  ShieldCheck,
  CreditCard,
  User,
  School,
  ChevronDown,
} from 'lucide-react-native';
import type { NavigationProp } from '@react-navigation/native';
import AppText from '../../common/AppText';
import QuickActionGrid, { QuickActionItem } from '../../dashboard/QuickActionGrid';
import { colors, Theme } from '../../../theme/tokens';
import { safeNavigate } from '../../../utils/navigationHelpers';
import type { RootStackParamList } from '../../../navigation/types';

const QUICK_ACTIONS = [
  { label: 'Add Branch', route: 'DirectorPrincipalRegistration', icon: PlusCircle, bg: 'rgba(37, 99, 235, 0.08)', color: Theme.colors.blue },
  { label: 'Upgrade', icon: Zap, bg: 'rgba(124, 58, 237, 0.08)', color: Theme.colors.violet, opensUpgradeModal: true },
  { label: 'Subscription', route: 'DirectorBilling', icon: ShieldCheck, bg: 'rgba(249, 115, 22, 0.08)', color: '#f97316', params: { variant: 'subscription' } },
  { label: 'Payments', route: 'DirectorBilling', icon: CreditCard, bg: 'rgba(34, 197, 94, 0.08)', color: Theme.colors.success, params: { variant: 'payments' } },
  { label: 'My Profile', route: 'Profile', icon: User, bg: 'rgba(236, 72, 153, 0.08)', color: '#ec4899' },
] as const;

export interface DirectorQuickAccessSectionProps {
  navigation: NavigationProp<RootStackParamList>;
  selectedBranchId: string;
  topBarOpacityAnim: Animated.Value;
  topBarTranslateAnim: Animated.Value;
  onAddBranchPress: () => void;
  onOpenUpgradeModal: () => void;
  onOpenBranchSelector: () => void;
}

export default function DirectorQuickAccessSection({
  navigation,
  selectedBranchId,
  topBarOpacityAnim,
  topBarTranslateAnim,
  onAddBranchPress,
  onOpenUpgradeModal,
  onOpenBranchSelector,
}: DirectorQuickAccessSectionProps) {
  return (
    <Animated.View
      style={[
        {
          opacity: topBarOpacityAnim,
          transform: [{ translateY: topBarTranslateAnim }],
          marginBottom: Theme.spacing.xl,
        },
      ]}
    >
      <View style={styles.quickAccessPanel}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>Quick Access</AppText>
        </View>
        <QuickActionGrid>
          {QUICK_ACTIONS.map((action) => {
            const IconComponent = action.icon;
            const isAddBranch = action.label === 'Add Branch';
            const opensUpgradeModal = 'opensUpgradeModal' in action && action.opensUpgradeModal;
            return (
              <QuickActionItem key={action.label}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.gridItemInner}
                  onPress={() => {
                    if (isAddBranch) {
                      onAddBranchPress();
                      return;
                    }
                    if (opensUpgradeModal) {
                      onOpenUpgradeModal();
                      return;
                    }
                    safeNavigate(navigation, (action as any).route, (action as any).params);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconContainer, { backgroundColor: action.bg }]}>
                    <IconComponent size={24} color={action.color} />
                  </View>
                  <View style={styles.gridLabelContainer}>
                    <AppText style={styles.gridLabel} weight="semibold" numberOfLines={2} adjustsFontSizeToFit>
                      {action.label}
                    </AppText>
                  </View>
                </TouchableOpacity>
              </QuickActionItem>
            );
          })}
        </QuickActionGrid>
      </View>

      <View style={[styles.branchSelector, { marginTop: Theme.spacing.md }]}>
        <AppText style={styles.branchSelectorLabel}>Filter Data By Branch</AppText>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.branchSelectorField}
          onPress={onOpenBranchSelector}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <School size={18} color={Theme.colors.primary} />
            <AppText style={styles.branchSelectorValue} numberOfLines={1}>
              {selectedBranchId === 'ALL' ? 'All Branches' : `Branch: ${selectedBranchId}`}
            </AppText>
          </View>
          <ChevronDown size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  quickAccessPanel: {
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  gridItemInner: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridLabelContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gridLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 12,
  },
  branchSelector: {
    marginBottom: Theme.spacing.md,
  },
  branchSelectorLabel: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 10,
  },
  branchSelectorField: {
    minHeight: 48,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchSelectorValue: {
    flex: 1,
    ...Theme.typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
