import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../common/AppText';
import { Theme, colors } from '../../theme/tokens';

export interface QuickActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress: () => void;
}

interface AdminQuickActionGridProps {
  actions: QuickActionItem[];
}

export default function AdminQuickActionGrid({ actions }: AdminQuickActionGridProps) {
  return (
    <View style={styles.grid}>
      {actions.map(action => (
        <TouchableOpacity
          key={action.key}
          style={styles.card}
          onPress={action.onPress}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View style={[styles.iconWrap, { backgroundColor: action.iconBg }]}>
            {action.icon}
          </View>
          <AppText style={styles.label} numberOfLines={2}>
            {action.label}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Theme.spacing.xl,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 17,
  },
});
