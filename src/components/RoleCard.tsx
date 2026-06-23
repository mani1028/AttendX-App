import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/tokens';

type Props = {
  title: string;
  subtitle: string;
  onPress?: () => void;
};

export default function RoleCard({ title, subtitle, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  accentBar: {
    width: 6,
    backgroundColor: colors.accent,
  },
  content: {
    padding: 14,
    gap: 4,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
