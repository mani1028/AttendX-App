import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { formatCurrencySafe, formatDateSafe } from './helpers';
import { salariesStyles as styles } from './salariesStyles';
import type { Employee, SalaryHistory } from './types';

export interface SalaryHistoryModalProps {
  visible: boolean;
  employee: Employee | null;
  history: SalaryHistory[];
  loading: boolean;
  onClose: () => void;
}

export default function SalaryHistoryModal({
  visible,
  employee,
  history,
  loading,
  onClose,
}: SalaryHistoryModalProps) {
  if (!employee) {return null;}

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Salary History</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalSubtitle}>{employee.name}</Text>
            <Text style={styles.employeeIdText}>ID: {employee.employee_id}</Text>

            <View style={styles.currentSalaryContainer}>
              <Text style={styles.currentSalaryLabel}>Current Salary:</Text>
              <Text style={styles.currentSalaryValue}>
                ₹{formatCurrencySafe(employee.salary)}
              </Text>
            </View>

            {loading ? (
              <ScreenSkeleton variant="list" />
            ) : history.length > 0 ? (
              <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyHeaderText, { flex: 2 }]}>Date</Text>
                  <Text style={[styles.historyHeaderText, { flex: 3 }]}>Change</Text>
                  <Text style={[styles.historyHeaderText, { flex: 2 }]}>Reason</Text>
                </View>
                {history.map((item, idx) => (
                  <View key={item.id || `hist-${idx}`} style={styles.historyItem}>
                    <Text style={[styles.historyItemText, { flex: 2 }]}>
                      {formatDateSafe(item.effective_date)}
                    </Text>
                    <Text style={[styles.historyItemText, { flex: 3 }]}>
                      ₹{formatCurrencySafe(item.old_salary)} → ₹{formatCurrencySafe(item.new_salary)}
                    </Text>
                    <Text style={[styles.historyItemText, styles.historyReason, { flex: 2 }]}>
                      {item.change_reason || 'Update'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No salary history yet</Text>
              </View>
            )}
          </ScrollView>

          <SafeAreaView>
            <View style={styles.modalFooter}>
              <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.closeButtonFull]} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

