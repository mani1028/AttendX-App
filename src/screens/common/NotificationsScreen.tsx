import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Calendar,
  Info,
  AlertTriangle,
  PartyPopper,
  Tent,
  CheckCheck,
  X,
  Trash2,
  BadgeCheck,
  MoreVertical,
  BellOff,
  Clock,
} from 'lucide-react-native';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import {
  addScopedNotificationId,
  loadScopedNotificationIds,
  saveScopedNotificationIds,
} from '../../utils/notificationStorage';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { notificationsStyles as styles } from '../../components/common/notifications/notificationsStyles';

import {
  NotificationCard,
  normalizeNotification,
  getTypeConfig,
  formatDate,
  formatFullDate,
  type Notification,
} from '../../components/common/notifications';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible, userRole } = useAuth();
  const { refreshUnreadCount } = useUnreadNotifications();
  const handleScroll = useScrollTabBar();
  const isAccountant = userRole?.toLowerCase() === 'accountant';
  const primaryColor = Theme.colors.gradientStart;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showActionMenu, setShowActionMenu] = useState<boolean>(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) {setLoading(true);}
    try {
      let normalizedRole = userRole?.toLowerCase() || '';
      if (normalizedRole !== 'principal' && normalizedRole !== 'student') {
        normalizedRole = 'staff';
      }
      const endpoint = `/notifications/${normalizedRole}/list`;

      const response = await API.get(endpoint);
      if (!isMounted.current) {return;}

      const items = response.data?.items || [];

      const [readIds, deletedIds] = await Promise.all([
        loadScopedNotificationIds('read'),
        loadScopedNotificationIds('deleted'),
      ]);

      const seenIds = new Set<string>();
      const deduplicated = items.filter((item: any) => {
        if (seenIds.has(item.id)) {return false;}
        seenIds.add(item.id);
        return true;
      });

      setNotifications(
        deduplicated
          .filter((item: any) => !deletedIds.includes(item.id))
          .map((item: any) => normalizeNotification({
            ...item,
            is_read: item.is_read || readIds.includes(item.id),
          }))
      );
    } catch (err: any) {
      if (isMounted.current && err?.response?.status !== 401) {
        console.error('Failed to fetch notifications:', err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(false);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      const readIds = await loadScopedNotificationIds('read');
      if (!readIds.includes(id)) {
        readIds.push(id);
        await saveScopedNotificationIds('read', readIds);
        const newUnreadCount = Math.max(0, notifications.length - readIds.length);
        await notificationService.updateBadgeCount(newUnreadCount);
        await refreshUnreadCount(true);
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const handleDeleteNotification = async (id?: string) => {
    const nid = id || selectedNotification?.id;
    if (!nid) {return;}

    const confirm = await new Promise<boolean>(resolve => {
      Alert.alert('Delete Notification', 'Remove this notification permanently?', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirm) {return;}

    try {
      setDeleting(true);
      await addScopedNotificationId('deleted', nid);
      setNotifications(prev => prev.filter(n => n.id !== nid));
      setShowDetailModal(false);
      setSelectedNotification(null);
      await refreshUnreadCount(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete notification.');
    } finally {
      setDeleting(false);
    }
  };

  const markAllRead = async () => {
    if (notifications.filter(n => !n.is_read).length === 0) { return; }
    try {
      const allIds = notifications.map(n => n.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await saveScopedNotificationIds('read', allIds);
      await notificationService.updateBadgeCount(0);
      await refreshUnreadCount(true);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteAllReadNotifications = async () => {
    const readNotifs = notifications.filter(n => n.is_read);
    if (readNotifs.length === 0) {
      Alert.alert('Nothing to Delete', 'There are no read notifications.');
      return;
    }
    const confirm = await new Promise<boolean>(resolve => {
      Alert.alert(
        'Delete Read Notifications',
        `This will permanently remove ${readNotifs.length} read notification${readNotifs.length !== 1 ? 's' : ''}.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete All', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirm) {return;}

    try {
      setDeleting(true);
      const deletedIds = readNotifs.map(n => n.id);
      await Promise.all(deletedIds.map(id => addScopedNotificationId('deleted', id)));
      setNotifications(prev => prev.filter(n => !n.is_read));
      await saveScopedNotificationIds('read', []);
      const unreads = notifications.filter(n => !n.is_read).length;
      await notificationService.updateBadgeCount(unreads);
      await refreshUnreadCount(true);
      setShowActionMenu(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete read notifications.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) { navigation.goBack(); return; }
    const roleMap: Record<string, string> = {
      teacher: 'TeacherDashboard',
      director: 'DirectorDashboard',
      accountant: 'AccountantDashboard',
      admin: 'AdminDashboard',
      visitor: 'VisitorDashboard',
    };
    navigation.navigate((roleMap[userRole?.toLowerCase() || ''] || 'MainTabs') as never);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scroll, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[
          styles.scrollContent,
          notifications.length === 0 && !loading && styles.scrollContentEmpty,
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
            colors={[primaryColor]}
          />
        }
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
              : notifications.length > 0
                ? `${notifications.length} notification${notifications.length !== 1 ? 's' : ''} · all read`
                : "You're all caught up!"
          }
          onBackPress={handleBackPress}
          rightActions={(
            <>
              <TouchableOpacity
                onPress={markAllRead}
                disabled={unreadCount === 0}
                style={[heroHeaderStyles.iconBtn, unreadCount === 0 && styles.iconBtnDisabled]}
              >
                <CheckCheck size={20} color={Theme.colors.card} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowActionMenu(true)} style={heroHeaderStyles.iconBtn}>
                <MoreVertical size={20} color={Theme.colors.card} />
              </TouchableOpacity>
            </>
          )}
        />

        {loading ? (
          <View style={styles.centeredState}>
            <ScreenSkeleton variant="list" />
            <AppText style={styles.loadingText}>Loading notifications…</AppText>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconRing,
                { backgroundColor: isAccountant ? Theme.colors.violetLight : Theme.colors.blueLight },
              ]}
            >
              <BellOff size={40} color={primaryColor} />
            </View>
            <AppText style={styles.emptyTitle}>No Notifications</AppText>
            <AppText style={styles.emptySubtitle}>
              You're all caught up! New alerts{'\n'}will appear here.
            </AppText>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {notifications.map(item => (
              <NotificationCard
                key={item.id}
                item={item}
                onPress={() => handleNotificationPress(item)}
                onDelete={() => handleDeleteNotification(item.id)}
              />
            ))}
          </View>
        )}
        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Action Menu Sheet ── */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.detailBackdrop}
            activeOpacity={1}
            onPress={() => setShowActionMenu(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <AppText style={styles.sheetTitle}>Actions</AppText>

            <TouchableOpacity
              style={[styles.sheetItem, unreadCount === 0 && styles.sheetItemDisabled]}
              disabled={unreadCount === 0}
              onPress={() => { markAllRead(); setShowActionMenu(false); }}
            >
              <View style={[styles.sheetItemIcon, { backgroundColor: '#ecfdf5' }]}>
                <CheckCheck size={20} color={unreadCount === 0 ? Theme.colors.textMuted : Theme.colors.success} />
              </View>
              <View style={styles.sheetItemText}>
                <AppText style={[styles.sheetItemLabel, unreadCount === 0 && styles.sheetItemLabelDisabled]}>
                  Mark All as Read
                </AppText>
                <AppText style={styles.sheetItemHint}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'No unread messages'}
                </AppText>
              </View>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={deleteAllReadNotifications}
              disabled={deleting}
            >
              <View style={[styles.sheetItemIcon, { backgroundColor: '#fef2f2' }]}>
                <Trash2 size={20} color={Theme.colors.error} />
              </View>
              <View style={styles.sheetItemText}>
                <AppText style={[styles.sheetItemLabel, { color: Theme.colors.error }]}>
                  Delete All Read
                </AppText>
                <AppText style={styles.sheetItemHint}>
                  {notifications.filter(n => n.is_read).length} read notifications
                </AppText>
              </View>
            </TouchableOpacity>

            <View style={{ height: insets.bottom + (Platform.OS === 'ios' ? 8 : 16) }} />
          </View>
        </View>
      </Modal>

      {/* ── Detail Bottom Sheet ── */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity
            style={styles.detailBackdrop}
            activeOpacity={1}
            onPress={() => setShowDetailModal(false)}
          />
          {selectedNotification ? (
            <View style={styles.detailSheet}>
              {(() => {
                const cfg = getTypeConfig(selectedNotification.type);
                const title = selectedNotification.title || 'Notification';
                const body = selectedNotification.description || 'No message provided.';
                return (
                  <>
                    <View style={styles.sheetHandle} />

                    <View style={styles.detailHeader}>
                      <View style={[styles.detailIconRing, { backgroundColor: cfg.bg }]}>
                        {React.cloneElement(cfg.icon as React.ReactElement<any>, {
                          size: 28,
                          color: cfg.color,
                        })}
                      </View>
                      <View style={styles.detailHeaderActions}>
                        <TouchableOpacity
                          onPress={() => handleDeleteNotification(selectedNotification.id)}
                          disabled={deleting}
                          style={[styles.detailActionBtn, { backgroundColor: '#fef2f2' }]}
                        >
                          <Trash2 size={16} color={Theme.colors.error} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowDetailModal(false)}
                          style={[styles.detailActionBtn, { backgroundColor: Theme.colors.background }]}
                        >
                          <X size={16} color={Theme.colors.textSec} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.detailMetaRow}>
                      <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                        <AppText style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</AppText>
                      </View>
                      <View style={styles.timeRow}>
                        <Clock size={11} color={Theme.colors.textMuted} />
                        <AppText style={styles.timeText}>
                          {formatDate(selectedNotification.created_at)}
                        </AppText>
                      </View>
                    </View>

                    <ScrollView
                      style={styles.detailScrollArea}
                      contentContainerStyle={styles.detailScrollContent}
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                      nestedScrollEnabled
                    >
                      <AppText style={styles.detailTitle}>{title}</AppText>

                      <View style={styles.detailDivider} />

                      <AppText style={styles.detailSectionLabel}>MESSAGE</AppText>
                      <AppText style={styles.detailBody} selectable>
                        {body}
                      </AppText>

                      {selectedNotification.event_date ? (
                        <View style={[styles.detailEventBox, { backgroundColor: cfg.bg }]}>
                          <Calendar size={20} color={cfg.color} />
                          <View>
                            <AppText style={[styles.detailEventLabel, { color: cfg.color }]}>
                              Scheduled Date
                            </AppText>
                            <AppText style={styles.detailEventValue}>
                              {formatFullDate(selectedNotification.event_date)}
                            </AppText>
                          </View>
                        </View>
                      ) : null}

                      <AppText style={styles.detailReceivedOn}>
                        Received · {formatFullDate(selectedNotification.created_at)}
                      </AppText>
                    </ScrollView>
                  </>
                );
              })()}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
