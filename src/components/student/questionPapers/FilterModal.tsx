import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import BottomSheetModal from '../../common/BottomSheetModal';
import { C } from '../../../theme/tokens';
import { questionPapersStyles as styles } from './questionPapersStyles';
import type { FilterOptions, SubjectOption } from './types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  subjects: SubjectOption[];
  examTypes: string[];
  currentFilterSubject: string;
  currentFilterExamType: string;
}

export default function FilterModal({
  visible,
  onClose,
  onApply,
  subjects,
  examTypes,
  currentFilterSubject,
  currentFilterExamType,
}: FilterModalProps) {
  const [selectedSubject, setSelectedSubject] = useState(currentFilterSubject);
  const [selectedExamType, setSelectedExamType] = useState(currentFilterExamType);

  useEffect(() => {
    if (visible) {
      setSelectedSubject(currentFilterSubject);
      setSelectedExamType(currentFilterExamType);
    }
  }, [visible, currentFilterSubject, currentFilterExamType]);

  const handleReset = () => {
    setSelectedSubject('all');
    setSelectedExamType('all');
  };

  const handleApply = () => {
    onApply({ subject: selectedSubject, examType: selectedExamType });
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.filterModal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Filter Papers</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="x" size={24} color={C.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.filterSectionTitle}>Subject</Text>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[styles.filterOption, selectedSubject === 'all' && styles.filterOptionActive]}
            onPress={() => setSelectedSubject('all')}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedSubject === 'all' && styles.filterOptionTextActive,
              ]}
            >
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={[styles.filterOption, selectedSubject === subject.id && styles.filterOptionActive]}
              onPress={() => setSelectedSubject(subject.id)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedSubject === subject.id && styles.filterOptionTextActive,
                ]}
              >
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterSectionTitle}>Exam Type</Text>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[styles.filterOption, selectedExamType === 'all' && styles.filterOptionActive]}
            onPress={() => setSelectedExamType('all')}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedExamType === 'all' && styles.filterOptionTextActive,
              ]}
            >
              All Types
            </Text>
          </TouchableOpacity>
          {examTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterOption, selectedExamType === type && styles.filterOptionActive]}
              onPress={() => setSelectedExamType(type)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedExamType === type && styles.filterOptionTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.resetModalBtn} onPress={handleReset}>
          <Text style={styles.resetModalBtnText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyModalBtn} onPress={handleApply}>
          <View style={styles.applyModalGradient}>
            <Text style={styles.applyModalBtnText}>Apply Filters</Text>
          </View>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}
