import React from 'react';
import { View, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { getStudentClass, getStudentName } from './helpers';
import type { Student } from './types';

export interface StudentSearchModalProps {
  visible: boolean;
  students: Student[];
  searchText: string;
  onSearchChange: (text: string) => void;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
}

export default function StudentSearchModal({
  visible,
  students,
  searchText,
  onSearchChange,
  onClose,
  onSelectStudent,
}: StudentSearchModalProps) {
  const search = searchText.trim().toLowerCase();
  const filtered = students.filter(student => {
    const name = getStudentName(student).toLowerCase();
    const cls = getStudentClass(student).toLowerCase();
    const id = (student.id || '').toLowerCase();
    const roll = (student.roll_number || '').toLowerCase();
    return name.includes(search) || cls.includes(search) || id.includes(search) || roll.includes(search);
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.studentSearchModal]}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">Select Student</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Type name, class, or roll number..."
              placeholderTextColor={C.textMuted}
              value={searchText}
              onChangeText={onSearchChange}
              autoFocus
            />
          </View>

          <ScrollView style={[styles.modalStudentList, innerPageLayoutStyles.scrollViewFront]} keyboardShouldPersistTaps="always">
            {filtered.length === 0 ? (
              <View style={styles.noSuggestionItem}>
                <AppText style={styles.noSuggestionText}>No students match "{searchText}"</AppText>
              </View>
            ) : (
              filtered.map((student, index) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={student.id || `search-student-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => onSelectStudent(student.id)}
                >
                  <View style={styles.suggestionRow}>
                    <View style={styles.suggestionMain}>
                      <AppText style={styles.suggestionItemText} weight="semibold">{getStudentName(student)}</AppText>
                      {Boolean(student.roll_number) && (
                        <AppText style={styles.suggestionItemSubtext}>Roll No: {student.roll_number}</AppText>
                      )}
                    </View>
                    {getStudentClass(student) ? (
                      <AppText style={styles.suggestionItemSubtext}>{getStudentClass(student)}</AppText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
