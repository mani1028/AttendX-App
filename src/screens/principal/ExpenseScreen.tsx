import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import { useAuth } from '../../context/AuthContext';

import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { expenseStyles as styles } from '../../components/principal/expense/expenseStyles';





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
  'Supplies',
  'Utilities',
  'Maintenance',
  'Salaries',
  'Equipment',
  'Other',
];

const categoryPalette: Record<string, { bg: string; text: string; bgSoft: string; textSoft: string; borderSoft: string }> = {
  Supplies: { bg: Theme.colors.warning, text: Theme.colors.card, bgSoft: Theme.colors.amberLight, textSoft: '#b45309', borderSoft: '#fde68a' },
  Utilities: { bg: Theme.colors.blue, text: Theme.colors.card, bgSoft: Theme.colors.blueLight, textSoft: Theme.colors.blueLight, borderSoft: '#bfdbfe' },
  Maintenance: { bg: '#4f46e5', text: Theme.colors.card, bgSoft: '#e0e7ff', textSoft: '#4338ca', borderSoft: '#c7d2fe' },
  Salaries: { bg: '#16a34a', text: Theme.colors.card, bgSoft: Theme.colors.greenLight, textSoft: '#15803d', borderSoft: '#a7f3d0' },
  Equipment: { bg: '#db2777', text: Theme.colors.card, bgSoft: '#fce7f3', textSoft: '#be185d', borderSoft: '#fbcfe8' },
  Other: { bg: Theme.colors.textSec, text: Theme.colors.card, bgSoft: Theme.colors.background, textSoft: Theme.colors.cardAlt, borderSoft: Theme.colors.border },
};

const ExpenseManagement = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible, userRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    category: 'Supplies',
    date: new Date().toISOString().split('T')[0],
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
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode) {
      fetchExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';
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
      const response = await API.get('/accountant/expenses', {
        params: { school_code: schoolCode },
      });
      setExpenses(response.data || []);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Failed to fetch expenses'));
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
      await API.post('/accountant/expenses/add', formData, {
        params: { school_code: schoolCode },
      });

      Alert.alert('Success', 'Expense added successfully');
      setFormData({
        title: '',
        amount: '',
        category: 'Supplies',
        date: new Date().toISOString().split('T')[0],
      });
      await fetchExpenses();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Error adding expense'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteId || !schoolCode) {return;}

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
      console.error('Error deleting expense:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Error deleting expense'));
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
            <TouchableOpacity accessibilityRole="button"
              onPress={() => confirmDelete(item.id)}
              style={styles.deleteButtonCircle}
              activeOpacity={0.6}
            >
              <Trash2 size={16} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const isAccountant = userRole?.toLowerCase() === 'accountant';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          innerPageLayoutStyles.scrollPageContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <StandardPageHeader
          scrollWithContent
          title="Expense Management"
          subtitle="Track and manage school expenditures"
          backgroundColor={isAccountant ? Theme.colors.primary : undefined}
          onBackPress={() => safeGoBack(navigation as any, isAccountant ? 'AccountantDashboard' : 'PrincipalDashboard')}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onRefresh}
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Plus size={20} color={Theme.colors.primary} />
            <AppText style={styles.formTitle} weight="bold">Add Expense</AppText>
          </View>

          <View style={styles.formGroup}>
            <View>
              <AppText style={styles.label} weight="semibold">Title</AppText>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'title' && styles.inputFocused,
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
                  focusedInput === 'amount' && styles.inputFocused,
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, innerPageLayoutStyles.scrollViewFront]}>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => {
                    const isSelected = formData.category === cat;
                    const catPalette = categoryPalette[cat] || categoryPalette.Other;
                    return (
                      <TouchableOpacity accessibilityRole="button"
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
                            backgroundColor: Theme.colors.background,
                            borderColor: Theme.colors.border,
                          },
                        ]}
                        onPress={() => handleInputChange('category', cat)}
                        activeOpacity={0.7}
                      >
                        <AppText
                          style={[
                            styles.categoryOptionText,
                            { color: isSelected ? Theme.colors.card : Theme.colors.textSec },
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
              <TouchableOpacity accessibilityRole="button"
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <AppText style={styles.dateText}>{formData.date}</AppText>
                <Calendar size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <AppButton
              title="Add Expense"
              onPress={handleSubmit}
              disabled={loading}
              loading={loading}
              leftIcon={!loading ? <Plus size={18} color={Theme.colors.card} /> : undefined}
              style={styles.submitButton}
            />
          </View>
        </View>

        {/* Expense List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View style={styles.sectionHeaderRow}>
              <LayoutDashboard size={20} color={Theme.colors.primary} />
              <AppText style={styles.listTitle} weight="bold">Expense List</AppText>
            </View>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryLabel} weight="semibold">Total Expenses</AppText>
              <AppText style={styles.summaryAmount} weight="bold">{formatAmount(getTotalExpenses())}</AppText>
            </View>
          </View>

          {loading && expenses.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ScreenSkeleton variant="list" />
              <AppText style={styles.loadingText}>Loading expenses...</AppText>
            </View>
          ) : expenses.length > 0 ? (
            <>
              {/* Category Summary */}
              <View style={styles.categorySummary}>
                <View style={styles.sectionHeaderRow}>
                  <Filter size={18} color={Theme.colors.primary} />
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
              <TouchableOpacity accessibilityRole="button"
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <AppText style={styles.cancelButtonText} weight="semibold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
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

export default ExpenseManagement;
