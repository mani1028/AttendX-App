import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { questionPaperStyles as styles } from './questionPaperStyles';

interface PickerFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}

export default function PickerField({
  label,
  value,
  placeholder,
  onPress,
  error,
}: PickerFieldProps) {
  return (
    <View style={styles.formGroup}>
      <AppText weight="semibold" style={styles.formLabel}>{label}</AppText>
      <TouchableOpacity accessibilityRole="button" style={styles.pickerField} onPress={onPress}>
        <AppText style={[styles.pickerValue, !value && styles.pickerPlaceholder]}>
          {value || placeholder}
        </AppText>
        <ChevronDown size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>
      {error ? <AppText style={styles.fieldError}>{error}</AppText> : null}
    </View>
  );
}
