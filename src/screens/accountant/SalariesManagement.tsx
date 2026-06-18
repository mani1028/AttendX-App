import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AccountantPageHeader from '../../components/layout/AccountantPageHeader';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../../config/api.config';
import { useAuth } from '../../context/AuthContext';
import * as principalService from '../../services/principalService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  department?: string;
  salary: number;
  employment_type: string;
}

interface SalaryHistory {
  id: string;
  old_salary: number;
  new_salary: number;
  effective_date: string;
  change_reason: string;
}

interface SalariesManagementProps {
  schoolCode: string;
}

/**
 * Safe date formatting without relying on Intl API
 * Works around React Native Intl limitations
 */
const formatDateSafe = (dateString: string): string => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  } catch {
    return '—';
  }
};

const formatCurrencySafe = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0.00';
  }

  const fixed = value.toFixed(2);
  const [wholePart, fractionPart] = fixed.split('.');
  const lastThree = wholePart.slice(-3);
  const otherDigits = wholePart.slice(0, -3);
  const groupedWhole = otherDigits
    ? `${otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree;

  return `${groupedWhole}.${fractionPart}`;
};

const useTabBarScrollVisibility = () => {
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  return useCallback((event: any) => {
    const currentScrollY = event?.nativeEvent?.contentOffset?.y ?? 0;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }

    lastScrollY.current = currentScrollY;
  }, [setTabBarVisible]);
};

// ─── API Service ────────────────────────────────────────────────────────────

const API_BASE_URL = `${ENV.API_URL.replace(/\/$/, '')}/api`;

const API = {
  get: async (endpoint: string, config?: { params?: Record<string, string> }) => {
    const token = await AsyncStorage.getItem('token');
    let url = `${API_BASE_URL}${endpoint}`;

    if (config?.params) {
      const params = new URLSearchParams(config.params);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  },

  put: async (endpoint: string, data: any, config?: { params?: Record<string, string> }) => {
    const token = await AsyncStorage.getItem('token');
    let url = `${API_BASE_URL}${endpoint}`;

    if (config?.params) {
      const params = new URLSearchParams(config.params);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

// ─── Custom Components ──────────────────────────────────────────────────────

interface StatusBadgeProps {
  text: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ text }) => (
  <View style={styles.statusBadge}>
    <Text style={styles.statusBadgeText}>{text}</Text>
  </View>
);

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChangeText, placeholder }) => (
  <View style={styles.searchContainer}>
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder || "Search..."}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#9ca3af"
    />
  </View>
);

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onHistory: (employee: Employee) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onEdit, onHistory }) => {
  return (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeId}>ID: {employee.employee_id}</Text>
        </View>
        <StatusBadge text={employee.employment_type} />
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
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit(employee)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit Salary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => onHistory(employee)}
        >
          <Text style={styles.actionButtonText}>📜 History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface MessageBoxProps {
  message: string;
  isError?: boolean;
  onClose?: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({ message, isError = false, onClose }) => {
  if (!message) return null;

  return (
    <View style={[styles.messageBox, isError ? styles.messageBoxError : styles.messageBoxSuccess]}>
      <Text style={[styles.messageText, isError ? styles.messageTextError : styles.messageTextSuccess]}>
        {message}
      </Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.messageClose}>
          <Text style={styles.messageCloseText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Edit Salary Modal ──────────────────────────────────────────────────────

interface EditSalaryModalProps {
  visible: boolean;
  employee: Employee | null;
  loading: boolean;
  onClose: () => void;
  onUpdate: (salary: number, reason: string) => void;
}

const EditSalaryModal: React.FC<EditSalaryModalProps> = ({
  visible,
  employee,
  loading,
  onClose,
  onUpdate,
}) => {
  const [salary, setSalary] = useState('');
  const [reason, setReason] = useState('increment');

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

  if (!employee) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Salary</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
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
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason for Change</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={reason}
                  onValueChange={(itemValue) => setReason(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Increment" value="increment" />
                  <Picker.Item label="Promotion" value="promotion" />
                  <Picker.Item label="Adjustment" value="adjustment" />
                  <Picker.Item label="Correction" value="correction" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 This change will be recorded in the salary history.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.updateButton, loading && styles.disabledButton]}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.updateButtonText}>Update Salary</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Salary History Modal ───────────────────────────────────────────────────

interface SalaryHistoryModalProps {
  visible: boolean;
  employee: Employee | null;
  history: SalaryHistory[];
  loading: boolean;
  onClose: () => void;
}

const SalaryHistoryModal: React.FC<SalaryHistoryModalProps> = ({
  visible,
  employee,
  history,
  loading,
  onClose,
}) => {
  if (!employee) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Salary History</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>{employee.name}</Text>
            <Text style={styles.employeeIdText}>ID: {employee.employee_id}</Text>

            <View style={styles.currentSalaryContainer}>
              <Text style={styles.currentSalaryLabel}>Current Salary:</Text>
              <Text style={styles.currentSalaryValue}>
                ₹{formatCurrencySafe(employee.salary)}
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#6648dc" style={styles.loader} />
            ) : history.length > 0 ? (
              <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyHeaderText, { flex: 2 }]}>Date</Text>
                  <Text style={[styles.historyHeaderText, { flex: 3 }]}>Change</Text>
                  <Text style={[styles.historyHeaderText, { flex: 2 }]}>Reason</Text>
                </View>
                {history.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
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

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.closeButtonFull]} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const SalariesManagement: React.FC<SalariesManagementProps> = ({ schoolCode }) => {
  const handleScroll = useTabBarScrollVisibility();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const navigation = useNavigation();

  // Load employees
  useEffect(() => {
    if (schoolCode) {
      loadEmployees();
    }
  }, [schoolCode]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const branchId = await AsyncStorage.getItem('branch_id') ||
                       await AsyncStorage.getItem('branchId') ||
                       '';

      const items = await principalService.getPrincipalTeachers({
        'school-code': schoolCode,
        ...(branchId ? { 'branch-id': branchId } : {})
      });
      
      // Transform keys to match expected Employee interface if needed, but getPrincipalTeachers
      // usually returns teacher objects. We just map teacher_full_name if it's missing but we have name.
      const empList = items.map(t => ({
        ...t,
        id: t.teacher_id || t.id,
        teacher_full_name: t.teacher_full_name || t.name || t.full_name,
        teacher_id: t.teacher_id || t.id,
        employee_id: t.employee_id || t.id,
      }));

      setEmployees(empList);
      setMessage('');
      setIsError(false);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      const errorMsg = error.message || 'Failed to load employees';
      setMessage(errorMsg);
      setIsError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  const handleOpenEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleUpdateSalary = async (salary: number, reason: string) => {
    if (!selectedEmployee) return;

    try {
      setUpdateLoading(true);
      await API.put(`/accountant/payroll/employees/${selectedEmployee.id}/salary`, {
        salary: salary,
        reason: reason
      }, {
        params: { school_code: schoolCode }
      });

      setMessage('Salary updated successfully');
      setIsError(false);
      setShowEditModal(false);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);

      // Refresh employee list
      loadEmployees();
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to update salary';
      setMessage(errorMsg);
      setIsError(true);

      // Auto-hide error message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleViewHistory = async (employee: Employee) => {
    try {
      setHistoryLoading(true);
      const response = await API.get(`/accountant/payroll/employees/${employee.id}/salary-history`, {
        params: { school_code: schoolCode }
      });

      const history = response.salary_history || [];
      setSalaryHistory(history);
      setSelectedEmployee(employee);
      setShowHistoryModal(true);
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to load salary history';
      setMessage(errorMsg);
      setIsError(true);

      setTimeout(() => setMessage(''), 5000);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(searchLower)) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(searchLower)) ||
      (emp.position && emp.position.toLowerCase().includes(searchLower))
    );
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <AccountantPageHeader 
        title="Staff Salaries" 
        greeting="Salaries & Payroll"
        subtext="Manage employee compensation"
        onBackPress={() => navigation.goBack()} 
      />
      <View style={styles.contentOverlap}>
        <ScrollView
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
        {/* Message Box */}
        <MessageBox
          message={message}
          isError={isError}
          onClose={() => setMessage('')}
        />

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <SearchInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name, employee ID, or position..."
            />
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6648dc" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        )}

        {/* Employees List */}
        {!loading && filteredEmployees.length > 0 && (
          <View style={styles.employeesList}>
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onEdit={handleOpenEdit}
                onHistory={handleViewHistory}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredEmployees.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>👥</Text>
            <Text style={styles.emptyStateTitle}>
              {searchTerm ? 'No employees found' : 'No employees in the system'}
            </Text>
            {searchTerm && (
              <Text style={styles.emptyStateSubtitle}>
                Try adjusting your search term
              </Text>
            )}
          </View>
        )}
      </ScrollView>
      </View>

      {/* Edit Salary Modal */}
      <EditSalaryModal
        visible={showEditModal}
        employee={selectedEmployee}
        loading={updateLoading}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleUpdateSalary}
      />

      {/* Salary History Modal */}
      <SalaryHistoryModal
        visible={showHistoryModal}
        employee={selectedEmployee}
        history={salaryHistory}
        loading={historyLoading}
        onClose={() => setShowHistoryModal(false)}
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentOverlap: {
    flex: 1,
    marginTop: -20,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    backgroundColor: '#f8fbff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6f5',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#123358',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  searchSection: {
    padding: 16,
    paddingTop: 0,
    marginTop: -20,
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  employeesList: {
    padding: 16,
    gap: 12,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  employeeId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  employeeDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 90,
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  salaryValue: {
    fontWeight: '600',
    color: '#059669',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#6648dc',
  },
  historyButton: {
    backgroundColor: '#0284c7',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  messageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  messageBoxSuccess: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  messageBoxError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fccacb',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  messageTextSuccess: {
    color: '#6648dc',
  },
  messageTextError: {
    color: '#b91c1c',
  },
  messageClose: {
    padding: 4,
  },
  messageCloseText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyStateContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6b7280',
  },
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  employeeIdText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  currentSalaryContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentSalaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  currentSalaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  currentSalaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6648dc',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: '#6648dc',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  closeButtonFull: {
    backgroundColor: '#6648dc',
    flex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loader: {
    marginTop: 20,
  },
  historyContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemText: {
    fontSize: 12,
    color: '#4b5563',
  },
  historyReason: {
    color: '#6b7280',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cfdbeb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});

export default SalariesManagement;