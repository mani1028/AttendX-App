import React from 'react';
import { View, TouchableOpacity, TextInput, Platform, LayoutAnimation } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Plus, ChevronRight, Calendar } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { homeworkStyles as styles } from './homeworkStyles';
import type { ClassOption, HomeworkFormState } from './types';

interface HomeworkCreateSectionProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  editingId: string | null;
  form: HomeworkFormState;
  onFormChange: (patch: Partial<HomeworkFormState>) => void;
  classOptions: ClassOption[];
  sectionOptions: string[];
  subjectOptions: string[];
  showClassDropdown: boolean;
  showSectionDropdown: boolean;
  showSubjectDropdown: boolean;
  onToggleClassDropdown: () => void;
  onToggleSectionDropdown: () => void;
  onToggleSubjectDropdown: () => void;
  onSelectClass: (className: string) => void;
  onSelectSection: (sectionName: string) => void;
  onSelectSubject: (subjectName: string) => void;
  showAssignedPicker: boolean;
  showDuePicker: boolean;
  onShowAssignedPicker: (show: boolean) => void;
  onShowDuePicker: (show: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function HomeworkCreateSection({
  expanded,
  onToggleExpanded,
  editingId,
  form,
  onFormChange,
  classOptions,
  sectionOptions,
  subjectOptions,
  showClassDropdown,
  showSectionDropdown,
  showSubjectDropdown,
  onToggleClassDropdown,
  onToggleSectionDropdown,
  onToggleSubjectDropdown,
  onSelectClass,
  onSelectSection,
  onSelectSubject,
  showAssignedPicker,
  showDuePicker,
  onShowAssignedPicker,
  onShowDuePicker,
  submitting,
  onSubmit,
  onCancel,
}: HomeworkCreateSectionProps) {
  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleExpanded();
  };

  return (
    <View style={styles.createSection}>
      <TouchableOpacity activeOpacity={0.9} onPress={handleToggle}>
        <AppCard style={styles.createCard}>
          <View style={styles.createCardInner}>
            <View style={styles.createIconWrapper}>
              <Plus size={24} color={Theme.colors.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="bold" style={styles.createTitle}>Create Homework</AppText>
              <AppText style={styles.createSubtitle}>Create and assign homework to students</AppText>
            </View>
            <View style={styles.createToggleTextWrap}>
              <AppText style={{ color: Theme.colors.textSec }}>{expanded ? 'Hide' : 'Create'}</AppText>
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>

      {expanded && (
        <>
          <AppText weight="bold" style={styles.formSectionTitle}>
            {editingId ? 'Edit Homework' : 'Create Homework'}
          </AppText>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Class Name</AppText>
            <TouchableOpacity
              style={[styles.dropdown, editingId && styles.disabledDropdown]}
              onPress={() => !editingId && onToggleClassDropdown()}
              disabled={!!editingId}
            >
              <AppText style={[styles.dropdownText, form.class_name && styles.dropdownValueText]}>
                {form.class_name || 'Select Class'}
              </AppText>
              <ChevronRight size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
            {!editingId && showClassDropdown && classOptions.length > 0 && (
              <View style={styles.dropdownMenu}>
                {classOptions.map((cls, idx) => (
                  <TouchableOpacity
                    key={cls?.class_name || `cls-${idx}`}
                    style={styles.dropdownItem}
                    onPress={() => cls?.class_name && onSelectClass(cls.class_name)}
                  >
                    <AppText style={styles.dropdownItemText}>{cls?.class_name || 'Unknown Class'}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Section Name</AppText>
            <TouchableOpacity
              style={[styles.dropdown, editingId && styles.disabledDropdown]}
              onPress={() => !editingId && form.class_name ? onToggleSectionDropdown() : null}
              disabled={!!editingId || !form.class_name}
            >
              <AppText style={[styles.dropdownText, form.section_name && styles.dropdownValueText]}>
                {form.section_name || (form.class_name ? 'Select Section' : 'Select Class First')}
              </AppText>
              <ChevronRight size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
            {!editingId && showSectionDropdown && sectionOptions.length > 0 && (
              <View style={styles.dropdownMenu}>
                {sectionOptions.map((sec, idx) => (
                  <TouchableOpacity
                    key={sec || `sec-${idx}`}
                    style={styles.dropdownItem}
                    onPress={() => sec && onSelectSection(sec)}
                  >
                    <AppText style={styles.dropdownItemText}>{sec || 'Unknown Section'}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Subject Name</AppText>
            <TouchableOpacity
              style={[styles.dropdown, editingId && styles.disabledDropdown]}
              onPress={() => !editingId && form.section_name ? onToggleSubjectDropdown() : null}
              disabled={!!editingId || !form.section_name}
            >
              <AppText style={[styles.dropdownText, form.subject_name && styles.dropdownValueText]}>
                {form.subject_name || (form.section_name ? 'Select Subject' : 'Select Section first')}
              </AppText>
              <ChevronRight size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
            {!editingId && showSubjectDropdown && subjectOptions.length > 0 && (
              <View style={styles.dropdownMenu}>
                {subjectOptions.map((subj, idx) => (
                  <TouchableOpacity
                    key={subj || `subj-${idx}`}
                    style={styles.dropdownItem}
                    onPress={() => subj && onSelectSubject(subj)}
                  >
                    <AppText style={styles.dropdownItemText}>{subj || 'Unknown Subject'}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Assigned date</AppText>
            <TouchableOpacity style={styles.dropdown} onPress={() => onShowAssignedPicker(true)}>
              <AppText style={[styles.dropdownText, form.assigned_date && styles.dropdownValueText]}>
                {form.assigned_date || 'select assigned date'}
              </AppText>
              <Calendar size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Due Date</AppText>
            <TouchableOpacity style={styles.dropdown} onPress={() => onShowDuePicker(true)}>
              <AppText style={[styles.dropdownText, form.due_date && styles.dropdownValueText]}>
                {form.due_date || 'select due date'}
              </AppText>
              <Calendar size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Title</AppText>
            <TextInput
              style={styles.textInput}
              placeholder="Enter title"
              placeholderTextColor={Theme.colors.textMuted}
              value={form.title}
              onChangeText={t => onFormChange({ title: t })}
            />
          </View>

          <View style={styles.formGroup}>
            <AppText weight="semibold" style={styles.formLabel}>Description</AppText>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Enter description"
              placeholderTextColor={Theme.colors.textMuted}
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={t => onFormChange({ description: t })}
            />
          </View>

          <View style={styles.actionButtons}>
            <AppButton
              title={editingId ? 'Update' : 'Create +'}
              onPress={onSubmit}
              disabled={submitting}
              style={styles.createButton}
            />
            {editingId && (
              <AppButton
                title="Cancel"
                type="secondary"
                onPress={onCancel}
                style={styles.cancelButton}
              />
            )}
          </View>

          {showAssignedPicker && (
            <DateTimePicker
              value={form.assigned_date ? new Date(form.assigned_date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_e, d) => {
                onShowAssignedPicker(false);
                if (d) { onFormChange({ assigned_date: d.toISOString().split('T')[0] }); }
              }}
            />
          )}

          {showDuePicker && (
            <DateTimePicker
              value={form.due_date ? new Date(form.due_date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_e, d) => {
                onShowDuePicker(false);
                if (d) { onFormChange({ due_date: d.toISOString().split('T')[0] }); }
              }}
            />
          )}
        </>
      )}
    </View>
  );
}
