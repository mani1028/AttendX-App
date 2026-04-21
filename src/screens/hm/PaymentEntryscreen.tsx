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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

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
  }, []);

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
        <Text style={styles.paymentAmount}>{formatAmount(item.amount)}</Text>
        <View style={[styles.methodBadge, item.method === 'cash' ? styles.cashBadge : styles.onlineBadge]}>
          <Text style={styles.methodText}>{item.method.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.paymentDate}>{formatDate(item.date)}</Text>
      {item.receipt_number && (
        <Text style={styles.receiptNumber}>Receipt: {item.receipt_number}</Text>
      )}
    </View>
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
          <Text style={styles.formTitle}>💳 Add Payment</Text>
          
          <View style={styles.formGroup}>
            <View>
              <Text style={styles.label}>Select Fee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feeScroll}>
                <View style={styles.feeContainer}>
                  <TouchableOpacity
                    style={[styles.feeOption, !formData.fee_id && styles.feeOptionSelected]}
                    onPress={() => handleFeeChange('')}
                  >
                    <Text style={[styles.feeOptionText, !formData.fee_id && styles.feeOptionTextSelected]}>
                      Select Fee
                    </Text>
                  </TouchableOpacity>
                  {fees.map((fee) => (
                    <TouchableOpacity
                      key={fee.id}
                      style={[styles.feeOption, formData.fee_id === fee.id && styles.feeOptionSelected]}
                      onPress={() => handleFeeChange(fee.id)}
                    >
                      <Text style={[styles.feeOptionText, formData.fee_id === fee.id && styles.feeOptionTextSelected]}>
                        {fee.student_name} - {formatAmount(fee.due_amount)} due
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {selectedFee && (
              <View style={styles.feeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Student:</Text>
                  <Text style={styles.detailValue}>{selectedFee.student_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Fee:</Text>
                  <Text style={styles.detailValue}>{formatAmount(selectedFee.total_fee)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Paid:</Text>
                  <Text style={[styles.detailValue, styles.paidValue]}>{formatAmount(selectedFee.paid_amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Due:</Text>
                  <Text style={[styles.detailValue, { color: getDueStatusColor(selectedFee.due_amount) }]}>
                    {formatAmount(selectedFee.due_amount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Due Date:</Text>
                  <Text style={styles.detailValue}>{selectedFee.due_date}</Text>
                </View>
              </View>
            )}

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
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodContainer}>
                <TouchableOpacity
                  style={[styles.methodOption, formData.method === 'cash' && styles.methodOptionSelected]}
                  onPress={() => handleInputChange('method', 'cash')}
                >
                  <Icon name="dollar-sign" size={16} color={formData.method === 'cash' ? '#fff' : '#4a5568'} />
                  <Text style={[styles.methodOptionText, formData.method === 'cash' && styles.methodOptionTextSelected]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodOption, formData.method === 'online' && styles.methodOptionSelected]}
                  onPress={() => handleInputChange('method', 'online')}
                >
                  <Icon name="credit-card" size={16} color={formData.method === 'online' ? '#fff' : '#4a5568'} />
                  <Text style={[styles.methodOptionText, formData.method === 'online' && styles.methodOptionTextSelected]}>
                    Online
                  </Text>
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
                  <Text style={styles.submitButtonText}>Add Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>📜 Payment History</Text>
            {selectedFee && (
              <Text style={styles.historySubtitle}>
                {selectedFee.student_name}
              </Text>
            )}
          </View>

          {!formData.fee_id ? (
            <View style={styles.emptyContainer}>
              <Icon name="credit-card" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Select a fee to view payment history</Text>
            </View>
          ) : payments.length > 0 ? (
            <View style={styles.paymentsList}>
              <View style={styles.paymentsHeader}>
                <Text style={styles.paymentsHeaderText}>Payment History</Text>
                <Text style={styles.totalPaymentsText}>
                  Total: {formatAmount(payments.reduce((sum, p) => sum + p.amount, 0))}
                </Text>
              </View>
              {payments.map((payment) => (
                <React.Fragment key={payment.id}>
                  {renderPaymentItem({ item: payment })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="clock" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No payments recorded yet</Text>
              <Text style={styles.emptySubtext}>Add a payment to see history</Text>
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
              <Text style={styles.modalTitle}>🧾 Payment Receipt</Text>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <Icon name="x" size={24} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {lastPayment && selectedFee && (
              <View style={styles.receiptContent}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptSchoolName}>School Fee Receipt</Text>
                  <Text style={styles.receiptDate}>{formatDate(lastPayment.date)}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Student Name:</Text>
                  <Text style={styles.receiptValue}>{selectedFee.student_name}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount Paid:</Text>
                  <Text style={[styles.receiptValue, styles.receiptAmount]}>
                    {formatAmount(lastPayment.amount)}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment Method:</Text>
                  <Text style={styles.receiptValue}>{lastPayment.method.toUpperCase()}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Fee:</Text>
                  <Text style={styles.receiptValue}>{formatAmount(selectedFee.total_fee)}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Paid:</Text>
                  <Text style={styles.receiptValue}>{formatAmount(selectedFee.paid_amount + lastPayment.amount)}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Remaining Due:</Text>
                  <Text style={[styles.receiptValue, { color: selectedFee.due_amount - lastPayment.amount > 0 ? '#d97706' : '#059669' }]}>
                    {formatAmount(selectedFee.due_amount - lastPayment.amount)}
                  </Text>
                </View>

                {lastPayment.receipt_number && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Receipt No:</Text>
                    <Text style={styles.receiptValue}>{lastPayment.receipt_number}</Text>
                  </View>
                )}

                <View style={styles.receiptDivider} />

                <Text style={styles.receiptFooter}>Thank you for your payment!</Text>
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
                <Text style={styles.printButtonText}>Print Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
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
    borderLeftColor: '#059669',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    marginRight: 8,
    marginBottom: 8,
  },
  feeOptionSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  feeOptionText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  feeOptionTextSelected: {
    color: '#ffffff',
  },
  feeDetails: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  detailValue: {
    fontSize: 13,
    color: '#0d1b2a',
    fontWeight: '500',
  },
  paidValue: {
    color: '#059669',
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
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
    borderColor: '#e4e9f2',
    backgroundColor: '#ffffff',
  },
  methodOptionSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  methodOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4a5568',
  },
  methodOptionTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#059669',
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
    color: '#0d1b2a',
  },
  historySubtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
  },
  paymentsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  paymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  paymentsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  totalPaymentsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  paymentRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
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
    color: '#0d1b2a',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cashBadge: {
    backgroundColor: '#dbeafe',
  },
  onlineBadge: {
    backgroundColor: '#d1fae5',
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
    color: '#8898aa',
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 11,
    color: '#4a5568',
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
    fontSize: 14,
    color: '#8898aa',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
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
    color: '#0d1b2a',
  },
  receiptDate: {
    fontSize: 12,
    color: '#8898aa',
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#e4e9f2',
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
    color: '#4a5568',
  },
  receiptValue: {
    fontSize: 14,
    color: '#0d1b2a',
    fontWeight: '500',
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  receiptFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8898aa',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    gap: 8,
  },
  printButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
});

export default PaymentEntry;