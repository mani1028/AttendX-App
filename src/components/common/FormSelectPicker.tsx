import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AppText from './AppText';
import CustomPickerModal from './CustomPickerModal';
import { Theme } from '../../theme/tokens';

export interface FormSelectOption {
  label: string;
  value: string;
}

interface FormSelectPickerProps {
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  title: string;
  placeholder?: string;
  error?: boolean;
  style?: ViewStyle;
}

export default function FormSelectPicker({
  value,
  onChange,
  options,
  title,
  placeholder = 'Select',
  error = false,
  style,
}: FormSelectPickerProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.trigger, error && styles.triggerError, style]}
        onPress={() => setVisible(true)}
      >
        <AppText style={[styles.text, !value && styles.placeholderText]}>
          {selectedLabel || placeholder}
        </AppText>
        <ChevronDown size={18} color={Theme.colors.textSec} />
      </TouchableOpacity>

      <CustomPickerModal
        visible={visible}
        title={title}
        options={options}
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
