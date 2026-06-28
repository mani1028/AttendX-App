import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppText from './AppText';
import { Theme } from '../../theme/tokens';
import { isWebRegistrationFieldRequired } from '../../utils/studentRegistrationValidation';

interface RegistrationFormFieldProps {
  label: string;
  step: number;
  fieldKey?: string;
  /** Override auto-detection from web required-field map. */
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function RegistrationFormField({
  label,
  step,
  fieldKey,
  required,
  error,
  children,
}: RegistrationFormFieldProps) {
  const showRequired =
    required === true ||
    (required !== false && Boolean(fieldKey && isWebRegistrationFieldRequired(fieldKey, step)));

  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>
        {label}
        {showRequired ? <Text style={styles.requiredStar}> *</Text> : null}
      </Text>
      {children}
      {error ? <AppText style={styles.fieldError}>{error}</AppText> : null}
    </View>
  );
}

export function StepRequiredLegend() {
  return (
    <Text style={styles.legend}>
      Fields marked with <Text style={styles.requiredStarInline}>*</Text> are required
    </Text>
  );
}

export function RequiredSectionTitle({
  title,
  required = false,
}: {
  title: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.sectionTitle}>
      {title}
      {required ? <Text style={styles.requiredStar}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  requiredStarInline: {
    color: '#DC2626',
    fontWeight: '700',
  },
  fieldError: {
    color: Theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  legend: {
    fontSize: 12,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
});
