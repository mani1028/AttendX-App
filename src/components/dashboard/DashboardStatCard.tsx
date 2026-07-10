import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import AppText from '../common/AppText';
import AppCard from '../common/AppCard';
import { Theme } from '../../theme/tokens';

export interface DashboardStatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  iconColor = Theme.colors.primary,
  iconBg = Theme.colors.primary + '14',
  trend,
  trendUp,
  onPress,
  style,
}: DashboardStatCardProps) {
  return (
    <AppCard
      onPress={onPress}
      elevated
      style={[styles.card, style]}
      padded
    >
      <View style={styles.row}>
        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon size={20} color={iconColor} strokeWidth={2} />
          </View>
        ) : null}
        <View style={styles.copy}>
          <AppText variant="label" style={styles.label}>
            {label}
          </AppText>
          <AppText variant="h3" weight="bold" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </AppText>
          {trend ? (
            <AppText
              variant="caption"
              style={{ color: trendUp ? Theme.colors.success : Theme.colors.error }}
            >
              {trend}
            </AppText>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    marginBottom: Theme.spacing.xs,
  },
});
