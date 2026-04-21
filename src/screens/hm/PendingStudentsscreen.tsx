import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

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
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load school code from storage
  useEffect(() => {
    loadSchoolCode();
  }, []);

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
        return { backgroundColor: '#d1fae5', color: '#065f46', icon: 'check-circle' };
      case 'partial':
        return { backgroundColor: '#fef3c7', color: '#92400e', icon: 'alert-triangle' };
      default:
        return { backgroundColor: '#fee2e2', color: '#991b1b', icon: 'x-circle' };
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
            <Text style={styles.studentName}>{item.student_name}</Text>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Icon name="clock" size={12} color="#dc2626" />
                <Text style={styles.urgentText}>Overdue</Text>
              </View>
            )}
          </View>
          {item.class_grade && item.section && (
            <Text style={styles.studentClass}>
              Class {item.class_grade} - Section {item.section}
            </Text>
          )}
          <View style={styles.feeDetails}>
            <Text style={styles.feeText}>Total: {formatAmount(item.total_fee)}</Text>
            <Text style={styles.paidText}>Paid: {formatAmount(item.paid_amount)}</Text>
            <Text style={[styles.dueText, { color: statusStyle.color }]}>
              Due: {formatAmount(item.due_amount)}
            </Text>
          </View>
          {item.due_date && (
            <Text style={styles.dueDate}>
              Due Date: {formatDate(item.due_date)}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
          <Icon name={statusStyle.icon as any} size={12} color={statusStyle.color} />
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
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
        <View style={styles.header}>
          <Text style={styles.title}>⚠️ Pending Fees Alert</Text>
          <Text style={styles.subtitle}>Monitor student fee status</Text>
        </View>

        {/* Summary Cards */}
        {students.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.unpaidCard]}>
              <Icon name="alert-circle" size={24} color="#dc2626" />
              <Text style={styles.summaryNumber}>{unpaidCount}</Text>
              <Text style={styles.summaryLabel}>Unpaid Students</Text>
            </View>
            <View style={[styles.summaryCard, styles.partialCard]}>
              <Icon name="clock" size={24} color="#d97706" />
              <Text style={styles.summaryNumber}>{partialCount}</Text>
              <Text style={styles.summaryLabel}>Partial Payments</Text>
            </View>
            <View style={[styles.summaryCard, styles.pendingCard]}>
              <Icon name="rupee" size={24} color="#059669" />
              <Text style={styles.summaryNumber}>{formatAmount(totalPending)}</Text>
              <Text style={styles.summaryLabel}>Total Pending</Text>
            </View>
          </View>
        )}

        {/* Alert Banner */}
        {students.length > 0 && (
          <View style={styles.alertBanner}>
            <Icon name="alert-triangle" size={20} color="#7f1d1d" />
            <Text style={styles.alertText}>
              {unpaidCount} student{unpaidCount !== 1 ? 's' : ''} with unpaid fees | 
              Total Pending: {formatAmount(totalPending)}
            </Text>
          </View>
        )}

        {/* Collection Rate */}
        {students.length > 0 && (
          <View style={styles.collectionCard}>
            <Text style={styles.collectionTitle}>Collection Rate</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${collectionRate}%` }]} />
            </View>
            <Text style={styles.collectionRate}>{collectionRate.toFixed(1)}%</Text>
            <Text style={styles.collectionDetails}>
              {formatAmount(totalPaid)} collected out of {formatAmount(totalFees)}
            </Text>
          </View>
        )}

        {/* Students List */}
        {loading && students.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Loading pending students...</Text>
          </View>
        ) : students.length > 0 ? (
          <View style={styles.studentsList}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Students with Pending Fees</Text>
              <Text style={styles.studentCount}>{students.length} Students</Text>
            </View>
            {students.map((student, index) => (
              <React.Fragment key={student.student_id || index}>
                {renderStudentItem({ item: student })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="check-circle" size={64} color="#059669" />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>No pending fees! All students are up-to-date. ✓</Text>
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
              <Text style={styles.modalTitle}>Student Fee Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Icon name="x" size={24} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Student Name</Text>
                  <Text style={styles.detailValue}>{selectedStudent.student_name}</Text>
                </View>

                {selectedStudent.class_grade && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Class & Section</Text>
                    <Text style={styles.detailValue}>
                      Class {selectedStudent.class_grade} - Section {selectedStudent.section}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Total Fee</Text>
                  <Text style={styles.detailValue}>{formatAmount(selectedStudent.total_fee)}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Amount Paid</Text>
                  <Text style={[styles.detailValue, styles.paidDetail]}>
                    {formatAmount(selectedStudent.paid_amount)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Due Amount</Text>
                  <Text style={[styles.detailValue, styles.dueDetail, { color: getStatusStyle(selectedStudent.status).color }]}>
                    {formatAmount(selectedStudent.due_amount)}
                  </Text>
                </View>

                {selectedStudent.due_date && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedStudent.due_date)}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusStyle(selectedStudent.status).backgroundColor }]}>
                    <Icon name={getStatusStyle(selectedStudent.status).icon as any} size={14} color={getStatusStyle(selectedStudent.status).color} />
                    <Text style={[styles.statusTextLarge, { color: getStatusStyle(selectedStudent.status).color }]}>
                      {getStatusText(selectedStudent.status)}
                    </Text>
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
                      <Icon name="bell" size={16} color="#fff" />
                      <Text style={styles.reminderButtonText}>Send Reminder</Text>
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
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Add missing imports
import { TouchableOpacity, Modal } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0d1b2a',
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
    fontWeight: '800',
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
    fontWeight: '500',
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
    fontWeight: '600',
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
    fontWeight: '800',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#8898aa',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0d1b2a',
  },
  paidDetail: {
    color: '#059669',
  },
  dueDetail: {
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
});

export default PendingStudents;