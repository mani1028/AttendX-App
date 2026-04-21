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
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';

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

const isNotificationNew = (createdAt: string): boolean => {
  if (!createdAt) return false;
  const diff = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
  return diff < 60;
};

export default function NotificationPanel({ type = 'student', isHM = false }) {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previousCount, setPreviousCount] = useState(-1);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const canDelete = type === 'hm' || isHM;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const schoolCode = await getSchoolCode();
      const branchId = await getBranchId();
      let endpoint = '/notifications/student/list';
      if (type === 'teacher') endpoint = '/notifications/teacher/list';
      else if (type === 'hm') endpoint = '/notifications/hm/list';

      const res = await API.get(endpoint, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        },
      });
      const newItems = res.data?.items || [];
      setNotifications(newItems);
      if (previousCount >= 0 && newItems.length > previousCount) {
        const added = newItems.length - previousCount;
        const msg = added === 1 ? `📢 new notification: ${newItems[0]?.title}` : `📢 ${added} new notifications`;
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
      setPreviousCount(newItems.length);
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
    fetchNotifications(); // initial load for badge
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      const schoolCode = await getSchoolCode();
      const branchId = await getBranchId();
      await API.delete(`/notifications/hm/delete/${id}`, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        },
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleViewAll = () => {
    setVisible(false);
    if (type === 'student') navigation.navigate('Notifications' as never);
    else if (type === 'teacher') navigation.navigate('Notifications' as never);
  };

  const unreadCount = notifications.filter(n => isNotificationNew(n.created_at)).length;

  const renderItem = ({ item }: { item: Notification }) => {
    const isNew = isNotificationNew(item.created_at);
    return (
      <TouchableOpacity style={[styles.notificationItem, isNew && styles.newItem]} onPress={() => {}}>
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
        <Text style={styles.bellIcon}>🔔</Text>
        {notifications.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount || notifications.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{type === 'hm' ? 'Posted Notifications' : 'School Updates'}</Text>
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
          </View>
        </View>
      </Modal>

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
  bellIcon: { fontSize: 20 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
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