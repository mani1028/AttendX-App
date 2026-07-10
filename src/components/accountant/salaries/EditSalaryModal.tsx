import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import CustomPickerModal from '../../common/CustomPickerModal';
import { Theme } from '../../../theme/tokens';
import { formatCurrencySafe } from './helpers';
import { salariesStyles as styles } from './salariesStyles';
import type { Employee } from './types';

export const SALARY_REASON_OPTIONS = [
  { label: 'Increment', value: 'increment' },
  { label: 'Promotion', value: 'promotion' },
  { label: 'Adjustment', value: 'adjustment' },
  { label: 'Correction', value: 'correction' },
  { label: 'Other', value: 'other' },
];

export interface EditSalaryModalProps {
  visible: boolean;
  employee: Employee | null;
  loading: boolean;
  onClose: () => void;
  onUpdate: (salary: number, reason: string) => void;
}

export default function EditSalaryModal({
  visible,
  employee,
  loading,
  onClose,
  onUpdate,
}: EditSalaryModalProps) {
  const [salary, setSalary] = useState('');
  const [reason, setReason] = useState('increment');
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  useEffect(() => {
    if (employee) {
      setSalary(String(employee.salary));
      setReason('increment');
    }
  }, [employee]);

  const handleUpdate = () => {
    const newSalary = parseFloat(salary);
    if (isNaN(newSalary) || newSalary <= 0) {
      Alert.alert('Error', 'Please enter a valid salary amount');
      return;
    }
    onUpdate(newSalary, reason);
  };

  if (!employee) {return null;}

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Salary</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalSubtitle}>{employee.name}</Text>
            <Text style={styles.employeeIdText}>ID: {employee.employee_id}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Salary</Text>
              <View style={styles.currentSalaryContainer}>
                <Text style={styles.currentSalaryText}>
                  ₹{formatCurrencySafe(employee.salary)}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Salary (₹) *</Text>
              <TextInput
                style={styles.input}
                value={salary}
                onChangeText={setSalary}
                keyboardType="numeric"
                placeholder="Enter new salary amount"
                placeholderTextColor={Theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason for Change</Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.reasonTrigger}
                onPress={() => setShowReasonPicker(true)}
              >
                <Text style={styles.reasonTriggerText}>
                  {SALARY_REASON_OPTIONS.find(option => option.value === reason)?.label || 'Select reason'}
                </Text>
                <ChevronDown size={18} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                This change will be recorded in the salary history.
              </Text>
            </View>
          </ScrollView>

          <SafeAreaView>
            <View style={styles.modalFooter}>
              <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.modalButton, styles.updateButton, loading && styles.disabledButton]}
                onPress={handleUpdate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Theme.colors.card} />
                ) : (
                  <Text style={styles.updateButtonText}>Update Salary</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>

      <CustomPickerModal
        visible={showReasonPicker}
        title="Reason for Change"
        options={SALARY_REASON_OPTIONS}
        selectedValue={reason}
        onValueChange={setReason}
        onClose={() => setShowReasonPicker(false)}
      />
    </Modal>
  );
};

