import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronRight, Users, LayoutGrid, ClipboardList, BookOpen } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { Theme } from '../../../theme/tokens';
import { ClassItem, SectionItem, ExamItem, SubjectItem, FilterPickerMode } from './types';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface MarksClassSelectorProps {
  classId: string;
  sectionId: string;
  examId: string;
  subjectId: string;
  classes: ClassItem[];
  sections: SectionItem[];
  exams: ExamItem[];
  subjects: SubjectItem[];
  loadingClasses: boolean;
  loadingExams: boolean;
  loadingStudents: boolean;
  onOpenPicker: (mode: FilterPickerMode) => void;
  onSearch: () => void;
}

export default function MarksClassSelector({
  classId,
  sectionId,
  examId,
  subjectId,
  classes,
  sections,
  exams,
  subjects,
  loadingClasses,
  loadingExams,
  loadingStudents,
  onOpenPicker,
  onSearch,
}: MarksClassSelectorProps) {
  return (
    <AppCard style={styles.mainCard} elevated={false} variant="flat">
      <View style={styles.selectionRow}>
        <View style={[styles.selectionField, { marginRight: 10 }]}>
          <AppText weight="bold" style={styles.selectionLabel}>Class</AppText>
          <TouchableOpacity accessibilityRole="button" style={styles.selectionDropdown} onPress={() => onOpenPicker('class')}>
            <Users size={18} color={classId ? Theme.colors.primary : Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
            <AppText weight="semibold" style={[styles.selectionDropdownText, !classId && { color: Theme.colors.textMuted }]} numberOfLines={1}>
              {classId ? `Class ${classes.find(c => c.class_id === classId)?.class_name || classId}` : 'Select Class'}
            </AppText>
            <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <AppText style={styles.selectionHelperText}>
            {loadingClasses ? 'Loading classes...' : 'Tap to choose a class'}
          </AppText>
        </View>

        <View style={styles.selectionField}>
          <AppText weight="bold" style={styles.selectionLabel}>Section</AppText>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.selectionDropdown, !classId && styles.selectionDropdownDisabled]}
            onPress={() => onOpenPicker('section')}
            disabled={!classId}
          >
            <LayoutGrid size={18} color={sectionId ? Theme.colors.primary : Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
            <AppText weight="semibold" style={[styles.selectionDropdownText, !sectionId && { color: Theme.colors.textMuted }]} numberOfLines={1}>
              {sectionId ? `Section ${sections.find(s => s.section_id === sectionId)?.section_name || sectionId}` : 'Select Section'}
            </AppText>
            <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <AppText style={styles.selectionHelperText}>
            {classId ? `${sections.length} section${sections.length === 1 ? '' : 's'} available` : 'Pick a class first'}
          </AppText>
        </View>
      </View>

      <View style={styles.selectionRow}>
        <View style={[styles.selectionField, { marginRight: 10 }]}>
          <AppText weight="bold" style={styles.selectionLabel}>Exam</AppText>
          <TouchableOpacity accessibilityRole="button" style={styles.selectionDropdown} onPress={() => onOpenPicker('exam')}>
            <ClipboardList size={18} color={examId ? Theme.colors.primary : Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
            <AppText weight="semibold" style={[styles.selectionDropdownText, !examId && { color: Theme.colors.textMuted }]} numberOfLines={1}>
              {examId ? exams.find(e => e.exam_id === examId)?.exam_name || examId : 'Select Exam'}
            </AppText>
            <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <AppText style={styles.selectionHelperText}>
            {loadingExams ? 'Loading exams...' : `${exams.length} exam${exams.length === 1 ? '' : 's'} available`}
          </AppText>
        </View>

        <View style={styles.selectionField}>
          <AppText weight="bold" style={styles.selectionLabel}>Subject</AppText>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.selectionDropdown, !classId && styles.selectionDropdownDisabled]}
            onPress={() => onOpenPicker('subject')}
            disabled={!classId}
          >
            <BookOpen size={18} color={subjectId ? Theme.colors.primary : Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
            <AppText weight="semibold" style={[styles.selectionDropdownText, !subjectId && { color: Theme.colors.textMuted }]} numberOfLines={1}>
              {subjectId ? subjects.find(s => s.subject_id === subjectId)?.subject_name || subjectId : 'Select Subject'}
            </AppText>
            <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <AppText style={styles.selectionHelperText}>
            {classId ? `${subjects.length} subject${subjects.length === 1 ? '' : 's'} available` : 'Pick a class first'}
          </AppText>
        </View>
      </View>

      <AppButton
        title={loadingStudents ? 'Searching...' : 'Search Marks'}
        onPress={onSearch}
        disabled={loadingStudents || !classId || !sectionId || !examId || !subjectId}
        style={styles.selectionSearchBtn}
      />
    </AppCard>
  );
}
