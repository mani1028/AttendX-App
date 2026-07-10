import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import ScreenSkeleton from './ScreenSkeleton';
import EmptyState from './EmptyState';
import ErrorState, { type ErrorStateVariant } from './ErrorState';
import { Theme } from '../../theme/tokens';
import { useNetworkState } from '../../hooks/useNetworkState';

export interface ScreenStateProps {
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  onRetry?: () => void;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  skeletonVariant?: 'dashboard' | 'list' | 'form' | 'detail' | 'card';
  skeletonRows?: number;
  children: React.ReactNode;
  style?: ViewStyle;
  checkOffline?: boolean;
}

export default function ScreenState({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'No data available.',
  emptyTitle,
  onRetry,
  onEmptyAction,
  emptyActionLabel,
  skeletonVariant = 'list',
  skeletonRows = 6,
  children,
  style,
  checkOffline = true,
}: ScreenStateProps) {
  const { isConnected } = useNetworkState();

  if (checkOffline && isConnected === false) {
    return (
      <View style={[styles.center, style]}>
        <ErrorState variant="offline" message="Check your connection and try again." onRetry={onRetry} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.fill, style]}>
        <ScreenSkeleton variant={skeletonVariant} rows={skeletonRows} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, style]}>
        <ErrorState message={error} onRetry={onRetry} />
      </View>
    );
  }

  if (empty) {
    return (
      <View style={[styles.center, style]}>
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
});
