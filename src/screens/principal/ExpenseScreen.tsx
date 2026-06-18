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
  LayoutDashboard,
  Filter,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Principal_THEME as C } from '../../constants/principalTheme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';


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

const categoryPalette: Record<string, { bg: string; text: string; bgSoft: string; textSoft: string; borderSoft: string }> = {
  Supplies: { bg: '#d97706', text: '#ffffff', bgSoft: '#fef3c7', textSoft: '#b45309', borderSoft: '#fde68a' },
  Utilities: { bg: '#2563eb', text: '#ffffff', bgSoft: '#dbeafe', textSoft: '#1d4ed8', borderSoft: '#bfdbfe' },
  Maintenance: { bg: '#4f46e5', text: '#ffffff', bgSoft: '#e0e7ff', textSoft: '#4338ca', borderSoft: '#c7d2fe' },
  Salaries: { bg: '#16a34a', text: '#ffffff', bgSoft: '#d1fae5', textSoft: '#15803d', borderSoft: '#a7f3d0' },
  Equipment: { bg: '#db2777', text: '#ffffff', bgSoft: '#fce7f3', textSoft: '#be185d', borderSoft: '#fbcfe8' },
  Other: { bg: '#475569', text: '#ffffff', bgSoft: '#f1f5f9', textSoft: '#334155', borderSoft: '#e2e8f0' },
};

