import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Text,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/theme';
import { Eye, EyeOff } from 'lucide-react-native';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  inputStyle,
  secureTextEntry,
  leftIcon,
  rightIcon,
  onFocus: userOnFocus,
  onBlur: userOnBlur,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    userOnFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
    userOnBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? Theme.colors.error : Theme.colors.border, error ? Theme.colors.error : Theme.colors.primary],
  });

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isFocused && styles.labelFocused, error && styles.labelError]}>
          {label}
        </Text>
      )}
      <Animated.View style={[styles.inputWrapper, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            (isPassword || rightIcon) ? styles.inputWithRight : null,
            inputStyle,
          ]}
          placeholderTextColor={Theme.colors.textMuted}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity style={styles.rightIcon} onPress={() => setIsPasswordVisible(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isPasswordVisible
              ? <Eye size={18} color={Theme.colors.textMuted} />
              : <EyeOff size={18} color={Theme.colors.textMuted} />
            }
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: Theme.colors.primary,
  },
  labelError: {
    color: Theme.colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.inputBg,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  inputWithLeft: {
    paddingLeft: 8,
  },
  inputWithRight: {
    paddingRight: 8,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  rightIcon: {
    paddingRight: 14,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
    marginLeft: 4,
  },
  hintText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
  },
});

export default AppInput;
