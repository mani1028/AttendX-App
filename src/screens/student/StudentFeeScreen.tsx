import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';

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
      <Text style={[styles.badgeText, getTextStyle()]}>
        {status?.toUpperCase() || 'UNPAID'}
      </Text>
    </View>
  );
};

// Fee Card Component (Gradient effect using View with background)
const FeeSummaryCard: React.FC<{
  icon: string;
  label: string;
  value: string;
  colors: string[];
}> = ({ icon, label, value, colors }) => (
  <View style={[styles.summaryCard, { backgroundColor: colors[0] }]}>
    <Text style={styles.summaryIcon}>{icon}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

export default function StudentFeeScreen() {
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
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Loading fee information...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.headerBlock}>
        <View>
          <Text style={styles.header}>💰 My Fee Ledger</Text>
          <Text style={styles.subText}>
            Track payments, due amounts, and receipts in one place.
          </Text>
          {schoolCode && studentId && (
            <Text style={styles.infoText}>
              {fees.length} record{fees.length !== 1 ? 's' : ''} • {schoolCode} • ID: {studentId}
            </Text>
          )}
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.cardContainer}>
        <FeeSummaryCard
          icon="💰"
          label="Total Fee"
          value={`₹${totalFee.toFixed(2)}`}
          colors={['#2563eb', '#3b82f6']}
        />
        <FeeSummaryCard
          icon="✅"
          label="Amount Paid"
          value={`₹${totalPaid.toFixed(2)}`}
          colors={['#059669', '#10b981']}
        />
        <FeeSummaryCard
          icon="⏰"
          label="Amount Due"
          value={`₹${totalDue.toFixed(2)}`}
          colors={['#dc2626', '#ef4444']}
        />
      </View>

      {/* No Data State */}
      {fees.length === 0 ? (
        <View style={styles.tableContainer}>
          <Text style={styles.noDataText}>No fee information found.</Text>
        </View>
      ) : (
        <>
          {/* Fee Details Table */}
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>Fee Details</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.colTotalFee]}>Total Fee</Text>
                  <Text style={[styles.tableHeaderText, styles.colPaid]}>Paid</Text>
                  <Text style={[styles.tableHeaderText, styles.colDue]}>Due</Text>
                  <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                  <Text style={[styles.tableHeaderText, styles.colDueDate]}>Due Date</Text>
                </View>

                {/* Rows */}
                {fees.map((fee) => (
                  <View key={fee.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colTotalFee]}>
                      ₹{fee.total_fee.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colPaid]}>
                      ₹{fee.paid_amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colDue]}>
                      ₹{fee.due_amount.toFixed(2)}
                    </Text>
                    <View style={styles.colStatus}>
                      <StatusBadge status={fee.status} />
                    </View>
                    <Text style={[styles.tableCell, styles.colDueDate]}>
                      {fee.due_date || '-'}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Payment History */}
          {payments.length > 0 && (
            <View style={[styles.tableContainer, styles.paymentHistoryContainer]}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
                    <Text style={[styles.tableHeaderText, styles.colMethod]}>Method</Text>
                    <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
                  </View>

                  {/* Rows */}
                  {payments.map((payment) => (
                    <View key={payment.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.colAmount]}>
                        ₹{payment.amount.toFixed(2)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colMethod]}>
                        {payment.method?.toUpperCase() || '-'}
                      </Text>
                      <Text style={[styles.tableCell, styles.colDate]}>
                        {payment.date || '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 12,
    color: '#56708f',
    fontSize: 14,
  },
  headerBlock: {
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10233d',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#56708f',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#7890a8',
    marginTop: 4,
  },
  cardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 4,
  },
  summaryIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8eef7',
    marginTop: 12,
  },
  paymentHistoryContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10233d',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fc',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e4e9f2',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  tableCell: {
    fontSize: 14,
    color: '#1e293b',
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
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgePaid: {
    backgroundColor: '#d1fae5',
  },
  badgePartial: {
    backgroundColor: '#fef3c7',
  },
  badgeUnpaid: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPaid: {
    color: '#065f46',
  },
  badgeTextPartial: {
    color: '#92400e',
  },
  badgeTextUnpaid: {
    color: '#991b1b',
  },
  noDataText: {
    color: '#5f748e',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});