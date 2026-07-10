import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { colors, Theme } from '../../../theme/tokens';
import { motion } from '../../../theme/motion';

export interface DirectorKpiCardProps {
  title: string;
  value: number;
  sub: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeUp: boolean;
  cardStyle?: ViewStyle;
  onPress?: () => void;
}

export default function DirectorKpiCard({
  title,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  badgeUp,
  cardStyle,
  onPress,
}: DirectorKpiCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const handlePressIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...motion.springs.snappy,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const onPressIn = () => {
    Animated.spring(handlePressIn, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(handlePressIn, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.kpiCard,
        cardStyle,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            {
              scale: handlePressIn.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.95],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.8}
        style={{ flex: 1, justifyContent: 'space-between' }}
      >
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
            <Icon size={16} color={iconColor} />
          </View>
          <View style={[styles.kpiBadge, badgeUp ? styles.kpiBadgeUp : styles.kpiBadgeDown]}>
            <View style={[styles.kpiBadgeDot, { backgroundColor: badgeUp ? colors.success : colors.error }]} />
            <AppText style={[styles.kpiBadgeText, { color: badgeUp ? colors.success : colors.error }]} weight="bold">
              {badge}
            </AppText>
          </View>
        </View>
        <AppText style={styles.kpiTitle} weight="bold">{title}</AppText>
        <AppText
          style={[styles.kpiValue, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
          weight="bold"
        >
          {value}
        </AppText>
        <AppText style={styles.kpiSub}>{sub}</AppText>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  kpiCard: {
    minHeight: 126,
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiBadgeUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  kpiBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  kpiBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Theme.spacing.xs,
  },
  kpiBadgeText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: colors.accent,
  },
  kpiTitle: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  kpiSub: {
    fontSize: Theme.typography.label.fontSize,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
