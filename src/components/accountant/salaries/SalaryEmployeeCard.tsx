import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Theme } from '../../../theme/tokens';
import SalaryStatusBadge from './SalaryStatusBadge';
import { formatCurrencySafe } from './helpers';
import { salariesStyles as styles } from './salariesStyles';
import type { Employee } from './types';

export interface SalaryEmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onHistory: (employee: Employee) => void;
}

export default function SalaryEmployeeCard({ employee, onEdit, onHistory }: SalaryEmployeeCardProps) {
  return (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeId}>ID: {employee.employee_id}</Text>
        </View>
        <SalaryStatusBadge text={employee.employment_type} />
      </View>

      <View style={styles.employeeDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Position:</Text>
          <Text style={styles.detailValue}>{employee.position}</Text>
        </View>
        {employee.department && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department:</Text>
            <Text style={styles.detailValue}>{employee.department}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Salary:</Text>
          <Text style={[styles.detailValue, styles.salaryValue]}>
            ₹{formatCurrencySafe(employee.salary)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit(employee)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit Salary</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => onHistory(employee)}
        >
          <Text style={styles.actionButtonText}>📜 History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

