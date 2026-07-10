import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Upload } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import CustomPickerModal from '../../common/CustomPickerModal';
import { Theme } from '../../../theme/tokens';
import PickerField from './PickerField';
import { questionPaperStyles as styles } from './questionPaperStyles';
import type { TeacherPaper, UploadFormState } from './types';
import type {
  TeacherPaperClassAssignment,
  TeacherPaperSection,
  TeacherPaperSubject,
} from '../../../services/teacherService';
import type { PickedQuestionPaperFile } from '../../../utils/pickQuestionPaperFile';

interface QuestionPaperUploadModalProps {
  visible: boolean;
  editingPaper: TeacherPaper | null;
  form: UploadFormState;
  formErrors: Record<string, string>;
  paperFile: PickedQuestionPaperFile | null;
  markingFile: PickedQuestionPaperFile | null;
  submitting: boolean;
  metaLoading: boolean;
  assignments: TeacherPaperClassAssignment[];
  examTypes: string[];
  selectedClass?: TeacherPaperClassAssignment;
  selectedSection?: TeacherPaperSection;
  subjectOptions: TeacherPaperSubject[];
  classPickerOpen: boolean;
  sectionPickerOpen: boolean;
  subjectPickerOpen: boolean;
  examTypePickerOpen: boolean;
  classPickerOptions: { label: string; value: string }[];
  sectionPickerOptions: { label: string; value: string }[];
  subjectPickerOptions: { label: string; value: string }[];
  examTypePickerOptions: { label: string; value: string }[];
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (patch: Partial<UploadFormState>) => void;
  onPickPaperFile: () => void;
  onPickMarkingFile: () => void;
  onClassChange: (classId: string) => void;
  onSectionChange: (sectionId: string) => void;
  setClassPickerOpen: (open: boolean) => void;
  setSectionPickerOpen: (open: boolean) => void;
  setSubjectPickerOpen: (open: boolean) => void;
  setExamTypePickerOpen: (open: boolean) => void;
}

export default function QuestionPaperUploadModal({
  visible,
  editingPaper,
  form,
  formErrors,
  paperFile,
  markingFile,
  submitting,
  metaLoading,
  assignments,
  examTypes,
  selectedClass,
  selectedSection,
  subjectOptions,
  classPickerOpen,
  sectionPickerOpen,
  subjectPickerOpen,
  examTypePickerOpen,
  classPickerOptions,
  sectionPickerOptions,
  subjectPickerOptions,
  examTypePickerOptions,
  onClose,
  onSubmit,
  onFormChange,
  onPickPaperFile,
  onPickMarkingFile,
  onClassChange,
  onSectionChange,
  setClassPickerOpen,
  setSectionPickerOpen,
  setSubjectPickerOpen,
  setExamTypePickerOpen,
}: QuestionPaperUploadModalProps) {
  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" style={styles.modalTitle}>
                  {editingPaper ? 'Edit Question Paper' : 'Upload Question Paper'}
                </AppText>
                <AppText style={styles.modalSubtitle}>
                  Select class, subject, exam type and attach a PDF or image (max 10 MB).
                </AppText>
              </View>
              <TouchableOpacity accessibilityRole="button" style={styles.modalCloseBtn} onPress={onClose}>
                <X size={22} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {metaLoading && assignments.length === 0 ? (
                <View style={styles.modalLoader}>
                  <ActivityIndicator color={Theme.colors.primary} />
                  <AppText style={styles.loaderText}>Loading class assignments...</AppText>
                </View>
              ) : (
                <>
                  <PickerField
                    label="Class *"
                    value={selectedClass?.class_name || ''}
                    placeholder="Select class"
                    onPress={() => setClassPickerOpen(true)}
                    error={formErrors.class_id}
                  />
                  <PickerField
                    label="Section *"
                    value={selectedSection?.section_name || ''}
                    placeholder={form.class_id ? 'Select section' : 'Select class first'}
                    onPress={() => form.class_id && setSectionPickerOpen(true)}
                    error={formErrors.section_id}
                  />
                  <PickerField
                    label="Subject *"
                    value={
                      subjectOptions.find(s => String(s.subject_id) === String(form.subject_id))?.subject_name || ''
                    }
                    placeholder={form.section_id ? 'Select subject' : 'Select section first'}
                    onPress={() => form.section_id && setSubjectPickerOpen(true)}
                    error={formErrors.subject_id}
                  />
                  <PickerField
                    label="Exam Type *"
                    value={form.exam_type}
                    placeholder={examTypes.length ? 'Select exam type' : 'No exam types available'}
                    onPress={() => examTypes.length > 0 && setExamTypePickerOpen(true)}
                    error={formErrors.exam_type}
                  />

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>Title *</AppText>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Mid-Term Mathematics"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={form.title}
                      onChangeText={text => onFormChange({ title: text })}
                    />
                    {formErrors.title ? <AppText style={styles.fieldError}>{formErrors.title}</AppText> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>Description / Instructions</AppText>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Duration, max marks, etc."
                      placeholderTextColor={Theme.colors.textMuted}
                      value={form.description}
                      onChangeText={text => onFormChange({ description: text })}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>
                      Question Paper File{editingPaper ? '' : ' *'}
                    </AppText>
                    <TouchableOpacity accessibilityRole="button" style={styles.filePickBox} onPress={onPickPaperFile}>
                      <Upload size={20} color={Theme.colors.primary} />
                      <AppText style={styles.filePickText}>
                        {paperFile?.name || (editingPaper ? 'Tap to replace file (optional)' : 'Tap to choose PDF or image')}
                      </AppText>
                    </TouchableOpacity>
                    {formErrors.file ? <AppText style={styles.fieldError}>{formErrors.file}</AppText> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>Marking Scheme (optional)</AppText>
                    <TouchableOpacity accessibilityRole="button" style={styles.filePickBox} onPress={onPickMarkingFile}>
                      <Upload size={20} color={Theme.colors.primary} />
                      <AppText style={styles.filePickText}>
                        {markingFile?.name || 'Tap to attach marking scheme'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton title="Cancel" type="secondary" onPress={onClose} style={styles.modalFooterBtn} />
              <AppButton
                title={submitting ? 'Saving...' : editingPaper ? 'Update' : 'Upload'}
                onPress={onSubmit}
                disabled={submitting || metaLoading}
                style={styles.modalFooterBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomPickerModal
        visible={classPickerOpen}
        title="Select Class"
        options={classPickerOptions}
        selectedValue={form.class_id}
        onValueChange={value => onClassChange(String(value))}
        onClose={() => setClassPickerOpen(false)}
      />
      <CustomPickerModal
        visible={sectionPickerOpen}
        title="Select Section"
        options={sectionPickerOptions}
        selectedValue={form.section_id}
        onValueChange={value => onSectionChange(String(value))}
        onClose={() => setSectionPickerOpen(false)}
      />
      <CustomPickerModal
        visible={subjectPickerOpen}
        title="Select Subject"
        options={subjectPickerOptions}
        selectedValue={form.subject_id}
        onValueChange={value => onFormChange({ subject_id: String(value) })}
        onClose={() => setSubjectPickerOpen(false)}
      />
      <CustomPickerModal
        visible={examTypePickerOpen}
        title="Select Exam Type"
        options={examTypePickerOptions}
        selectedValue={form.exam_type}
        onValueChange={value => onFormChange({ exam_type: String(value) })}
        onClose={() => setExamTypePickerOpen(false)}
      />
    </>
  );
}
