import React from 'react';
import { View, Text } from 'react-native';
import { teacherRegistrationStyles as styles } from './teacherRegistrationStyles';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>
        {label}
        {required && <Text style={styles.requiredStar}> *</Text>}
      </Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}
