import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle, WifiOff, ShieldOff } from 'lucide-react-native';
import AppText from './AppText';
import AppButton from './AppButton';
import { Theme } from '../../theme/tokens';

export type ErrorStateVariant = 'error' | 'offline' | 'permission';

const VARIANT_CONFIG = {
  error: { Icon: AlertCircle, title: 'Something went wrong', color: Theme.colors.error },
  offline: { Icon: WifiOff, title: 'You\'re offline', color: Theme.colors.warning },
  permission: { Icon: ShieldOff, title: 'Access denied', color: Theme.colors.error },
};

export interface ErrorStateProps {
  variant?: ErrorStateVariant;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export default function ErrorState({
  variant = 'error',
  message,
  retryLabel = 'Try again',
  onRetry,
  style,
}: ErrorStateProps) {
  const { Icon, title, color } = VARIANT_CONFIG[variant];

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={28} color={color} strokeWidth={2} />
      </View>
      <AppText variant="h4" weight="bold" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.message}>
        {message}
      </AppText>
      {onRetry ? (
        <AppButton
          title={retryLabel}
          type="primary"
          size="sm"
          onPress={onRetry}
          style={styles.action}
          accessibilityLabel={retryLabel}
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
    width: 56,
    height: 56,
    borderRadius: Theme.radius.xl,
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
    maxWidth: 300,
    lineHeight: 22,
  },
  action: {
    marginTop: Theme.spacing.md,
    minWidth: 140,
  },
});
