import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Theme } from '../../../theme/tokens';
import type { ClassSection } from './types';
import { principalRegistrationStyles as styles } from './principalRegistrationStyles';

interface ClassesStepProps {
  classes: ClassSection[];
  onUpdateClassName: (index: number, value: string) => void;
  onAddClass: () => void;
  onRemoveClass: (index: number) => void;
  onAddSection: (classIndex: number) => void;
  onRemoveSection: (classIndex: number, sectionIndex: number) => void;
  onUpdateSection: (classIndex: number, sectionIndex: number, value: string) => void;
  errors: string[];
  fieldErrors: Record<string, string>;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
}

export default function ClassesStep({
  classes,
  onUpdateClassName,
  onAddClass,
  onRemoveClass,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  errors,
  fieldErrors,
  focusedField,
  setFocusedField,
}: ClassesStepProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>📚 Classes & Sections</Text>

      {errors.length > 0 && (
        <View style={styles.warningBox}>
          {errors.map((err, i) => (
            <Text key={i} style={styles.warningText}>⚠ {err}</Text>
          ))}
        </View>
      )}

      {classes.map((cls, ci) => (
        <View key={ci} style={styles.classCard}>
          <View style={styles.classHeader}>
            <View style={styles.classNumber}>
              <Text style={styles.classNumberText}>{ci + 1}</Text>
            </View>
            <View style={styles.classNameField}>
              <Text style={styles.label}>
                Class Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors[`class_name_${ci}`] && styles.inputError,
                  focusedField === `class_name_${ci}` && styles.inputFocused,
                ]}
                placeholder="e.g. Grade 1, LKG, Class 10"
                placeholderTextColor={Theme.colors.textMuted}
                value={cls.class_name}
                onChangeText={(text) => onUpdateClassName(ci, text)}
                onFocus={() => setFocusedField(`class_name_${ci}`)}
                onBlur={() => setFocusedField(null)}
              />
              {fieldErrors[`class_name_${ci}`] && (
                <Text style={styles.errorText}>{fieldErrors[`class_name_${ci}`]}</Text>
              )}
            </View>
            {classes.length > 1 && (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.removeClassBtn}
                onPress={() => onRemoveClass(ci)}
              >
                <Text style={styles.removeClassBtnText}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>

          {cls.sections.map((sec, si) => (
            <View key={si} style={styles.sectionRow}>
              <TextInput
                style={[
                  styles.sectionInput,
                  fieldErrors[`section_${ci}_${si}`] && styles.inputError,
                  focusedField === `section_${ci}_${si}` && styles.sectionInputFocused,
                ]}
                placeholder={`Section ${String.fromCharCode(65 + si)} (e.g. A, B)`}
                placeholderTextColor={Theme.colors.textMuted}
                value={sec}
                onChangeText={(text) => onUpdateSection(ci, si, text)}
                onFocus={() => setFocusedField(`section_${ci}_${si}`)}
                onBlur={() => setFocusedField(null)}
              />
              {cls.sections.length > 1 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.removeSectionBtn}
                  onPress={() => onRemoveSection(ci, si)}
                >
                  <Text style={styles.removeSectionBtnText}>✕</Text>
                </TouchableOpacity>
              )}
              {fieldErrors[`section_${ci}_${si}`] && (
                <Text style={styles.errorText}>{fieldErrors[`section_${ci}_${si}`]}</Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.addSectionBtn}
            onPress={() => onAddSection(ci)}
          >
            <Text style={styles.addSectionBtnText}>+ Add Section</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity accessibilityRole="button" style={styles.addClassBtn} onPress={onAddClass}>
        <Text style={styles.addClassBtnText}>+ Add Another Class</Text>
      </TouchableOpacity>
    </View>
  );
}
