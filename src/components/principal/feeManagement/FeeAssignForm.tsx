import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FileText, User, CheckCircle2, X, Calendar, Plus, Search } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { getStudentClass, getStudentName } from './helpers';
import type { FormData, Student } from './types';

export interface FeeAssignFormProps {
  formData: FormData;
  students: Student[];
  loading: boolean;
  showDatePicker: boolean;
  onInputChange: (name: keyof FormData, value: string) => void;
  onOpenStudentSearch: () => void;
  onClearStudent: () => void;
  onShowDatePicker: (show: boolean) => void;
  onDateChange: (event: any, selectedDate?: Date) => void;
  onSubmit: () => void;
}

export default function FeeAssignForm({
  formData,
  students,
  loading,
  showDatePicker,
  onInputChange,
  onOpenStudentSearch,
  onClearStudent,
  onShowDatePicker,
  onDateChange,
  onSubmit,
}: FeeAssignFormProps) {
  const selectedStudent = students.find(s => s.id === formData.student_id);

  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeaderRow}>
        <FileText size={20} color={C.text} />
        <AppText style={styles.formTitle} weight="bold">Assign Fee to Student</AppText>
      </View>

      <View style={styles.formGroup}>
        <View>
          <View style={styles.labelRow}>
            <User size={16} color={C.textMuted} />
            <AppText style={styles.label} weight="semibold">Student</AppText>
          </View>
          {selectedStudent ? (
            <View style={styles.selectedStudentBadge}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.selectedStudentBadgeLeft}
                onPress={onOpenStudentSearch}
                activeOpacity={0.7}
              >
                <CheckCircle2 size={18} color={C.success} />
                <AppText style={styles.selectedStudentText} weight="semibold">
                  {getStudentName(selectedStudent)}
                  {selectedStudent.roll_number ? ` (Roll: ${selectedStudent.roll_number})` : ''}
                  {getStudentClass(selectedStudent) ? ` (${getStudentClass(selectedStudent)})` : ''}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={onClearStudent} style={styles.clearSelectedStudentBtn}>
                <X size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity accessibilityRole="button" style={styles.searchTriggerInput} onPress={onOpenStudentSearch} activeOpacity={0.7}>
              <AppText style={styles.searchTriggerText}>Search student by name, class, or roll number...</AppText>
              <Search size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View>
          <AppText style={styles.label} weight="semibold">Total Fee (₹)</AppText>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            value={formData.total_fee}
            onChangeText={(text) => onInputChange('total_fee', text)}
          />
        </View>

        <View>
          <AppText style={styles.label} weight="semibold">Due Date</AppText>
          <TouchableOpacity accessibilityRole="button" style={styles.dateInput} onPress={() => onShowDatePicker(true)}>
            <AppText style={styles.dateText}>{formData.due_date || 'Select Date'}</AppText>
            <Calendar size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.submitButton} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Theme.colors.card} />
          ) : (
            <>
              <Plus size={16} color={Theme.colors.card} />
              <AppText style={styles.submitButtonText} weight="bold">Create Fee</AppText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={formData.due_date ? new Date(formData.due_date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
    </View>
  );
}
