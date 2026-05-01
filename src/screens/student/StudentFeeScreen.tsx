import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { getStudentFee, getPaymentHistory, downloadReceipt } from '../../services/studentService';
import colors from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';

const { width } = Dimensions.get('window');

// Types
interface Fee {
  id: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  due_date: string;
  fee_type?: string;
  description?: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
  receipt_no?: string;
  transaction_id?: string;
}

// Summary Card Component
const SummaryCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  backgroundColor: string;
}> = ({ icon, label, value, backgroundColor }) => (
  <View style={[styles.summaryCard, { backgroundColor }]}>
    <View style={styles.summaryIconContainer}>
      <Icon name={icon as any} size={24} color="#fff" />
    </View>
    <View style={styles.summaryContent}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
    </View>
  </View>
);

export default function StudentFeeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const lastScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const sid = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');
        const code = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');

        if (sid) setStudentId(sid);
        if (code) setSchoolCode(code);

        // Load cached data
        if (sid) {
           const cachedFees = await AsyncStorage.getItem(`fees_cache_${sid}`);
           if (cachedFees) setFees(JSON.parse(cachedFees));

           const cachedPayments = await AsyncStorage.getItem(`payments_cache_${sid}`);
           if (cachedPayments) setPayments(JSON.parse(cachedPayments));
        }

        if (sid) {
          await fetchFeeInfo(sid, !fees.length);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const fetchFeeInfo = async (sid: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const feeData = await getStudentFee();
      // Format the data to match the expected local 'fees' array structure
      const formattedFees: Fee[] = [{
        id: 'summary',
        total_fee: feeData.totalFee,
        paid_amount: feeData.paidFee,
        due_amount: feeData.pendingFee,
        status: feeData.pendingFee <= 0 ? 'paid' : 'partial',
        due_date: 'N/A'
      }];

      setFees(formattedFees);
      await AsyncStorage.setItem(`fees_cache_${sid}`, JSON.stringify(formattedFees));

      // Fetch payment history
      const historyData = await getPaymentHistory();
      setPayments(Array.isArray(historyData) ? historyData : []);
      await AsyncStorage.setItem(`payments_cache_${sid}`, JSON.stringify(historyData));

    } catch (error) {
      console.error('Error fetching fee info:', error);
      // Fallback to empty states on 404/Error
      setFees([]);
      setPayments([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (studentId) {
      await fetchFeeInfo(studentId, false);
    }
    setRefreshing(false);
  }, [studentId]);

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

  const totalFee = fees.reduce((sum, f) => sum + f.total_fee, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paid_amount, 0);
  const totalDue = fees.reduce((sum, f) => sum + f.due_amount, 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderOverview = () => {
    const mainFee = fees[0] || { status: 'PARTIAL', due_date: '23-04-2026' };
    return (
      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Icon name="file-text" size={18} color="#1E293B" />
          <AppText style={styles.detailsTitle}>FEE DETAILS</AppText>
        </View>

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Total Fee</AppText>
          <AppText style={styles.detailValue}>{formatCurrency(totalFee)}</AppText>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Paid Amount</AppText>
          <AppText style={[styles.detailValue, { color: '#22c55e' }]}>{formatCurrency(totalPaid)}</AppText>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Due Amount</AppText>
          <AppText style={[styles.detailValue, { color: '#ef4444' }]}>{formatCurrency(totalDue)}</AppText>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Status</AppText>
          <View style={styles.statusBadge}>
            <AppText style={styles.statusText}>{mainFee.status?.toUpperCase() || 'PARTIAL'}</AppText>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Due Date</AppText>
          <View style={styles.dueDateContainer}>
            <Icon name="calendar" size={16} color="#94A3B8" />
            <AppText style={styles.dueDateValue}>{mainFee.due_date || '23-04-2026'}</AppText>
          </View>
        </View>
      </View>
    );
  };

  const renderHistory = () => (
    <View style={styles.historySection}>
      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderLeft}>
          <Icon name="rotate-ccw" size={18} color="#1E293B" />
          <AppText style={styles.detailsTitle}>Payment History</AppText>
        </View>
        <TouchableOpacity>
          <AppText style={styles.viewAllText}>View All</AppText>
        </TouchableOpacity>
      </View>

      {payments.length === 0 ? (
        <View style={styles.emptyHistory}>
          <AppText style={styles.emptyHistoryText}>No payment history found</AppText>
        </View>
      ) : (
        payments.map((item, index) => (
          <TouchableOpacity
            key={item.id || index}
            style={styles.historyItem}
            onPress={() => {
              setSelectedPayment(item);
              setShowDetailModal(true);
            }}
          >
            <View style={styles.historyIconContainer}>
              <Icon name="database" size={20} color="#22c55e" />
            </View>
            <View style={styles.historyInfo}>
              <AppText style={styles.historyAmount}>{formatCurrency(item.amount)}</AppText>
              <AppText style={styles.historyMethod}>{item.method || 'CASH'}</AppText>
            </View>
            <View style={styles.historyRight}>
              <AppText style={styles.historyDate}>
                {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
              </AppText>
              <Icon name="chevron-right" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))
      )}

      {payments.length > 0 && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownloadReceipt(payments[0].id, payments[0].receipt_no || '')}
          disabled={!!downloading}
        >
          {downloading === payments[0].id ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Icon name="download" size={18} color="#3b82f6" />
          )}
          <AppText style={styles.downloadButtonText}>
            {downloading === payments[0].id ? 'Downloading...' : 'Download Latest Receipt'}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Fee & Payments</AppText>
        <TouchableOpacity
          style={styles.notificationIcon}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Ledger Info Card */}
        <View style={styles.ledgerCard}>
          <AppText style={styles.ledgerTitle}>MY FEE LEDGER</AppText>
          <View style={styles.ledgerRow}>
            <AppText style={styles.ledgerLabel}>Total Records</AppText>
            <AppText style={styles.ledgerValue}>: {fees.length.toString().padStart(2, '0')}</AppText>
          </View>
          <View style={styles.ledgerRow}>
            <AppText style={styles.ledgerLabel}>School</AppText>
            <AppText style={styles.ledgerValue}>: {schoolCode || 'SCH41452'}</AppText>
          </View>
          <View style={styles.ledgerRow}>
            <AppText style={styles.ledgerLabel}>Student ID</AppText>
            <AppText style={styles.ledgerValue}>: {studentId || 'STUDENT_ID_100'}</AppText>
          </View>
        </View>

        {/* Summary Cards */}
        <SummaryCard
          icon="credit-card"
          label="Total Fee"
          value={formatCurrency(totalFee)}
          backgroundColor="#3b82f6"
        />
        <SummaryCard
          icon="check-circle"
          label="Amount Paid"
          value={formatCurrency(totalPaid)}
          backgroundColor="#10b981"
        />
        <SummaryCard
          icon="clock"
          label="Amount Due"
          value={formatCurrency(totalDue)}
          backgroundColor="#ef4444"
        />

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <AppText style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <AppText style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</AppText>
          </TouchableOpacity>
        </View>

        {/* Dynamic Content */}
        {activeTab === 'overview' ? renderOverview() : renderHistory()}
      </ScrollView>

      {/* Payment Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Payment Details</AppText>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.receiptContainer}>
                  <Icon name="check-circle" size={48} color="#10b981" />
                  <AppText style={styles.receiptAmount}>{formatCurrency(selectedPayment.amount)}</AppText>
                  <AppText style={styles.receiptStatus}>Payment Successful</AppText>
                </View>

                <View style={styles.detailList}>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Receipt No</AppText>
                    <AppText style={styles.modalDetailValue}>{selectedPayment.receipt_no || 'REC-' + selectedPayment.id.slice(-6).toUpperCase()}</AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Transaction ID</AppText>
                    <AppText style={styles.modalDetailValue}>{selectedPayment.transaction_id || 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase()}</AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Payment Date</AppText>
                    <AppText style={styles.modalDetailValue}>
                      {new Date(selectedPayment.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Payment Method</AppText>
                    <AppText style={styles.modalDetailValue}>{selectedPayment.method || 'CASH'}</AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Status</AppText>
                    <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                      <AppText style={[styles.statusText, { color: '#15803d' }]}>SUCCESS</AppText>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.downloadButton, { marginTop: 20 }]}
                  onPress={() => handleDownloadReceipt(selectedPayment.id, selectedPayment.receipt_no || '')}
                  disabled={!!downloading}
                >
                  {downloading === selectedPayment.id ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Icon name="download" size={18} color="#3b82f6" />
                  )}
                  <AppText style={styles.downloadButtonText}>
                    {downloading === selectedPayment.id ? 'Downloading...' : 'Download Receipt PDF'}
                  </AppText>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  ledgerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...Platform.select({

      android: { elevation: 3 },

      ios: {},

    }),
    marginTop: 10,
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  ledgerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  ledgerLabel: {
    fontSize: 12,
    color: '#64748B',
    width: 100,
  },
  ledgerValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    marginBottom: 20,
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...Platform.select({

      android: { elevation: 3 },

      ios: {},

    }),
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803d',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDateValue: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  historySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...Platform.select({

      android: { elevation: 3 },

      ios: {},

    }),
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  historyMethod: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#64748B',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyHistory: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  receiptContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  receiptStatus: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 5,
  },
  detailList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
});
