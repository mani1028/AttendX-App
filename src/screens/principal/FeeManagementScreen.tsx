import { useScrollTabBar } from '../../hooks/useScrollTabBar';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';
import {
  ChevronLeft,
  Plus,
  CreditCard,
  X,
  Calendar,
  LayoutDashboard,
  CheckCircle2,
  FileText,
  User,
  Search,
} from 'lucide-react-native';
import {
  addPayment,
  createFee,
  getAllFees,
  getSchoolStudents,
  getPaymentHistoryByFee,
  downloadReceipt,
  PaymentRecord,
} from '../../services/accountantService';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';





interface Student {
  id: string;
  name?: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
  roll_number?: string;
}

interface Fee {
  id: string;
  student_id: string;
  student_name?: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'pending';
  due_date: string;
  created_at?: string;
}

interface FormData {
  student_id: string;
  total_fee: string;
  due_date: string;
}

const FeeManagement = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setTabBarVisible, userRole } = useAuth();
  const isMounted = useRef(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [formData, setFormData] = useState<FormData>({
    student_id: '',
    total_fee: '',
    due_date: '',
  });
  const [showStudentSearchModal, setShowStudentSearchModal] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const lastProcessedStudentId = useRef<string | null>(null);

  // Pre-select student if passed via route params
  useEffect(() => {
    const sId = route?.params?.student_id || route?.params?.studentId;
    if (!sId || lastProcessedStudentId.current === sId) {return;}
    if (students.length > 0) {
      const found = students.find(s => s.id === sId);
      if (found) {
        setFormData(prev => ({ ...prev, student_id: sId }));
        lastProcessedStudentId.current = sId;
        if (navigation?.setParams) {
          navigation.setParams({ student_id: undefined, studentId: undefined });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params, students]);

  // Load school code from storage
  useEffect(() => {
    isMounted.current = true;
    loadSchoolCode();
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode && schoolCode.trim() !== '') {
      fetchStudentsAndFees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      if (isMounted.current) {
        setSchoolCode(code);
      }
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchStudentsAndFees = async () => {
    if (!schoolCode || schoolCode.trim() === '') {
      return;
    }
    try {
      setLoading(true);

      const [studentRows, feeRows] = await Promise.all([
        getSchoolStudents(schoolCode || undefined),
        getAllFees(schoolCode || undefined),
      ]);

      if (isMounted.current) {
        setStudents(studentRows as Student[]);
        setFees(feeRows as Fee[]);
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error fetching data:', error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Failed to fetch data';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudentsAndFees();
    setRefreshing(false);
  };

  const handleInputChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, due_date: dateStr }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.student_id) {
      Alert.alert('Validation Error', 'Please select a student');
      return;
    }

    if (!formData.total_fee || parseFloat(formData.total_fee) <= 0) {
      Alert.alert('Validation Error', 'Valid total fee amount is required');
      return;
    }

    if (!formData.due_date) {
      Alert.alert('Validation Error', 'Due date is required');
      return;
    }

    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      await createFee({
        student_id: formData.student_id,
        total_fee: Number(formData.total_fee),
        due_date: formData.due_date,
      }, schoolCode);

      if (isMounted.current) {
        Alert.alert('Success', 'Fee created successfully');
        setFormData({ student_id: '', total_fee: '', due_date: '' });
        await fetchStudentsAndFees();
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error creating fee:', error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Error creating fee';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handlePayment = async () => {
    if (!selectedFee) {return;}

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Validation Error', 'Valid payment amount is required');
      return;
    }

    if (parseFloat(paymentAmount) > selectedFee.due_amount) {
      Alert.alert('Validation Error', `Payment amount cannot exceed due amount of ₹${selectedFee.due_amount.toFixed(2)}`);
      return;
    }

    try {
      setProcessingPayment(true);
      await addPayment({
        fee_id: selectedFee.id,
        amount: parseFloat(paymentAmount),
        method: 'cash',
      }, schoolCode);

      if (isMounted.current) {
        Alert.alert('Success', 'Payment recorded successfully');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedFee(null);
        await fetchStudentsAndFees();
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Error processing payment:', error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Error processing payment';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      if (isMounted.current) {
        setProcessingPayment(false);
      }
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return { backgroundColor: C.successSoft, color: C.success };
      case 'partial':
        return { backgroundColor: C.warningSoft, color: C.warning };
      default:
        return { backgroundColor: C.errorSoft, color: C.error };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'PAID';
      case 'partial':
        return 'PARTIAL';
      default:
        return 'PENDING';
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const handleDownloadReceipt = async (paymentId: string, receiptNo: string) => {
    try {
      setDownloading(paymentId);
      const data = await downloadReceipt(paymentId);

      const fileName = `Receipt_${receiptNo || paymentId}.pdf`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      const base64Data = Buffer.from(data).toString('base64');
      await RNFS.writeFile(filePath, base64Data, 'base64');

      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title: 'Payment Receipt',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download receipt. Please try again later.');
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStudentName = (student: Student) => {
    return student.name || student.student_full_name || 'N/A';
  };

  const getStudentClass = (student: Student) => {
    if (student.class_grade && student.section) {
      return `${student.class_grade} - ${student.section}`;
    }
    return student.class_grade || student.section || '';
  };

  const getTotalCollected = () => {
    return fees.reduce((sum, fee) => sum + fee.paid_amount, 0);
  };

  const getTotalPending = () => {
    return fees.reduce((sum, fee) => sum + fee.due_amount, 0);
  };

  const getTotalFees = () => {
    return fees.reduce((sum, fee) => sum + fee.total_fee, 0);
  };

  const renderFeeItem = ({ item }: { item: Fee }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity accessibilityRole="button"
        style={styles.feeRow}
        onPress={async () => {
          setSelectedFee(item);
          setPaymentAmount('');
          setShowPaymentModal(true);

          // Load payment history for this fee
          try {
            setLoadingHistory(true);
            const history = await getPaymentHistoryByFee(item.id);
            if (isMounted.current) {
              setPaymentHistory(history as any[]);
            }
          } catch (error) {
            console.error('Error fetching payment history:', error);
          } finally {
            if (isMounted.current) {
              setLoadingHistory(false);
            }
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.feeInfo}>
          <AppText style={styles.studentName} weight="bold">
            {item.student_name || 'N/A'}
            {Boolean((item as any).roll_number) && ` (Roll: ${(item as any).roll_number})`}
          </AppText>
          <View style={styles.feeDetails}>
            <AppText style={styles.feeAmount} weight="semibold">Total: {formatAmount(item.total_fee)}</AppText>
            <AppText style={styles.paidAmount} weight="semibold">Paid: {formatAmount(item.paid_amount)}</AppText>
            <AppText style={styles.dueAmount} weight="bold">Due: {formatAmount(item.due_amount)}</AppText>
          </View>
          <View style={styles.feeMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
                {getStatusText(item.status)}
              </AppText>
            </View>
            <AppText style={styles.dueDate} weight="semibold">Due: {formatDate(item.due_date)}</AppText>
          </View>
        </View>
        {item.status !== 'paid' && (
          <View style={styles.paymentButtonContainer}>
            <TouchableOpacity accessibilityRole="button"
              style={styles.paymentButton}
              onPress={() => {
                setSelectedFee(item);
                setPaymentAmount('');
                setShowPaymentModal(true);
              }}
            >
              <CreditCard size={16} color={Theme.colors.card} />
              <AppText style={styles.paymentButtonText} weight="bold">Pay</AppText>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
          title="Accounts & Fees"
          subtitle="Manage student dues and payment records"
          backgroundColor={userRole?.toLowerCase() === 'accountant' ? Theme.colors.primary : undefined}
          onBackPress={() => safeGoBack(
            navigation as any,
            userRole?.toLowerCase() === 'accountant' ? 'AccountantDashboard' : 'PrincipalDashboard',
          )}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryLabel} weight="semibold">Total Fees</AppText>
              <AppText style={styles.summaryValue} weight="bold">{formatAmount(getTotalFees())}</AppText>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: C.success }]}>
              <AppText style={styles.summaryLabel} weight="semibold">Collected</AppText>
              <AppText style={[styles.summaryValue, styles.collectedValue]} weight="bold">{formatAmount(getTotalCollected())}</AppText>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: C.error }]}>
              <AppText style={styles.summaryLabel} weight="semibold">Pending</AppText>
              <AppText style={[styles.summaryValue, styles.pendingValue]} weight="bold">{formatAmount(getTotalPending())}</AppText>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <FileText size={20} color={C.text} />
              <AppText style={styles.formTitle} weight="bold">Assign Fee to Student</AppText>
            </View>

            <View style={styles.formGroup}>
              <View>
                <View style={styles.labelRow}>
                  <User size={16} color={C.textMuted} />
                  <AppText style={styles.label} weight="semibold">Student</AppText>
                </View>
                {(() => {
                  const selectedStudent = students.find(s => s.id === formData.student_id);
                  if (selectedStudent) {
                    return (
                      <View style={styles.selectedStudentBadge}>
                        <TouchableOpacity accessibilityRole="button"
                          style={styles.selectedStudentBadgeLeft}
                          onPress={() => {
                            setModalSearchText('');
                            setShowStudentSearchModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <CheckCircle2 size={18} color={C.success} />
                          <AppText style={styles.selectedStudentText} weight="semibold">
                            {getStudentName(selectedStudent)}
                            {selectedStudent.roll_number ? ` (Roll: ${selectedStudent.roll_number})` : ''}
                            {getStudentClass(selectedStudent) && ` (${getStudentClass(selectedStudent)})`}
                          </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button"
                          onPress={() => {
                            handleInputChange('student_id', '');
                          }}
                          style={styles.clearSelectedStudentBtn}
                        >
                          <X size={18} color={C.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity accessibilityRole="button"
                      style={styles.searchTriggerInput}
                      onPress={() => {
                        setModalSearchText('');
                        setShowStudentSearchModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <AppText style={styles.searchTriggerText}>
                        Search student by name, class, or roll number...
                      </AppText>
                      <Search size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  );
                })()}
              </View>

              <View>
                <AppText style={styles.label} weight="semibold">Total Fee (₹)</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={formData.total_fee}
                  onChangeText={(text) => handleInputChange('total_fee', text)}
                />
              </View>

              <View>
                <AppText style={styles.label} weight="semibold">Due Date</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <AppText style={styles.dateText}>{formData.due_date || 'Select Date'}</AppText>
                  <Calendar size={18} color={C.textMuted} />
                </TouchableOpacity>
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
                    <Plus size={16} color={Theme.colors.card} />
                    <AppText style={styles.submitButtonText} weight="bold">Create Fee</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Fees List Section */}
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <View style={styles.sectionHeaderRow}>
                <LayoutDashboard size={20} color={C.text} />
                <AppText style={styles.listTitle} weight="bold">All Fees</AppText>
              </View>
              <View style={styles.countBadge}>
                <AppText style={styles.feeCount} weight="bold">
                  {(() => {
                    const filteredFees = fees.filter(fee => {
                      const matchesSearch = !feeSearchQuery.trim() ||
                        (fee.student_name || '').toLowerCase().includes(feeSearchQuery.toLowerCase()) ||
                        ((fee as any).roll_number || '').toLowerCase().includes(feeSearchQuery.toLowerCase()) ||
                        ((fee as any).roll_no || '').toLowerCase().includes(feeSearchQuery.toLowerCase());
                      const matchesStatus = feeStatusFilter === 'all' || fee.status === feeStatusFilter;
                      return matchesSearch && matchesStatus;
                    });
                    return filteredFees.length;
                  })()} Records
                </AppText>
              </View>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
              <TextInput
                style={styles.filterSearchInput}
                placeholder="Search by student name or roll no..."
                placeholderTextColor={C.textMuted}
                value={feeSearchQuery}
                onChangeText={setFeeSearchQuery}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.statusFilterScroll, innerPageLayoutStyles.scrollViewFront]}>
                <View style={styles.statusFilterContainer}>
                  {(['all', 'pending', 'partial', 'paid'] as const).map((status) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={status}
                      style={[
                        styles.statusFilterOption,
                        feeStatusFilter === status && styles.statusFilterOptionSelected,
                      ]}
                      onPress={() => setFeeStatusFilter(status)}
                    >
                      <AppText
                        style={[
                          styles.statusFilterOptionText,
                          feeStatusFilter === status && styles.statusFilterOptionTextSelected,
                        ]}
                        weight="semibold"
                      >
                        {status.toUpperCase()}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {loading && fees.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.primary} />
                <AppText style={styles.loadingText}>Loading fees...</AppText>
              </View>
            ) : (
              (() => {
                const filteredFees = fees.filter(fee => {
                  const matchesSearch = !feeSearchQuery.trim() ||
                    (fee.student_name || '').toLowerCase().includes(feeSearchQuery.toLowerCase()) ||
                    ((fee as any).roll_number || '').toLowerCase().includes(feeSearchQuery.toLowerCase()) ||
                    ((fee as any).roll_no || '').toLowerCase().includes(feeSearchQuery.toLowerCase());
                  const matchesStatus = feeStatusFilter === 'all' || fee.status === feeStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                if (filteredFees.length > 0) {
                  return (
                    <View style={styles.feesList}>
                      {filteredFees.map((fee, index) => (
                        <React.Fragment key={fee.id || `fee-${index}`}>
                          {renderFeeItem({ item: fee })}
                        </React.Fragment>
                      ))}
                    </View>
                  );
                }

                return (
                  <View style={styles.emptyContainer}>
                    <AppText style={styles.emptyText}>
                      {fees.length === 0 ? 'No fees found.' : 'No matching records found.'}
                    </AppText>
                    <AppText style={styles.emptySubtext}>
                      {fees.length === 0 ? 'Assign fees to students to get started' : 'Try adjusting your search or status filter'}
                    </AppText>
                  </View>
                );
              })()
            )}
          </View>
        </View>
      </ScrollView>


      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.due_date ? new Date(formData.due_date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Record Payment</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowPaymentModal(false)}>
                <X size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedFee && (
              <>
                <View style={styles.modalInfo}>
                  <AppText style={styles.modalLabel} weight="semibold">Student</AppText>
                  <AppText style={styles.modalValue} weight="bold">{selectedFee.student_name || 'N/A'}</AppText>

                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoCol}>
                      <AppText style={styles.modalLabel} weight="semibold">Total Fee</AppText>
                      <AppText style={styles.modalValue} weight="semibold">{formatAmount(selectedFee.total_fee)}</AppText>
                    </View>
                    <View style={styles.modalInfoCol}>
                      <AppText style={styles.modalLabel} weight="semibold">Amount Paid</AppText>
                      <AppText style={[styles.modalValue, { color: C.success }]} weight="semibold">{formatAmount(selectedFee.paid_amount)}</AppText>
                    </View>
                    <View style={styles.modalInfoCol}>
                      <AppText style={styles.modalLabel} weight="semibold">Due Amount</AppText>
                      <AppText style={[styles.modalValue, styles.dueAmountValue]} weight="bold">{formatAmount(selectedFee.due_amount)}</AppText>
                    </View>
                  </View>
                </View>

                {/* Payment History Section in Modal */}
                <View style={styles.historySection}>
                  <AppText style={styles.historyTitle} weight="bold">Payment History</AppText>
                  {loadingHistory ? (
                    <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 10 }} />
                  ) : paymentHistory.length > 0 ? (
                    <View style={styles.historyList}>
                      {paymentHistory.map((payment, idx) => (
                        <TouchableOpacity accessibilityRole="button"
                          key={payment.id || idx}
                          style={styles.historyItem}
                          onPress={() => {
                            setSelectedPayment(payment);
                            setShowDetailModal(true);
                          }}
                        >
                          <View>
                            <AppText style={styles.historyAmount} weight="bold">{formatAmount(payment.amount)}</AppText>
                            <AppText style={styles.historyDate}>{formatDate(payment.paid_at || payment.created_at || '')}</AppText>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.historyMethodBadge}>
                              <AppText style={styles.historyMethodText} weight="bold">{payment.method.toUpperCase()}</AppText>
                            </View>
                            <ChevronLeft size={16} color={C.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <AppText style={styles.noHistoryText}>No payments recorded yet</AppText>
                  )}
                </View>

                {selectedFee.status !== 'paid' && (
                  <View style={styles.modalForm}>
                    <AppText style={styles.label} weight="semibold">New Payment (₹)</AppText>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter amount"
                      placeholderTextColor={C.textMuted}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                    />
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <AppText style={styles.cancelButtonText} weight="semibold">Close</AppText>
                  </TouchableOpacity>
                  {selectedFee.status !== 'paid' && (
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.modalButton, styles.payButton]}
                      onPress={handlePayment}
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <ActivityIndicator size="small" color={Theme.colors.card} />
                      ) : (
                        <AppText style={styles.payButtonText} weight="bold">Pay Now</AppText>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* Payment Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 450 }]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Receipt Details</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowDetailModal(false)}>
                <X size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView style={{ maxHeight: 500 }}>
                <View style={{ alignItems: 'center', marginBottom: Theme.spacing.lg, paddingVertical: 10 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.md }}>
                    <CheckCircle2 size={32} color={C.success} />
                  </View>
                  <AppText style={{ fontSize: 28, color: C.text }} weight="bold">{formatAmount(selectedPayment.amount)}</AppText>
                  <AppText style={{ ...Theme.typography.body, color: C.success }} weight="semibold">Payment Successful</AppText>
                </View>

                <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: Theme.spacing.md, gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText style={{ fontSize: 13, color: C.textMuted }}>Receipt No</AppText>
                    <AppText style={{ fontSize: 13, color: C.text }} weight="bold">
                      {selectedPayment.receipt_no || 'REC-' + selectedPayment.id.substring(0, 8).toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText style={{ fontSize: 13, color: C.textMuted }}>Transaction ID</AppText>
                    <AppText style={{ fontSize: 13, color: C.text }} weight="bold">
                      {selectedPayment.transaction_id || 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText style={{ fontSize: 13, color: C.textMuted }}>Date & Time</AppText>
                    <AppText style={{ fontSize: 13, color: C.text }} weight="bold">
                      {new Date(selectedPayment.paid_at || selectedPayment.created_at || '').toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText style={{ fontSize: 13, color: C.textMuted }}>Method</AppText>
                    <AppText style={{ fontSize: 13, color: C.text }} weight="bold">{selectedPayment.method.toUpperCase()}</AppText>
                  </View>
                </View>

                <TouchableOpacity accessibilityRole="button"
                  style={[styles.submitButton, { marginTop: Theme.spacing.lg, backgroundColor: C.bg, borderWidth: 1, borderColor: C.primary }]}
                  onPress={() => handleDownloadReceipt(selectedPayment.id, selectedPayment.receipt_no || '')}
                  disabled={!!downloading}
                >
                  {downloading === selectedPayment.id ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <FileText size={18} color={C.primary} />
                  )}
                  <AppText style={{ color: C.primary }} weight="bold">
                    {downloading === selectedPayment.id ? 'Downloading...' : 'Download Receipt'}
                  </AppText>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity accessibilityRole="button"
              style={[styles.modalButton, styles.cancelButton, { marginTop: Theme.spacing.md }]}
              onPress={() => setShowDetailModal(false)}
            >
              <AppText style={styles.cancelButtonText} weight="semibold">Back</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Student Search Modal */}
      <Modal
        visible={showStudentSearchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStudentSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', padding: 20 }]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Select Student</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowStudentSearchModal(false)}>
                <X size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Type name, class, or roll number..."
                placeholderTextColor={C.textMuted}
                value={modalSearchText}
                onChangeText={setModalSearchText}
                autoFocus={true}
              />
            </View>

            <ScrollView style={[styles.modalStudentList, innerPageLayoutStyles.scrollViewFront]} keyboardShouldPersistTaps="always">
              {(() => {
                const search = modalSearchText.trim().toLowerCase();
                const filtered = students.filter(student => {
                  const name = getStudentName(student).toLowerCase();
                  const cls = getStudentClass(student).toLowerCase();
                  const id = (student.id || '').toLowerCase();
                  const roll = (student.roll_number || '').toLowerCase();
                  return name.includes(search) || cls.includes(search) || id.includes(search) || roll.includes(search);
                });

                if (filtered.length === 0) {
                  return (
                    <View style={styles.noSuggestionItem}>
                      <AppText style={styles.noSuggestionText}>No students match "{modalSearchText}"</AppText>
                    </View>
                  );
                }

                return filtered.map((student, index) => (
                  <TouchableOpacity accessibilityRole="button"
                    key={student.id || `search-student-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => {
                      handleInputChange('student_id', student.id);
                      setShowStudentSearchModal(false);
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: Theme.spacing.sm }}>
                        <AppText style={styles.suggestionItemText} weight="semibold">
                          {getStudentName(student)}
                        </AppText>
                        {Boolean(student.roll_number) && (
                          <AppText style={styles.suggestionItemSubtext}>
                            Roll No: {student.roll_number}
                          </AppText>
                        )}
                      </View>
                      {getStudentClass(student) ? (
                        <AppText style={styles.suggestionItemSubtext}>
                          {getStudentClass(student)}
                        </AppText>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
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
  contentOverlap: {
    flex: 1,
        backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    color: C.text,
    marginBottom: Theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  formGroup: {
    gap: 16,
  },
  label: {
    color: C.text,
    ...Theme.typography.body,
  },
  selectedStudentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: Theme.spacing.xs,
  },
  selectedStudentBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedStudentText: {
    color: C.success,
    ...Theme.typography.body,
    flexShrink: 1,
  },
  clearSelectedStudentBtn: {
    padding: Theme.spacing.xs,
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
    marginTop: Theme.spacing.xs,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionItemText: {
    ...Theme.typography.body,
    color: C.text,
  },
  suggestionItemSubtext: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },
  noSuggestionItem: {
    padding: 12,
    alignItems: 'center',
  },
  noSuggestionText: {
    ...Theme.typography.caption,
    color: C.textMuted,
    fontStyle: 'italic',
  },
  filterSection: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  filterSearchInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    ...Theme.typography.body,
    backgroundColor: C.bg,
    color: C.text,
  },
  statusFilterScroll: {
    marginTop: Theme.spacing.xs,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  statusFilterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  statusFilterOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  statusFilterOptionText: {
    ...Theme.typography.label,
    color: C.textMuted,
  },
  statusFilterOptionTextSelected: {
    color: Theme.colors.card,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    ...Theme.typography.body,
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
    ...Theme.typography.body,
    color: C.text,
  },
  submitButton: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: Theme.spacing.sm,
  },
  submitButtonText: {
    color: Theme.colors.card,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: Theme.spacing.md,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  summaryValue: {
    fontSize: 16,
    color: C.text,
  },
  collectedValue: {
    color: C.success,
  },
  pendingValue: {
    color: C.error,
  },
  listSection: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  listTitle: {
    fontSize: 18,
    color: C.text,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
  },
  countBadge: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  feeCount: {
    ...Theme.typography.caption,
    color: C.primary,
  },
  feesList: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  feeInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  feeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Theme.spacing.sm,
  },
  feeAmount: {
    fontSize: 13,
    color: C.text,
  },
  paidAmount: {
    fontSize: 13,
    color: C.success,
  },
  dueAmount: {
    fontSize: 13,
    color: C.error,
  },
  feeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...Theme.typography.label,
  },
  dueDate: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },
  paymentButtonContainer: {
    justifyContent: 'center',
  },
  paymentButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentButtonText: {
    color: Theme.colors.card,
    fontSize: 13,
  },
  loadingContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyText: {
    fontSize: 16,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  emptySubtext: {
    ...Theme.typography.body,
    color: C.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: C.text,
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalLabel: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  modalValue: {
    fontSize: 16,
    color: C.text,
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalInfoCol: {
    flex: 1,
  },
  dueAmountValue: {
    color: C.error,
  },
  historySection: {
    marginVertical: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  historyTitle: {
    ...Theme.typography.body,
    color: C.text,
    marginBottom: 10,
  },
  historyList: {
    maxHeight: 150,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
  },
  historyAmount: {
    ...Theme.typography.body,
    color: C.text,
  },
  historyDate: {
    ...Theme.typography.label,
    color: C.textMuted,
  },
  historyMethodBadge: {
    backgroundColor: C.bg,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 4,
  },
  historyMethodText: {
    fontSize: 10,
    color: C.primary,
  },
  noHistoryText: {
    ...Theme.typography.caption,
    color: C.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  modalForm: {
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelButtonText: {
    color: C.textMuted,
  },
  payButton: {
    backgroundColor: C.primary,
  },
  payButtonText: {
    color: Theme.colors.card,
  },
  searchTriggerInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xs,
  },
  searchTriggerText: {
    ...Theme.typography.body,
    color: C.textMuted,
    flex: 1,
  },
  modalSearchContainer: {
    marginBottom: Theme.spacing.md,
  },
  modalSearchInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    ...Theme.typography.body,
    backgroundColor: C.bg,
    color: C.text,
  },
  modalStudentList: {
    maxHeight: 350,
  },
});

export default FeeManagement;
