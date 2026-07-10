import React from 'react';
import { View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';
import type { PickerMode } from './types';

export interface ClassSectionPickerModalProps {
  pickerMode: PickerMode;
  classOptions: string[];
  selSectionOptions: string[];
  selClass: string;
  selSection: string;
  onClose: () => void;
  onSelectClass: (className: string) => void;
  onSelectSection: (section: string) => void;
}

export default function ClassSectionPickerModal({
  pickerMode,
  classOptions,
  selSectionOptions,
  selClass,
  selSection,
  onClose,
  onSelectClass,
  onSelectSection,
}: ClassSectionPickerModalProps) {
  return (
    <Modal visible={pickerMode !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <View>
              <AppText style={styles.pickerTitle}>
                {pickerMode === 'class' ? 'Select Class' : 'Select Section'}
              </AppText>
              <AppText style={styles.pickerSubtitle}>
                {pickerMode === 'class'
                  ? 'Choose the class to load available sections.'
                  : 'Choose a section for the selected class.'}
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn}>
              <XCircle size={22} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerShell}>
            <ScrollView style={{ maxHeight: 350 }}>
              {pickerMode === 'class' ? (
                !Array.isArray(classOptions) || classOptions.length === 0 ? (
                  <View style={{ padding: Theme.spacing.xl, alignItems: 'center' }}>
                    <AppText style={{ color: Theme.colors.textSec }}>No classes available</AppText>
                  </View>
                ) : (
                  classOptions.filter(Boolean).map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.pickerOption, selClass === item && styles.pickerOptionActive]}
                      onPress={() => {
                        onSelectClass(item);
                        onClose();
                      }}
                    >
                      <AppText style={[styles.pickerOptionText, selClass === item && styles.pickerOptionTextActive]}>
                        Class {item}
                      </AppText>
                      {selClass === item && <CheckCircle2 size={18} color={Theme.colors.primary} />}
                    </TouchableOpacity>
                  ))
                )
              ) : !Array.isArray(selSectionOptions) || selSectionOptions.length === 0 ? (
                <View style={{ padding: Theme.spacing.xl, alignItems: 'center' }}>
                  <AppText style={{ color: Theme.colors.textSec }}>No sections available</AppText>
                </View>
              ) : (
                selSectionOptions.filter(Boolean).map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pickerOption, selSection === item && styles.pickerOptionActive]}
                    onPress={() => {
                      onSelectSection(item);
                      onClose();
                    }}
                  >
                    <AppText style={[styles.pickerOptionText, selSection === item && styles.pickerOptionTextActive]}>
                      Section {item}
                    </AppText>
                    {selSection === item && <CheckCircle2 size={18} color={Theme.colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.pickerActions}>
            <TouchableOpacity style={[styles.pickerCancelBtn, { flex: 1 }]} onPress={onClose}>
              <AppText style={styles.pickerCancelText}>Close</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
