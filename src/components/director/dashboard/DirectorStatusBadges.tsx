import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../common/AppText';
import { colors, Theme } from '../../../theme/tokens';
import { getHealthMeta } from './helpers';

export const DirectorStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <AppText style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </AppText>
    </View>
  );
};

export const DirectorHealthBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = getHealthMeta(status);
  return (
    <View style={[styles.healthBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <AppText style={[styles.healthText, { color: meta.color }]}>{meta.label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radius.xl,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    ...Theme.typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.error,
  },
  healthBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Theme.radius.md,
    borderWidth: 1.2,
    marginTop: Theme.spacing.xs,
  },
  healthText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});
