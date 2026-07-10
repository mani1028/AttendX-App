import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Crown,
  GitBranch,
  ChevronRight,
  Gem,
  Plus,
  CheckCircle2,
} from 'lucide-react-native';
import AppText from '../common/AppText';
import AppButton from '../common/AppButton';
import { Theme } from '../../theme/tokens';
import { formatBranchLimit } from '../../utils/pricingPlans';

const UNLOCK_FEATURES = [
  'Add more branches / campuses',
  'Centralized academic year & branch switching',
  'Advanced staff & student attendance insights',
];

type NextPlanPreview = {
  id?: string;
  title?: string;
  selectedPriceText?: string;
};

export function DirectorBranchLimitPanel({
  branchCount,
  branchLimit,
  planName,
  onCancel,
  onUpgradePress,
}: {
  branchCount: number;
  branchLimit: number;
  planName: string;
  onCancel: () => void;
  onUpgradePress: () => void;
}) {
  return (
    <View style={styles.limitPanel}>
      <View style={styles.limitHeader}>
        <AppText style={styles.limitHeaderTitle} weight="bold">Add New Branch</AppText>
      </View>

      <View style={styles.limitBody}>
        <View style={styles.limitIconWrap}>
          <AppText style={styles.limitEmoji}>👑</AppText>
        </View>
        <AppText style={styles.limitTitle} weight="bold">Branch Limit Reached</AppText>
        <AppText style={styles.limitMessage}>
          You have used all{' '}
          <AppText style={styles.limitHighlight} weight="bold">
            {branchCount} of {formatBranchLimit(branchLimit)}
          </AppText>
          {' '}available branch slots under your{' '}
          <AppText weight="bold">{planName}</AppText>
          {' '}plan. Expand your institution by upgrading.
        </AppText>

        <View style={styles.featuresBox}>
          <AppText style={styles.featuresTitle} weight="bold">Unlock Premium Features</AppText>
          {UNLOCK_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <CheckCircle2 size={16} color={Theme.colors.success} />
              <AppText style={styles.featureText}>{feature}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.limitActions}>
          <AppButton title="Cancel" onPress={onCancel} type="secondary" />
          <View style={{ width: 12 }} />
          <AppButton title="Upgrade Limit" onPress={onUpgradePress} type="primary" />
        </View>
      </View>
    </View>
  );
}

export function DirectorUpgradeChoiceModal({
  visible,
  onClose,
  nextPlan,
  currentPlanName,
  onUpgradePlan,
  onAddBranchSlot,
}: {
  visible: boolean;
  onClose: () => void;
  nextPlan?: NextPlanPreview | null;
  currentPlanName?: string;
  onUpgradePlan: () => void;
  onAddBranchSlot: () => void;
}) {
  const insets = useSafeAreaInsets();
  const planLabel = currentPlanName
    ? currentPlanName.charAt(0).toUpperCase() + currentPlanName.slice(1)
    : 'plan';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.modalCard}>
          <TouchableOpacity accessibilityRole="button" style={styles.modalClose} onPress={onClose}>
            <X size={20} color={Theme.colors.textSec} />
          </TouchableOpacity>

          <View style={styles.modalHero}>
            <View style={styles.modalHeroIcon}>
              <Gem size={28} color={Theme.colors.primary} />
            </View>
            <AppText style={styles.modalTitle} weight="bold">Grow Your School</AppText>
            <AppText style={styles.modalSubtitle}>
              You've reached the branch limit on your current plan. Choose how to expand below.
            </AppText>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity accessibilityRole="button" style={styles.optionCardPrimary} onPress={onUpgradePlan}>
              <View style={styles.optionIconPrimary}>
                <Crown size={22} color={Theme.colors.card} />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle} weight="bold">Upgrade Plan</AppText>
                <AppText style={styles.optionDesc}>
                  Move to {nextPlan?.title || 'a higher tier'} and unlock more branches across all your locations.
                </AppText>
                {nextPlan?.selectedPriceText ? (
                  <AppText style={styles.optionPrice} weight="bold">
                    From {nextPlan.selectedPriceText}/mo
                  </AppText>
                ) : null}
              </View>
              <ChevronRight size={18} color={Theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" style={styles.optionCardSecondary} onPress={onAddBranchSlot}>
              <View style={styles.optionIconSecondary}>
                <Plus size={20} color={Theme.colors.card} />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle} weight="bold">Add Branch</AppText>
                <AppText style={styles.optionDesc}>
                  Expand under your current {planLabel} plan. Billed per branch.
                </AppText>
              </View>
              <ChevronRight size={18} color={Theme.colors.success} />
            </TouchableOpacity>

            {!nextPlan && (
              <View style={styles.enterpriseNote}>
                <GitBranch size={18} color="#ea580c" />
                <AppText style={styles.enterpriseText}>
                  Need many more branches? Contact support for enterprise pricing.
                </AppText>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  limitPanel: {
    borderRadius: Theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  limitHeader: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
  },
  limitHeaderTitle: {
    color: Theme.colors.card,
    fontSize: Theme.typography.h3.fontSize,
  },
  limitBody: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  limitIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  limitEmoji: {
    fontSize: 40,
  },
  limitTitle: {
    fontSize: Theme.typography.h2.fontSize,
    color: Theme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  limitMessage: {
    fontSize: Theme.typography.bodyMd.fontSize,
    color: Theme.colors.textSec,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  limitHighlight: {
    color: '#4f46e5',
  },
  featuresBox: {
    width: '100%',
    backgroundColor: Theme.colors.inputBg,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 18,
    marginBottom: Theme.spacing.lg,
  },
  featuresTitle: {
    fontSize: Theme.typography.caption.fontSize,
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Theme.spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: Theme.typography.body.fontSize,
    color: Theme.colors.cardAlt,
  },
  limitActions: {
    flexDirection: 'row',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.lg,
    maxHeight: '88%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    paddingTop: Theme.spacing.sm,
  },
  modalHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: Theme.typography.h2.fontSize,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Theme.typography.body.fontSize,
    color: Theme.colors.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: Theme.radius.lg,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    marginBottom: Theme.spacing.md,
  },
  optionCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: Theme.radius.lg,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.inputBg,
    marginBottom: Theme.spacing.md,
  },
  optionIconPrimary: {
    width: 52,
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSecondary: {
    width: 52,
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  optionDesc: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  optionPrice: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.xs,
  },
  enterpriseNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: Theme.radius.md,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  enterpriseText: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    color: '#9a3412',
    lineHeight: 18,
  },
});
