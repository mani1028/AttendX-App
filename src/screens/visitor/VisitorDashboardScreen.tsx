import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { visitorApi, qrApi } from '../../services/visitorApi';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import QRCode from 'react-native-qrcode-svg';

// Types
interface Visitor {
  id: string;
  visitor_no: string;
  full_name: string;
  phone: string;
  student_name: string;
  class_name: string;
  class_grade: string;
  purpose: string;
  status: 'pending' | 'checked_in' | 'checked_out' | 'rejected';
  visited_at: string;
}

interface Stats {
  total_visitors: number;
  today_visitors: number;
  currently_present: number;
  pending_approval: number;
}

interface QRData {
  token: string;
  url: string;
  qrImage?: string;
  branch_id?: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatTime = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN');
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', color: '#d97706', label: 'PENDING' };
      case 'checked_in':
        return { bg: '#d1fae5', color: '#059669', label: 'CHECKED IN' };
      case 'checked_out':
        return { bg: '#dbeafe', color: '#2563eb', label: 'CHECKED OUT' };
      case 'rejected':
        return { bg: '#fee2e2', color: '#dc2626', label: 'REJECTED' };
      default:
        return { bg: '#f1f5f9', color: '#64748b', label: status?.toUpperCase() || 'UNKNOWN' };
    }
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number;
  loading: boolean;
  color?: string;
}> = ({ title, value, loading, color }) => (
  <AppCard style={styles.statCard}>
    <Text style={styles.statTitle}>{title}</Text>
    {loading ? (
      <ActivityIndicator size="small" color={color || colors.primary} />
    ) : (
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    )}
  </AppCard>
);

