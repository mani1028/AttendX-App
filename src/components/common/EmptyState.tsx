import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Inbox } from 'lucide-react-native';
import AppText from './AppText';
import AppButton from './AppButton';
import { Theme } from '../../theme/tokens';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="text">
      <View style={styles.iconWrap} accessibilityElementsHidden>
        <Icon size={32} color={Theme.colors.textMuted} strokeWidth={1.5} />
      </View>
      <AppText variant="h4" weight="bold" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <AppButton
          title={actionLabel}
          type="outline"
          size="sm"
          onPress={onAction}
          style={styles.action}
          accessibilityLabel={actionLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Theme.radius.xxl,
    backgroundColor: Theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  action: {
    marginTop: Theme.spacing.md,
    minWidth: 140,
  },
});
