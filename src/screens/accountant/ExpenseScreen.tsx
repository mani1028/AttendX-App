import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import {
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  LayoutDashboard,
  Filter,
  X,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { Theme, C } from '../../theme/tokens';
import * as accountantService from '../../services/accountantService';
import { formatErrorMessage } from '../../utils/helpers';
import { expenseStyles as styles } from '../../components/accountant/expense/expenseStyles';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
}

interface FormData {
  title: string;
  amount: string;
  category: string;
  date: string;
  description: string;
}

const categories = [
  'Supplies',
  'Utilities',
  'Maintenance',
  'Salaries',
  'Equipment',
  'Other',
];

const categoryPalette: Record<string, { bg: string; text: string; bgSoft: string }> = {
  Supplies: { bg: Theme.colors.warning, text: Theme.colors.card, bgSoft: Theme.colors.amberLight },
  Utilities: { bg: Theme.colors.blue, text: Theme.colors.card, bgSoft: Theme.colors.blueLight },
  Maintenance: { bg: '#4f46e5', text: Theme.colors.card, bgSoft: '#e0e7ff' },
  Salaries: { bg: '#16a34a', text: Theme.colors.card, bgSoft: Theme.colors.greenLight },
  Equipment: { bg: '#db2777', text: Theme.colors.card, bgSoft: '#fce7f3' },
  Other: { bg: Theme.colors.textSec || Theme.colors.textSec, text: Theme.colors.card, bgSoft: Theme.colors.background || Theme.colors.inputBg },
};

