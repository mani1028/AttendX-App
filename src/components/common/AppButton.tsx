import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  TouchableOpacityProps,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import RNReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Theme } from '../../theme/tokens';
import { motion } from '../../theme/motion';

type ButtonType = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

type Props = Omit<TouchableOpacityProps, 'style'> & {
  title: string;
  type?: ButtonType;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  onPress,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    scale.value = withSpring(0.96, motion.springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, motion.springs.bouncy);
  };

  const handlePress = (e: any) => {
    if (type === 'danger') {
      RNReactNativeHapticFeedback.trigger('notificationError');
    } else if (type === 'primary') {
      RNReactNativeHapticFeedback.trigger('impactMedium');
    } else {
      RNReactNativeHapticFeedback.trigger('impactLight');
    }
    if (onPress) {onPress(e);}
  };

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...(rest as any)}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.base,
        sizeStyles[size],
        typeStyles[type],
        isDisabled && styles.disabled,
        style,
        aStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={type === 'secondary' || type === 'outline' || type === 'ghost' ? Theme.colors.primary : Theme.colors.card}
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
    </AnimatedPressable>
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
  iconLeft: { marginRight: Theme.spacing.sm },
  iconRight: { marginLeft: Theme.spacing.sm },
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
  md: { ...Theme.typography.bodyMd },
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
    backgroundColor: `${Theme.colors.primary}14`, // ~8% opacity of primary
  },
});

const typeTextStyles = StyleSheet.create({
  primary: { color: Theme.colors.card },
  secondary: { color: Theme.colors.text },
  danger: { color: Theme.colors.card },
  outline: { color: Theme.colors.primary },
  ghost: { color: Theme.colors.primary },
});
