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
  StatusBar,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
  danger: colors.error,
};

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
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const [fees, setFees] = useState<Fee[]>([]);
  const [formData, setFormData] = useState<FormData>({
    fee_id: "",
    amount: "",
    method: "cash",
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);

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
      fetchFees();
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

  const fetchFees = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.get("/accountant/fees", {
        params: { school_code: schoolCode },
      });
      setFees(response.data || []);
    } catch (error: any) {
      console.error("Error fetching fees:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to fetch fees";
      Alert.alert('Error', errorMsg);
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
    if (!feeId || !schoolCode) return;

    try {
      const response = await API.get(`/accountant/payments/${feeId}`, {
        params: { school_code: schoolCode },
      });
      setPayments(response.data || []);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
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
      const response = await API.post("/accountant/payments/add", formData, {
        params: { school_code: schoolCode },
      });
      
      const newPayment = response.data;
      setLastPayment(newPayment);
      setShowReceiptModal(true);
      
      Alert.alert('Success', 'Payment added successfully');
      setFormData({ fee_id: "", amount: "", method: "cash" });
      setSelectedFee(null);
      await fetchFees();
    } catch (error: any) {
      console.error("Error adding payment:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Error adding payment";
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDueStatusColor = (dueAmount: number) => {
    if (dueAmount === 0) return '#059669';
    if (dueAmount < 0) return '#dc2626';
    return '#d97706';
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={styles.paymentRow}>
      <View style={styles.paymentInfo}>
        <AppText style={styles.paymentAmount}>{formatAmount(item.amount)}</AppText>
        <View style={[styles.methodBadge, item.method === 'cash' ? styles.cashBadge : styles.onlineBadge]}>
          <AppText style={styles.methodText}>{item.method.toUpperCase()}</AppText>
        </View>
      </View>
      <AppText style={styles.paymentDate}>{formatDate(item.date)}</AppText>
      {item.receipt_number && (
        <AppText style={styles.receiptNumber}>Receipt: {item.receipt_number}</AppText>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Header */}
      <View style={styles.headerStandard}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Payment Entry</AppText>
        <View style={{ width: 40 }} />
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
          <AppText style={styles.formTitle}>💳 Add Payment</AppText>
          
          <View style={styles.formGroup}>
            <View>
              <AppText style={styles.label}>Select Fee</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feeScroll}>
                <View style={styles.feeContainer}>
                  <TouchableOpacity
                    style={[styles.feeOption, !formData.fee_id && styles.feeOptionSelected]}
                    onPress={() => handleFeeChange('')}
                  >
                    <AppText style={[styles.feeOptionText, !formData.fee_id && styles.feeOptionTextSelected]}>
                      Select Fee
                    </AppText>
                  </TouchableOpacity>
                  {fees.map((fee) => (
                    <TouchableOpacity
                      key={fee.id}
                      style={[styles.feeOption, formData.fee_id === fee.id && styles.feeOptionSelected]}
                      onPress={() => handleFeeChange(fee.id)}
                    >
                      <AppText style={[styles.feeOptionText, formData.fee_id === fee.id && styles.feeOptionTextSelected]}>
                        {fee.student_name} - {formatAmount(fee.due_amount)} due
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {selectedFee && (
              <View style={styles.feeDetails}>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Student:</AppText>
                  <AppText style={styles.detailValue}>{selectedFee.student_name}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Total Fee:</AppText>
                  <AppText style={styles.detailValue}>{formatAmount(selectedFee.total_fee)}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Paid:</AppText>
                  <AppText style={[styles.detailValue, styles.paidValue]}>{formatAmount(selectedFee.paid_amount)}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Due:</AppText>
                  <AppText style={[styles.detailValue, { color: getDueStatusColor(selectedFee.due_amount) }]}>
                    {formatAmount(selectedFee.due_amount)}
                  </AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Due Date:</AppText>
                  <AppText style={styles.detailValue}>{selectedFee.due_date}</AppText>
                </View>
              </View>
            )}

            <View>
              <AppText style={styles.label}>Amount (₹)</AppText>
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
              <AppText style={styles.label}>Payment Method</AppText>
              <View style={styles.methodContainer}>
                <TouchableOpacity
                  style={[styles.methodOption, formData.method === 'cash' && styles.methodOptionSelected]}
                  onPress={() => handleInputChange('method', 'cash')}
                >
                  <Icon name="dollar-sign" size={16} color={formData.method === 'cash' ? '#fff' : C.text} />
                  <AppText style={[styles.methodOptionText, formData.method === 'cash' && styles.methodOptionTextSelected]}>
                    Cash
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodOption, formData.method === 'online' && styles.methodOptionSelected]}
                  onPress={() => handleInputChange('method', 'online')}
                >
                  <Icon name="credit-card" size={16} color={formData.method === 'online' ? '#fff' : C.text} />
                  <AppText style={[styles.methodOptionText, formData.method === 'online' && styles.methodOptionTextSelected]}>
                    Online
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="credit-card" size={16} color="#fff" />
                  <AppText style={styles.submitButtonText}>Add Payment</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <AppText style={styles.historyTitle}>📜 Payment History</AppText>
            {selectedFee && (
              <AppText style={styles.historySubtitle}>
                {selectedFee.student_name}
              </AppText>
            )}
          </View>

          {!formData.fee_id ? (
            <View style={styles.emptyContainer}>
              <Icon name="credit-card" size={48} color={C.border} />
              <AppText style={styles.emptyText}>Select a fee to view payment history</AppText>
            </View>
          ) : payments.length > 0 ? (
            <View style={styles.paymentsList}>
              <View style={styles.paymentsHeader}>
                <AppText style={styles.paymentsHeaderText}>Payment History</AppText>
                <AppText style={styles.totalPaymentsText}>
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
              <Icon name="clock" size={48} color={C.border} />
              <AppText style={styles.emptyText}>No payments recorded yet</AppText>
              <AppText style={styles.emptySubtext}>Add a payment to see history</AppText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Receipt Modal */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>🧾 Payment Receipt</AppText>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <Icon name="x" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            {lastPayment && selectedFee && (
              <View style={styles.receiptContent}>
                <View style={styles.receiptHeader}>
                  <AppText style={styles.receiptSchoolName}>School Fee Receipt</AppText>
                  <AppText style={styles.receiptDate}>{formatDate(lastPayment.date)}</AppText>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Student Name:</AppText>
                  <AppText style={styles.receiptValue}>{selectedFee.student_name}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Amount Paid:</AppText>
                  <AppText style={[styles.receiptValue, styles.receiptAmount]}>
                    {formatAmount(lastPayment.amount)}
                  </AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Payment Method:</AppText>
                  <AppText style={styles.receiptValue}>{lastPayment.method.toUpperCase()}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Total Fee:</AppText>
                  <AppText style={styles.receiptValue}>{formatAmount(selectedFee.total_fee)}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Total Paid:</AppText>
                  <AppText style={styles.receiptValue}>{formatAmount(selectedFee.paid_amount + lastPayment.amount)}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel}>Remaining Due:</AppText>
                  <AppText style={[styles.receiptValue, { color: selectedFee.due_amount - lastPayment.amount > 0 ? C.warning : C.success }]}>
                    {formatAmount(selectedFee.due_amount - lastPayment.amount)}
                  </AppText>
                </View>

                {lastPayment.receipt_number && (
                  <View style={styles.receiptRow}>
                    <AppText style={styles.receiptLabel}>Receipt No:</AppText>
                    <AppText style={styles.receiptValue}>{lastPayment.receipt_number}</AppText>
                  </View>
                )}

                <View style={styles.receiptDivider} />

                <AppText style={styles.receiptFooter}>Thank you for your payment!</AppText>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.printButton]}
                onPress={() => {
                  Alert.alert('Print', 'Print functionality would be implemented here');
                }}
              >
                <Icon name="printer" size={16} color="#fff" />
                <AppText style={styles.printButtonText}>Print Receipt</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowReceiptModal(false)}
              >
                <AppText style={styles.closeButtonText}>Close</AppText>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: C.success,
    margin: 16,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 16,
  },
  formGroup: {
    gap: 16,
  },
  label: {
    fontWeight: '600',
    color: C.textMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  feeScroll: {
    flexDirection: 'row',
  },
  feeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    marginBottom: 8,
  },
  feeOptionSelected: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  feeOptionText: {
    fontSize: 14,
    color: C.text,
  },
  feeOptionTextSelected: {
    color: '#ffffff',
  },
  feeDetails: {
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  detailValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  paidValue: {
    color: C.success,
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
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  methodOptionSelected: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  methodOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textMuted,
  },
  methodOptionTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: C.success,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  historySection: {
    margin: 16,
    marginTop: 8,
  },
  historyHeader: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  historySubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  paymentsList: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  paymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  totalPaymentsText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.success,
  },
  paymentRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cashBadge: {
    backgroundColor: colors.primary + '30',
  },
  onlineBadge: {
    backgroundColor: C.successSoft,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.text,
  },
  paymentDate: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 11,
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
    fontSize: 14,
    color: C.textMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: C.border,
    marginTop: 4,
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  receiptContent: {
    padding: 16,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptSchoolName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  receiptDate: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
  },
  receiptValue: {
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: C.success,
  },
  receiptFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textMuted,
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButton: {
    backgroundColor: C.success,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  printButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: C.bg,
  },
  closeButtonText: {
    color: C.text,
    fontWeight: '600',
  },
});

export default PaymentEntry;