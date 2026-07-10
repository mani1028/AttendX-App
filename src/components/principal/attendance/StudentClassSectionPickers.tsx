import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

export interface StudentClassSectionPickersProps {
  selectedClassLabel: string;
  selectedSectionLabel: string;
  hasSelectedSection: boolean;
  onClassPress: () => void;
  onSectionPress: () => void;
}

export default function StudentClassSectionPickers({
  selectedClassLabel,
  selectedSectionLabel,
  hasSelectedSection,
  onClassPress,
  onSectionPress,
}: StudentClassSectionPickersProps) {
  return (
    <View style={styles.studentFilterRow}>
      <TouchableOpacity accessibilityRole="button" style={styles.pickerPill} onPress={onClassPress} activeOpacity={0.85}>
        <View style={styles.pickerPillContent}>
          <View style={styles.pickerTextGroup}>
            <AppText style={styles.pickerLabel}>Class</AppText>
            <AppText style={styles.pickerValue} weight="semibold">{selectedClassLabel}</AppText>
          </View>
          <ChevronDown size={16} color={C.muted} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.pickerPill, !hasSelectedSection && styles.pickerPillDisabled]}
        onPress={onSectionPress}
        activeOpacity={0.85}
        disabled={!hasSelectedSection}
      >
        <View style={styles.pickerPillContent}>
          <View style={styles.pickerTextGroup}>
            <AppText style={styles.pickerLabel}>Section</AppText>
            <AppText style={styles.pickerValue} weight="semibold">{selectedSectionLabel}</AppText>
          </View>
          <ChevronDown size={16} color={C.muted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
