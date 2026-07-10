import React, { RefObject } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C } from '../../../theme/tokens';
import { teacherManagementStyles as styles } from './styles';
import { GENDER_OPTIONS, STATUS_OPTIONS } from './types';

export interface TeacherEditModalProps {
  visible: boolean;
  editForm: Record<string, string> | null;
  saving: boolean;
  windowHeight: number;
  editScrollMaxHeight: number;
  bottomInset: number;
  editScrollRef: RefObject<ScrollView | null>;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onFieldFocus: () => void;
}

const EDIT_FIELDS: Array<[string, string, 'text' | 'number' | 'date' | 'select', string[]?]> = [
  ['teacher_full_name', 'Full Name', 'text'],
  ['gender', 'Gender', 'select', GENDER_OPTIONS],
  ['date_of_birth', 'Date of Birth', 'date'],
  ['mobile_number', 'Mobile Number', 'number'],
  ['email_id', 'Email', 'text'],
  ['designation', 'Designation', 'text'],
  ['department_subject', 'Department', 'text'],
  ['teacher_status', 'Status', 'select', STATUS_OPTIONS],
];

export default function TeacherEditModal({
  visible,
  editForm,
  saving,
  windowHeight,
  bottomInset,
  editScrollRef,
  onClose,
  onSave,
  onFormChange,
  onFieldFocus,
}: TeacherEditModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetCard,
            styles.sheetCardTall,
            styles.sheetCardColumn,
            { maxHeight: windowHeight * 0.92, paddingBottom: Math.max(bottomInset, 16) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <AppText style={styles.sheetTitle} weight="bold">Edit Staff Details</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={editScrollRef}
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            bounces
          >
            <View style={styles.formGrid}>
              {editForm && EDIT_FIELDS.map(([name, label, type, options]) => {
                const value = editForm[name];
                if (type === 'select' && options) {
                  return (
                    <View key={name} style={styles.formGroup}>
                      <AppText style={styles.label} weight="semibold">{label}</AppText>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={value}
                          onValueChange={(val) => onFormChange((p) => ({ ...p, [name]: val }))}
                          style={styles.picker}
                          dropdownIconColor={C.muted}
                        >
                          {options.map((opt) => (
                            <Picker.Item key={opt} label={opt} value={opt} color={C.text} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  );
                }
                return (
                  <View key={name} style={styles.formGroup}>
                    <AppText style={styles.label} weight="semibold">{label}</AppText>
                    <TextInput
                      style={styles.input}
                      value={value}
                      placeholderTextColor={C.muted}
                      keyboardType={name === 'mobile_number' ? 'phone-pad' : name === 'email_id' ? 'email-address' : 'default'}
                      maxLength={name === 'mobile_number' ? 10 : undefined}
                      autoCapitalize={name === 'email_id' ? 'none' : 'sentences'}
                      onFocus={onFieldFocus}
                      onChangeText={(val) => {
                        const next = name === 'mobile_number'
                          ? val.replace(/\D/g, '').slice(0, 10)
                          : val;
                        onFormChange((p) => ({ ...p, [name]: next }));
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity accessibilityRole="button" style={[styles.sheetFooterBtn, styles.cancelBtn]} onPress={onClose}>
              <AppText style={styles.cancelBtnText} weight="semibold">Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.sheetFooterBtn, styles.saveBtn]} onPress={onSave} disabled={saving}>
              <AppText style={styles.saveBtnText} weight="bold">{saving ? 'Saving...' : 'Save Changes'}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
