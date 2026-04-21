import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

interface FormData {
  title: string;
  amount: string;
  category: string;
  date: string;
}

const categories = [
  "Supplies",
  "Utilities",
  "Maintenance",
  "Salaries",
  "Equipment",
  "Other"
];

const categoryColors: Record<string, string> = {
  Supplies: '#fef3c7',
  Utilities: '#dbeafe',
  Maintenance: '#e0e7ff',
  Salaries: '#d1fae5',
  Equipment: '#fce7f3',
  Other: '#f3f4f6',
};

const categoryTextColors: Record<string, string> = {
  Supplies: '#92400e',
  Utilities: '#1e40af',
  Maintenance: '#3730a3',
  Salaries: '#065f46',
  Equipment: '#9d174d',
  Other: '#374151',
};

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    amount: "",
    category: "Supplies",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
  }, []);

  useEffect(() => {
    if (schoolCode) {
      fetchExpenses();
    }
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';
      setSchoolCode(code);
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchExpenses = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.get("/accountant/expenses", {
        params: { school_code: schoolCode },
      });
      setExpenses(response.data || []);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to fetch expenses";
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  };

  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: dateStr }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Validation Error', 'Valid amount is required');
      return;
    }

    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      await API.post("/accountant/expenses/add", formData, {
        params: { school_code: schoolCode },
      });
      
      Alert.alert('Success', 'Expense added successfully');
      setFormData({
        title: "",
        amount: "",
        category: "Supplies",
        date: new Date().toISOString().split("T")[0],
      });
      await fetchExpenses();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Error adding expense";
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteId || !schoolCode) return;

    try {
      setLoading(true);
      await API.delete(`/accountant/expenses/${deleteId}`, {
        params: { school_code: schoolCode },
      });
      
      Alert.alert('Success', 'Expense deleted successfully');
      setShowDeleteModal(false);
      setDeleteId(null);
      await fetchExpenses();
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Error deleting expense";
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const getCategoryStyle = (category: string) => ({
    backgroundColor: categoryColors[category] || '#f3f4f6',
    color: categoryTextColors[category] || '#374151',
  });

  const formatAmount = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getExpensesByCategory = () => {
    const categoryMap: Record<string, number> = {};
    expenses.forEach(expense => {
      categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
    });
    return categoryMap;
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity 
      style={styles.expenseRow}
      onLongPress={() => confirmDelete(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle}>{item.title}</Text>
        <View style={styles.expenseMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryStyle(item.category).backgroundColor }]}>
            <Text style={[styles.categoryText, { color: getCategoryStyle(item.category).color }]}>
              {item.category}
            </Text>
          </View>
          <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <View style={styles.expenseAmountContainer}>
        <Text style={styles.expenseAmount}>{formatAmount(item.amount)}</Text>
        <TouchableOpacity 
          onPress={() => confirmDelete(item.id)}
          style={styles.deleteIcon}
        >
          <Text style={styles.deleteIconText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>➕ Add Expense</Text>
          
          <View style={styles.formGroup}>
            <View>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Stationery Purchase"
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
              />
            </View>

            <View>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text)}
              />
            </View>

            <View>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        formData.category === cat && styles.categoryOptionSelected,
                        { backgroundColor: categoryColors[cat] }
                      ]}
                      onPress={() => handleInputChange('category', cat)}
                    >
                      <Text 
                        style={[
                          styles.categoryOptionText,
                          formData.category === cat && styles.categoryOptionTextSelected,
                          { color: categoryTextColors[cat] }
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formData.date}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Expense List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>📋 Expense List</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={styles.summaryAmount}>{formatAmount(getTotalExpenses())}</Text>
            </View>
          </View>

          {loading && expenses.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#dc2626" />
              <Text style={styles.loadingText}>Loading expenses...</Text>
            </View>
          ) : expenses.length > 0 ? (
            <>
              {/* Category Summary */}
              <View style={styles.categorySummary}>
                <Text style={styles.categorySummaryTitle}>Expenses by Category</Text>
                <View style={styles.categorySummaryGrid}>
                  {Object.entries(getExpensesByCategory()).map(([category, amount]) => (
                    <View key={category} style={styles.categorySummaryItem}>
                      <View style={[styles.categorySummaryBadge, { backgroundColor: categoryColors[category] }]}>
                        <Text style={[styles.categorySummaryText, { color: categoryTextColors[category] }]}>
                          {category}
                        </Text>
                      </View>
                      <Text style={styles.categorySummaryAmount}>{formatAmount(amount)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Expense List */}
              <View style={styles.expenseList}>
                <View style={styles.expenseListHeader}>
                  <Text style={styles.expenseListHeaderText}>Recent Expenses</Text>
                </View>
                {expenses.map((expense) => (
                  <React.Fragment key={expense.id}>
                    {renderExpenseItem({ item: expense })}
                  </React.Fragment>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No expenses found.</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first expense</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date ? new Date(formData.date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Expense</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this expense? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteExpense}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: '#f7f9fc',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    margin: 16,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 16,
  },
  formGroup: {
    gap: 16,
  },
  label: {
    fontWeight: '600',
    color: '#4a5568',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  dateInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  dateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryOptionSelected: {
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryOptionTextSelected: {
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  listSection: {
    flex: 1,
    margin: 16,
    marginTop: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8898aa',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#dc2626',
  },
  categorySummary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  categorySummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 12,
  },
  categorySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categorySummaryItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  categorySummaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  categorySummaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categorySummaryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  expenseList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  expenseListHeader: {
    backgroundColor: '#f7f9fc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  expenseListHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 12,
    color: '#8898aa',
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  deleteIcon: {
    padding: 4,
  },
  deleteIconText: {
    fontSize: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8898aa',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  emptyText: {
    fontSize: 16,
    color: '#8898aa',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default ExpenseManagement;