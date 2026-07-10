import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions, Platform, NativeSyntheticEvent, NativeScrollEvent, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Buffer } from 'buffer';
import Icon from 'react-native-vector-icons/Feather';
import { getStudentFee, getPaymentHistory } from '../../services/studentService';
import { downloadReceipt } from '../../services/accountantService';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { RefreshCw } from 'lucide-react-native';
import { studentFeeStyles as styles } from '../../components/student/studentFee/studentFeeStyles';

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

const getFeeCacheKey = (studentId: string, schoolCode?: string) => {
  if (!studentId) {return null;}
  return schoolCode ? `fees_cache_${schoolCode}_${studentId}` : `fees_cache_${studentId}`;
};

const getPaymentCacheKey = (studentId: string, schoolCode?: string) => {
  if (!studentId) {return null;}
  return schoolCode ? `payments_cache_${schoolCode}_${studentId}` : `payments_cache_${studentId}`;
};

// Summary Card Component
const SummaryCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  backgroundColor: string;
}> = ({ icon, label, value, backgroundColor }) => (
  <View style={[styles.summaryCard, { backgroundColor }]}>
    <View style={styles.summaryIconContainer}>
      <Icon name={icon as any} size={24} color={C.colors.card} />
    </View>
    <View style={styles.summaryContent}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
    </View>
  </View>
);

