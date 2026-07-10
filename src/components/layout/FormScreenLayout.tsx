import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../theme/tokens';

interface FormScreenLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
}

/** Keyboard-safe scroll wrapper for forms. */
export default function FormScreenLayout({
  children,
  footer,
  style,
  contentStyle,
  scrollProps,
}: FormScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Theme.spacing.lg },
          contentStyle,
        ]}
        {...scrollProps}
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + Theme.spacing.sm }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.background },
  scroll: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
  },
});
