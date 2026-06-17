import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../../theme/theme';

type ButtonType = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

type Props = TouchableOpacityProps & {
  title: string;
  type?: ButtonType;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function AppButton({
  title,
  type = 'primary',
  loading = false,
  leftIcon,
  rightIcon,
  size = 'md',
  style,
  textStyle,
  disabled,
  ...rest
}: Props) {
  const { color: _c, ...touchableProps } = rest as any;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      {...touchableProps}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        sizeStyles[size],
        typeStyles[type],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={type === 'secondary' || type === 'outline' || type === 'ghost' ? Theme.colors.primary : '#fff'}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.text, typeTextStyles[type], sizeTextStyles[size], textStyle]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  disabled: { opacity: 0.55 },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 36, paddingHorizontal: 14 },
  md: { minHeight: 48, paddingHorizontal: 20 },
  lg: { minHeight: 56, paddingHorizontal: 28 },
});

const sizeTextStyles = StyleSheet.create({
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 16 },
});

const typeStyles = StyleSheet.create({
  primary: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  secondary: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  danger: {
    backgroundColor: Theme.colors.error,
    shadowColor: Theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'rgba(102,72,220,0.08)',
  },
});

const typeTextStyles = StyleSheet.create({
  primary: { color: '#ffffff' },
  secondary: { color: Theme.colors.text },
  danger: { color: '#ffffff' },
  outline: { color: Theme.colors.primary },
  ghost: { color: Theme.colors.primary },
});
