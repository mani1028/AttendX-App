import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';

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

// Enhanced Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'paid') {
      return {
        container: styles.badgePaid,
        text: styles.badgeTextPaid,
        label: 'PAID',
        icon: 'check-circle',
        iconColor: '#22c55e',
      };
    }
    if (lowerStatus === 'partial') {
      return {
        container: styles.badgePartial,
        text: styles.badgeTextPartial,
        label: 'PARTIAL',
        icon: 'alert-triangle',
        iconColor: '#f59e0b',
      };
    }
    return {
      container: styles.badgeUnpaid,
      text: styles.badgeTextUnpaid,
      label: 'UNPAID',
      icon: 'x-circle',
      iconColor: '#ef4444',
    };
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, config.container]}>
      <Icon name={config.icon} size={12} color={config.iconColor} />
      <AppText style={[styles.badgeText, config.text]}>{config.label}</AppText>
    </View>
  );
};

// Enhanced Fee Summary Card
const FeeSummaryCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  trend?: number;
  gradientColors: string[];
}> = ({ icon, label, value, trend, gradientColors }) => (
  <LinearGradient
    colors={gradientColors}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.summaryCard}
  >
    <View style={styles.summaryIconContainer}>
      <AppText style={styles.summaryIcon}>{icon}</AppText>
    </View>
    <View style={styles.summaryContent}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Icon 
            name={trend >= 0 ? "trending-up" : "trending-down"} 
            size={12} 
            color={trend >= 0 ? "#10b981" : "#ef4444"} 
          />
          <AppText style={[styles.trendText, { color: trend >= 0 ? "#10b981" : "#ef4444" }]}>
            {Math.abs(trend)}% from last month
          </AppText>
        </View>
      )}
    </View>
  </LinearGradient>
);

