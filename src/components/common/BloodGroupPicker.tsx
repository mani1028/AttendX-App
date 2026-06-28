import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AppText from './AppText';
import CustomPickerModal from './CustomPickerModal';
import { Theme } from '../../theme/tokens';
import { bloodGroupPickerOptions } from '../../utils/studentRegistrationValidation';

interface BloodGroupPickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
  style?: ViewStyle;
}

export default function BloodGroupPicker({
  value,
  onChange,
  error = false,
  placeholder = 'Select blood group',
  style,
}: BloodGroupPickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.trigger, error && styles.triggerError, style]}
        onPress={() => setVisible(true)}
      >
        <AppText style={[styles.text, !value && styles.placeholderText]}>
          {value || placeholder}
        </AppText>
        <ChevronDown size={18} color={Theme.colors.textSec} />
      </TouchableOpacity>

      <CustomPickerModal
        visible={visible}
        title="Select Blood Group"
        options={bloodGroupPickerOptions()}
        selectedValue={value}
        onValueChange={(nextValue) => {
          onChange(String(nextValue || ''));
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Theme.colors.background,
  },
  triggerError: {
    borderColor: Theme.colors.error,
  },
  text: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Theme.colors.textMuted,
  },
});
