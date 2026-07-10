import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { StudentMark } from './types';
import { marksEntryStyles as styles } from './marksEntryStyles';

function RollTag({ roll }: { roll: string }) {
  return (
    <View style={styles.rollTag}>
      <AppText weight="bold" style={styles.rollTagText}>#{roll}</AppText>
    </View>
  );
}

interface StudentMarkRowProps {
  student: StudentMark;
  maxMarks: number;
  onAbsentToggle: (studentId: string, isAbsent: boolean) => void;
  onMarksChange: (studentId: string, value: string) => void;
}

export default function StudentMarkRow({
  student,
  onAbsentToggle,
  onMarksChange,
}: StudentMarkRowProps) {
  const isSaved = student.hasExistingMarks && student.marks_obtained !== '';

  return (
    <View style={[styles.studentRow, student.isAbsent && styles.studentRowAbsent, isSaved && styles.studentRowSaved]}>
      <View style={styles.studentInfoCol}>
        <View style={styles.studentMainInfo}>
          <RollTag roll={student.roll_number} />
          <AppText weight="bold" style={styles.studentName} numberOfLines={1}>{student.student_full_name}</AppText>
        </View>
        <AppText weight="semibold" style={styles.studentId}>ID: {student.student_id}</AppText>
      </View>

      <View style={styles.actionCol}>
        <View style={styles.attendanceToggle}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.toggleBtn, !student.isAbsent && styles.toggleBtnActive]}
            onPress={() => onAbsentToggle(student.student_id, false)}
          >
            <AppText weight="bold" style={[styles.toggleText, !student.isAbsent && styles.toggleTextActive]}>P</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.toggleBtn, student.isAbsent && styles.toggleBtnAbsentActive]}
            onPress={() => onAbsentToggle(student.student_id, true)}
          >
            <AppText weight="bold" style={[styles.toggleText, student.isAbsent && styles.toggleTextAbsentActive]}>A</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.marksContainer}>
          <TextInput
            style={[
              styles.marksInput,
              student.isAbsent && styles.marksInputDisabled,
              isSaved && styles.marksInputSaved,
            ]}
            placeholder="0"
            placeholderTextColor={Theme.colors.textMuted}
            keyboardType="numeric"
            value={student.isAbsent ? '0' : student.marks_obtained}
            onChangeText={(value) => onMarksChange(student.student_id, value)}
            editable={!student.isAbsent}
          />
        </View>
      </View>

      {isSaved && (
        <View style={styles.savedIndicator}>
          <CheckCircle2 size={12} color="#15803d" />
        </View>
      )}
    </View>
  );
}
