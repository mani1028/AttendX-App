import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

export default function AppText({ children, style, ...props }: TextProps) {
  // If children is undefined or null, don't render anything to avoid Text component errors
  if (children === undefined || children === null) return null;

  return (
    <Text style={[styles.text, style]} {...props}>
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
