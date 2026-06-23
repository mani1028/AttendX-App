import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TouchableOpacity,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
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

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';




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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
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
        return { backgroundColor: '#d1fae5', color: '#065f46', icon: CheckCircle };
      case 'partial':
        return { backgroundColor: '#fef3c7', color: '#92400e', icon: AlertTriangle };
      default:
        return { backgroundColor: '#fee2e2', color: '#991b1b', icon: AlertCircle };
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


      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          >
            <ChevronLeft size={24} color={Theme.colors.card} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Pending Fees</AppText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>Pending Students</AppText>
          <AppText style={styles.headerSubtext}>Monitor student fee status and collection</AppText>
        </View>
      </View>

      <View style={styles.contentOverlap}>
        <ScrollView
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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
              <Clock size={24} color="#d97706" />
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
            <ActivityIndicator size="large" color={Theme.colors.success} />
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
      </ScrollView>
    </View>

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
                <X size={24} color="#4a5568" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  contentOverlap: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    marginTop: -HEADER_CONSTANTS.BORDER_RADIUS,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Theme.colors.card,
    ...Theme.typography.h3,
    textAlign: 'center',
    flex: 1,
  },
  headerContent: {
    marginTop: Theme.spacing.lg,
  },
  headerGreeting: {
    color: Theme.colors.card,
    ...Theme.typography.h1,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 20,
    color: Theme.colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    ...Theme.typography.body,
    color: '#4a5568',
    marginTop: Theme.spacing.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    margin: Theme.spacing.md,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  unpaidCard: {
    borderTopColor: Theme.colors.error,
    borderTopWidth: 3,
  },
  partialCard: {
    borderTopColor: '#d97706',
    borderTopWidth: 3,
  },
  pendingCard: {
    borderTopColor: Theme.colors.success,
    borderTopWidth: 3,
  },
  summaryNumber: {
    fontSize: 20,
    color: Theme.colors.text,
    marginTop: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.label,
    color: '#4a5568',
    marginTop: Theme.spacing.xs,
  },
  alertBanner: {
    backgroundColor: '#fee2e2',
    margin: Theme.spacing.md,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.error,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#7f1d1d',
  },
  collectionCard: {
    backgroundColor: Theme.colors.card,
    margin: Theme.spacing.md,
    marginTop: 0,
    padding: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  collectionTitle: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Theme.colors.success,
    borderRadius: 4,
  },
  collectionRate: {
    fontSize: 24,
    color: Theme.colors.success,
    marginTop: Theme.spacing.sm,
  },
  collectionDetails: {
    ...Theme.typography.caption,
    color: '#4a5568',
    marginTop: Theme.spacing.xs,
  },
  studentsList: {
    margin: Theme.spacing.md,
    marginTop: 0,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  listTitle: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  studentCount: {
    fontSize: 13,
    color: '#4a5568',
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.xs,
  },
  studentName: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    color: Theme.colors.error,
  },
  studentClass: {
    ...Theme.typography.caption,
    color: '#4a5568',
    marginBottom: Theme.spacing.sm,
  },
  feeDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Theme.spacing.xs,
  },
  feeText: {
    ...Theme.typography.caption,
    color: '#4a5568',
  },
  paidText: {
    ...Theme.typography.caption,
    color: Theme.colors.success,
  },
  dueText: {
    ...Theme.typography.caption,
  },
  dueDate: {
    ...Theme.typography.label,
    color: '#8898aa',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...Theme.typography.label,
  },
  loadingContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8898aa',
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    margin: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    color: Theme.colors.success,
    marginTop: Theme.spacing.md,
  },
  emptyText: {
    ...Theme.typography.body,
    color: '#4a5568',
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  modalBody: {
    padding: Theme.spacing.md,
  },
  detailSection: {
    marginBottom: Theme.spacing.md,
  },
  detailLabel: {
    ...Theme.typography.caption,
    color: '#8898aa',
    marginBottom: Theme.spacing.xs,
  },
  detailValue: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  paidDetail: {
    color: Theme.colors.success,
  },
  dueDetail: {
    // moved to weight="bold"
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 13,
  },
  actionButtons: {
    marginTop: Theme.spacing.md,
  },
  reminderButton: {
    backgroundColor: Theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  reminderButtonText: {
    color: Theme.colors.card,
  },
  modalFooter: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  closeModalButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#4a5568',
  },
});

export default PendingStudents;
