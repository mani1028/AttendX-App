import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import { renewalPaymentStyles as styles } from './renewalPaymentStyles';

export interface PlanCardProps {
  plan: any;
  isCurrent: boolean;
  loadingP: boolean;
  canCheckout: boolean;
  isPopular: boolean;
  billingCycle: 'monthly' | 'yearly';
  branchCount: number;
  wantsAutoPay: boolean;
  loadingPlan: string | null;
  onSelect: (plan: any) => void;
}

export default function PlanCard({
  plan,
  isCurrent,
  loadingP,
  canCheckout,
  isPopular,
  billingCycle,
  branchCount,
  wantsAutoPay,
  loadingPlan,
  onSelect,
}: PlanCardProps) {
  const features: string[] = plan.features?.length > 0
    ? plan.features
    : ['Core Features Included', 'Student & Staff Attendance', 'Support Tier Included'];

  return (
    <View
      style={[
        styles.planCard,
        isCurrent && styles.planCardCurrent,
        isPopular && styles.planCardPopular,
      ]}
    >
      <View style={styles.planCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planCardTitle}>{plan.title}</Text>
          {plan.description ? <Text style={styles.planCardDesc}>{plan.description}</Text> : null}
        </View>
        {isCurrent ? (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanBadgeTxt}>Current</Text>
          </View>
        ) : null}
        {isPopular ? (
          <View style={styles.popularPlanBadge}>
            <Text style={styles.popularPlanBadgeTxt}>Popular</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.planCardPricing}>
        {plan.hasPromo && plan.originalPriceText ? (
          <Text style={styles.planCardStrike}>{plan.originalPriceText}/branch</Text>
        ) : null}
        <View style={styles.planCardPriceRow}>
          <Text style={styles.planCardPrice}>
            {plan.isCustomPricing ? 'Contact Sales' : plan.totalPriceText || plan.selectedPriceText}
          </Text>
          {!plan.isCustomPricing && (plan.totalPriceText || plan.priceValue > 0) ? (
            <Text style={styles.planCardPeriod}>
              / {billingCycle === 'monthly' ? 'month' : 'year'}
            </Text>
          ) : null}
        </View>
      </View>
      {plan.priceBreakdown ? <Text style={styles.planPriceBreakdown}>{plan.priceBreakdown}</Text> : null}
      {plan.perBranch && plan.unitPriceText ? (
        <Text style={styles.planPerBranchMeta}>
          {plan.unitPriceText} per branch · {plan.branchCount || branchCount || 1} active
        </Text>
      ) : null}

      <View style={styles.planFeaturesList}>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureItem}>
            <CheckCircle2 size={16} color={isCurrent ? Theme.colors.primary : Theme.colors.success} style={styles.featureIcon} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity accessibilityRole="button"
        onPress={() => onSelect(plan)}
        disabled={loadingPlan !== null || isCurrent || !canCheckout}
        style={[
          styles.planCardBtn,
          isCurrent && styles.planCardBtnCurrent,
          loadingP && styles.planCardBtnLoading,
          !canCheckout && styles.planCardBtnDisabled,
        ]}
      >
        {loadingP ? (
          <ActivityIndicator size="small" color={Theme.colors.card} />
        ) : (
          <Text style={[styles.planCardBtnTxt, isCurrent && styles.planCardBtnTxtCurrent]}>
            {isCurrent
              ? 'Active Plan'
              : !canCheckout
                ? 'Contact Support'
                : wantsAutoPay
                  ? 'Subscribe Now'
                  : 'Pay / Renew Now'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
