import React from 'react';
import { View, TextInput } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { salariesStyles as styles } from './salariesStyles';

export interface SalarySearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SalarySearchInput({ value, onChangeText, placeholder }: SalarySearchInputProps) {
  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder || 'Search...'}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Theme.colors.textMuted}
      />
    </View>
  );
}
