import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import CustomPickerModal from '../../common/CustomPickerModal';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { Theme } from '../../../theme/tokens';
import { ClassItem, SectionItem, ExamItem, SubjectItem } from './types';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface MarksFilterModalProps {
  visible: boolean;
  classes: ClassItem[];
  sections: SectionItem[];
  exams: ExamItem[];
  subjects: SubjectItem[];
  selectedClass: string;
  selectedSection: string;
  selectedExam: string;
  selectedSubject: string;
  onSelectClass: (classId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onSelectExam: (examId: string) => void;
  onSelectSubject: (subjectId: string) => void;
  onApply: () => void;
  onClose: () => void;
}

export default function MarksFilterModal({
  visible,
  classes,
  sections,
  exams,
  subjects,
  selectedClass,
  selectedSection,
  selectedExam,
  selectedSubject,
  onSelectClass,
  onSelectSection,
  onSelectExam,
  onSelectSubject,
  onApply,
  onClose,
}: MarksFilterModalProps) {
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: { label: string; value: string }[];
    selectedValue: string;
    onValueChange: (value: string) => void;
  } | null>(null);

  const handleOptionSelect = (mode: 'class' | 'section' | 'exam' | 'subject', id: string) => {
    if (mode === 'class') { onSelectClass(id); }
    else if (mode === 'section') { onSelectSection(id); }
    else if (mode === 'exam') { onSelectExam(id); }
    else if (mode === 'subject') { onSelectSubject(id); }
  };

  const currentSelection = (type: 'class' | 'section' | 'exam' | 'subject') => {
    if (type === 'class') { return classes.find(c => c.class_id === selectedClass)?.class_name || 'Select Class'; }
    if (type === 'section') { return sections.find(s => s.section_id === selectedSection)?.section_name || 'Select Section'; }
    if (type === 'exam') { return exams.find(e => e.exam_id === selectedExam)?.exam_name || 'Select Exam'; }
    if (type === 'subject') { return subjects.find(s => s.subject_id === selectedSubject)?.subject_name || 'Select Subject'; }
    return '';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText weight="bold" style={styles.modalTitle}>Select Filters</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={20} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
            <View style={styles.filterGroup}>
              <AppText weight="bold" style={styles.modalLabel}>Class</AppText>
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerSelector}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Class',
                  options: classes.map(c => ({ label: c.class_name, value: c.class_id })),
                  selectedValue: selectedClass,
                  onValueChange: (v) => handleOptionSelect('class', v),
                })}
              >
                <AppText style={styles.pickerSelectorText}>{currentSelection('class')}</AppText>
                <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            {selectedClass ? (
              <View style={styles.filterGroup}>
                <AppText weight="bold" style={styles.modalLabel}>Section</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.pickerSelector}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Section',
                    options: sections.map(s => ({ label: s.section_name, value: s.section_id })),
                    selectedValue: selectedSection,
                    onValueChange: (v) => handleOptionSelect('section', v),
                  })}
                >
                  <AppText style={styles.pickerSelectorText}>{currentSelection('section')}</AppText>
                  <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.filterGroup}>
              <AppText weight="bold" style={styles.modalLabel}>Exam</AppText>
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerSelector}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Exam',
                  options: exams.map(e => ({ label: e.exam_name, value: e.exam_id })),
                  selectedValue: selectedExam,
                  onValueChange: (v) => handleOptionSelect('exam', v),
                })}
              >
                <AppText style={styles.pickerSelectorText}>{currentSelection('exam')}</AppText>
                <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
            </View>

            {selectedClass ? (
              <View style={styles.filterGroup}>
                <AppText weight="bold" style={styles.modalLabel}>Subject</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.pickerSelector}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Subject',
                    options: subjects.map(su => ({ label: su.subject_name, value: su.subject_id })),
                    selectedValue: selectedSubject,
                    onValueChange: (v) => handleOptionSelect('subject', v),
                  })}
                >
                  <AppText style={styles.pickerSelectorText}>{currentSelection('subject')}</AppText>
                  <ChevronRight size={18} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Apply Filters" onPress={onApply} disabled={!selectedClass || !selectedSection || !selectedExam || !selectedSubject} />
          </View>
        </View>
      </View>

      {pickerModal ? (
        <CustomPickerModal
          {...pickerModal}
          onClose={() => setPickerModal(null)}
        />
      ) : null}
    </Modal>
  );
}
