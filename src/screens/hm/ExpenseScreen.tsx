import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  IndianRupee,
  LayoutDashboard,
  Filter,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { HM_THEME as C } from '../../constants/hmTheme';
import { formatErrorMessage } from '../../utils/helpers';


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
  Supplies: 'rgba(217, 119, 6, 0.2)',    // warning soft
  Utilities: 'rgba(37, 99, 235, 0.2)',    // secondary soft
  Maintenance: 'rgba(99, 102, 241, 0.2)', // primary soft
  Salaries: 'rgba(22, 163, 74, 0.2)',    // success soft
  Equipment: 'rgba(236, 72, 153, 0.2)',  // pink soft
  Other: 'rgba(148, 163, 184, 0.2)',     // muted soft
};

const categoryTextColors: Record<string, string> = {
  Supplies: '#fbbf24',    // amber-400
  Utilities: '#60a5fa',   // blue-400
  Maintenance: '#818cf8', // indigo-400
  Salaries: '#4ade80',    // green-400
  Equipment: '#f472b6',  // pink-400
  Other: '#94a3b8',      // slate-400
};

const ExpenseManagement = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
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
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

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
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Failed to fetch expenses"));
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
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Error adding expense"));
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
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Error deleting expense"));
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
        <AppText style={styles.expenseTitle}>{item.title}</AppText>
        <View style={styles.expenseMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryStyle(item.category).backgroundColor }]}>
            <AppText style={[styles.categoryText, { color: getCategoryStyle(item.category).color }]}>
              {item.category}
            </AppText>
          </View>
          <AppText style={styles.expenseDate}>{formatDate(item.date)}</AppText>
        </View>
      </View>
      <View style={styles.expenseAmountContainer}>
        <AppText style={styles.expenseAmount} weight="bold">{formatAmount(item.amount)}</AppText>
        <TouchableOpacity 
          onPress={() => confirmDelete(item.id)}
          style={styles.deleteIcon}
        >
          <Trash2 size={18} color={C.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HMDashboard' as never))}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Expense Management</AppText>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <RefreshCw size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Plus size={20} color={C.text} />
            <AppText style={styles.formTitle} weight="bold">Add Expense</AppText>
          </View>
          
          <View style={styles.formGroup}>
            <View>
              <AppText style={styles.label} weight="semiBold">Title</AppText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Stationery Purchase"
                placeholderTextColor={C.textMuted}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
              />
            </View>

            <View>
              <AppText style={styles.label} weight="semiBold">Amount (₹)</AppText>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text)}
              />
            </View>

            <View>
              <AppText style={styles.label} weight="semiBold">Category</AppText>
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
                      <AppText
                        style={[
                          styles.categoryOptionText,
                          formData.category === cat && styles.categoryOptionTextSelected,
                          { color: categoryTextColors[cat] }
                        ]}
                      >
                        {cat}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <AppText style={styles.label} weight="semiBold">Date</AppText>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <AppText style={styles.dateText}>{formData.date}</AppText>
                <Calendar size={18} color={C.muted} />
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
                <AppText style={styles.submitButtonText} weight="bold">Add Expense</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Expense List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View style={styles.sectionHeaderRow}>
              <LayoutDashboard size={20} color={C.text} />
              <AppText style={styles.listTitle} weight="bold">Expense List</AppText>
            </View>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryLabel} weight="semiBold">Total Expenses</AppText>
              <AppText style={styles.summaryAmount} weight="bold">{formatAmount(getTotalExpenses())}</AppText>
            </View>
          </View>

          {loading && expenses.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.danger} />
              <AppText style={styles.loadingText}>Loading expenses...</AppText>
            </View>
          ) : expenses.length > 0 ? (
            <>
              {/* Category Summary */}
              <View style={styles.categorySummary}>
                <View style={styles.sectionHeaderRow}>
                  <Filter size={18} color={C.text} />
                  <AppText style={styles.categorySummaryTitle} weight="semiBold">Expenses by Category</AppText>
                </View>
                <View style={styles.categorySummaryGrid}>
                  {Object.entries(getExpensesByCategory()).map(([category, amount]) => (
                    <View key={category} style={styles.categorySummaryItem}>
                      <View style={[styles.categorySummaryBadge, { backgroundColor: categoryColors[category] }]}>
                        <AppText style={[styles.categorySummaryText, { color: categoryTextColors[category] }]} weight="semiBold">
                          {category}
                        </AppText>
                      </View>
                      <AppText style={styles.categorySummaryAmount} weight="bold">{formatAmount(amount)}</AppText>
                    </View>
                  ))}
                </View>
              </View>

              {/* Expense List */}
              <View style={styles.expenseList}>
                <View style={styles.expenseListHeader}>
                  <AppText style={styles.expenseListHeaderText} weight="semiBold">Recent Expenses</AppText>
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
              <AppText style={styles.emptyText}>No expenses found.</AppText>
              <AppText style={styles.emptySubtext}>Tap + to add your first expense</AppText>
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
          maximumDate={new Date()}
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
            <View style={styles.modalHeader}>
              <AlertCircle size={24} color={C.error} />
              <AppText style={styles.modalTitle} weight="bold">Delete Expense</AppText>
            </View>
            <AppText style={styles.modalMessage}>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AppText>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <AppText style={styles.cancelButtonText} weight="semiBold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteExpense}
              >
                <AppText style={styles.deleteButtonText} weight="semiBold">Delete</AppText>
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
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 30,
    borderLeftWidth: 4,
    borderLeftColor: C.danger,
    margin: 16,
    marginBottom: 8,
    marginTop: 10,
  },
  formTitle: {
    fontSize: 18,
    color: C.text,
    marginBottom: 16,
  },
  formGroup: {
    gap: 16,
  },
  label: {
    color: C.textMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: C.bg,
    color: C.text,
  },
  dateInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: C.text,
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
    borderColor: C.danger,
  },
  categoryOptionText: {
    fontSize: 14,
  },
  categoryOptionTextSelected: {
  },
  submitButton: {
    backgroundColor: C.danger,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
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
    color: C.text,
  },
  summaryCard: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: C.textMuted,
  },
  summaryAmount: {
    fontSize: 20,
    color: C.danger,
  },
  categorySummary: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  categorySummaryTitle: {
    fontSize: 14,
    color: C.text,
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
  },
  categorySummaryAmount: {
    fontSize: 14,
    color: C.text,
  },
  expenseList: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  expenseListHeader: {
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  expenseListHeaderText: {
    fontSize: 14,
    color: C.text,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
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
  },
  expenseDate: {
    fontSize: 12,
    color: C.textMuted,
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  expenseAmount: {
    fontSize: 16,
    color: C.text,
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
    color: C.textMuted,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyText: {
    fontSize: 16,
    color: C.textMuted,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    color: C.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: C.textMuted,
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
    backgroundColor: C.bg,
  },
  cancelButtonText: {
    color: C.text,
  },
  deleteButton: {
    backgroundColor: C.danger,
  },
  deleteButtonText: {
    color: '#ffffff',
  },
});

export default ExpenseManagement;