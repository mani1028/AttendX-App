import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';
import type { SectionGroup } from './types';

export interface ClassSectionPickerModalsProps {
  showClassDropdown: boolean;
  showSectionDropdown: boolean;
  studentGroups: [string, SectionGroup[]][];
  availableSections: SectionGroup[];
  onCloseClass: () => void;
  onCloseSection: () => void;
  onSelectClass: (sections: SectionGroup[]) => void;
  onSelectSection: (section: SectionGroup) => void;
}

export default function ClassSectionPickerModals({
  showClassDropdown,
  showSectionDropdown,
  studentGroups,
  availableSections,
  onCloseClass,
  onCloseSection,
  onSelectClass,
  onSelectSection,
}: ClassSectionPickerModalsProps) {
  return (
    <>
      <Modal visible={showClassDropdown} transparent animationType="fade" onRequestClose={onCloseClass}>
        <TouchableOpacity accessibilityRole="button" style={styles.pickerOverlay} activeOpacity={1} onPress={onCloseClass}>
          <View style={styles.pickerSheet}>
            <AppText style={styles.pickerSheetTitle} weight="bold">Select Class</AppText>
            <ScrollView>
              {studentGroups.map(([grade, sections]) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={grade}
                  style={styles.pickerRow}
                  onPress={() => onSelectClass(sections)}
                >
                  <View>
                    <AppText style={styles.pickerRowTitle} weight="semibold">Class {grade}</AppText>
                    <AppText style={styles.pickerRowSubtitle}>
                      {sections.length} section{sections.length !== 1 ? 's' : ''}
                    </AppText>
                  </View>
                  <ChevronRight size={18} color={C.muted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSectionDropdown} transparent animationType="fade" onRequestClose={onCloseSection}>
        <TouchableOpacity accessibilityRole="button" style={styles.pickerOverlay} activeOpacity={1} onPress={onCloseSection}>
          <View style={styles.pickerSheet}>
            <AppText style={styles.pickerSheetTitle} weight="bold">Select Section</AppText>
            <ScrollView>
              {availableSections.map(section => {
                const presentPct = section.students_total
                  ? Math.round(((section.present || 0) / section.students_total) * 100)
                  : 0;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={`${section.class_grade}-${section.section}`}
                    style={styles.pickerRow}
                    onPress={() => onSelectSection(section)}
                  >
                    <View>
                      <AppText style={styles.pickerRowTitle} weight="semibold">Section {section.section}</AppText>
                      <AppText style={styles.pickerRowSubtitle}>{section.students_total || 0} students</AppText>
                    </View>
                    <View style={[styles.pickerPct, presentPct > 75 ? styles.sectionPctHigh : styles.sectionPctLow]}>
                      <AppText style={styles.sectionPctText} weight="bold">{presentPct}%</AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