// Payment History Card Component
const PaymentCard: React.FC<{ payment: Payment }> = ({ payment }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const getMethodIcon = (method: string) => {
    switch(method?.toLowerCase()) {
      case 'cash': return 'dollar-sign';
      case 'card': return 'credit-card';
      case 'online': return 'wifi';
      default: return 'smartphone';
    }
  };

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentCardLeft}>
        <View style={styles.paymentIconContainer}>
          <Icon name={getMethodIcon(payment.method)} size={20} color="#3b82f6" />
        </View>
      </View>
      <View style={styles.paymentCardMiddle}>
        <AppText style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</AppText>
        <View style={styles.paymentMethodContainer}>
          <Icon name="credit-card" size={12} color="#64748b" />
          <AppText style={styles.paymentMethod}>{payment.method?.toUpperCase() || 'CASH'}</AppText>
        </View>
      </View>
      <View style={styles.paymentCardRight}>
        <AppText style={styles.paymentDate}>{formatDate(payment.date)}</AppText>
        {payment.receipt_no && (
          <TouchableOpacity style={styles.receiptButton}>
            <Icon name="file-text" size={12} color="#3b82f6" />
            <AppText style={styles.receiptText}>Receipt</AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Fee Item Component
const FeeItem: React.FC<{ fee: Fee }> = ({ fee }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <View style={styles.feeItem}>
      <View style={styles.feeItemHeader}>
        <View style={styles.feeTypeContainer}>
          <Icon name="file-text" size={16} color="#3b82f6" />
          <AppText style={styles.feeType}>{fee.fee_type || 'Tuition Fee'}</AppText>
        </View>
        <StatusBadge status={fee.status} />
      </View>
      
      <View style={styles.feeDetails}>
        <View style={styles.feeDetailItem}>
          <AppText style={styles.feeDetailLabel}>Total Amount</AppText>
          <AppText style={styles.feeDetailValue}>{formatCurrency(fee.total_fee)}</AppText>
        </View>
        <View style={styles.feeDetailItem}>
          <AppText style={styles.feeDetailLabel}>Paid Amount</AppText>
          <AppText style={[styles.feeDetailValue, styles.paidAmount]}>
            {formatCurrency(fee.paid_amount)}
          </AppText>
        </View>
        <View style={styles.feeDetailItem}>
          <AppText style={styles.feeDetailLabel}>Due Amount</AppText>
          <AppText style={[styles.feeDetailValue, styles.dueAmount]}>
            {formatCurrency(fee.due_amount)}
          </AppText>
        </View>
        <View style={styles.feeDetailItem}>
          <AppText style={styles.feeDetailLabel}>Due Date</AppText>
          <View style={styles.dueDateContainer}>
            <Icon name="calendar" size={12} color="#64748b" />
            <AppText style={styles.feeDetailValue}>{fee.due_date || 'Not specified'}</AppText>
          </View>
        </View>
      </View>

      {fee.due_amount > 0 && (
        <TouchableOpacity style={styles.payNowButton}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payNowGradient}
          >
            <Icon name="credit-card" size={16} color="#fff" />
            <AppText style={styles.payNowText}>Pay Now</AppText>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function StudentFeeScreen({ navigation }: any) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'fees' | 'history'>('fees');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');
        const code = await AsyncStorage.getItem('school_code') || 
                     await AsyncStorage.getItem('schoolCode');
        const sid = await AsyncStorage.getItem('student_id');

        if (!token || role !== 'student') {
          console.log('Unauthorized: Redirect to login');
          return;
        }

        if (code) setSchoolCode(code);
        if (sid) setStudentId(sid);

        if (sid && code) {
          await fetchFeeInfo(sid, code);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const fetchFeeInfo = async (sid: string, code: string) => {
    try {
      setLoading(true);
      
      const feesResponse = await API.get(`/accountant/fees/${sid}`, {
        params: { school_code: code },
      });
      const feesData = feesResponse.data || [];
      setFees(feesData);

      if (feesData.length > 0) {
        const allPayments: Payment[] = [];
        for (const fee of feesData) {
          const paymentsResponse = await API.get(`/accountant/payments/${fee.id}`, {
            params: { school_code: code },
          });
          const paymentData = paymentsResponse.data || [];
          allPayments.push(...paymentData);
        }
        setPayments(allPayments);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching fee info:', error);
      setFees([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (studentId && schoolCode) {
      await fetchFeeInfo(studentId, schoolCode);
    }
    setRefreshing(false);
  }, [studentId, schoolCode]);

  const totalFee = fees.reduce((sum, f) => sum + f.total_fee, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paid_amount, 0);
  const totalDue = fees.reduce((sum, f) => sum + f.due_amount, 0);
  const paymentPercentage = totalFee > 0 ? (totalPaid / totalFee) * 100 : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <AppText style={styles.loaderText}>Loading fee information...</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <View>
                <AppText style={styles.welcomeGreeting}>Good {getGreeting()}! 👋</AppText>
                <AppText style={styles.welcomeTitle}>Fee Dashboard</AppText>
                <AppText style={styles.welcomeSub}>Track your payments and dues</AppText>
              </View>
              <TouchableOpacity style={styles.notificationIcon}>
                <Icon name="bell" size={20} color="#fff" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
            <FeeSummaryCard
              icon="💰"
              label="Total Fee"
              value={`₹${totalFee.toLocaleString('en-IN')}`}
              gradientColors={['#3b82f6', '#2563eb']}
            />
            <FeeSummaryCard
              icon="✅"
              label="Total Paid"
              value={`₹${totalPaid.toLocaleString('en-IN')}`}
              trend={5}
              gradientColors={['#10b981', '#059669']}
            />
            <FeeSummaryCard
              icon="⏰"
              label="Total Due"
              value={`₹${totalDue.toLocaleString('en-IN')}`}
              trend={-3}
              gradientColors={['#ef4444', '#dc2626']}
            />
          </ScrollView>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <AppText style={styles.progressTitle}>Payment Progress</AppText>
              <AppText style={styles.progressPercentage}>{paymentPercentage.toFixed(1)}%</AppText>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${paymentPercentage}%` }]} />
            </View>
            <View style={styles.progressStats}>
              <View>
                <AppText style={styles.progressStatLabel}>Paid</AppText>
                <AppText style={styles.progressStatValue}>₹{totalPaid.toLocaleString('en-IN')}</AppText>
              </View>
              <View>
                <AppText style={styles.progressStatLabel}>Due</AppText>
                <AppText style={styles.progressStatValue}>₹{totalDue.toLocaleString('en-IN')}</AppText>
              </View>
              <View>
                <AppText style={styles.progressStatLabel}>Total</AppText>
                <AppText style={styles.progressStatValue}>₹{totalFee.toLocaleString('en-IN')}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'fees' && styles.tabActive]}
            onPress={() => setActiveTab('fees')}
          >
            <Icon 
              name="file-text" 
              size={18} 
              color={activeTab === 'fees' ? '#3b82f6' : '#64748b'} 
            />
            <AppText style={[styles.tabText, activeTab === 'fees' && styles.tabTextActive]}>
              Fee Details
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Icon 
              name="clock" 
              size={18} 
              color={activeTab === 'history' ? '#3b82f6' : '#64748b'} 
            />
            <AppText style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Payment History
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'fees' ? (
          fees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="credit-card" size={48} color="#cbd5e1" />
              </View>
              <AppText style={styles.emptyTitle}>No Fee Records</AppText>
              <AppText style={styles.emptyText}>
                No fee information found for your account
              </AppText>
            </View>
          ) : (
            <View style={styles.feesContainer}>
              {fees.map((fee) => (
                <FeeItem key={fee.id} fee={fee} />
              ))}
            </View>
          )
        ) : (
          payments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="history" size={48} color="#cbd5e1" />
              </View>
              <AppText style={styles.emptyTitle}>No Payment History</AppText>
              <AppText style={styles.emptyText}>
                No payment transactions found
              </AppText>
            </View>
          ) : (
            <View style={styles.paymentsContainer}>
              <AppText style={styles.paymentsCount}>
                {payments.length} transaction{payments.length !== 1 ? 's' : ''}
              </AppText>
              {payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </View>
          )
        )}

        {/* Footer Info */}
        <View style={styles.footer}>
          <View style={styles.footerCard}>
            <View style={styles.footerItem}>
              <Icon name="user" size={14} color="#94a3b8" />
              <AppText style={styles.footerText}>Student ID: {studentId || '—'}</AppText>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Icon name="home" size={14} color="#94a3b8" />
              <AppText style={styles.footerText}>School: {schoolCode || '—'}</AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  gradientHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#bfdbfe',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  summarySection: {
    marginTop: -20,
    paddingHorizontal: 16,
  },
  summaryScroll: {
    flexDirection: 'row',
  },
  summaryCard: {
    width: width * 0.4,
    padding: 16,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryIconContainer: {
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 28,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  progressSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3b82f6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  feesContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  feeItem: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  feeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  feeDetailItem: {
    width: '48%',
  },
  feeDetailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  feeDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  paidAmount: {
    color: '#10b981',
  },
  dueAmount: {
    color: '#ef4444',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payNowButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  payNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentsContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  paymentsCount: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentCardLeft: {
    marginRight: 16,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCardMiddle: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentCardRight: {
    alignItems: 'flex-end',
  },
  paymentDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receiptText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  badgePaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  badgePartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeUnpaid: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPaid: {
    color: '#22c55e',
  },
  badgeTextPartial: {
    color: '#f59e0b',
  },
  badgeTextUnpaid: {
    color: '#ef4444',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    marginHorizontal: 16,
    marginTop: 40,
    backgroundColor: '#ffffff',
    borderRadius: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  footerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});