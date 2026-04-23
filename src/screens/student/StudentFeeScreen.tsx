import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import AvatarBubble from '../../components/common/AvatarBubble';
import { useAuth } from '../../context/AuthContext';

// Types
interface Fee {
  id: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  due_date: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = () => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'paid') return styles.badgePaid;
    if (lowerStatus === 'partial') return styles.badgePartial;
    return styles.badgeUnpaid;
  };

  const getTextStyle = () => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'paid') return styles.badgeTextPaid;
    if (lowerStatus === 'partial') return styles.badgeTextPartial;
    return styles.badgeTextUnpaid;
  };

  return (
    <View style={[styles.badge, getStatusStyle()]}>
      <AppText style={[styles.badgeText, getTextStyle()]}>
        {status?.toUpperCase() || 'UNPAID'}
      </AppText>
    </View>
  );
};

// Fee Card Component
const FeeSummaryCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  bgColor: string;
}> = ({ icon, label, value, bgColor }) => (
  <View style={[styles.summaryCard, { backgroundColor: bgColor }]}>
    <AppText style={styles.summaryIcon}>{icon}</AppText>
    <AppText style={styles.summaryLabel}>{label}</AppText>
    <AppText style={styles.summaryValue}>{value}</AppText>
  </View>
);

export default function StudentFeeScreen({ navigation }: any) {
  const { userName } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [schoolCode, setSchoolCode] = useState<string>('');

  // Load credentials and validate role
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');
        const code = await AsyncStorage.getItem('school_code') || 
                     await AsyncStorage.getItem('schoolCode');
        const sid = await AsyncStorage.getItem('student_id');

        // Validate authentication
        if (!token || role !== 'student') {
          // Navigate to login - you'll need navigation prop
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
      
      // Fetch fees for this student
      const feesResponse = await API.get(`/accountant/fees/${sid}`, {
        params: { school_code: code },
      });
      const feesData = feesResponse.data || [];
      setFees(feesData);

      // Fetch all payments for each fee
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

  // Calculate totals
  const totalFee = fees.reduce((sum, f) => sum + f.total_fee, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paid_amount, 0);
  const totalDue = fees.reduce((sum, f) => sum + f.due_amount, 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText style={styles.loaderText}>Loading fee information...</AppText>
        </View>
      </View>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</AppText>
          <AppText style={styles.welcomeSub}>Track your fee payments and due amounts.</AppText>
        </View>
        <View style={styles.dateBadge}>
          <Icon name="calendar" size={12} color={colors.textMuted} />
          <AppText style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </AppText>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText style={styles.title}>Fee Ledger</AppText>
          <AppText style={styles.subText}>{fees.length} records found</AppText>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.cardContainer}>
        <FeeSummaryCard
          icon="💰"
          label="Total Fee"
          value={`₹${totalFee.toFixed(2)}`}
          bgColor="rgba(37, 99, 235, 0.2)"
        />
        <FeeSummaryCard
          icon="✅"
          label="Paid"
          value={`₹${totalPaid.toFixed(2)}`}
          bgColor="rgba(21, 128, 61, 0.2)"
        />
        <FeeSummaryCard
          icon="⏰"
          label="Due"
          value={`₹${totalDue.toFixed(2)}`}
          bgColor="rgba(185, 28, 28, 0.2)"
        />
      </View>

      {/* No Data State */}
      {fees.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <AppText style={styles.noDataText}>No fee information found.</AppText>
        </AppCard>
      ) : (
        <>
          {/* Fee Details Table */}
          <AppCard style={styles.tableCard}>
            <AppText style={styles.sectionTitle}>Fee Details</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <AppText style={[styles.tableHeaderText, styles.colTotalFee]}>Total Fee</AppText>
                  <AppText style={[styles.tableHeaderText, styles.colPaid]}>Paid</AppText>
                  <AppText style={[styles.tableHeaderText, styles.colDue]}>Due</AppText>
                  <AppText style={[styles.tableHeaderText, styles.colStatus]}>Status</AppText>
                  <AppText style={[styles.tableHeaderText, styles.colDueDate]}>Due Date</AppText>
                </View>

                {/* Rows */}
                {fees.map((fee) => (
                  <View key={fee.id} style={styles.tableRow}>
                    <AppText style={[styles.tableCell, styles.colTotalFee]}>
                      ₹{fee.total_fee.toFixed(2)}
                    </AppText>
                    <AppText style={[styles.tableCell, styles.colPaid]}>
                      ₹{fee.paid_amount.toFixed(2)}
                    </AppText>
                    <AppText style={[styles.tableCell, styles.colDue]}>
                      ₹{fee.due_amount.toFixed(2)}
                    </AppText>
                    <View style={styles.colStatus}>
                      <StatusBadge status={fee.status} />
                    </View>
                    <AppText style={[styles.tableCell, styles.colDueDate]}>
                      {fee.due_date || '-'}
                    </AppText>
                  </View>
                ))}
              </View>
            </ScrollView>
          </AppCard>

          {/* Payment History */}
          {payments.length > 0 && (
            <AppCard style={styles.paymentHistoryContainer}>
              <AppText style={styles.sectionTitle}>Payment History</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header */}
                  <View style={styles.tableHeader}>
                    <AppText style={[styles.tableHeaderText, styles.colAmount]}>Amount</AppText>
                    <AppText style={[styles.tableHeaderText, styles.colMethod]}>Method</AppText>
                    <AppText style={[styles.tableHeaderText, styles.colDate]}>Date</AppText>
                  </View>

                  {/* Rows */}
                  {payments.map((payment) => (
                    <View key={payment.id} style={styles.tableRow}>
                      <AppText style={[styles.tableCell, styles.colAmount]}>
                        ₹{payment.amount.toFixed(2)}
                      </AppText>
                      <AppText style={[styles.tableCell, styles.colMethod]}>
                        {payment.method?.toUpperCase() || '-'}
                      </AppText>
                      <AppText style={[styles.tableCell, styles.colDate]}>
                        {payment.date || '-'}
                      </AppText>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </AppCard>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: colors.textMuted,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  refreshBtn: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tableCard: {
    marginBottom: 20,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  paymentHistoryContainer: {
    marginTop: 0,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    padding: 18,
    paddingBottom: 0,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  colTotalFee: {
    width: 100,
  },
  colPaid: {
    width: 90,
  },
  colDue: {
    width: 90,
  },
  colStatus: {
    width: 90,
  },
  colDueDate: {
    width: 100,
  },
  colAmount: {
    width: 100,
  },
  colMethod: {
    width: 100,
  },
  colDate: {
    width: 110,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgePaid: {
    backgroundColor: 'rgba(21, 128, 61, 0.15)',
  },
  badgePartial: {
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
  },
  badgeUnpaid: {
    backgroundColor: 'rgba(185, 28, 28, 0.15)',
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
  noDataText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