export default function StudentFeeScreen({ navigation }: any) {
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
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    const loadUserData = async () => {
      try {
        const sid = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');
        const code = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');

        if (sid) {setStudentId(sid);}
        if (code) {setSchoolCode(code);}

        // Load cached data
        if (sid) {
          const feeCacheKey = getFeeCacheKey(sid, code || undefined);
          const paymentCacheKey = getPaymentCacheKey(sid, code || undefined);

          const cachedFees = (feeCacheKey ? await AsyncStorage.getItem(feeCacheKey) : null)
            || await AsyncStorage.getItem(`fees_cache_${sid}`);
          if (cachedFees) {setFees(JSON.parse(cachedFees));}

          const cachedPayments = (paymentCacheKey ? await AsyncStorage.getItem(paymentCacheKey) : null)
            || await AsyncStorage.getItem(`payments_cache_${sid}`);
          if (cachedPayments) {setPayments(JSON.parse(cachedPayments));}
        }

        if (sid) {
          await fetchFeeInfo(sid, code || undefined, !fees.length);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const fetchFeeInfo = async (sid: string, code?: string, showLoading = true) => {
    const feeCacheKey = getFeeCacheKey(sid, code);
    const paymentCacheKey = getPaymentCacheKey(sid, code);

    try {
      if (showLoading) {setLoading(true);}

      const feeData = await getStudentFee();
      const formattedFees: Fee[] = [{
        id: 'summary',
        total_fee: feeData.totalFee,
        paid_amount: feeData.paidFee,
        due_amount: feeData.pendingFee,
        status: feeData.pendingFee <= 0 ? 'paid' : 'partial',
        due_date: (feeData as any).due_date || 'N/A',
      }];

      setFees(formattedFees);
      if (feeCacheKey) {
        await AsyncStorage.setItem(feeCacheKey, JSON.stringify(formattedFees));
      }
    } catch (error) {
      console.error('Error fetching fee summary:', error);
    }

    try {
      const historyData = await getPaymentHistory();
      const normalizedHistory = Array.isArray(historyData) ? historyData : [];
      setPayments(normalizedHistory);
      if (paymentCacheKey) {
        await AsyncStorage.setItem(paymentCacheKey, JSON.stringify(normalizedHistory));
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      if (showLoading) {setLoading(false);}
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (studentId) {
      await fetchFeeInfo(studentId, schoolCode, false);
    }
    setRefreshing(false);
  }, [schoolCode, studentId]);

  const handleDownloadReceipt = async (paymentId: string, receiptNo: string) => {
    try {
      setDownloading(paymentId);
      const data = await downloadReceipt(paymentId);

      const fileName = `Receipt_${receiptNo || paymentId}.pdf`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // Ensure robust conversion from ArrayBuffer to base64
      let base64Data: string;
      try {
        if (data instanceof ArrayBuffer) {
          base64Data = Buffer.from(new Uint8Array(data)).toString('base64');
        } else {
          base64Data = Buffer.from(data).toString('base64');
        }
      } catch (convErr) {
        // Fallback: attempt generic Buffer conversion
        base64Data = Buffer.from(data as any).toString('base64');
      }

      await RNFS.writeFile(filePath, base64Data, 'base64');
      const exists = await RNFS.exists(filePath);
      if (!exists) {throw new Error('Written file not found');}

      try {
        const finalUrl = Platform.OS === 'android'
          ? `content://com.visys.attendx.fileprovider/internal_files/${fileName}`
          : `file://${filePath}`;

        const shareOptions = {
          url: finalUrl,
          type: 'application/pdf',
          title: 'Payment Receipt',
        };

        await Share.open(shareOptions);
      } catch (shareErr: any) {
        const m = String(shareErr?.message || '').toLowerCase();
        if (m.includes('user did not share') || m.includes('cancel')) {
          // user cancelled share - silently ignore
        } else {
          throw shareErr;
        }
      }
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
    const mainFee = fees[0] || { status: 'PARTIAL', due_date: 'N/A' };
    return (
      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Icon name="file-text" size={18} color={C.colors.primary} />
          <AppText style={styles.detailsTitle}>FEE DETAILS</AppText>
        </View>

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Total Fee</AppText>
          <AppText style={styles.detailValue}>{formatCurrency(totalFee)}</AppText>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Paid Amount</AppText>
          <AppText style={[styles.detailValue, { color: C.colors.success }]}>{formatCurrency(totalPaid)}</AppText>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Due Amount</AppText>
          <AppText style={[styles.detailValue, { color: C.colors.error }]}>{formatCurrency(totalDue)}</AppText>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Status</AppText>
          <View style={[styles.statusBadge, { backgroundColor: totalDue <= 0 ? C.colors.successBg : C.colors.warningBg }]}>
            <AppText style={[styles.statusText, { color: totalDue <= 0 ? C.colors.success : C.colors.warning }]}>
              {totalDue <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID')}
            </AppText>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Due Date</AppText>
          <View style={styles.dueDateContainer}>
            <Icon name="calendar" size={16} color={C.colors.textMuted} />
            <AppText style={styles.dueDateValue}>{mainFee.due_date || 'N/A'}</AppText>
          </View>
        </View>
      </View>
    );
  };

  const renderHistory = () => (
    <View style={styles.historySection}>
      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderLeft}>
          <Icon name="rotate-ccw" size={18} color={C.colors.primary} />
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
              <Icon name="database" size={20} color={C.colors.success} />
            </View>
            <View style={styles.historyInfo}>
              <AppText style={styles.historyAmount}>{formatCurrency(item.amount)}</AppText>
              <AppText style={styles.historyMethod}>{item.method || 'CASH'}</AppText>
            </View>
            <View style={styles.historyRight}>
              <AppText style={styles.historyDate}>
                {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
              </AppText>
              <Icon name="chevron-right" size={18} color={C.colors.textMuted} />
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
            <ActivityIndicator size="small" color={C.colors.blue} />
          ) : (
            <Icon name="download" size={18} color={C.colors.blue} />
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
        <ScreenSkeleton variant="list" />
      </View>
    );
  }

  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Fee & Payments"
        subtitle={`${fees.length} fee record${fees.length === 1 ? '' : 's'}`}
        onBackPress={() => (canGoBack ? navigation.goBack() : navigation.navigate('MainTabs'))}
        showBack={canGoBack}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Refresh fees"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />
        <View style={styles.pageBody}>
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
          backgroundColor={C.colors.blue}
        />
        <SummaryCard
          icon="check-circle"
          label="Amount Paid"
          value={formatCurrency(totalPaid)}
          backgroundColor={C.colors.success}
        />
        <SummaryCard
          icon="clock"
          label="Amount Due"
          value={formatCurrency(totalDue)}
          backgroundColor={C.colors.error}
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
        </View>
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
                <Icon name="x" size={24} color={C.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.receiptContainer}>
                  <Icon name="check-circle" size={48} color={C.colors.success} />
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
                        minute: '2-digit',
                      })}
                    </AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Payment Method</AppText>
                    <AppText style={styles.modalDetailValue}>{selectedPayment.method || 'CASH'}</AppText>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <AppText style={styles.modalDetailLabel}>Status</AppText>
                    <View style={[styles.statusBadge, { backgroundColor: C.colors.successBg }]}>
                      <AppText style={[styles.statusText, { color: C.colors.success }]}>SUCCESS</AppText>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.downloadButton, { marginTop: Theme.spacing.xl }]}
                  onPress={() => handleDownloadReceipt(selectedPayment.id, selectedPayment.receipt_no || '')}
                  disabled={!!downloading}
                >
                  {downloading === selectedPayment.id ? (
                    <ActivityIndicator size="small" color={C.colors.blue} />
                  ) : (
                    <Icon name="download" size={18} color={C.colors.blue} />
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
