import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import AppText from '../common/AppText';
import AppCard from '../common/AppCard';
import { Theme } from '../../theme/tokens';

export interface DashboardSectionProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  noCard?: boolean;
}

export default function DashboardSection({
  title,
  actionLabel,
  onAction,
  children,
  style,
  noCard = false,
}: DashboardSectionProps) {
  const header = (
    <View style={styles.header}>
      <AppText variant="h4" weight="bold">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppText variant="caption" style={styles.actionText}>
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={Theme.colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (noCard) {
    return (
      <View style={[styles.section, style]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <AppCard style={[styles.card, style]} padded>
      {header}
      <View style={styles.body}>{children}</View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Theme.spacing.md,
  },
  card: {
    marginBottom: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    minHeight: 44,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xs,
  },
  actionText: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  body: {},
});
