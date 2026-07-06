import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../common/AppText';
import AppButton from '../common/AppButton';
import { Theme } from '../../theme/tokens';

interface AdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function AdminEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: AdminEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconRing}>{icon}</View>
      <AppText weight="bold" style={styles.title}>{title}</AppText>
      {description ? (
        <AppText style={styles.description}>{description}</AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: 8,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    color: Theme.colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  action: {
    marginTop: 20,
    minWidth: 160,
  },
});
