import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Bell, Calendar, Info, AlertTriangle, PartyPopper, Tent, CheckCheck, X, Trash2, BadgeCheck } from 'lucide-react-native';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { colors } from '../../constants/theme';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { safeJsonParse } from '../../utils/storage';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  event_date: string | null;
  created_at: string;
  is_read?: boolean;
}

const getTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'event': return <Calendar size={20} color="#3b82f6" />;
    case 'program': return <Tent size={20} color="#22c55e" />;
    case 'festival': return <PartyPopper size={20} color="#f59e0b" />;
    case 'urgent': return <AlertTriangle size={20} color="#ef4444" />;
    case 'announcement': return <Info size={20} color="#f43f5e" />;
    case 'approval':
    case 'approved':
    case 'request':
    case 'registration':
    case 'student_registration':
      return <BadgeCheck size={20} color="#059669" />;
    default: return <Bell size={20} color="#6366f1" />;
  }
};

const getTypeStyles = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'event': return { bg: '#dbeafe', color: '#1e40af' };
    case 'program': return { bg: '#dcfce7', color: '#15803d' };
    case 'festival': return { bg: '#fef3c7', color: '#92400e' };
    case 'urgent': return { bg: '#fee2e2', color: '#991b1b' };
    case 'announcement': return { bg: '#fff1f2', color: '#9f1239' };
    case 'approval':
    case 'approved':
    case 'request':
    case 'registration':
    case 'student_registration':
      return { bg: '#dcfce7', color: '#047857' };
    default: return { bg: '#eef2ff', color: '#4338ca' };
  }
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible, userRole } = useAuth();
  const { refreshUnreadCount } = useUnreadNotifications();
  const lastScrollY = useRef(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const role = (await AsyncStorage.getItem('user_role')) || (await AsyncStorage.getItem('userRole')) || 'student';

      let endpoint = '/notifications/student/list';
      if (role.toLowerCase() === 'teacher') {
        endpoint = '/notifications/teacher/list';
      } else if (role.toLowerCase() === 'hm') {
        endpoint = '/notifications/hm/list';
      } else if (role.toLowerCase() === 'admin') {
        endpoint = '/notifications/admin/list';
      } else if (role.toLowerCase() === 'principal') {
        endpoint = '/notifications/principal/list';
      } else if (role.toLowerCase() === 'accountant') {
        endpoint = '/notifications/accountant/list';
      }

      const response = await API.get(endpoint);

      if (!isMounted.current) return;

      const items = response.data?.items || [];

      // Load read status from local storage for simulation if backend doesn't support it
      const readStatus = await AsyncStorage.getItem('read_notifications');
      const readIds = safeJsonParse<string[]>(readStatus, [], () => {
        AsyncStorage.setItem('read_notifications', JSON.stringify([])).catch(() => {});
      });

      setNotifications(items.map((item: any) => ({
        ...item,
        is_read: item.is_read || readIds.includes(item.id)
      })));
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      if (isMounted.current && err?.response?.status !== 401) {
        // Optional: show error message to user
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(false);
  }, []);

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const canDeleteServerSide = (userRole || '').toLowerCase() === 'hm' || (userRole || '').toLowerCase() === 'admin';

  const handleDeleteNotification = async (id?: string) => {
    const nid = id || selectedNotification?.id;
    if (!nid) return;

    const confirm = await new Promise<boolean>(resolve => {
      // @ts-ignore Alert types
      Alert.alert('Delete', 'Are you sure you want to delete this notification?', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });

    if (!confirm) return;

    try {
      setDeleting(true);
      if (canDeleteServerSide) {
        // Use HM delete endpoint — backend currently exposes /notifications/hm/delete/{id}
        await API.delete(`/notifications/hm/delete/${nid}`);
      }
      setNotifications(prev => prev.filter(n => n.id !== nid));
      setShowDetailModal(false);
      setSelectedNotification(null);
      // Refresh badge/context
      await refreshUnreadCount(true);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      Alert.alert('Error', 'Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  const getNotificationLabel = (item: Notification) => {
    const type = (item.type || '').toLowerCase();
    if (type === 'approval' || type === 'approved' || type === 'request' || type === 'registration' || type === 'student_registration') {
      return 'Student Approval';
    }
    return item.type?.toUpperCase();
  };

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      const readStatus = await AsyncStorage.getItem('read_notifications');
      const readIds = safeJsonParse<string[]>(readStatus, [], () => {
        AsyncStorage.setItem('read_notifications', JSON.stringify([])).catch(() => {});
      });
      if (!readIds.includes(id)) {
        readIds.push(id);
        await AsyncStorage.setItem('read_notifications', JSON.stringify(readIds));
        
        // Update badge count
        const unreadCount = Math.max(0, (notifications.length - readIds.length));
        await notificationService.updateBadgeCount(unreadCount);

        // Refresh context count
        await refreshUnreadCount(true);
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      const allIds = notifications.map(n => n.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await AsyncStorage.setItem('read_notifications', JSON.stringify(allIds));
      
      // Update badge count to 0
      await notificationService.updateBadgeCount(0);

      // Refresh context count
      await refreshUnreadCount(true);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    switch (userRole?.toLowerCase()) {
      case 'teacher':
        navigation.navigate('TeacherDashboard' as never);
        break;
      case 'hm':
        navigation.navigate('HMDashboard' as never);
        break;
      case 'principal':
        navigation.navigate('PrincipalDashboard' as never);
        break;
      case 'accountant':
        navigation.navigate('AccountantDashboard' as never);
        break;
      case 'admin':
        navigation.navigate('AdminDashboard' as never);
        break;
      case 'visitor':
        navigation.navigate('VisitorDashboard' as never);
        break;
      default:
        navigation.navigate('MainTabs' as never);
        break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      <View style={styles.heroHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <AppText style={styles.heroTitle}>Notifications</AppText>
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <CheckCheck size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContent}>
          <AppText style={styles.heroGreeting}>Notice Board</AppText>
          <AppText style={styles.heroSubtext}>Stay updated with the latest school announcements</AppText>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color="#cbd5e1" />
            <AppText style={styles.emptyTitle}>No Notifications</AppText>
            <AppText style={styles.emptyText}>You're all caught up! No new notices for you.</AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {notifications.map((item) => {
              const styles_type = getTypeStyles(item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                >
                  <AppCard style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
                    <View style={[styles.iconContainer, { backgroundColor: styles_type.bg }]}>
                      {getTypeIcon(item.type)}
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <AppText style={[styles.typeText, { color: styles_type.color }]}>{getNotificationLabel(item)}</AppText>
                        <AppText style={styles.dateText}>{formatDate(item.created_at)}</AppText>
                      </View>
                      <AppText style={styles.cardTitle}>{item.title}</AppText>
                      <AppText style={styles.cardDesc} numberOfLines={3}>{item.description}</AppText>
                      {item.event_date && (
                        <View style={styles.eventInfo}>
                          <Calendar size={12} color="#64748b" />
                          <AppText style={styles.eventDate}>Event Date: {formatDate(item.event_date)}</AppText>
                        </View>
                      )}
                    </View>
                    {!item.is_read && <View style={styles.unreadDot} />}
                    <TouchableOpacity
                      style={styles.cardDeleteBtn}
                      onPress={() => handleDeleteNotification(item.id)}
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </AppCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Notification Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#001F3F', '#08335e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <View style={styles.modalTitleRow}>
                <AppText style={styles.modalTitle}>Notification Details</AppText>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleDeleteNotification(selectedNotification?.id)} disabled={deleting} style={styles.modalActionBtn}>
                    <Trash2 size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {selectedNotification && (
                <>
                  <View style={styles.modalTypeContainer}>
                    <View style={[styles.modalTypeBadge, { backgroundColor: getTypeStyles(selectedNotification.type).bg }]}>
                      {getTypeIcon(selectedNotification.type)}
                      <AppText style={[styles.modalTypeText, { color: getTypeStyles(selectedNotification.type).color }]}>
                        {selectedNotification.type?.toUpperCase()}
                      </AppText>
                    </View>
                    <AppText style={styles.modalDateText}>
                      Received on {formatDate(selectedNotification.created_at)}
                    </AppText>
                  </View>

                  <AppText style={styles.modalFullTitle}>{selectedNotification.title}</AppText>

                  <View style={styles.divider} />

                  <AppText style={styles.modalDetailLabel}>Message</AppText>
                  <AppText style={styles.modalFullDesc}>
                    {selectedNotification.description}
                  </AppText>

                  {selectedNotification.event_date && (
                    <View style={styles.modalEventBox}>
                      <Calendar size={20} color="#3b82f6" />
                      <View>
                        <AppText style={styles.eventBoxLabel}>Scheduled Date</AppText>
                        <AppText style={styles.eventBoxValue}>
                          {formatDate(selectedNotification.event_date)}
                        </AppText>
                      </View>
                    </View>
                  )}
                </>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroHeader: {
    backgroundColor: '#001F3F',
    height: 180,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroContent: {
    marginTop: 20,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    backgroundColor: '#fff',
    shadowOpacity: 0.1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
    paddingRight: 34,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  eventDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    position: 'absolute',
    top: 15,
    right: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    padding: 20,
  },
  modalTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  modalTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalDateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalFullTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  modalDetailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalFullDesc: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalEventBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  eventBoxLabel: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '700',
  },
  eventBoxValue: {
    fontSize: 14,
    color: '#0c4a6e',
    fontWeight: '600',
  },
  modalActionBtn: {
    padding: 6,
    marginRight: 6,
  },
  cardDeleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