const ExpenseScreen = () => {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const handleScroll = useScrollTabBar();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    title: '',
    amount: '',
    category: 'Supplies',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await accountantService.getAllExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = filterCategory === 'All'
    ? expenses
    : expenses.filter(e => e.category === filterCategory);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categorySummary = categories.map(cat => ({
    name: cat,
    total: filteredExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
    count: filteredExpenses.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0);

  const handleAddExpense = async () => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await accountantService.addExpense({
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category,
        date: form.date,
        description: form.description.trim() || undefined,
      });
      Alert.alert('Success', 'Expense added successfully');
      setShowAddModal(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    try {
      await accountantService.deleteExpense(selectedExpense.id);
      Alert.alert('Deleted', 'Expense removed');
      setShowDeleteModal(false);
      setSelectedExpense(null);
      fetchExpenses();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      amount: '',
      category: 'Supplies',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderCategorySummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <LayoutDashboard size={20} color={Theme.colors.primary} />
        <AppText style={styles.summaryLabel}>Total Expenses</AppText>
        <AppText style={styles.summaryValue}>₹{totalAmount.toLocaleString('en-IN')}</AppText>
        <AppText style={styles.summaryCount}>{filteredExpenses.length} entries</AppText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll]}>
        {categorySummary.map((cat) => {
          const palette = categoryPalette[cat.name] || categoryPalette.Other;
          return (
            <View key={cat.name} style={[styles.categoryMiniCard, { backgroundColor: palette.bgSoft }]}>
              <View style={[styles.categoryDot, { backgroundColor: palette.bg }]} />
              <AppText style={styles.categoryMiniName}>{cat.name}</AppText>
              <AppText style={styles.categoryMiniAmount}>₹{cat.total.toLocaleString('en-IN')}</AppText>
              <AppText style={styles.categoryMiniCount}>{cat.count} items</AppText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderExpenseCard = (item: Expense) => {
    const palette = categoryPalette[item.category] || categoryPalette.Other;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.expenseCard}
        onLongPress={() => {
          setSelectedExpense(item);
          setShowDeleteModal(true);
        }}
      >
        <View style={[styles.categoryBadge, { backgroundColor: palette.bg }]}>
          <AppText style={styles.categoryBadgeText}>{item.category.charAt(0)}</AppText>
        </View>
        <View style={styles.expenseInfo}>
          <AppText style={styles.expenseTitle} numberOfLines={1}>{item.title}</AppText>
          <AppText style={styles.expenseDate}>{formatDate(item.date)}</AppText>
        </View>
        <View style={styles.expenseRight}>
          <AppText style={styles.expenseAmount}>₹{item.amount.toLocaleString('en-IN')}</AppText>
          <View style={[styles.categoryTag, { backgroundColor: palette.bgSoft }]}>
            <AppText style={[styles.categoryTagText, { color: palette.bg }]}>{item.category}</AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Expense Tracking"
          onBackPress={() => navigation.goBack()}
        />

        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Filter size={14} color={Theme.colors.primary} />
            <AppText style={styles.filterBtnText}>{filterCategory === 'All' ? 'All' : filterCategory}</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Plus size={16} color={Theme.colors.card} />
            <AppText style={styles.addBtnText}>Add Expense</AppText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ScreenSkeleton variant="list" />
        ) : (
          <>
            {renderCategorySummary()}

            <View style={styles.listHeader}>
              <AppText style={styles.listTitle}>All Expenses</AppText>
              <AppText style={styles.listCount}>{filteredExpenses.length}</AppText>
            </View>

            {filteredExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <AlertCircle size={40} color={Theme.colors.border} />
                <AppText style={styles.emptyText}>No expenses found</AppText>
                <AppText style={styles.emptySubtext}>Add your first expense using the button above</AppText>
              </View>
            ) : (
              filteredExpenses.map(renderExpenseCard)
            )}
          </>
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Add Expense</AppText>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <X size={24} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
              <AppText style={styles.label}>Title</AppText>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(text) => setForm(p => ({ ...p, title: text }))}
                placeholder="Expense title"
                placeholderTextColor={Theme.colors.textMuted}
              />

              <AppText style={styles.label}>Amount (₹)</AppText>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={(text) => setForm(p => ({ ...p, amount: text.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor={Theme.colors.textMuted}
                keyboardType="decimal-pad"
              />

              <AppText style={styles.label}>Category</AppText>
              <View style={styles.optionRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.optionChip, form.category === cat && styles.optionChipActive]}
                    onPress={() => setForm(p => ({ ...p, category: cat }))}
                  >
                    <AppText style={[styles.optionText, form.category === cat && styles.optionTextActive]}>
                      {cat}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppText style={styles.label}>Date</AppText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Calendar size={16} color={Theme.colors.textSec} />
                <AppText style={styles.dateBtnText}>{form.date}</AppText>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(form.date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setForm(p => ({ ...p, date: date.toISOString().split('T')[0] }));
                    }
                  }}
                />
              )}

              <AppText style={styles.label}>Description (optional)</AppText>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.description}
                onChangeText={(text) => setForm(p => ({ ...p, description: text }))}
                placeholder="Notes about this expense"
                placeholderTextColor={Theme.colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddModal(false); resetForm(); }}
              >
                <AppText style={styles.cancelBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleAddExpense}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Theme.colors.card} />
                ) : (
                  <AppText style={styles.submitBtnText}>Add Expense</AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <AlertCircle size={40} color={C.error || Theme.colors.error} />
            <AppText style={styles.deleteTitle}>Delete Expense?</AppText>
            <AppText style={styles.deleteMessage}>
              {selectedExpense?.title} - ₹{selectedExpense?.amount.toLocaleString('en-IN')}
            </AppText>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowDeleteModal(false); setSelectedExpense(null); }}
              >
                <AppText style={styles.cancelBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDeleteExpense}>
                <Trash2 size={16} color={Theme.colors.card} />
                <AppText style={styles.deleteConfirmText}>Delete</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <AppText style={styles.modalTitle}>Filter by Category</AppText>
            <TouchableOpacity
              style={[styles.filterOption, filterCategory === 'All' && styles.filterOptionActive]}
              onPress={() => { setFilterCategory('All'); setShowFilterModal(false); }}
            >
              <AppText style={[styles.filterOptionText, filterCategory === 'All' && styles.filterOptionTextActive]}>
                All Categories
              </AppText>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterOption, filterCategory === cat && styles.filterOptionActive]}
                onPress={() => { setFilterCategory(cat); setShowFilterModal(false); }}
              >
                <View style={[styles.filterDot, { backgroundColor: (categoryPalette[cat] || categoryPalette.Other).bg }]} />
                <AppText style={[styles.filterOptionText, filterCategory === cat && styles.filterOptionTextActive]}>
                  {cat}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};
