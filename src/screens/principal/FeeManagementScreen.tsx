import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';
import {
  addPayment,
  createFee,
  getAllFees,
  getSchoolStudents,
  getPaymentHistoryByFee,
  downloadReceipt,
  PaymentRecord,
} from '../../services/accountantService';
import { useAuth } from '../../context/AuthContext';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import {
  feeManagementStyles as styles,
  FeeSummaryCards,
  FeeAssignForm,
  FeeListSection,
  PaymentModal,
  PaymentDetailModal,
  StudentSearchModal,
  receiptLabel,
  type Student,
  type Fee,
  type FormData,
} from '../../components/principal/feeManagement';

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
  const [formData, setFormData] = useState<FormData>({ student_id: '', total_fee: '', due_date: '' });
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
  const [downloading, setDownloading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const lastProcessedStudentId = useRef<string | null>(null);

  useEffect(() => {
    const sId = route?.params?.student_id || route?.params?.studentId;
    if (!sId || lastProcessedStudentId.current === sId) { return; }
    if (students.length > 0) {
      const found = students.find(s => s.id === sId);
      if (found) {
        setFormData(prev => ({ ...prev, student_id: sId }));
        lastProcessedStudentId.current = sId;
        navigation?.setParams?.({ student_id: undefined, studentId: undefined });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params, students]);

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

  useEffect(() => {
    if (schoolCode.trim()) { fetchStudentsAndFees(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const handleScroll = useScrollTabBar();

  const loadSchoolCode = async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      if (isMounted.current) { setSchoolCode(code); }
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchStudentsAndFees = async () => {
    if (!schoolCode.trim()) { return; }
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
        Alert.alert('Error', error?.response?.data?.message || error?.message || 'Failed to fetch data');
      }
    } finally {
      if (isMounted.current) { setLoading(false); }
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

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, due_date: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.student_id) { Alert.alert('Validation Error', 'Please select a student'); return; }
    if (!formData.total_fee || parseFloat(formData.total_fee) <= 0) {
      Alert.alert('Validation Error', 'Valid total fee amount is required');
      return;
    }
    if (!formData.due_date) { Alert.alert('Validation Error', 'Due date is required'); return; }
    if (!schoolCode) { Alert.alert('Error', 'School code not found. Please login again.'); return; }

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
        Alert.alert('Error', error?.response?.data?.message || error?.message || 'Error creating fee');
      }
    } finally {
      if (isMounted.current) { setLoading(false); }
    }
  };

  const openFeePayment = async (fee: Fee) => {
    setSelectedFee(fee);
    setPaymentAmount('');
    setShowPaymentModal(true);
    try {
      setLoadingHistory(true);
      const history = await getPaymentHistoryByFee(fee.id);
      if (isMounted.current) { setPaymentHistory(history as PaymentRecord[]); }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      if (isMounted.current) { setLoadingHistory(false); }
    }
  };

  const handlePayment = async () => {
    if (!selectedFee) { return; }
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
      await addPayment({ fee_id: selectedFee.id, amount: parseFloat(paymentAmount), method: 'cash' }, schoolCode);
      if (isMounted.current) {
        Alert.alert('Success', 'Payment recorded successfully');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedFee(null);
        await fetchStudentsAndFees();
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        Alert.alert('Error', error?.response?.data?.message || error?.message || 'Error processing payment');
      }
    } finally {
      if (isMounted.current) { setProcessingPayment(false); }
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedPayment) { return; }
    try {
      setDownloading(true);
      const data = await downloadReceipt(selectedPayment.id);
      const fileName = `Receipt_${receiptLabel(selectedPayment)}.pdf`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, Buffer.from(data).toString('base64'), 'base64');
      await Share.open({ url: `file://${filePath}`, type: 'application/pdf', title: 'Payment Receipt' });
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download receipt. Please try again later.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="Accounts & Fees"
          subtitle="Manage student dues and payment records"
          backgroundColor={userRole?.toLowerCase() === 'accountant' ? Theme.colors.primary : undefined}
          onBackPress={() => safeGoBack(
            navigation,
            userRole?.toLowerCase() === 'accountant' ? 'AccountantDashboard' : 'PrincipalDashboard',
          )}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          <FeeSummaryCards fees={fees} />

          <FeeAssignForm
            formData={formData}
            students={students}
            loading={loading}
            showDatePicker={showDatePicker}
            onInputChange={handleInputChange}
            onOpenStudentSearch={() => { setModalSearchText(''); setShowStudentSearchModal(true); }}
            onClearStudent={() => handleInputChange('student_id', '')}
            onShowDatePicker={setShowDatePicker}
            onDateChange={handleDateChange}
            onSubmit={handleSubmit}
          />

          <FeeListSection
            fees={fees}
            loading={loading}
            feeSearchQuery={feeSearchQuery}
            feeStatusFilter={feeStatusFilter}
            onSearchChange={setFeeSearchQuery}
            onStatusFilterChange={setFeeStatusFilter}
            onFeePress={openFeePayment}
            onPayPress={openFeePayment}
          />
        </View>
      </ScrollView>

      <PaymentModal
        visible={showPaymentModal}
        selectedFee={selectedFee}
        paymentAmount={paymentAmount}
        processingPayment={processingPayment}
        paymentHistory={paymentHistory}
        loadingHistory={loadingHistory}
        onClose={() => setShowPaymentModal(false)}
        onPaymentAmountChange={setPaymentAmount}
        onPay={handlePayment}
        onHistoryItemPress={(payment) => { setSelectedPayment(payment); setShowDetailModal(true); }}
      />

      <PaymentDetailModal
        visible={showDetailModal}
        payment={selectedPayment}
        downloading={downloading}
        onClose={() => setShowDetailModal(false)}
        onDownloadReceipt={handleDownloadReceipt}
      />

      <StudentSearchModal
        visible={showStudentSearchModal}
        students={students}
        searchText={modalSearchText}
        onSearchChange={setModalSearchText}
        onClose={() => setShowStudentSearchModal(false)}
        onSelectStudent={(studentId) => {
          handleInputChange('student_id', studentId);
          setShowStudentSearchModal(false);
        }}
      />
    </View>
  );
};

export default FeeManagement;
