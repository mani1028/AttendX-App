import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AppInput from '../../common/AppInput';
import type { FormData } from './types';
import { principalRegistrationStyles as styles } from './principalRegistrationStyles';

interface BranchStepProps {
  form: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  errors: Record<string, string>;
}

export default function BranchStep({ form, onChange, errors }: BranchStepProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>🏢 Branch Information</Text>

      <AppInput
        label="Branch ID"
        placeholder="e.g. BR-001"
        value={form.branch_id}
        onChangeText={(text) => onChange('branch_id', text)}
        error={errors.branch_id}
        autoCapitalize="characters"
      />

      <AppInput
        label="Branch Name"
        placeholder="e.g. Main Campus"
        value={form.branch_name}
        onChangeText={(text) => onChange('branch_name', text)}
        error={errors.branch_name}
      />

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Status <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerContainer}>
          {['ACTIVE', 'INACTIVE'].map(opt => (
            <TouchableOpacity
              accessibilityRole="button"
              key={opt}
              style={[styles.pickerOption, form.status === opt && styles.pickerOptionActive]}
              onPress={() => onChange('status', opt)}
            >
              <Text style={[styles.pickerText, form.status === opt && styles.pickerTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.status && <Text style={styles.errorText}>{errors.status}</Text>}
      </View>
    </View>
  );
}
