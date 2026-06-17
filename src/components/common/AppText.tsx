import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Theme } from '../../theme/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyMd' | 'caption' | 'label';

interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  muted?: boolean;
  children: React.ReactNode;
}

const weights: Record<Weight, string> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export default function AppText({
  variant = 'body',
  weight,
  color,
  muted,
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles[variant],
        weight ? { fontWeight: weights[weight] as any } : null,
        color ? { color } : muted ? { color: Theme.colors.textMuted } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: Theme.colors.text,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Theme.colors.text,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Theme.colors.text,
    lineHeight: 24,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: Theme.colors.text,
    lineHeight: 22,
  },
  bodyMd: {
    fontSize: 15,
    fontWeight: '400',
    color: Theme.colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Theme.colors.textMuted,
  },
});