// Visitor Row Component
const VisitorRow: React.FC<{
  visitor: Visitor;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCheckout: (id: string) => void;
}> = ({ visitor, onApprove, onReject, onCheckout }) => {
  const isPending = visitor.status === 'pending';
  const isCheckedIn = visitor.status === 'checked_in';

  return (
    <View style={styles.visitorRow}>
      <View style={styles.visitorHeader}>
        <Text style={styles.visitorNo}>{visitor.visitor_no?.slice(0, 8) || '-'}</Text>
        <StatusBadge status={visitor.status} />
      </View>
      
      <View style={styles.visitorInfo}>
        <View style={styles.visitorName}>
          <Text style={styles.visitorNameText}>{visitor.full_name}</Text>
          <Text style={styles.visitorPhone}>{visitor.phone}</Text>
        </View>
        <View style={styles.visitorStudent}>
          <Text style={styles.visitorStudentName}>{visitor.student_name}</Text>
          <Text style={styles.visitorClass}>
            {visitor.class_name} {visitor.class_grade ? `(${visitor.class_grade})` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.visitorDetails}>
        <Text style={styles.visitorPurpose}>Purpose: {visitor.purpose}</Text>
        <Text style={styles.visitorTime}>Time: {formatTime(visitor.visited_at)}</Text>
      </View>

      <View style={styles.visitorActions}>
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => onApprove(visitor.id)}>
              <Text style={styles.actionBtnText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(visitor.id)}>
              <Text style={styles.actionBtnText}>✗ Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {isCheckedIn && (
          <TouchableOpacity style={[styles.actionBtn, styles.checkoutBtn]} onPress={() => onCheckout(visitor.id)}>
            <Text style={styles.actionBtnText}>Checkout</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// QR Modal Component
const QRModal: React.FC<{
  visible: boolean;
  qrData: QRData | null;
  onClose: () => void;
}> = ({ visible, qrData, onClose }) => {
  if (!qrData) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Visitor QR Code</Text>
          
          {qrData.qrImage ? (
            <Image source={{ uri: qrData.qrImage }} style={styles.qrImage} />
          ) : qrData.url ? (
            <View style={styles.qrCodeContainer}>
              <QRCode value={qrData.url} size={200} />
            </View>
          ) : null}

          {qrData.url && (
            <View style={styles.qrUrlContainer}>
              <Text style={styles.qrUrlLabel}>Registration Link:</Text>
              <Text style={styles.qrUrlText} selectable>{qrData.url}</Text>
            </View>
          )}

          <Text style={styles.modalMessage}>
            Scan this QR code for visitors to register and check-in
          </Text>
          
          <AppButton title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

// Filter Modal Component
const FilterModal: React.FC<{
  visible: boolean;
  dateFrom: string;
  dateTo: string;
  onApply: (dateFrom: string, dateTo: string) => void;
  onReset: () => void;
  onClose: () => void;
}> = ({ visible, dateFrom, dateTo, onApply, onReset, onClose }) => {
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    setLocalDateFrom(dateFrom);
    setLocalDateTo(dateTo);
  }, [dateFrom, dateTo, visible]);

  const handleApply = () => {
    onApply(localDateFrom, localDateTo);
    onClose();
  };

  const handleReset = () => {
    setLocalDateFrom('');
    setLocalDateTo('');
    onReset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Visitors</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterBody}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>From Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                <Text style={styles.dateText}>{localDateFrom || 'Select date'}</Text>
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={localDateFrom ? new Date(localDateFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowFromPicker(false);
                    if (date) setLocalDateFrom(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>To Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                <Text style={styles.dateText}>{localDateTo || 'Select date'}</Text>
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={localDateTo ? new Date(localDateTo) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowToPicker(false);
                    if (date) setLocalDateTo(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.filterFooter}>
            <AppButton title="Reset" onPress={handleReset} type="secondary" />
            <AppButton title="Apply Filters" onPress={handleApply} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function VisitorDashboardScreen() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'checked_in' | 'all'>('pending');
  const [qrData, setQRData] = useState<QRData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      setSchoolCode(code);
      setBranchId(bid);
    };
    load();
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setErrorMsg('');
    
    try {
      // Build filters
      const filters: any = {};
      if (activeTab !== 'all') {
        filters.status_filter = activeTab;
      }
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const visitorsRes = await visitorApi.listVisitors(filters);
      setVisitors(visitorsRes.data?.data || []);
    } catch (error: any) {
      console.error('Failed to fetch visitors:', error);
      setErrorMsg(error?.response?.data?.detail || 'Failed to load visitor data');
    } finally {
      setLoadingVisitors(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await visitorApi.getVisitorStats();
      setStats(statsRes.data?.data || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (!loadingVisitors) {
      setLoadingVisitors(true);
      fetchData();
    }
  }, [activeTab, dateFrom, dateTo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchStats()]);
    setRefreshing(false);
  }, [fetchData, fetchStats]);

  const handleApprove = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.approveVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve visitor');
    }
  }, [fetchData, fetchStats]);

  const handleReject = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.rejectVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject visitor');
    }
  }, [fetchData, fetchStats]);

  const handleCheckout = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.checkoutVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to checkout visitor');
    }
  }, [fetchData, fetchStats]);

  const loadQRCode = useCallback(async () => {
    try {
      const res = await qrApi.getActiveQR();
      let qrData = res.data?.data || null;

      if (!qrData) {
        const createRes = await qrApi.generateQR(30);
        qrData = createRes.data?.data || null;
      }

      if (!qrData) {
        Alert.alert('Error', 'No active QR is available and failed to create a new QR');
        return;
      }

      setQRData(qrData);
      setShowQRModal(true);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to load QR code');
    }
  }, []);

  const handleTabChange = (tab: 'pending' | 'checked_in' | 'all') => {
    setActiveTab(tab);
  };

  const handleApplyFilters = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  // Filtered visitors based on tab
  const filteredVisitors = useMemo(() => {
    if (activeTab === 'all') return visitors;
    return visitors.filter(v => v.status === activeTab);
  }, [visitors, activeTab]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📋 Visitor Management</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.qrBtn} onPress={loadQRCode}>
              <Text style={styles.qrBtnText}>📱 QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Text style={styles.refreshBtnText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Visitors" value={stats?.total_visitors || 0} loading={loadingStats} />
          <StatCard title="Today's Visitors" value={stats?.today_visitors || 0} loading={loadingStats} color="#3b82f6" />
          <StatCard title="Currently Present" value={stats?.currently_present || 0} loading={loadingStats} color="#059669" />
          <StatCard title="Pending Approval" value={stats?.pending_approval || 0} loading={loadingStats} color="#d97706" />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => handleTabChange('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              ⏳ Pending ({stats?.pending_approval || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checked_in' && styles.tabActive]}
            onPress={() => handleTabChange('checked_in')}
          >
            <Text style={[styles.tabText, activeTab === 'checked_in' && styles.tabTextActive]}>
              ✅ Checked In ({stats?.currently_present || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => handleTabChange('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              📋 All Visitors
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Button */}
        {(dateFrom || dateTo) && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>Active Filters:</Text>
            {dateFrom && <View style={styles.filterTag}><Text style={styles.filterTagText}>From: {dateFrom}</Text></View>}
            {dateTo && <View style={styles.filterTag}><Text style={styles.filterTagText}>To: {dateTo}</Text></View>}
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Text style={styles.filterBtnText}>🔽 Filter by Date</Text>
        </TouchableOpacity>

        {/* Visitors List */}
        {loadingVisitors ? (
          <Loader />
        ) : filteredVisitors.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No visitors found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </AppCard>
        ) : (
          filteredVisitors.map(visitor => (
            <VisitorRow
              key={visitor.id}
              visitor={visitor}
              onApprove={handleApprove}
              onReject={handleReject}
              onCheckout={handleCheckout}
            />
          ))
        )}
      </ScrollView>

      {/* QR Modal */}
      <QRModal
        visible={showQRModal}
        qrData={qrData}
        onClose={() => setShowQRModal(false)}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onClose={() => setShowFilterModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
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
    color: '#0d1b2a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  qrBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  refreshBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  refreshBtnText: {
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  filterTagText: {
    fontSize: 11,
    color: '#334155',
  },
  clearFiltersText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  filterBtn: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  filterBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  visitorRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitorNo: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: '#64748b',
  },
  visitorInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  visitorName: {
    flex: 1,
  },
  visitorNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 2,
  },
  visitorPhone: {
    fontSize: 12,
    color: '#64748b',
  },
  visitorStudent: {
    flex: 1,
  },
  visitorStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 2,
  },
  visitorClass: {
    fontSize: 12,
    color: '#64748b',
  },
  visitorDetails: {
    marginBottom: 12,
  },
  visitorPurpose: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 4,
  },
  visitorTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  visitorActions: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#d1fae5',
  },
  rejectBtn: {
    backgroundColor: '#fee2e2',
  },
  checkoutBtn: {
    backgroundColor: '#dbeafe',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
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
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },
  filterBody: {
    padding: 16,
  },
  filterField: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  dateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  qrImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 16,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  qrUrlContainer: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginTop: 16,
  },
  qrUrlLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  qrUrlText: {
    fontSize: 12,
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});