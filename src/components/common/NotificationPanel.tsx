import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell } from 'lucide-react-native';
import eventEmitter from '../../utils/eventEmitter';
import { isJwtExpired } from '../../utils/jwt';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import BottomSheetModal from './BottomSheetModal';
import { safeJsonParse } from '../../utils/storage';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { addScopedNotificationId, loadScopedNotificationIds, saveScopedNotificationIds } from '../../utils/notificationStorage';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  event_date?: string;
  created_at: string;
}

const getSchoolCode = async () => (await AsyncStorage.getItem('school_code')) || '';
const getBranchId = async () => (await AsyncStorage.getItem('branch_id')) || '';

const isNotificationNew = (id: string, readIds: string[]): boolean => {
  return !readIds.includes(id);
};

export default function NotificationPanel({ type = 'student', isDirector = false }) {
  const navigation = useNavigation();
  const { refreshUnreadCount } = useUnreadNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previousCount, setPreviousCount] = useState(-1);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const canDelete = type === 'director' || isDirector;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = (await AsyncStorage.getItem('token')) || null;
      if (!token || isJwtExpired(token)) {
        // stop background polling by emitting logout and skip fetch
        eventEmitter.emit('app-logout');
        setNotifications([]);
        setLoading(false);
        return;
      }
      const schoolCode = await getSchoolCode();
      const branchId = await getBranchId();

      // Use role-based endpoint pattern consistent with useUnreadNotifications hook
      const endpoint = `/notifications/${type.toLowerCase()}/list`;

      const res = await API.get(endpoint, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        },
      });
      const newItems = res.data?.items || res.data?.data || [];
      
      // Deduplicate notifications by ID (prevents duplicate display if backend returns duplicates)
      const seenIds = new Set<string>();
      const deduplicatedItems = newItems.filter((item: any) => {
        if (seenIds.has(item.id)) {
          console.warn('Duplicate notification detected in panel, filtering:', item.id);
          return false;
        }
        seenIds.add(item.id);
        return true;
      });
      
      setNotifications(deduplicatedItems);

      const [currentReadIds, deletedIds] = await Promise.all([
        loadScopedNotificationIds('read'),
        loadScopedNotificationIds('deleted'),
      ]);
      setReadIds(currentReadIds);

      const visibleItems = deduplicatedItems.filter((item: any) => !deletedIds.includes(item.id));

      if (previousCount >= 0 && visibleItems.length > previousCount) {
        const added = visibleItems.length - previousCount;
        const msg = added === 1 ? `📢 new notification: ${visibleItems[0]?.title}` : `📢 ${added} new notifications`;
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
      setPreviousCount(visibleItems.length);

      setNotifications(visibleItems);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [type, previousCount]);

  useEffect(() => {
    if (visible) fetchNotifications();
  }, [visible, fetchNotifications]);

  useEffect(() => {
    fetchNotifications(); // initial load
  }, [fetchNotifications]);

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await addScopedNotificationId('deleted', id);
      // Remove all copies of this notification (handles duplicates)
      setNotifications(prev => prev.filter(n => n.id !== id));
      await refreshUnreadCount(true);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      Alert.alert('Error', 'Failed to delete notification. Please try again.');
    }
  };

  const handleViewAll = () => {
    setVisible(false);
    navigation.navigate('Notifications' as never);
  };

  const unreadCount = notifications.filter(n => isNotificationNew(n.id, readIds)).length;

  const renderItem = ({ item }: { item: Notification }) => {
    const isNew = isNotificationNew(item.id, readIds);
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isNew && styles.newItem]}
        onPress={async () => {
          // Mark as read when clicked
          if (isNew) {
            const newReadIds = [...readIds, item.id];
            setReadIds(newReadIds);
            await saveScopedNotificationIds('read', newReadIds);
            await refreshUnreadCount(true);
          }
        }}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type || 'Event'}</Text>
          </View>
          {isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>New</Text></View>}
        </View>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.notifFooter}>
          {item.event_date && <Text style={styles.footerText}>📅 {item.event_date}</Text>}
          <Text style={styles.footerText}>{new Date(item.created_at).toLocaleDateString()}</Text>
          {canDelete && (
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.bellButton} onPress={() => setVisible(true)}>
        <Bell size={22} color="#f1f5f9" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <BottomSheetModal visible={visible} onClose={() => setVisible(false)} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{type === 'director' ? 'Posted Notifications' : 'School Updates'}</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text>No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications.slice(0, 5)}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
        {!loading && notifications.length > 0 && (type === 'student' || type === 'teacher') && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.viewAllBtn} onPress={handleViewAll}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetModal>

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: { position: 'relative', padding: 8 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 11,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  modalContent: { backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  closeText: { fontSize: 20, color: '#64748b', padding: 4 },
  loader: { margin: 40 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8, opacity: 0.5 },
  notificationItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  newItem: { backgroundColor: '#f0f9ff', borderLeftWidth: 3, borderLeftColor: '#0c4a6e' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, fontWeight: '600', color: '#0c4a6e', textTransform: 'uppercase' },
  newBadge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  notifTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#0f172a' },
  notifDesc: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  notifFooter: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 11, color: '#94a3b8' },
  deleteText: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  viewAllBtn: { alignItems: 'center' },
  viewAllText: { color: '#0c4a6e', fontWeight: '600' },
  toast: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center', zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '600' },
});