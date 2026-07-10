import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import * as principalService from '../../services/principalService';
import {
  salariesStyles as styles,
  salariesApi as API,
  SalarySearchInput,
  SalaryEmployeeCard,
  SalaryMessageBox,
  EditSalaryModal,
  SalaryHistoryModal,
  type Employee,
  type SalaryHistory,
  type SalariesManagementProps,
} from '../../components/accountant/salaries';

export default function SalariesManagement({ schoolCode }: SalariesManagementProps) {
  const handleScroll = useScrollTabBar();
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
      const branchId = await storage.getString(StorageKeys.BRANCH_ID) ||
                       await storage.getString(StorageKeys.BRANCH_ID) ||
                       '';

      const items = await principalService.getPrincipalTeachers({
        'school-code': schoolCode,
        ...(branchId ? { 'branch-id': branchId } : {}),
      });

      // Transform keys to match expected Employee interface, providing fallbacks for name and id
      const empList = items.map((t, idx) => {
        const id = t.teacher_id || t.id || t.employee_id || `emp-${idx}`;
        const name = t.teacher_full_name || t.name || t.full_name || 'Staff Member';
        return {
          ...t,
          id: String(id),
          name: String(name),
          teacher_full_name: String(name),
          teacher_id: t.teacher_id ? String(t.teacher_id) : String(id),
          employee_id: t.employee_id ? String(t.employee_id) : t.teacher_id ? String(t.teacher_id) : String(id),
          employment_type: t.employment_type || t.teacher_status || 'Full-Time',
          position: t.position || t.designation || 'Staff',
          salary: typeof t.salary === 'number' ? t.salary : parseFloat(t.salary) || 0,
        };
      });

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
    if (!selectedEmployee) {return;}

    try {
      setUpdateLoading(true);
      await API.put(`/accountant/employees/${selectedEmployee.id}/salary`, {
        salary: salary,
        reason: reason,
      }, {
        params: { school_code: schoolCode },
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
      const response = await API.get(`/accountant/employees/${employee.id}/salary-history`, {
        params: { school_code: schoolCode },
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          title="Staff Salaries"
          greeting="Salaries & Payroll"
          greetingSubtext="Manage employee compensation"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        {/* Message Box */}
        <SalaryMessageBox
          message={message}
          isError={isError}
          onClose={() => setMessage('')}
        />

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <SalarySearchInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name, employee ID, or position..."
            />
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ScreenSkeleton variant="list" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        )}

        {/* Employees List */}
        {!loading && filteredEmployees.length > 0 && (
          <View style={styles.employeesList}>
            {filteredEmployees.map((employee, idx) => (
              <SalaryEmployeeCard
                key={employee.id || `emp-card-${idx}`}
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
        </View>
      </ScrollView>

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

