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
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  limitHeader: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  limitHeaderTitle: {
    color: Theme.colors.card,
    fontSize: 18,
  },
  limitBody: {
    padding: 24,
    alignItems: 'center',
  },
  limitIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  limitEmoji: {
    fontSize: 40,
  },
  limitTitle: {
    fontSize: 22,
    color: Theme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  limitMessage: {
    fontSize: 15,
    color: Theme.colors.textSec,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  limitHighlight: {
    color: '#4f46e5',
  },
  featuresBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 12,
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  limitActions: {
    flexDirection: 'row',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 24,
    maxHeight: '88%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  modalHeroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    color: Theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Theme.colors.textSec,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    marginBottom: 12,
  },
  optionCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  optionIconPrimary: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSecondary: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  optionPrice: {
    fontSize: 13,
    color: Theme.colors.primary,
    marginTop: 4,
  },
  enterpriseNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  enterpriseText: {
    flex: 1,
    fontSize: 13,
    color: '#9a3412',
    lineHeight: 18,
  },
});
