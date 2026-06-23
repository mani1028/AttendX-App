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

import BottomSheetModal from './BottomSheetModal';
import { safeJsonParse } from '../../utils/storage';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { addScopedNotificationId, loadScopedNotificationIds, saveScopedNotificationIds } from '../../utils/notificationStorage';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';



interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  event_date?: string;
  created_at: string;
}

const getSchoolCode = async () => (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
const getBranchId = async () => (await storage.getString(StorageKeys.BRANCH_ID)) || '';

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
      const token = (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || null;
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
      const normalizedType = (type.toLowerCase() === 'accountant' || type.toLowerCase() === 'teacher') ? 'staff' : type.toLowerCase();
      const endpoint = `/notifications/${normalizedType}/list`;

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
    if (visible) {fetchNotifications();}
  }, [visible, fetchNotifications]);

  useEffect(() => {
    fetchNotifications(); // initial load
  }, [fetchNotifications]);

  const handleDelete = async (id: string) => {
    if (!canDelete) {return;}
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
      <TouchableOpacity accessibilityRole="button"
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
            <TouchableOpacity accessibilityRole="button" onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity accessibilityRole="button" style={styles.bellButton} onPress={() => setVisible(true)}>
        <Bell size={22} color={Theme.colors.background} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <BottomSheetModal visible={visible} onClose={() => setVisible(false)} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{type === 'director' ? 'Posted Notifications' : 'School Updates'}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setVisible(false)}>
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
            <TouchableOpacity accessibilityRole="button" style={styles.viewAllBtn} onPress={handleViewAll}>
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
  bellButton: { position: 'relative', padding: Theme.spacing.sm },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Theme.colors.error,
    borderRadius: 11,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.card,
  },
  badgeText: { color: Theme.colors.card, fontSize: 10, fontWeight: '900' },
  modalContent: { backgroundColor: Theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  closeText: { fontSize: 20, color: Theme.colors.textSec, padding: Theme.spacing.xs },
  loader: { margin: 40 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: Theme.spacing.sm, opacity: 0.5 },
  notificationItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.background },
  newItem: { backgroundColor: '#f0f9ff', borderLeftWidth: 3, borderLeftColor: '#0c4a6e' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, fontWeight: '600', color: '#0c4a6e', textTransform: 'uppercase' },
  newBadge: { backgroundColor: Theme.colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: Theme.colors.card },
  notifTitle: { ...Theme.typography.body, fontWeight: '600', marginBottom: Theme.spacing.xs, color: Theme.colors.text },
  notifDesc: { fontSize: 13, color: Theme.colors.textSec, marginBottom: 6 },
  notifFooter: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: Theme.spacing.xs },
  footerText: { ...Theme.typography.label, color: '#94a3b8' },
  deleteText: { ...Theme.typography.label, color: Theme.colors.error, fontWeight: '600' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  viewAllBtn: { alignItems: 'center' },
  viewAllText: { color: '#0c4a6e', fontWeight: '600' },
  toast: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: Theme.colors.error, padding: 12, borderRadius: 8, alignItems: 'center', zIndex: 1000 },
  toastText: { color: Theme.colors.card, fontWeight: '600' },
});
