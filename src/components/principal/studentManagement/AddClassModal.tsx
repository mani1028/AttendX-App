import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput } from 'react-native';
import { X, Plus, AlertTriangle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { colors, C } from '../../../theme/tokens';
import { studentManagementStyles as styles } from './styles';
import type { ClassItem } from './types';

export interface AddClassModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { class_name: string; sections: string[] }) => Promise<void>;
  existingClasses: ClassItem[];
}

export default function AddClassModal({ visible, onClose, onSave, existingClasses }: AddClassModalProps) {
  const [className, setClassName] = useState('');
  const [sections, setSections] = useState<string[]>(['A']);
  const [sectionInput, setSectionInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!className.trim()) { e.className = 'Class name is required.'; }
    if (sections.length === 0) { e.sections = 'Add at least one section.'; }

    const duplicates = sections.filter((sec) =>
      existingClasses.some(
        (c) =>
          String(c.class_grade || '').trim() === className.trim() &&
          String(c.section || '').trim().toUpperCase() === sec
      )
    );

    if (duplicates.length > 0) {
      e.sections = `Class ${className} Section ${duplicates.join(', ')} already exists.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSection = () => {
    const v = sectionInput.trim().toUpperCase();
    if (!v) { return; }
    if (sections.includes(v)) {
      setErrors((p) => ({ ...p, sectionInput: 'Section already added.' }));
      return;
    }
    setSections((p) => [...p, v]);
    setSectionInput('');
    setErrors((p) => {
      const newErrors = { ...p };
      delete newErrors.sections;
      delete newErrors.sectionInput;
      return newErrors;
    });
  };

  const removeSection = (s: string) => setSections((p) => p.filter((x) => x !== s));

  const handleSave = async () => {
    if (!validate()) { return; }

    setSaving(true);
    try {
      await onSave({
        class_name: className.trim(),
        sections: sections.map((s) => s.toLowerCase()),
      });
      onClose();
    } catch (err: any) {
      setErrors({
        api: err?.response?.data?.detail || 'Failed to add class. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.modalTitle} weight="bold">Add New Class</AppText>
              <AppText style={styles.modalSubtitle}>Enter class details and configure sections</AppText>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {errors.api && (
              <View style={styles.errorBanner}>
                <AlertTriangle size={16} color={C.danger} />
                <AppText style={styles.errorBannerText} weight="semibold">{errors.api}</AppText>
              </View>
            )}

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semibold">
                Class Name <AppText style={styles.requiredStar} weight="bold">*</AppText>
              </AppText>
              <TextInput
                style={styles.input}
                value={className}
                onChangeText={(text) => {
                  setClassName(text);
                  setErrors((p) => {
                    const newErrors = { ...p };
                    delete newErrors.className;
                    return newErrors;
                  });
                }}
                placeholder="e.g. Grade 10, Class VI, Standard 2"
                placeholderTextColor={colors.textMuted}
              />
              {errors.className && <AppText style={styles.errorText}>{errors.className}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semibold">
                Sections <AppText style={styles.requiredStar} weight="bold">*</AppText>
              </AppText>

              <View style={styles.sectionsRow}>
                <TextInput
                  style={[styles.input, styles.flexOne]}
                  value={sectionInput}
                  onChangeText={(text) => {
                    setSectionInput(text.toUpperCase());
                    setErrors((p) => {
                      const newErrors = { ...p };
                      delete newErrors.sectionInput;
                      return newErrors;
                    });
                  }}
                  placeholder="e.g. A, B, C"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={addSection}
                />
                <TouchableOpacity accessibilityRole="button" style={styles.addSectionBtn} onPress={addSection}>
                  <Plus size={12} color={colors.textMuted} />
                  <AppText style={styles.addSectionBtnText} weight="semibold">Add</AppText>
                </TouchableOpacity>
              </View>

              {errors.sectionInput && <AppText style={styles.errorText}>{errors.sectionInput}</AppText>}

              {sections.length > 0 && (
                <View style={styles.sectionsWrap}>
                  {sections.map((s) => (
                    <View key={s} style={styles.sectionPill}>
                      <AppText style={styles.sectionPillText} weight="semibold">Section {s}</AppText>
                      <TouchableOpacity accessibilityRole="button" onPress={() => removeSection(s)}>
                        <X size={10} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {errors.sections && <AppText style={styles.errorText}>{errors.sections}</AppText>}

              <AppText style={styles.hintText}>
                Type a letter and click "Add" or press Enter. You can add multiple sections.
              </AppText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText} weight="semibold">Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <AppText style={styles.saveBtnText} weight="semibold">{saving ? 'Saving…' : 'Add Class'}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
