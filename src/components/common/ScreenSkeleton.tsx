import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { Theme } from '../../theme/tokens';

export type ScreenSkeletonVariant = 'dashboard' | 'list' | 'form' | 'detail' | 'card';

interface ScreenSkeletonProps {
  variant?: ScreenSkeletonVariant;
  rows?: number;
  style?: ViewStyle;
}

function DashboardSkeleton() {
  return (
    <View style={styles.dashboard}>
      <SkeletonLoader height={140} borderRadius={Theme.radius.xxxl} style={styles.hero} />
      <View style={styles.statRow}>
        <SkeletonLoader height={88} borderRadius={Theme.radius.lg} style={styles.stat} />
        <SkeletonLoader height={88} borderRadius={Theme.radius.lg} style={styles.stat} />
      </View>
      <SkeletonLoader height={120} borderRadius={Theme.radius.lg} style={styles.block} />
      <SkeletonLoader height={48} borderRadius={Theme.radius.md} style={styles.block} />
      <SkeletonLoader height={48} borderRadius={Theme.radius.md} style={styles.block} />
    </View>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <View style={styles.list}>
      <SkeletonLoader height={40} borderRadius={Theme.radius.md} style={styles.search} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <SkeletonLoader width={48} height={48} borderRadius={Theme.radius.full} />
          <View style={styles.listCopy}>
            <SkeletonLoader height={14} width="70%" borderRadius={Theme.radius.sm} />
            <SkeletonLoader height={12} width="45%" borderRadius={Theme.radius.sm} style={{ marginTop: Theme.spacing.sm }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FormSkeleton() {
  return (
    <View style={styles.form}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.field}>
          <SkeletonLoader height={12} width={80} borderRadius={Theme.radius.sm} />
          <SkeletonLoader height={50} borderRadius={Theme.radius.lg} style={{ marginTop: Theme.spacing.sm }} />
        </View>
      ))}
      <SkeletonLoader height={48} borderRadius={Theme.radius.lg} style={{ marginTop: Theme.spacing.md }} />
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View style={styles.detail}>
      <SkeletonLoader height={24} width="60%" borderRadius={Theme.radius.sm} />
      <SkeletonLoader height={14} width="40%" borderRadius={Theme.radius.sm} style={{ marginTop: Theme.spacing.md }} />
      <SkeletonLoader height={160} borderRadius={Theme.radius.lg} style={{ marginTop: Theme.spacing.lg }} />
      <SkeletonLoader height={100} borderRadius={Theme.radius.lg} style={{ marginTop: Theme.spacing.md }} />
    </View>
  );
}

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonLoader height={100} borderRadius={Theme.radius.lg} />
    </View>
  );
}

export default function ScreenSkeleton({
  variant = 'list',
  rows = 6,
  style,
}: ScreenSkeletonProps) {
  return (
    <View style={[styles.root, style]} accessibilityLabel="Loading content" accessibilityRole="progressbar">
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'list' && <ListSkeleton rows={rows} />}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'card' && <CardSkeleton />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  dashboard: {
    gap: Theme.spacing.md,
  },
  hero: {
    marginBottom: Theme.spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  stat: {
    flex: 1,
  },
  block: {
    marginTop: Theme.spacing.xs,
  },
  list: {
    gap: Theme.spacing.sm,
  },
  search: {
    marginBottom: Theme.spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  listCopy: {
    flex: 1,
  },
  form: {
    gap: Theme.spacing.md,
  },
  field: {
    marginBottom: Theme.spacing.xs,
  },
  detail: {
    paddingTop: Theme.spacing.sm,
  },
  card: {},
});
