import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
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
  Bell
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { HM_THEME as C } from '../../constants/hmTheme';

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
  const lastScrollY = useRef(0);
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
      fetchPendingStudents();
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

  const fetchPendingStudents = async () => {
    if (!schoolCode) {
      Alert.alert('Error', 'School code not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.get("/accountant/reports/pending-students", {
        params: { school_code: schoolCode },
      });
      setStudents(response.data || []);
    } catch (error: any) {
      console.error("Error fetching pending students:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to fetch pending students";
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
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const unpaidCount = students.filter(s => s.status === "unpaid").length;
  const partialCount = students.filter(s => s.status === "partial").length;
  const totalPending = students.reduce((sum, s) => sum + s.due_amount, 0);
  const totalFees = students.reduce((sum, s) => sum + s.total_fee, 0);
  const totalPaid = students.reduce((sum, s) => sum + s.paid_amount, 0);
  const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

  const renderStudentItem = ({ item }: { item: PendingStudent }) => {
    const statusStyle = getStatusStyle(item.status);
    const isUrgent = item.status === 'unpaid' && item.due_date && new Date(item.due_date) < new Date();

    const StatusIcon = statusStyle.icon;

    return (
      <TouchableOpacity
        style={styles.studentRow}
        onPress={() => {
          setSelectedStudent(item);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <View style={styles.studentHeader}>
            <AppText style={styles.studentName} weight="semiBold">{item.student_name}</AppText>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Clock size={12} color="#dc2626" />
                <AppText style={styles.urgentText} weight="semiBold">Overdue</AppText>
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
            <AppText style={[styles.dueText, { color: statusStyle.color }]} weight="semiBold">
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
          <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="semiBold">
            {getStatusText(item.status)}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate('HMDashboard' as never)
          }
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">
          Pending Students
        </AppText>
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
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <AlertCircle size={24} color="#dc2626" />
            <AppText style={styles.title} weight="bold">Pending Fees Alert</AppText>
          </View>
          <AppText style={styles.subtitle} weight="regular">Monitor student fee status</AppText>
        </View>

        {/* Summary Cards */}
        {students.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.unpaidCard]}>
              <AlertCircle size={24} color="#dc2626" />
              <AppText style={styles.summaryNumber} weight="bold">{unpaidCount}</AppText>
              <AppText style={styles.summaryLabel} weight="regular">Unpaid Students</AppText>
            </View>
            <View style={[styles.summaryCard, styles.partialCard]}>
              <Clock size={24} color="#d97706" />
              <AppText style={styles.summaryNumber} weight="bold">{partialCount}</AppText>
              <AppText style={styles.summaryLabel} weight="regular">Partial Payments</AppText>
            </View>
            <View style={[styles.summaryCard, styles.pendingCard]}>
              <CircleDollarSign size={24} color="#059669" />
              <AppText style={styles.summaryNumber} weight="bold">{formatAmount(totalPending)}</AppText>
              <AppText style={styles.summaryLabel} weight="regular">Total Pending</AppText>
            </View>
          </View>
        )}

        {/* Alert Banner */}
        {students.length > 0 && (
          <View style={styles.alertBanner}>
            <AlertTriangle size={20} color="#7f1d1d" />
            <AppText style={styles.alertText} weight="semiBold">
              {unpaidCount} student{unpaidCount !== 1 ? 's' : ''} with unpaid fees | 
              Total Pending: {formatAmount(totalPending)}
            </AppText>
          </View>
        )}

        {/* Collection Rate */}
        {students.length > 0 && (
          <View style={styles.collectionCard}>
            <AppText style={styles.collectionTitle} weight="semiBold">Collection Rate</AppText>
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
            <ActivityIndicator size="large" color="#059669" />
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
            <CheckCircle size={64} color="#059669" />
            <AppText style={styles.emptyTitle} weight="bold">All Clear!</AppText>
            <AppText style={styles.emptyText} weight="regular">No pending fees! All students are up-to-date. ✓</AppText>
          </View>
        )}
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
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <X size={24} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semiBold">Student Name</AppText>
                  <AppText style={styles.detailValue} weight="regular">{selectedStudent.student_name}</AppText>
                </View>

                {selectedStudent.class_grade && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} weight="semiBold">Class & Section</AppText>
                    <AppText style={styles.detailValue} weight="regular">
                      Class {selectedStudent.class_grade} - Section {selectedStudent.section}
                    </AppText>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semiBold">Total Fee</AppText>
                  <AppText style={styles.detailValue} weight="regular">{formatAmount(selectedStudent.total_fee)}</AppText>
                </View>

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semiBold">Amount Paid</AppText>
                  <AppText style={[styles.detailValue, styles.paidDetail]} weight="regular">
                    {formatAmount(selectedStudent.paid_amount)}
                  </AppText>
                </View>

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semiBold">Due Amount</AppText>
                  <AppText style={[styles.detailValue, styles.dueDetail, { color: getStatusStyle(selectedStudent.status).color }]} weight="bold">
                    {formatAmount(selectedStudent.due_amount)}
                  </AppText>
                </View>

                {selectedStudent.due_date && (
                  <View style={styles.detailSection}>
                    <AppText style={styles.detailLabel} weight="semiBold">Due Date</AppText>
                    <AppText style={styles.detailValue} weight="regular">{formatDate(selectedStudent.due_date)}</AppText>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <AppText style={styles.detailLabel} weight="semiBold">Status</AppText>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusStyle(selectedStudent.status).backgroundColor }]}>
                    {React.createElement(getStatusStyle(selectedStudent.status).icon, { size: 14, color: getStatusStyle(selectedStudent.status).color })}
                    <AppText style={[styles.statusTextLarge, { color: getStatusStyle(selectedStudent.status).color }]} weight="bold">
                      {getStatusText(selectedStudent.status)}
                    </AppText>
                  </View>
                </View>

                {selectedStudent.status !== 'paid' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
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
                      <Bell size={16} color="#fff" />
                      <AppText style={styles.reminderButtonText} weight="semiBold">Send Reminder</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <AppText style={styles.closeModalButtonText} weight="semiBold">Close</AppText>
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
    backgroundColor: '#001F3F',
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 0,
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
  header: {
    padding: 20,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 20,
    color: '#0d1b2a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  unpaidCard: {
    borderTopColor: '#dc2626',
    borderTopWidth: 3,
  },
  partialCard: {
    borderTopColor: '#d97706',
    borderTopWidth: 3,
  },
  pendingCard: {
    borderTopColor: '#059669',
    borderTopWidth: 3,
  },
  summaryNumber: {
    fontSize: 20,
    color: '#0d1b2a',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#4a5568',
    marginTop: 4,
  },
  alertBanner: {
    backgroundColor: '#fee2e2',
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#7f1d1d',
  },
  collectionCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  collectionTitle: {
    fontSize: 14,
    color: '#0d1b2a',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e4e9f2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  collectionRate: {
    fontSize: 24,
    color: '#059669',
    marginTop: 8,
  },
  collectionDetails: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 4,
  },
  studentsList: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  listTitle: {
    fontSize: 16,
    color: '#0d1b2a',
  },
  studentCount: {
    fontSize: 13,
    color: '#4a5568',
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  studentName: {
    fontSize: 16,
    color: '#0d1b2a',
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
    color: '#dc2626',
  },
  studentClass: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 8,
  },
  feeDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  feeText: {
    fontSize: 12,
    color: '#4a5568',
  },
  paidText: {
    fontSize: 12,
    color: '#059669',
  },
  dueText: {
    fontSize: 12,
  },
  dueDate: {
    fontSize: 11,
    color: '#8898aa',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
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
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#059669',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 8,
    textAlign: 'center',
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 18,
    color: '#0d1b2a',
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8898aa',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#0d1b2a',
  },
  paidDetail: {
    color: '#059669',
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
    marginTop: 16,
  },
  reminderButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  reminderButtonText: {
    color: '#ffffff',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
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