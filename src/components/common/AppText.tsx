import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Theme } from '../../theme/tokens';



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
    ...Theme.typography.h1,
    letterSpacing: -0.8,
    color: Theme.colors.text,
    lineHeight: 34,
  },
  h2: {
    ...Theme.typography.h2,
    letterSpacing: -0.5,
    color: Theme.colors.text,
    lineHeight: 28,
  },
  h3: {
    ...Theme.typography.h3,
    letterSpacing: -0.3,
    color: Theme.colors.text,
    lineHeight: 24,
  },
  h4: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    lineHeight: 22,
  },
  body: {
    ...Theme.typography.body,
    fontWeight: '400',
    color: Theme.colors.text,
    lineHeight: 22,
  },
  bodyMd: {
    ...Theme.typography.bodyMd,
    fontWeight: '400',
    color: Theme.colors.text,
    lineHeight: 24,
  },
  caption: {
    ...Theme.typography.caption,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  label: {
    ...Theme.typography.label,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Theme.colors.textMuted,
  },
});
