import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import { modalStyles as styles } from './modalStyles';

interface AdminInlineSelectorProps {
  options: { label: string; value: unknown }[];
  selectedValue: unknown;
  onSelect: (val: unknown) => void;
  disabled?: boolean;
}

export default function AdminInlineSelector({ options, selectedValue, onSelect, disabled }: AdminInlineSelectorProps) {
  return (
    <View style={[styles.inlineSelector, disabled && { opacity: 0.5 }]}>
      {options.map(opt => {
        const active = opt.value === selectedValue;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            key={String(opt.value)}
            style={[styles.inlineSelectorOption, active && styles.inlineSelectorOptionActive]}
            onPress={() => !disabled && onSelect(opt.value)}
            disabled={disabled}
          >
            <AppText style={[styles.inlineSelectorText, active && styles.inlineSelectorTextActive]}>
              {opt.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
