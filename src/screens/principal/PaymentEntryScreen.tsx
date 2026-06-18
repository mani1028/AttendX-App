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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CreditCard,
  Banknote,
  History,
  X,
  Printer,
  Clock,
  CircleDollarSign,
  ScrollText,
  ReceiptText,
  CheckCircle2
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Principal_THEME as C } from '../../constants/principalTheme';
import { formatErrorMessage } from '../../utils/helpers';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';


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
  const insets = useSafeAreaInsets();
  const { setTabBarVisible, userRole } = useAuth();
  const lastScrollY = useRef(0);
  const isMounted = useRef(true);
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
  const [feeSearchText, setFeeSearchText] = useState('');

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
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Failed to fetch fees"));
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
      setFeeSearchText('');
      await fetchFees();
    } catch (error: any) {
      console.error("Error adding payment:", error);
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Error adding payment"));
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
        <AppText style={styles.paymentAmount} weight="bold">{formatAmount(item.amount)}</AppText>
        <View style={[styles.methodBadge, item.method === 'cash' ? styles.cashBadge : styles.onlineBadge]}>
          <AppText style={styles.methodText} weight="semibold">{item.method.toUpperCase()}</AppText>
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
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

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
                style={styles.iconButton}
                onPress={() => safeGoBack(navigation as any, isAccountant ? 'AccountantDashboard' : 'PrincipalDashboard')}
              >
                <ChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <AppText weight="bold" style={styles.headerTitle}>Payment Entry</AppText>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.headerContent}>
              <AppText weight="bold" style={styles.headerGreeting}>Fees & Payments</AppText>
              <AppText style={styles.headerSubtext}>Record student fees and track payment history</AppText>
            </View>
          </View>
        );
      })()}

      <View style={styles.contentOverlap}>
        <ScrollView
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
        >
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
                    <TouchableOpacity
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
                            <TouchableOpacity
                              key={fee.id || `fee-${index}`}
                              style={styles.suggestionItem}
                              onPress={() => {
                                handleFeeChange(fee.id);
                                setFeeSearchText('');
                              }}
                            >
                              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
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
                  <TouchableOpacity
                    style={[styles.methodOption, formData.method === 'cash' && styles.methodOptionSelected]}
                    onPress={() => handleInputChange('method', 'cash')}
                  >
                    <CircleDollarSign size={16} color={formData.method === 'cash' ? '#fff' : C.text} />
                    <AppText style={[styles.methodOptionText, formData.method === 'cash' && styles.methodOptionTextSelected]} weight="semibold">
                      Cash
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.methodOption, formData.method === 'online' && styles.methodOptionSelected]}
                    onPress={() => handleInputChange('method', 'online')}
                  >
                    <CreditCard size={16} color={formData.method === 'online' ? '#fff' : C.text} />
                    <AppText style={[styles.methodOptionText, formData.method === 'online' && styles.methodOptionTextSelected]} weight="semibold">
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
                    <CreditCard size={16} color="#fff" />
                    <AppText style={styles.submitButtonText} weight="semibold">Add Payment</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment History Section */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
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
        </ScrollView>
      </View>

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
              <View style={styles.sectionHeaderRow}>
                <ReceiptText size={20} color={C.text} />
                <AppText style={styles.modalTitle} weight="bold">Payment Receipt</AppText>
              </View>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <X size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            {lastPayment && selectedFee && (
              <View style={styles.receiptContent}>
                <View style={styles.receiptHeader}>
                  <AppText style={styles.receiptSchoolName} weight="bold">School Fee Receipt</AppText>
                  <AppText style={styles.receiptDate}>{formatDate(lastPayment.date)}</AppText>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Student Name:</AppText>
                  <AppText style={styles.receiptValue} weight="semibold">{selectedFee.student_name}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Amount Paid:</AppText>
                  <AppText style={[styles.receiptValue, styles.receiptAmount]} weight="bold">
                    {formatAmount(lastPayment.amount)}
                  </AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Payment Method:</AppText>
                  <AppText style={styles.receiptValue} weight="semibold">{lastPayment.method.toUpperCase()}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Total Fee:</AppText>
                  <AppText style={styles.receiptValue} weight="semibold">{formatAmount(selectedFee.total_fee)}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Total Paid:</AppText>
                  <AppText style={styles.receiptValue} weight="semibold">{formatAmount(selectedFee.paid_amount + lastPayment.amount)}</AppText>
                </View>

                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Remaining Due:</AppText>
                  <AppText style={[styles.receiptValue, { color: selectedFee.due_amount - lastPayment.amount > 0 ? C.warning : C.success }]} weight="semibold">
                    {formatAmount(selectedFee.due_amount - lastPayment.amount)}
                  </AppText>
                </View>

                {lastPayment.receipt_number && (
                  <View style={styles.receiptRow}>
                    <AppText style={styles.receiptLabel} weight="semibold">Receipt No:</AppText>
                    <AppText style={styles.receiptValue} weight="semibold">{lastPayment.receipt_number}</AppText>
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
                <Printer size={16} color="#fff" />
                <AppText style={styles.printButtonText} weight="semibold">Print Receipt</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowReceiptModal(false)}
              >
                <AppText style={styles.closeButtonText} weight="semibold">Close</AppText>
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
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
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
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    marginTop: -HEADER_CONSTANTS.BORDER_RADIUS,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: C.success,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    color: C.text,
  },
  formGroup: {
    gap: 16,
  },
  label: {
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
    color: C.textMuted,
  },
  detailValue: {
    fontSize: 13,
    color: C.text,
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
    color: C.text,
  },
  totalPaymentsText: {
    fontSize: 14,
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
    color: C.textMuted,
  },
  receiptValue: {
    fontSize: 14,
    color: C.text,
  },
  receiptAmount: {
    fontSize: 16,
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
  },
  closeButton: {
    backgroundColor: C.bg,
  },
  closeButtonText: {
    color: C.text,
  },
  selectedFeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  selectedFeeBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedFeeText: {
    color: C.success,
    fontSize: 14,
    flexShrink: 1,
  },
  clearSelectedFeeBtn: {
    padding: 4,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionsContainer: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionItemText: {
    fontSize: 14,
    color: C.text,
  },
  suggestionItemSubtext: {
    fontSize: 12,
    color: C.textMuted,
  },
  noSuggestionItem: {
    padding: 12,
    alignItems: 'center',
  },
  noSuggestionText: {
    fontSize: 12,
    color: C.textMuted,
    fontStyle: 'italic',
  },
});

export default PaymentEntry;