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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

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
    loadSchoolCode();
  }, []);

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
      setSchoolCode(code);
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchStudentsAndFees = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch students
      const studentResponse = await API.get("/manage/students", {
        params: { school_code: schoolCode },
      });
      setStudents(studentResponse.data || []);

      // Fetch fees
      const feesResponse = await API.get("/accountant/fees", {
        params: { school_code: schoolCode },
      });
      setFees(feesResponse.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to fetch data";
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
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
      await API.post("/accountant/fees/create", formData, {
        params: { school_code: schoolCode },
      });
      
      Alert.alert('Success', 'Fee created successfully');
      setFormData({ student_id: "", total_fee: "", due_date: "" });
      await fetchStudentsAndFees();
    } catch (error: any) {
      console.error("Error creating fee:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Error creating fee";
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
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
      await API.post(`/accountant/fees/${selectedFee.id}/pay`, 
        { amount: parseFloat(paymentAmount) },
        { params: { school_code: schoolCode } }
      );
      
      Alert.alert('Success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedFee(null);
      await fetchStudentsAndFees();
    } catch (error: any) {
      console.error("Error processing payment:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Error processing payment";
      Alert.alert('Error', errorMsg);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return { backgroundColor: '#d1fae5', color: '#065f46' };
      case 'partial':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      default:
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
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
          <Text style={styles.studentName}>{item.student_name || 'N/A'}</Text>
          <View style={styles.feeDetails}>
            <Text style={styles.feeAmount}>Total: {formatAmount(item.total_fee)}</Text>
            <Text style={styles.paidAmount}>Paid: {formatAmount(item.paid_amount)}</Text>
            <Text style={styles.dueAmount}>Due: {formatAmount(item.due_amount)}</Text>
          </View>
          <View style={styles.feeMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
            <Text style={styles.dueDate}>Due: {formatDate(item.due_date)}</Text>
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
              <Icon name="credit-card" size={16} color="#fff" />
              <Text style={styles.paymentButtonText}>Pay</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>📋 Assign Fee to Student</Text>
          
          <View style={styles.formGroup}>
            <View>
              <Text style={styles.label}>Student</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentScroll}>
                <View style={styles.studentContainer}>
                  <TouchableOpacity
                    style={[styles.studentOption, !formData.student_id && styles.studentOptionSelected]}
                    onPress={() => handleInputChange('student_id', '')}
                  >
                    <Text style={[styles.studentOptionText, !formData.student_id && styles.studentOptionTextSelected]}>
                      Select Student
                    </Text>
                  </TouchableOpacity>
                  {students.map((student) => (
                    <TouchableOpacity
                      key={student.id}
                      style={[styles.studentOption, formData.student_id === student.id && styles.studentOptionSelected]}
                      onPress={() => handleInputChange('student_id', student.id)}
                    >
                      <Text style={[styles.studentOptionText, formData.student_id === student.id && styles.studentOptionTextSelected]}>
                        {getStudentName(student)}
                        {getStudentClass(student) && ` (${getStudentClass(student)})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text style={styles.label}>Total Fee (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={formData.total_fee}
                onChangeText={(text) => handleInputChange('total_fee', text)}
              />
            </View>

            <View>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formData.due_date || 'Select Date'}</Text>
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
                  <Icon name="plus" size={16} color="#fff" />
                  <Text style={styles.submitButtonText}>Create Fee</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Fees</Text>
            <Text style={styles.summaryValue}>{formatAmount(getTotalFees())}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={[styles.summaryValue, styles.collectedValue]}>{formatAmount(getTotalCollected())}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, styles.pendingValue]}>{formatAmount(getTotalPending())}</Text>
          </View>
        </View>

        {/* Fees List Section */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>📊 All Fees</Text>
            <Text style={styles.feeCount}>{fees.length} Records</Text>
          </View>

          {loading && fees.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading fees...</Text>
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
              <Text style={styles.emptyText}>No fees found.</Text>
              <Text style={styles.emptySubtext}>Assign fees to students to get started</Text>
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
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="x" size={24} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {selectedFee && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Student</Text>
                  <Text style={styles.modalValue}>{selectedFee.student_name || 'N/A'}</Text>
                  
                  <Text style={styles.modalLabel}>Total Fee</Text>
                  <Text style={styles.modalValue}>{formatAmount(selectedFee.total_fee)}</Text>
                  
                  <Text style={styles.modalLabel}>Amount Paid</Text>
                  <Text style={styles.modalValue}>{formatAmount(selectedFee.paid_amount)}</Text>
                  
                  <Text style={styles.modalLabel}>Due Amount</Text>
                  <Text style={[styles.modalValue, styles.dueAmountValue]}>{formatAmount(selectedFee.due_amount)}</Text>
                </View>

                <View style={styles.modalForm}>
                  <Text style={styles.label}>Payment Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
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
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.payButton]}
                    onPress={handlePayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.payButtonText}>Record Payment</Text>
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
    borderLeftColor: '#2563eb',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    marginRight: 8,
    marginBottom: 8,
  },
  studentOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  studentOptionText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  studentOptionTextSelected: {
    color: '#ffffff',
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  dateInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  dateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  submitButton: {
    backgroundColor: '#2563eb',
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
    fontWeight: '600',
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
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8898aa',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  collectedValue: {
    color: '#059669',
  },
  pendingValue: {
    color: '#dc2626',
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
    fontWeight: '700',
    color: '#0d1b2a',
  },
  feeCount: {
    fontSize: 14,
    color: '#8898aa',
  },
  feesList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  feeInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 8,
  },
  feeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  feeAmount: {
    fontSize: 14,
    color: '#4a5568',
  },
  paidAmount: {
    fontSize: 14,
    color: '#059669',
  },
  dueAmount: {
    fontSize: 14,
    color: '#dc2626',
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
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 12,
    color: '#8898aa',
  },
  paymentButtonContainer: {
    justifyContent: 'center',
  },
  paymentButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8898aa',
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
    fontSize: 16,
    color: '#8898aa',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#cbd5e1',
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
    padding: 20,
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
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8898aa',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 12,
  },
  dueAmountValue: {
    color: '#dc2626',
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
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#2563eb',
  },
  payButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default FeeManagement;