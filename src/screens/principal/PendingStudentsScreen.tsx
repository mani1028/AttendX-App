import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Alert, Platform, TouchableOpacity, Modal, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AlertCircle,
  Clock,
  CircleDollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  Bell,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { pendingStudentsStyles as styles } from '../../components/principal/pendingStudents/pendingStudentsStyles';




// Local theme bridge

interface PendingStudent {
  student_id: string;
  student_name: string;
  class_grade?: string;
  section?: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  due_date?: string;
}

const PendingStudents = () => {
  const navigation = useNavigation();
  const { setTabBarVisible, userRole } = useAuth();
  const isAccountant = userRole?.toLowerCase() === 'accountant';
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode) {
      fetchPendingStudents();
    }
  }, [schoolCode]);

  const loadSchoolCode = async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(code);
    } catch (error) {
      console.error('Error loading school code:', error);
      Alert.alert('Error', 'Failed to load school code');
    }
  };

  const fetchPendingStudents = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.get('/accountant/reports/pending-students', {
        params: { school_code: schoolCode },
      });
      setStudents(response.data || []);
    } catch (error: any) {
      console.error('Error fetching pending students:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to fetch pending students';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingStudents();
    setRefreshing(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return { backgroundColor: Theme.colors.greenLight, color: '#065f46', icon: CheckCircle };
      case 'partial':
        return { backgroundColor: Theme.colors.amberLight, color: '#92400e', icon: AlertTriangle };
      default:
        return { backgroundColor: Theme.colors.redLight, color: '#991b1b', icon: AlertCircle };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'PAID';
      case 'partial':
        return 'PARTIAL';
      default:
        return 'UNPAID';
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {return 'N/A';}
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const unpaidCount = students.filter(s => s.status === 'unpaid').length;
  const partialCount = students.filter(s => s.status === 'partial').length;
  const totalPending = students.reduce((sum, s) => sum + s.due_amount, 0);
  const totalFees = students.reduce((sum, s) => sum + s.total_fee, 0);
  const totalPaid = students.reduce((sum, s) => sum + s.paid_amount, 0);
  const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

  const renderStudentItem = ({ item }: { item: PendingStudent }) => {
    const statusStyle = getStatusStyle(item.status);
    const isUrgent = item.status === 'unpaid' && item.due_date && new Date(item.due_date) < new Date();

    const StatusIcon = statusStyle.icon;

    return (
      <TouchableOpacity accessibilityRole="button"
        style={styles.studentRow}
        onPress={() => {
          setSelectedStudent(item);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <View style={styles.studentHeader}>
            <AppText style={styles.studentName} weight="semibold">{item.student_name}</AppText>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Clock size={12} color={Theme.colors.error} />
                <AppText style={styles.urgentText} weight="semibold">Overdue</AppText>
              </View>
            )}
          </View>
          {item.class_grade && item.section && (
            <AppText style={styles.studentClass} weight="regular">
              Class {item.class_grade} - Section {item.section}
            </AppText>
          )}
          <View style={styles.feeDetails}>
            <AppText style={styles.feeText} weight="regular">Total: {formatAmount(item.total_fee)}</AppText>
            <AppText style={styles.paidText} weight="regular">Paid: {formatAmount(item.paid_amount)}</AppText>
            <AppText style={[styles.dueText, { color: statusStyle.color }]} weight="semibold">
              Due: {formatAmount(item.due_amount)}
            </AppText>
          </View>
          {item.due_date && (
            <AppText style={styles.dueDate} weight="regular">
              Due Date: {formatDate(item.due_date)}
            </AppText>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
          <StatusIcon size={12} color={statusStyle.color} />
          <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="semibold">
            {getStatusText(item.status)}
          </AppText>
        </View>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <StandardPageHeader
          scrollWithContent
          title="Pending Students"
          subtitle="Monitor student fee status and collection"
          backgroundColor={isAccountant ? Theme.colors.primary : undefined}
          onBackPress={() => safeGoBack(
            navigation as any,
            isAccountant ? 'AccountantDashboard' : 'PrincipalDashboard',
          )}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <AlertCircle size={24} color={Theme.colors.error} />
              <AppText style={styles.title} weight="bold">Pending Fees Alert</AppText>
            </View>
            <AppText style={styles.subtitle} weight="regular">Monitor student fee status</AppText>
          </View>

        {/* Summary Cards */}
        {students.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.unpaidCard]}>
              <AlertCircle size={24} color={Theme.colors.error} />
              <AppText style={styles.summaryNumber} weight="bold">{unpaidCount}</AppText>
              <AppText style={styles.summaryLabel} weight="regular">Unpaid Students</AppText>
            </View>
            <View style={[styles.summaryCard, styles.partialCard]}>
              <Clock size={24} color={Theme.colors.warning} />
              <AppText style={styles.summaryNumber} weight="bold">{partialCount}</AppText>
              <AppText style={styles.summaryLabel} weight="regular">Partial Payments</AppText>
            </View>
            <View style={[styles.summaryCard, styles.pendingCard]}>
              <CircleDollarSign size={24} color={Theme.colors.success} />
              <AppText style={styles.summaryNumber} weight="bold">{formatAmount(totalPending)}</AppText>
              <AppText style={styles.summaryLabel} weight="regular">Total Pending</AppText>
            </View>
          </View>
        )}

        {/* Alert Banner */}
        {students.length > 0 && (
          <View style={styles.alertBanner}>
            <AlertTriangle size={20} color="#7f1d1d" />
            <AppText style={styles.alertText} weight="semibold">
              {unpaidCount} student{unpaidCount !== 1 ? 's' : ''} with unpaid fees |
              Total Pending: {formatAmount(totalPending)}
            </AppText>
          </View>
        )}

        {/* Collection Rate */}
        {students.length > 0 && (
          <View style={styles.collectionCard}>
            <AppText style={styles.collectionTitle} weight="semibold">Collection Rate</AppText>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${collectionRate}%` }]} />
            </View>
            <AppText style={styles.collectionRate} weight="bold">{collectionRate.toFixed(1)}%</AppText>
            <AppText style={styles.collectionDetails} weight="regular">
              {formatAmount(totalPaid)} collected out of {formatAmount(totalFees)}
            </AppText>
          </View>
        )}

        {/* Students List */}
        {loading && students.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ScreenSkeleton variant="list" />
            <AppText style={styles.loadingText} weight="regular">Loading pending students...</AppText>
          </View>
        ) : students.length > 0 ? (
          <View style={styles.studentsList}>
            <View style={styles.listHeader}>
              <AppText style={styles.listTitle} weight="bold">Students with Pending Fees</AppText>
              <AppText style={styles.studentCount} weight="regular">{students.length} Students</AppText>
            </View>
            {students.map((student, index) => (
              <React.Fragment key={student.student_id || index}>
                {renderStudentItem({ item: student })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <CheckCircle size={64} color={Theme.colors.success} />
            <AppText style={styles.emptyTitle} weight="bold">All Clear!</AppText>
            <AppText style={styles.emptyText} weight="regular">No pending fees! All students are up-to-date. ✓</AppText>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Student Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Student Fee Details</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowDetailsModal(false)}>
                <X size={24} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semibold">Student Name</AppText>
                  <AppText style={styles.detailValue} weight="regular">{selectedStudent.student_name}</AppText>
                </View>

                {selectedStudent.class_grade && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} weight="semibold">Class & Section</AppText>
                    <AppText style={styles.detailValue} weight="regular">
                      Class {selectedStudent.class_grade} - Section {selectedStudent.section}
                    </AppText>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semibold">Total Fee</AppText>
                  <AppText style={styles.detailValue} weight="regular">{formatAmount(selectedStudent.total_fee)}</AppText>
                </View>

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semibold">Amount Paid</AppText>
                  <AppText style={[styles.detailValue, styles.paidDetail]} weight="regular">
                    {formatAmount(selectedStudent.paid_amount)}
                  </AppText>
                </View>

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semibold">Due Amount</AppText>
                  <AppText style={[styles.detailValue, styles.dueDetail, { color: getStatusStyle(selectedStudent.status).color }]} weight="bold">
                    {formatAmount(selectedStudent.due_amount)}
                  </AppText>
                </View>

                {selectedStudent.due_date && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} weight="semibold">Due Date</AppText>
                    <AppText style={styles.detailValue} weight="regular">{formatDate(selectedStudent.due_date)}</AppText>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semibold">Status</AppText>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusStyle(selectedStudent.status).backgroundColor }]}>
                    {React.createElement(getStatusStyle(selectedStudent.status).icon, { size: 14, color: getStatusStyle(selectedStudent.status).color })}
                    <AppText style={[styles.statusTextLarge, { color: getStatusStyle(selectedStudent.status).color }]} weight="bold">
                      {getStatusText(selectedStudent.status)}
                    </AppText>
                  </View>
                </View>

                {selectedStudent.status !== 'paid' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity accessibilityRole="button"
                      style={styles.reminderButton}
                      onPress={() => {
                        Alert.alert(
                          'Send Reminder',
                          `Send payment reminder to ${selectedStudent.student_name}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Send',
                              onPress: () => {
                                Alert.alert('Success', `Reminder sent to ${selectedStudent.student_name}`);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Bell size={16} color={Theme.colors.card} />
                      <AppText style={styles.reminderButtonText} weight="semibold">Send Reminder</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.closeModalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <AppText style={styles.closeModalButtonText} weight="semibold">Close</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PendingStudents;
