import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Theme } from '../../theme/tokens';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  variant?: 'default' | 'bordered' | 'flat';
}

export default function AppCard({
  children,
  style,
  onPress,
  padded = true,
  elevated = false,
  variant = 'default',
}: AppCardProps) {
  const cardStyle = [
    styles.card,
    variant === 'bordered' && styles.bordered,
    variant === 'flat' && styles.flat,
    elevated && variant === 'default' && styles.elevated,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.87}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxxl,
    overflow: 'hidden',
  },
  padded: {
    padding: Theme.spacing.md,
  },
  elevated: {
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bordered: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  flat: {
    backgroundColor: Theme.colors.cardAlt,
  },
});