const ExpenseManagement = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible, userRole } = useAuth();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<'title' | 'amount' | null>(null);

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const catPalette = categoryPalette[item.category] || categoryPalette.Other;
    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseCardHeader}>
          <View style={styles.expenseInfo}>
            <AppText style={styles.expenseTitle} weight="semibold">{item.title}</AppText>
            <View style={styles.expenseMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: catPalette.bgSoft }]}>
                <AppText style={[styles.categoryText, { color: catPalette.textSoft }]} weight="semibold">
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
              style={styles.deleteButtonCircle}
              activeOpacity={0.6}
            >
              <Trash2 size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

        <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Standardized Header */}
        {(() => {
          const isAccountant = userRole?.toLowerCase() === 'accountant';
          return (
            <View style={[styles.headerStandard, { 
              paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets),
              backgroundColor: isAccountant ? '#1e3a8a' : HEADER_CONSTANTS.BACKGROUND_COLOR
            }]}>
              <View style={styles.headerTop}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => safeGoBack(navigation as any, isAccountant ? 'AccountantDashboard' : 'PrincipalDashboard')}
                >
                  <ChevronLeft size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <AppText weight="bold" style={styles.headerTitle}>Expense Tracker</AppText>
                </View>
                <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
                  <RefreshCw size={20} color={HEADER_CONSTANTS.TEXT_COLOR} />
                </TouchableOpacity>
              </View>

              <View style={styles.headerContent}>
                <AppText weight="bold" style={styles.headerGreeting}>Expense Management</AppText>
                <AppText style={styles.headerSubtext}>Track and manage school expenditures</AppText>
              </View>
            </View>
          );
        })()}

      <View style={styles.contentOverlap}>
        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Plus size={20} color="#1e3a8a" />
            <AppText style={styles.formTitle} weight="bold">Add Expense</AppText>
          </View>
          
          <View style={styles.formGroup}>
            <View>
              <AppText style={styles.label} weight="semibold">Title</AppText>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'title' && styles.inputFocused
                ]}
                placeholder="e.g., Stationery Purchase"
                placeholderTextColor={C.textMuted}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                onFocus={() => setFocusedInput('title')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View>
              <AppText style={styles.label} weight="semibold">Amount (₹)</AppText>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'amount' && styles.inputFocused
                ]}
                placeholder="Enter amount"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text)}
                onFocus={() => setFocusedInput('amount')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View>
              <AppText style={styles.label} weight="semibold">Category</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => {
                    const isSelected = formData.category === cat;
                    const catPalette = categoryPalette[cat] || categoryPalette.Other;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          isSelected ? {
                            backgroundColor: catPalette.bg,
                            borderColor: catPalette.bg,
                            shadowColor: catPalette.bg,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            elevation: 3,
                          } : {
                            backgroundColor: '#f1f5f9',
                            borderColor: '#e2e8f0',
                          }
                        ]}
                        onPress={() => handleInputChange('category', cat)}
                        activeOpacity={0.7}
                      >
                        <AppText
                          style={[
                            styles.categoryOptionText,
                            { color: isSelected ? '#ffffff' : '#475569' }
                          ]}
                          weight={isSelected ? 'bold' : 'semibold'}
                        >
                          {cat}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View>
              <AppText style={styles.label} weight="semibold">Date</AppText>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <AppText style={styles.dateText}>{formData.date}</AppText>
                <Calendar size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1e3a8a', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Plus size={18} color="#fff" style={styles.submitButtonIcon} />
                    <AppText style={styles.submitButtonText} weight="bold">Add Expense</AppText>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expense List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View style={styles.sectionHeaderRow}>
              <LayoutDashboard size={20} color="#1e3a8a" />
              <AppText style={styles.listTitle} weight="bold">Expense List</AppText>
            </View>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryLabel} weight="semibold">Total Expenses</AppText>
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
                  <Filter size={18} color="#1e3a8a" />
                  <AppText style={styles.categorySummaryTitle} weight="bold">Expenses by Category</AppText>
                </View>
                <View style={styles.categorySummaryGrid}>
                  {Object.entries(getExpensesByCategory()).map(([category, amount]) => {
                    const catPalette = categoryPalette[category] || categoryPalette.Other;
                    return (
                      <View key={category} style={styles.categorySummaryCard}>
                        <View style={[styles.categorySummaryBadge, { backgroundColor: catPalette.bgSoft }]}>
                          <AppText style={[styles.categorySummaryText, { color: catPalette.textSoft }]} weight="bold">
                            {category}
                          </AppText>
                        </View>
                        <AppText style={styles.categorySummaryAmount} weight="bold">{formatAmount(amount)}</AppText>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Expense List */}
              <View style={styles.expenseListContainer}>
                <View style={styles.expenseListHeader}>
                  <AppText style={styles.expenseListHeaderText} weight="bold">Recent Expenses</AppText>
                </View>
                <View style={styles.expenseListItems}>
                  {expenses.map((expense) => (
                    <React.Fragment key={expense.id}>
                      {renderExpenseItem({ item: expense })}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <AppText style={styles.emptyText}>No expenses found.</AppText>
              <AppText style={styles.emptySubtext}>Tap + to add your first expense</AppText>
            </View>
          )}
        </View>
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
                <AppText style={styles.cancelButtonText} weight="semibold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteExpense}
              >
                <AppText style={styles.deleteButtonText} weight="semibold">Delete</AppText>
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
    backgroundColor: '#1e3a8a',
  },
  headerStandard: {
    backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM + 15,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  contentOverlap: {
    marginTop: -20,
    backgroundColor: C.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 16,
    flex: 1,
    minHeight: 800,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
    textAlign: 'center',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: `rgba(255,255,255,${HEADER_CONSTANTS.SUBTITLE_OPACITY})`,
    fontSize: HEADER_CONSTANTS.SUBTITLE_FONT_SIZE,
    marginTop: 4,
  },
  backBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIconBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 24,
    margin: 16,
    marginBottom: 16,
    marginTop: 10,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  formTitle: {
    fontSize: 20,
    color: '#0d1b2a',
    marginBottom: 16,
    marginLeft: 8,
  },
  formGroup: {
    gap: 20,
  },
  label: {
    color: '#8898aa',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    color: '#0d1b2a',
  },
  inputFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  dateInput: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 14,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonIcon: {
    marginTop: 1,
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
    color: '#0d1b2a',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'flex-end',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 22,
    color: '#1d4ed8',
  },
  categorySummary: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  categorySummaryTitle: {
    fontSize: 16,
    color: '#0d1b2a',
    marginBottom: 16,
    marginLeft: 8,
  },
  categorySummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categorySummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  categorySummaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 6,
  },
  categorySummaryText: {
    fontSize: 12,
  },
  categorySummaryAmount: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  expenseListContainer: {
    marginTop: 8,
  },
  expenseListHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  expenseListHeaderText: {
    fontSize: 16,
    color: '#1e3a8a',
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    color: '#0d1b2a',
    marginBottom: 6,
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
    color: '#8898aa',
  },
  expenseAmountContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  expenseAmount: {
    fontSize: 18,
    color: '#0d1b2a',
  },
  deleteButtonCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
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