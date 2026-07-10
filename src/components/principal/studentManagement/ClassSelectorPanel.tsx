import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Plus, ChevronDown } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { studentManagementStyles as styles } from './styles';
import type { SelectedClass } from './types';

export interface ClassSelectorPanelProps {
  selected: SelectedClass | null;
  isCompactScreen: boolean;
  onOpenGradePicker: () => void;
  onOpenSectionPicker: () => void;
  onAddClass: () => void;
}

export default function ClassSelectorPanel({
  selected,
  isCompactScreen,
  onOpenGradePicker,
  onOpenSectionPicker,
  onAddClass,
}: ClassSelectorPanelProps) {
  return (
    <View style={styles.selectorContainer}>
      <View style={styles.selectorHeader}>
        <AppText style={styles.panelTitle} weight="bold">Classes & Sections</AppText>
        {isCompactScreen && (
          <TouchableOpacity accessibilityRole="button" style={styles.addBtnSmall} onPress={onAddClass}>
            <Plus size={14} color={C.primary} />
            <AppText style={styles.addBtnSmallText} weight="semibold">Add Class</AppText>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.selectRow}>
        <View style={styles.selectField}>
          <AppText style={styles.selectLabel}>Class</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.selectTrigger}
            onPress={onOpenGradePicker}
            activeOpacity={0.85}
          >
            <AppText style={[styles.selectValue, !selected?.class_grade && styles.selectPlaceholder]} numberOfLines={1}>
              {selected?.class_grade ? `Class ${selected.class_grade}` : 'Select class'}
            </AppText>
            <ChevronDown size={16} color={C.t3} />
          </TouchableOpacity>
        </View>
        <View style={styles.selectField}>
          <AppText style={styles.selectLabel}>Section</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.selectTrigger, !selected?.class_grade && styles.selectTriggerDisabled]}
            onPress={() => selected?.class_grade && onOpenSectionPicker()}
            activeOpacity={0.85}
            disabled={!selected?.class_grade}
          >
            <AppText style={[styles.selectValue, !selected?.section && styles.selectPlaceholder]} numberOfLines={1}>
              {selected?.section ? `Section ${selected.section}` : 'Select section'}
            </AppText>
            <ChevronDown size={16} color={C.t3} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
