import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../../constants/theme';

interface AppTextProps extends TextProps {
  weight?: 'regular' | 'semiBold' | 'bold';
}

export default function AppText({ children, style, weight = 'regular', ...props }: AppTextProps) {
  // If children is undefined or null, don't render anything to avoid Text component errors
  if (children === undefined || children === null) return null;

  const getWeightStyle = (): TextStyle => {
    switch (weight) {
      case 'bold':
        return { fontWeight: '700' };
      case 'semiBold':
        return { fontWeight: '600' };
      case 'regular':
      default:
        return { fontWeight: '400' };
    }
  };

  return (
    <Text style={[styles.text, getWeightStyle(), style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});
