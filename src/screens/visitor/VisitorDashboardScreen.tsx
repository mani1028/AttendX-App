import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@react-native-vector-icons/feather';
import { Bell } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { visitorApi, qrApi } from '../../services/visitorApi';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'react-native-qrcode-svg';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { formatErrorMessage } from '../../utils/helpers';

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
        return { bg: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24', label: 'PENDING' };
      case 'checked_in':
        return { bg: 'rgba(5, 150, 105, 0.15)', color: '#34d399', label: 'CHECKED IN' };
      case 'checked_out':
        return { bg: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', label: 'CHECKED OUT' };
      case 'rejected':
        return { bg: 'rgba(220, 38, 38, 0.15)', color: '#f87171', label: 'REJECTED' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', color: colors.textMuted, label: status?.toUpperCase() || 'UNKNOWN' };
    }
  };
  const config = getStatusConfig();
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <AppText style={[styles.badgeText, { color: config.color }]}>{config.label}</AppText>
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
    <AppText style={styles.statTitle}>{title}</AppText>
    {loading ? (
      <ActivityIndicator size="small" color={color || colors.accent} />
    ) : (
      <AppText style={[styles.statValue, color && { color }]}>{value}</AppText>
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
    <AppCard style={styles.visitorRow}>
      <View style={styles.visitorHeader}>
        <AppText style={styles.visitorNo}>{visitor.visitor_no?.slice(0, 8) || '-'}</AppText>
        <StatusBadge status={visitor.status} />
      </View>
      
      <View style={styles.visitorInfo}>
        <View style={styles.visitorName}>
          <AppText style={styles.visitorNameText}>{visitor.full_name}</AppText>
          <AppText style={styles.visitorPhone}>{visitor.phone}</AppText>
        </View>
        <View style={styles.visitorStudent}>
          <AppText style={styles.visitorStudentName}>{visitor.student_name}</AppText>
          <AppText style={styles.visitorClass}>
            {visitor.class_name} {visitor.class_grade ? `(${visitor.class_grade})` : ''}
          </AppText>
        </View>
      </View>

      <View style={styles.visitorDetails}>
        <AppText style={styles.visitorPurpose}>Purpose: {visitor.purpose}</AppText>
        <AppText style={styles.visitorTime}>Time: {formatTime(visitor.visited_at)}</AppText>
      </View>

      <View style={styles.visitorActions}>
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => onApprove(visitor.id)}>
              <AppText style={styles.actionBtnText}>✓ Approve</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onReject(visitor.id)}>
              <AppText style={styles.actionBtnText}>✗ Reject</AppText>
            </TouchableOpacity>
          </View>
        )}
        {isCheckedIn && (
          <TouchableOpacity style={[styles.actionBtn, styles.checkoutBtn]} onPress={() => onCheckout(visitor.id)}>
            <AppText style={styles.actionBtnText}>Checkout</AppText>
          </TouchableOpacity>
        )}
      </View>
    </AppCard>
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
          <AppText style={styles.modalTitle}>Visitor QR Code</AppText>
          
          {qrData.qrImage ? (
            <Image source={{ uri: qrData.qrImage }} style={styles.qrImage} />
          ) : qrData.url ? (
            <View style={styles.qrCodeContainer}>
              <QRCode value={qrData.url} size={200} backgroundColor={colors.surface} color={colors.textPrimary} />
            </View>
          ) : null}

          {qrData.url && (
            <View style={styles.qrUrlContainer}>
              <AppText style={styles.qrUrlLabel}>Registration Link:</AppText>
              <AppText style={styles.qrUrlText} selectable>{qrData.url}</AppText>
            </View>
          )}

          <AppText style={styles.modalMessage}>
            Scan this QR code for visitors to register and check-in
          </AppText>
          
          <AppButton title="Close" onPress={onClose} style={{ marginTop: 20, width: '100%' }} />
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
            <AppText style={styles.modalTitle}>Filter Visitors</AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <AppText style={styles.modalCloseText}>✕</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.filterBody}>
            <View style={styles.filterField}>
              <AppText style={styles.filterLabel}>From Date</AppText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                <AppText style={styles.dateText}>{localDateFrom || 'Select date'}</AppText>
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={localDateFrom ? new Date(localDateFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    setShowFromPicker(false);
                    if (date) setLocalDateFrom(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>

            <View style={styles.filterField}>
              <AppText style={styles.filterLabel}>To Date</AppText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                <AppText style={styles.dateText}>{localDateTo || 'Select date'}</AppText>
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={localDateTo ? new Date(localDateTo) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    setShowToPicker(false);
                    if (date) setLocalDateTo(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.filterFooter}>
            <AppButton title="Reset" onPress={handleReset} type="secondary" style={{ flex: 1 }} />
            <AppButton title="Apply Filters" onPress={handleApply} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function VisitorDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { userName } = useAuth();
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
  const { unreadCount } = useUnreadNotifications();

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
      console.log('DEBUG 403 ERROR:', error.response?.data);
      console.error('Failed to fetch visitors:', error);

      const message = error?.response?.data?.detail ||
                    error?.response?.data?.message ||
                    'You do not have permission to view visitor data.';
      setErrorMsg(message);
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
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to approve visitor');
    }
  }, [fetchData, fetchStats]);

  const handleReject = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.rejectVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to reject visitor');
    }
  }, [fetchData, fetchStats]);

  const handleCheckout = useCallback(async (visitorId: string) => {
    try {
      await visitorApi.checkoutVisitor(visitorId);
      fetchData();
      fetchStats();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to checkout visitor');
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
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail) || 'Failed to load QR code');
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Navy Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
        <View style={{ width: 40 }} />
        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle}>Visitor Portal</AppText>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Bell size={20} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badgeNotification}>
                <AppText style={styles.badgeTextNotification}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'User'}!</AppText>
            <AppText style={styles.welcomeSub}>Manage campus visitors and check-ins.</AppText>
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
          <AppText style={styles.title}>Visitor Management</AppText>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.qrBtn} onPress={loadQRCode}>
              <AppText style={styles.qrBtnText}>📱 QR Code</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <AppText style={styles.errorText}>{errorMsg}</AppText>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Visitors" value={stats?.total_visitors || 0} loading={loadingStats} />
          <StatCard title="Today's" value={stats?.today_visitors || 0} loading={loadingStats} color={colors.accent} />
          <StatCard title="Present" value={stats?.currently_present || 0} loading={loadingStats} color={colors.success} />
          <StatCard title="Pending" value={stats?.pending_approval || 0} loading={loadingStats} color={colors.warning} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => handleTabChange('pending')}
          >
            <AppText style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              ⏳ Pending ({stats?.pending_approval || 0})
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checked_in' && styles.tabActive]}
            onPress={() => handleTabChange('checked_in')}
          >
            <AppText style={[styles.tabText, activeTab === 'checked_in' && styles.tabTextActive]}>
              ✅ Checked In ({stats?.currently_present || 0})
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => handleTabChange('all')}
          >
            <AppText style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              📋 All
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Filter Button */}
        {(dateFrom || dateTo) && (
          <View style={styles.activeFilters}>
            <AppText style={styles.activeFiltersLabel}>Active Filters:</AppText>
            {dateFrom && <View style={styles.filterTag}><AppText style={styles.filterTagText}>From: {dateFrom}</AppText></View>}
            {dateTo && <View style={styles.filterTag}><AppText style={styles.filterTagText}>To: {dateTo}</AppText></View>}
            <TouchableOpacity onPress={handleResetFilters}>
              <AppText style={styles.clearFiltersText}>Clear</AppText>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <AppText style={styles.filterBtnText}>🔽 Filter by Date</AppText>
        </TouchableOpacity>

        {/* Visitors List */}
        {loadingVisitors ? (
          <Loader />
        ) : filteredVisitors.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <AppText style={styles.emptyIcon}>👥</AppText>
            <AppText style={styles.emptyTitle}>No visitors found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your filters</AppText>
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
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 20,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
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
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  qrBtn: {
    backgroundColor: colors.accentSoft,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnLabel: {
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: colors.errorSoft,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
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
    color: colors.textMuted,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTag: {
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTagText: {
    fontSize: 11,
    color: colors.textPrimary,
  },
  clearFiltersText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  filterBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  filterBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  visitorRow: {
    marginBottom: 12,
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
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  visitorPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  visitorStudent: {
    flex: 1,
  },
  visitorStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  visitorClass: {
    fontSize: 12,
    color: colors.textMuted,
  },
  visitorDetails: {
    marginBottom: 12,
  },
  visitorPurpose: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
    opacity: 0.8,
  },
  visitorTime: {
    fontSize: 12,
    color: colors.textMuted,
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
    flex: 1,
  },
  approveBtn: {
    backgroundColor: 'rgba(21, 128, 61, 0.2)',
  },
  rejectBtn: {
    backgroundColor: 'rgba(185, 28, 28, 0.2)',
  },
  checkoutBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    width: '100%',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  badgeNotification: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeTextNotification: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: colors.textMuted,
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
    color: colors.textMuted,
    marginBottom: 6,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.bg,
  },
  dateText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
  },
  qrUrlContainer: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrUrlLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  qrUrlText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});
