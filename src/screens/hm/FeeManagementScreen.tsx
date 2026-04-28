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
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Plus,
  CreditCard,
  X,
  Calendar,
  IndianRupee,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react-native';
import {
  addPayment,
  createFee,
  getAllFees,
  getSchoolStudents,
} from '../../services/accountantService';
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
  primarySoft: colors.primary + '20',
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
};

interface Student {
  id: string;
  name?: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
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
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const lastScrollY = useRef(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [formData, setFormData] = useState<FormData>({
    student_id: "",
    total_fee: "",
    due_date: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load school code from storage
  useEffect(() => {
    isMounted.current = true;
    loadSchoolCode();
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
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
      fetchStudentsAndFees();
    }
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';
      if (isMounted.current) {
        setSchoolCode(code);
      }
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchStudentsAndFees = async () => {
    if (!schoolCode) {
      return;
    }

    try {
      setLoading(true);

      const [studentRows, feeRows] = await Promise.all([
        getSchoolStudents(),
        getAllFees(),
      ]);

      if (isMounted.current) {
        setStudents(studentRows as Student[]);
        setFees(feeRows as Fee[]);
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error("Error fetching data:", error);
        const errorMsg = error?.response?.data?.message || error?.message || "Failed to fetch data";
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
      });
      
      if (isMounted.current) {
        Alert.alert('Success', 'Fee created successfully');
        setFormData({ student_id: "", total_fee: "", due_date: "" });
        await fetchStudentsAndFees();
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error("Error creating fee:", error);
        const errorMsg = error?.response?.data?.message || error?.message || "Error creating fee";
        Alert.alert('Error', errorMsg);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handlePayment = async () => {
    if (!selectedFee) return;
    
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
      });
      
      if (isMounted.current) {
        Alert.alert('Success', 'Payment recorded successfully');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedFee(null);
        await fetchStudentsAndFees();
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error("Error processing payment:", error);
        const errorMsg = error?.response?.data?.message || error?.message || "Error processing payment";
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
      <TouchableOpacity 
        style={styles.feeRow}
        onPress={() => {
          if (item.status !== 'paid') {
            setSelectedFee(item);
            setPaymentAmount('');
            setShowPaymentModal(true);
          } else {
            Alert.alert('Fee Status', 'This fee has been fully paid');
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.feeInfo}>
          <AppText style={styles.studentName} weight="bold">{item.student_name || 'N/A'}</AppText>
          <View style={styles.feeDetails}>
            <AppText style={styles.feeAmount} weight="semiBold">Total: {formatAmount(item.total_fee)}</AppText>
            <AppText style={styles.paidAmount} weight="semiBold">Paid: {formatAmount(item.paid_amount)}</AppText>
            <AppText style={styles.dueAmount} weight="bold">Due: {formatAmount(item.due_amount)}</AppText>
          </View>
          <View style={styles.feeMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
                {getStatusText(item.status)}
              </AppText>
            </View>
            <AppText style={styles.dueDate} weight="semiBold">Due: {formatDate(item.due_date)}</AppText>
          </View>
        </View>
        {item.status !== 'paid' && (
          <View style={styles.paymentButtonContainer}>
            <TouchableOpacity 
              style={styles.paymentButton}
              onPress={() => {
                setSelectedFee(item);
                setPaymentAmount('');
                setShowPaymentModal(true);
              }}
            >
              <CreditCard size={16} color="#fff" />
              <AppText style={styles.paymentButtonText} weight="bold">Pay</AppText>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Header */}
      <View style={styles.headerStandard}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Fee Management</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
                <AppText style={styles.label} weight="semiBold">Student</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentScroll}>
                <View style={styles.studentContainer}>
                  <TouchableOpacity
                    style={[styles.studentOption, !formData.student_id && styles.studentOptionSelected]}
                    onPress={() => handleInputChange('student_id', '')}
                  >
                    <AppText style={[styles.studentOptionText, !formData.student_id && styles.studentOptionTextSelected]}>
                      Select Student
                    </AppText>
                  </TouchableOpacity>
                  {students.map((student) => (
                    <TouchableOpacity
                      key={student.id}
                      style={[styles.studentOption, formData.student_id === student.id && styles.studentOptionSelected]}
                      onPress={() => handleInputChange('student_id', student.id)}
                    >
                      <AppText style={[styles.studentOptionText, formData.student_id === student.id && styles.studentOptionTextSelected]}>
                        {getStudentName(student)}
                        {getStudentClass(student) && ` (${getStudentClass(student)})`}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <AppText style={styles.label} weight="semiBold">Total Fee (₹)</AppText>
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
              <AppText style={styles.label} weight="semiBold">Due Date</AppText>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <AppText style={styles.dateText}>{formData.due_date || 'Select Date'}</AppText>
                <Calendar size={18} color={C.textMuted} />
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
                <>
                  <Plus size={16} color="#fff" />
                  <AppText style={styles.submitButtonText} weight="bold">Create Fee</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <AppText style={styles.summaryLabel} weight="semiBold">Total Fees</AppText>
            <AppText style={styles.summaryValue} weight="bold">{formatAmount(getTotalFees())}</AppText>
          </View>
          <View style={styles.summaryCard}>
            <AppText style={styles.summaryLabel} weight="semiBold">Collected</AppText>
            <AppText style={[styles.summaryValue, styles.collectedValue]} weight="bold">{formatAmount(getTotalCollected())}</AppText>
          </View>
          <View style={styles.summaryCard}>
            <AppText style={styles.summaryLabel} weight="semiBold">Pending</AppText>
            <AppText style={[styles.summaryValue, styles.pendingValue]} weight="bold">{formatAmount(getTotalPending())}</AppText>
          </View>
        </View>

        {/* Fees List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View style={styles.sectionHeaderRow}>
              <LayoutDashboard size={20} color={C.text} />
              <AppText style={styles.listTitle} weight="bold">All Fees</AppText>
            </View>
            <AppText style={styles.feeCount} weight="semiBold">{fees.length} Records</AppText>
          </View>

          {loading && fees.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.primary} />
              <AppText style={styles.loadingText}>Loading fees...</AppText>
            </View>
          ) : fees.length > 0 ? (
            <View style={styles.feesList}>
              {fees.map((fee) => (
                <React.Fragment key={fee.id}>
                  {renderFeeItem({ item: fee })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <AppText style={styles.emptyText}>No fees found.</AppText>
              <AppText style={styles.emptySubtext}>Assign fees to students to get started</AppText>
            </View>
          )}
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
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedFee && (
              <>
                <View style={styles.modalInfo}>
                  <AppText style={styles.modalLabel} weight="semiBold">Student</AppText>
                  <AppText style={styles.modalValue} weight="bold">{selectedFee.student_name || 'N/A'}</AppText>
                  
                  <AppText style={styles.modalLabel} weight="semiBold">Total Fee</AppText>
                  <AppText style={styles.modalValue} weight="semiBold">{formatAmount(selectedFee.total_fee)}</AppText>
                  
                  <AppText style={styles.modalLabel} weight="semiBold">Amount Paid</AppText>
                  <AppText style={styles.modalValue} weight="semiBold">{formatAmount(selectedFee.paid_amount)}</AppText>
                  
                  <AppText style={styles.modalLabel} weight="semiBold">Due Amount</AppText>
                  <AppText style={[styles.modalValue, styles.dueAmountValue]} weight="bold">{formatAmount(selectedFee.due_amount)}</AppText>
                </View>

                <View style={styles.modalForm}>
                  <AppText style={styles.label} weight="semiBold">Payment Amount (₹)</AppText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <AppText style={styles.cancelButtonText} weight="semiBold">Cancel</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.payButton]}
                    onPress={handlePayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <AppText style={styles.payButtonText} weight="bold">Record Payment</AppText>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  formTitle: {
    fontSize: 18,
    color: C.text,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
    fontSize: 14,
  },
  studentScroll: {
    flexDirection: 'row',
  },
  studentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  studentOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    marginBottom: 8,
  },
  studentOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  studentOptionText: {
    fontSize: 14,
    color: C.text,
  },
  studentOptionTextSelected: {
    color: '#ffffff',
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
  submitButton: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 4,
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
    margin: 16,
    marginTop: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    color: C.text,
  },
  feeCount: {
    fontSize: 14,
    color: C.textMuted,
  },
  feesList: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  feeInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    color: C.text,
    marginBottom: 8,
  },
  feeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
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
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
  },
  dueDate: {
    fontSize: 12,
    color: C.textMuted,
  },
  paymentButtonContainer: {
    justifyContent: 'center',
  },
  paymentButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 13,
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
    color: C.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
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
    padding: 24,
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
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    color: C.text,
    marginBottom: 12,
  },
  dueAmountValue: {
    color: C.error,
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
    color: '#ffffff',
  },
});

export default FeeManagement;