import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { payrollStyles as styles } from './payrollStyles';

type FieldProps = {
  label: string;
  hint?: string;
  width?: '48%' | '100%';
  children: React.ReactNode;
};

export const PayrollField: React.FC<FieldProps> = ({ label, hint, width = '100%', children }) => (
  <View style={[styles.fieldContainer, { width }]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>
);

export const PctInput: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => (
  <View style={styles.pctInputContainer}>
    <TextInput
      style={styles.pctInput}
      value={value === 0 ? '' : String(value)}
      onChangeText={(text) => onChange(Number(text) || 0)}
      keyboardType="numeric"
      placeholder="0"
      placeholderTextColor={Theme.colors.textMuted}
    />
    <Text style={styles.pctInputSymbol}>%</Text>
  </View>
);

export const RupeeInput: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => (
  <View style={styles.rupeeInputContainer}>
    <Text style={styles.rupeeInputSymbol}>₹</Text>
    <TextInput
      style={styles.rupeeInput}
      value={value === 0 ? '' : String(value)}
      onChangeText={(text) => onChange(Number(text) || 0)}
      keyboardType="numeric"
      placeholder="0"
      placeholderTextColor={Theme.colors.textMuted}
    />
  </View>
);

export const PayrollTypeToggle: React.FC<{ mode: string; onChange: (mode: string) => void }> = ({ mode, onChange }) => (
  <View style={styles.toggleContainer}>
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.toggleOption, mode === 'fixed' && styles.toggleOptionActive]}
      onPress={() => onChange('fixed')}
    >
      <View style={[styles.radioOuter, mode === 'fixed' && { borderColor: Theme.colors.primary }]}>
        {mode === 'fixed' ? <View style={styles.radioInner} /> : null}
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={[styles.toggleOptionTitle, mode === 'fixed' && styles.toggleOptionTitleActive]}>Fixed Payroll</Text>
        <Text style={[styles.toggleOptionDesc, mode === 'fixed' && styles.toggleOptionDescActive]}>Basic pay only. LOP for absences.</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.toggleOption, mode === 'corporate' && styles.toggleOptionActive]}
      onPress={() => onChange('corporate')}
    >
      <View style={[styles.radioOuter, mode === 'corporate' && { borderColor: Theme.colors.primary }]}>
        {mode === 'corporate' ? <View style={styles.radioInner} /> : null}
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={[styles.toggleOptionTitle, mode === 'corporate' && styles.toggleOptionTitleActive]}>Corporate Payroll</Text>
        <Text style={[styles.toggleOptionDesc, mode === 'corporate' && styles.toggleOptionDescActive]}>Full structure: HRA, DA, TA, PF, ESI.</Text>
      </View>
    </TouchableOpacity>
  </View>
);
