import React from 'react';
import { View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { studentPromotionStyles as styles } from './studentPromotionStyles';
import { PICKER_MUTED, PICKER_TEXT } from './types';

export default function PromoPicker({
  selectedValue,
  onValueChange,
  enabled = true,
  children,
}: {
  selectedValue: string;
  onValueChange: (v: string) => void;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.pickerWrap, !enabled && styles.pickerDisabled]}>
      <Picker
        enabled={enabled}
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
        itemStyle={styles.pickerItem}
        dropdownIconColor={PICKER_TEXT}
        mode="dropdown"
      >
        {children}
      </Picker>
    </View>
  );
}

