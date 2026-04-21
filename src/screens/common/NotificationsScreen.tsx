import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';

// Types
interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  event_date: string | null;
  created_at: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) ||
         (await AsyncStorage.getItem('branch')) ||
         (await AsyncStorage.getItem('BranchID')) || '01';
};

const getUserRole = async (): Promise<string> => {
  const role = await AsyncStorage.getItem('user_role');
  return (role || (await AsyncStorage.getItem('userRole')) || 'student').toLowerCase();
};

const getTypeColor = (type: string): { background: string; color: string } => {
  const colors: Record<string, { background: string; color: string }> = {
    event: { background: '#dbeafe', color: '#1e40af' },
    program: { background: '#dcfce7', color: '#15803d' },
    festival: { background: '#fef3c7', color: '#92400e' },
    holiday: { background: '#f3e8ff', color: '#6b21a8' },
    announcement: { background: '#fecdd3', color: '#9f1239' },
    urgent: { background: '#fecaca', color: '#991b1b' },
  };
  return colors[type?.toLowerCase()] || colors.event;
};

const getAccentColor = (type: string): string => {
  const colors: Record<string, string> = {
    event: '#3b82f6',
    program: '#22c55e',
    festival: '#f59e0b',
    holiday: '#a855f7',
    announcement: '#f43f5e',
    urgent: '#ef4444',
  };
  return colors[type?.toLowerCase()] || '#3b82f6';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Type Badge Component
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const { background, color } = getTypeColor(type);
  return (
    <View style={[styles.typeBadge, { backgroundColor: background }]}>
      <Text style={[styles.typeBadgeText, { color }]}>
        {type || 'Event'}
      </Text>
    </View>
  );
};

// Notification Card Component
const NotificationCard: React.FC<{ notification: Notification }> = ({ notification }) => {
  const accentColor = getAccentColor(notification.type);
  
  return (
    <View style={[styles.notificationCard, { borderLeftColor: accentColor }]}>
      <View style={styles.cardHeader}>
        <TypeBadge type={notification.type} />
      </View>
      
      <Text style={styles.cardTitle}>{notification.title}</Text>
      <Text style={styles.cardDescription}>{notification.description}</Text>
      
      {notification.event_date && (
        <View style={styles.eventDate}>
          <Text style={styles.eventDateIcon}>📅</Text>
          <Text style={styles.eventDateText}>{formatDate(notification.event_date)}</Text>
        </View>
      )}
      
      <Text style={styles.timestamp}>
        Posted on {formatDateTime(notification.created_at)}
      </Text>
    </View>
  );
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  // Load credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const role = await getUserRole();
      setSchoolCode(code);
      setBranchId(bid);
      setUserRole(role);
    };
    loadCredentials();
  }, []);

  // Fetch notifications when credentials are ready
  useEffect(() => {
    if (schoolCode && branchId && userRole) {
      fetchNotifications();
    }
  }, [schoolCode, branchId, userRole]);

  const fetchNotifications = async () => {
    if (!schoolCode || !branchId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = userRole === 'teacher'
        ? '/notifications/teacher/list'
        : '/notifications/student/list';
      
      const response = await API.get(endpoint, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        },
      });
      
      setNotifications(response.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [schoolCode, branchId, userRole]);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>School Announcements & Alerts</Text>
        </View>
        <View style={styles.notificationCount}>
          <Text style={styles.notificationCountText}>
            {notifications.length} {notifications.length === 1 ? 'Alert' : 'Alerts'}
          </Text>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No announcements yet</Text>
          <Text style={styles.emptyText}>Check back later for school updates and alerts</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 24,
    color: '#2563eb',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  notificationCount: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  notificationCountText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventDateIcon: {
    fontSize: 14,
  },
  eventDateText: {
    fontSize: 13,
    color: '#64748b',
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
});