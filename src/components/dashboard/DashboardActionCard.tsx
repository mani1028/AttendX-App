import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';

export interface DashboardActionCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  onPress: () => void;
  style?: ViewStyle;
  badge?: string | number;
}

export default function DashboardActionCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = Theme.colors.primary,
  iconBg = Theme.colors.primary + '12',
  onPress,
  style,
  badge,
}: DashboardActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={22} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyMd" weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge != null && Number(badge) > 0 ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText} weight="bold">
            {Number(badge) > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
      <ChevronRight size={18} color={Theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    minHeight: 64,
    gap: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Theme.colors.card,
    fontSize: Theme.typography.label.fontSize,
  },
});
