import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../theme/tokens';

const HIT = 44;

interface IconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel: string;
}

/** Minimum 44×44pt touch target per Apple HIG. */
export default function IconButton({
  onPress,
  disabled,
  children,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={[styles.btn, style]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: HIT,
    minHeight: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.full,
  },
});
