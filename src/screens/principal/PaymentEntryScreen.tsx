import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  CreditCard,
  Banknote,
  History,
  X,
  Printer,
  Clock,
  CircleDollarSign,
  ScrollText,
  ReceiptText,
  CheckCircle2,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { paymentEntryStyles as styles } from '../../components/principal/paymentEntry/paymentEntryStyles';
import {
  formatAmount,
  getDueStatusColor,
  PaymentHistoryRow,
  PaymentReceiptModal,
} from '../../components/principal/paymentEntry';





interface Fee {
  id: string;
  student_id: string;
  student_name: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  due_date: string;
}

interface Payment {
  id: string;
  fee_id: string;
  amount: number;
  method: 'cash' | 'online';
  date: string;
  receipt_number?: string;
}

interface FormData {
  fee_id: string;
  amount: string;
  method: 'cash' | 'online';
}

const PaymentEntry = () => {
  const navigation = useNavigation();
  const { setTabBarVisible, userRole } = useAuth();
  const isMounted = useRef(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [formData, setFormData] = useState<FormData>({
    fee_id: '',
    amount: '',
    method: 'cash',
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [feeSearchText, setFeeSearchText] = useState('');

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode) {
      fetchFees();
    }
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

  const fetchFees = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.get('/accountant/fees', {
        params: { school_code: schoolCode },
      });
      setFees(response.data || []);
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Failed to fetch fees'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFees();
    if (formData.fee_id) {
      await fetchPaymentHistory(formData.fee_id);
    }
    setRefreshing(false);
  };

  const fetchPaymentHistory = async (feeId: string) => {
    if (!feeId || !schoolCode) {return;}

    try {
      const response = await API.get(`/accountant/payments/${feeId}`, {
        params: { school_code: schoolCode },
      });
      setPayments(response.data || []);
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      setPayments([]);
    }
  };

  const handleFeeChange = async (feeId: string) => {
    setFormData(prev => ({ ...prev, fee_id: feeId }));

    if (feeId) {
      const fee = fees.find(f => f.id === feeId);
      setSelectedFee(fee || null);
      await fetchPaymentHistory(feeId);
    } else {
      setSelectedFee(null);
      setPayments([]);
    }
  };

  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.fee_id) {
      Alert.alert('Validation Error', 'Please select a fee');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Validation Error', 'Valid amount is required');
      return;
    }

    const selectedFeeObj = fees.find(f => f.id === formData.fee_id);
    if (selectedFeeObj && parseFloat(formData.amount) > selectedFeeObj.due_amount) {
      Alert.alert(
        'Validation Error',
        `Payment amount cannot exceed due amount of ₹${selectedFeeObj.due_amount.toFixed(2)}`
      );
      return;
    }

    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.post('/accountant/payments/add', formData, {
        params: { school_code: schoolCode },
      });

      const newPayment = response.data;
      setLastPayment(newPayment);
      setShowReceiptModal(true);

      Alert.alert('Success', 'Payment added successfully');
      setFormData({ fee_id: '', amount: '', method: 'cash' });
      setSelectedFee(null);
      setFeeSearchText('');
      await fetchFees();
    } catch (error: any) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Error adding payment'));
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <PaymentHistoryRow payment={item} />
  );

  const isAccountant = userRole?.toLowerCase() === 'accountant';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <StandardPageHeader
          scrollWithContent
          title="Payment Entry"
          subtitle="Record student fees and track payment history"
          onBackPress={() => safeGoBack(navigation as any, isAccountant ? 'AccountantDashboard' : 'PrincipalDashboard')}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={20} color={C.text} />
              <AppText style={styles.formTitle} weight="bold">Add Payment</AppText>
            </View>

            <View style={styles.formGroup}>
              <View>
                <AppText style={styles.label} weight="semibold">Select Fee</AppText>
                {selectedFee ? (
                  <View style={styles.selectedFeeBadge}>
                    <View style={styles.selectedFeeBadgeLeft}>
                      <CheckCircle2 size={18} color={C.success} />
                      <AppText style={styles.selectedFeeText} weight="semibold">
                        {selectedFee.student_name}
                        {Boolean((selectedFee as any).roll_number) && ` (Roll: ${(selectedFee as any).roll_number})`} (Due: {formatAmount(selectedFee.due_amount)})
                      </AppText>
                    </View>
                    <TouchableOpacity accessibilityRole="button"
                      onPress={() => {
                        handleFeeChange('');
                        setFeeSearchText('');
                      }}
                      style={styles.clearSelectedFeeBtn}
                    >
                      <X size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Search student name or roll number..."
                      placeholderTextColor={C.textMuted}
                      value={feeSearchText}
                      onChangeText={setFeeSearchText}
                    />
                    {feeSearchText.trim().length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {fees
                          .filter(fee => {
                            const nameMatch = (fee.student_name || '').toLowerCase().includes(feeSearchText.toLowerCase());
                            const rollMatch = ((fee as any).roll_number || '').toLowerCase().includes(feeSearchText.toLowerCase()) ||
                                              ((fee as any).roll_no || '').toLowerCase().includes(feeSearchText.toLowerCase());
                            return nameMatch || rollMatch;
                          })
                          .slice(0, 5)
                          .map((fee, index) => (
                            <TouchableOpacity accessibilityRole="button"
                              key={fee.id || `fee-${index}`}
                              style={styles.suggestionItem}
                              onPress={() => {
                                handleFeeChange(fee.id);
                                setFeeSearchText('');
                              }}
                            >
                              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1, marginRight: Theme.spacing.sm }}>
                                  <AppText style={styles.suggestionItemText} weight="semibold">
                                    {fee.student_name}
                                  </AppText>
                                  {Boolean((fee as any).roll_number) && (
                                    <AppText style={styles.suggestionItemSubtext}>
                                      Roll No: {(fee as any).roll_number}
                                    </AppText>
                                  )}
                                </View>
                                <AppText style={styles.suggestionItemSubtext}>
                                  Due: {formatAmount(fee.due_amount)}
                                </AppText>
                              </View>
                            </TouchableOpacity>
                          ))
                        }
                        {fees.filter(fee => {
                          const nameMatch = (fee.student_name || '').toLowerCase().includes(feeSearchText.toLowerCase());
                          const rollMatch = ((fee as any).roll_number || '').toLowerCase().includes(feeSearchText.toLowerCase()) ||
                                            ((fee as any).roll_no || '').toLowerCase().includes(feeSearchText.toLowerCase());
                          return nameMatch || rollMatch;
                        }).length === 0 && (
                          <View style={styles.noSuggestionItem}>
                            <AppText style={styles.noSuggestionText}>No student fees match "{feeSearchText}"</AppText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {selectedFee && (
                <View style={styles.feeDetails}>
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel} weight="semibold">Student:</AppText>
                    <AppText style={styles.detailValue} weight="semibold">{selectedFee.student_name}</AppText>
                  </View>
                  {Boolean((selectedFee as any).roll_number) && (
                    <View style={styles.detailRow}>
                      <AppText style={styles.detailLabel} weight="semibold">Roll Number:</AppText>
                      <AppText style={styles.detailValue} weight="semibold">{(selectedFee as any).roll_number}</AppText>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel} weight="semibold">Total Fee:</AppText>
                    <AppText style={styles.detailValue} weight="semibold">{formatAmount(selectedFee.total_fee)}</AppText>
                  </View>
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel} weight="semibold">Paid:</AppText>
                    <AppText style={[styles.detailValue, styles.paidValue]} weight="semibold">{formatAmount(selectedFee.paid_amount)}</AppText>
                  </View>
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel} weight="semibold">Due:</AppText>
                    <AppText style={[styles.detailValue, { color: getDueStatusColor(selectedFee.due_amount) }]} weight="semibold">
                      {formatAmount(selectedFee.due_amount)}
                    </AppText>
                  </View>
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel} weight="semibold">Due Date:</AppText>
                    <AppText style={styles.detailValue} weight="semibold">{selectedFee.due_date}</AppText>
                  </View>
                </View>
              )}

              <View>
                <AppText style={styles.label} weight="semibold">Amount (₹)</AppText>
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
                <AppText style={styles.label} weight="semibold">Payment Method</AppText>
                <View style={styles.methodContainer}>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.methodOption, formData.method === 'cash' && styles.methodOptionSelected]}
                    onPress={() => handleInputChange('method', 'cash')}
                  >
                    <CircleDollarSign size={16} color={formData.method === 'cash' ? Theme.colors.card : C.text} />
                    <AppText style={[styles.methodOptionText, formData.method === 'cash' && styles.methodOptionTextSelected]} weight="semibold">
                      Cash
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.methodOption, formData.method === 'online' && styles.methodOptionSelected]}
                    onPress={() => handleInputChange('method', 'online')}
                  >
                    <CreditCard size={16} color={formData.method === 'online' ? Theme.colors.card : C.text} />
                    <AppText style={[styles.methodOptionText, formData.method === 'online' && styles.methodOptionTextSelected]} weight="semibold">
                      Online
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity accessibilityRole="button"
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Theme.colors.card} />
                ) : (
                  <>
                    <CreditCard size={16} color={Theme.colors.card} />
                    <AppText style={styles.submitButtonText} weight="semibold">Add Payment</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment History Section */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderLeft}>
                <View style={styles.sectionHeaderRow}>
                  <ScrollText size={20} color={C.text} />
                  <AppText style={styles.historyTitle} weight="bold">Payment History</AppText>
                </View>
                {selectedFee && (
                  <AppText style={styles.historySubtitle}>
                    {selectedFee.student_name}
                  </AppText>
                )}
              </View>
              {isAccountant ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.viewAllHistoryBtn}
                  onPress={() => navigation.navigate('AccountantPaymentHistory' as never)}
                >
                  <History size={16} color={Theme.colors.primary} />
                  <AppText style={styles.viewAllHistoryText} weight="semibold">View All</AppText>
                </TouchableOpacity>
              ) : null}
            </View>

            {!formData.fee_id ? (
              <View style={styles.emptyContainer}>
                <CreditCard size={48} color={C.border} />
                <AppText style={styles.emptyText}>Select a fee to view payment history</AppText>
              </View>
            ) : payments.length > 0 ? (
              <View style={styles.paymentsList}>
                <View style={styles.paymentsHeader}>
                  <AppText style={styles.paymentsHeaderText} weight="semibold">Payment History</AppText>
                  <AppText style={styles.totalPaymentsText} weight="bold">
                    Total: {formatAmount(payments.reduce((sum, p) => sum + p.amount, 0))}
                  </AppText>
                </View>
                {payments.map((payment) => (
                  <React.Fragment key={payment.id}>
                    {renderPaymentItem({ item: payment })}
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Clock size={48} color={C.border} />
                <AppText style={styles.emptyText}>No payments recorded yet</AppText>
                <AppText style={styles.emptySubtext}>Add a payment to see history</AppText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <PaymentReceiptModal
        visible={showReceiptModal}
        lastPayment={lastPayment}
        selectedFee={selectedFee}
        onClose={() => setShowReceiptModal(false)}
      />
    </View>
  );
};

export default PaymentEntry;
