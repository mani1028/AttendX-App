import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
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
  Sparkles,
} from 'lucide-react-native';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import {
  addScopedNotificationId,
  loadScopedNotificationIds,
  saveScopedNotificationIds,
} from '../../utils/notificationStorage';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  event_date: string | null;
  created_at: string;
  is_read?: boolean;
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; color: string; gradientColors: string[]; label: string }
> = {
  event: {
    icon: <Calendar size={18} color={Theme.colors.blue} />,
    bg: '#eff6ff',
    color: Theme.colors.blue,
    gradientColors: ['#dbeafe', '#eff6ff'],
    label: 'EVENT',
  },
  program: {
    icon: <Tent size={18} color={Theme.colors.success} />,
    bg: '#ecfdf5',
    color: Theme.colors.success,
    gradientColors: ['#d1fae5', '#ecfdf5'],
    label: 'PROGRAM',
  },
  festival: {
    icon: <PartyPopper size={18} color="#d97706" />,
    bg: '#fffbeb',
    color: '#d97706',
    gradientColors: ['#fef3c7', '#fffbeb'],
    label: 'FESTIVAL',
  },
  urgent: {
    icon: <AlertTriangle size={18} color={Theme.colors.error} />,
    bg: '#fef2f2',
    color: Theme.colors.error,
    gradientColors: ['#fee2e2', '#fef2f2'],
    label: 'URGENT',
  },
  announcement: {
    icon: <Info size={18} color="#0ea5e9" />,
    bg: '#f0f9ff',
    color: '#0ea5e9',
    gradientColors: ['#e0f2fe', '#f0f9ff'],
    label: 'ANNOUNCEMENT',
  },
  approval: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: '#ecfdf5',
    color: Theme.colors.success,
    gradientColors: ['#d1fae5', '#ecfdf5'],
    label: 'APPROVAL',
  },
  approved: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: '#ecfdf5',
    color: Theme.colors.success,
    gradientColors: ['#d1fae5', '#ecfdf5'],
    label: 'APPROVED',
  },
  request: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: '#ecfdf5',
    color: Theme.colors.success,
    gradientColors: ['#d1fae5', '#ecfdf5'],
    label: 'REQUEST',
  },
  registration: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: '#ecfdf5',
    color: Theme.colors.success,
    gradientColors: ['#d1fae5', '#ecfdf5'],
    label: 'REGISTRATION',
  },
  student_registration: {
    icon: <BadgeCheck size={18} color={Theme.colors.success} />,
    bg: '#ecfdf5',
    color: Theme.colors.success,
    gradientColors: ['#d1fae5', '#ecfdf5'],
    label: 'STUDENT REG.',
  },
};

const getTypeConfig = (type: string) => {
  return (
    TYPE_CONFIG[type?.toLowerCase()] || {
      icon: <Bell size={18} color={Theme.colors.primary} />,
      bg: '#eef2ff',
      color: Theme.colors.primary,
      gradientColors: ['#e0e7ff', '#eef2ff'],
      label: (type || 'GENERAL').toUpperCase(),
    }
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {return 'Just now';}
  if (diffMins < 60) {return `${diffMins}m ago`;}
  if (diffHours < 24) {return `${diffHours}h ago`;}
  if (diffDays < 7) {return `${diffDays}d ago`;}
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatFullDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

// ─── Notification Card ────────────────────────────────────────────────────────
function NotificationCard({
  item,
  onPress,
  onDelete,
}: {
  item: Notification;
  onPress: () => void;
  onDelete: () => void;
}) {
  const cfg = getTypeConfig(item.type);
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: pressAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.card, !item.is_read && styles.cardUnread]}>
          {/* Unread accent bar */}
          {!item.is_read && <View style={[styles.unreadBar, { backgroundColor: cfg.color }]} />}

          <View style={styles.cardInner}>
            {/* Icon badge */}
            <View style={[styles.iconBadge, { backgroundColor: cfg.bg }]}>
              {cfg.icon}
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                  <AppText style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</AppText>
                </View>
                <View style={styles.timeRow}>
                  <Clock size={10} color="#94a3b8" />
                  <AppText style={styles.timeText}>{formatDate(item.created_at)}</AppText>
                </View>
              </View>

              <AppText style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </AppText>

              {item.event_date && (
                <View style={styles.eventChip}>
                  <Calendar size={11} color={cfg.color} />
                  <AppText style={[styles.eventChipText, { color: cfg.color }]}>
                    {formatFullDate(item.event_date)}
                  </AppText>
                </View>
              )}
            </View>

            {/* Actions column */}
            <View style={styles.cardActions}>
              {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={14} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible, userRole } = useAuth();
  const { refreshUnreadCount } = useUnreadNotifications();
  const handleScroll = useScrollTabBar();
  const isAccountant = userRole?.toLowerCase() === 'accountant';
  const headerColors = isAccountant ? ['#6648dc', '#818cf8'] : [Theme.colors.primary, '#2563eb'];
  const primaryColor = isAccountant ? '#6648dc' : Theme.colors.primary;

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
          .map((item: any) => ({ ...item, is_read: item.is_read || readIds.includes(item.id) }))
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


      {/* ── Hero Header ── */}
      <LinearGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative circles */}
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        {/* Top bar */}
        <View style={styles.headerTopBar}>
          <TouchableOpacity onPress={handleBackPress} style={styles.iconBtn}>
            <ChevronLeft size={22} color={Theme.colors.card} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={markAllRead} style={styles.iconBtn}>
              <CheckCheck size={20} color={Theme.colors.card} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowActionMenu(true)} style={styles.iconBtn}>
              <MoreVertical size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title area */}
        <View style={styles.headerContent}>
          <View style={styles.headerIconRing}>
            <Bell size={26} color={Theme.colors.card} />
          </View>
          <View style={styles.headerTextBlock}>
            <AppText style={styles.headerTitle}>Notifications</AppText>
            <AppText style={styles.headerSubtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
                : "You're all caught up!"}
            </AppText>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <AppText style={styles.unreadBadgeText}>{unreadCount}</AppText>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── List ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={primaryColor} />
            <AppText style={styles.loadingText}>Loading notifications…</AppText>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={isAccountant ? ['#f3e8ff', '#f5f3ff'] : ['#eff6ff', '#dbeafe']}
              style={styles.emptyIconRing}
            >
              <BellOff size={40} color={primaryColor} />
            </LinearGradient>
            <AppText style={styles.emptyTitle}>No Notifications</AppText>
            <AppText style={styles.emptySubtitle}>
              You're all caught up! New alerts{'\n'}will appear here.
            </AppText>
          </View>
        ) : (
          <>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Sparkles size={14} color={primaryColor} />
              <AppText style={[styles.sectionHeaderText, { color: primaryColor }]}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </AppText>
            </View>

            {notifications.map(item => (
              <NotificationCard
                key={item.id}
                item={item}
                onPress={() => handleNotificationPress(item)}
                onDelete={() => handleDeleteNotification(item.id)}
              />
            ))}
          </>
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
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <AppText style={styles.sheetTitle}>Actions</AppText>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => { markAllRead(); setShowActionMenu(false); }}
            >
              <View style={[styles.sheetItemIcon, { backgroundColor: '#ecfdf5' }]}>
                <CheckCheck size={20} color={Theme.colors.success} />
              </View>
              <View style={styles.sheetItemText}>
                <AppText style={styles.sheetItemLabel}>Mark All as Read</AppText>
                <AppText style={styles.sheetItemHint}>{unreadCount} unread</AppText>
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

            <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Detail Bottom Sheet ── */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {selectedNotification && (() => {
              const cfg = getTypeConfig(selectedNotification.type);
              return (
                <>
                  {/* Sheet handle */}
                  <View style={styles.sheetHandle} />

                  {/* Header */}
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconRing, { backgroundColor: cfg.bg }]}>
                      {React.cloneElement(cfg.icon as React.ReactElement<any>, { size: 28, color: cfg.color })}
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

                  {/* Meta row */}
                  <View style={styles.detailMetaRow}>
                    <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                      <AppText style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</AppText>
                    </View>
                    <View style={styles.timeRow}>
                      <Clock size={11} color="#94a3b8" />
                      <AppText style={styles.timeText}>{formatDate(selectedNotification.created_at)}</AppText>
                    </View>
                  </View>

                  <ScrollView
                    style={styles.detailScrollArea}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <AppText style={styles.detailTitle}>{selectedNotification.title}</AppText>

                    <View style={styles.detailDivider} />

                    <AppText style={styles.detailSectionLabel}>MESSAGE</AppText>
                    <AppText style={styles.detailBody}>{selectedNotification.description}</AppText>

                    {selectedNotification.event_date && (
                      <LinearGradient
                        colors={cfg.gradientColors}
                        style={styles.detailEventBox}
                      >
                        <Calendar size={20} color={cfg.color} />
                        <View>
                          <AppText style={[styles.detailEventLabel, { color: cfg.color }]}>
                            Scheduled Date
                          </AppText>
                          <AppText style={styles.detailEventValue}>
                            {formatFullDate(selectedNotification.event_date)}
                          </AppText>
                        </View>
                      </LinearGradient>
                    )}

                    <AppText style={styles.detailReceivedOn}>
                      Received · {formatFullDate(selectedNotification.created_at)}
                    </AppText>

                    <View style={{ height: 24 }} />
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },

  // Header
  header: {
    paddingBottom: 28,
    paddingHorizontal: 20,


    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  decCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: 60,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTextBlock: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.card,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  unreadBadgeText: {
    color: Theme.colors.card,
    fontSize: 13,
    fontWeight: '800',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Theme.spacing.md, paddingBottom: 40 },

  // States
  centeredState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  loadingText: {
    ...Theme.typography.body,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    ...Theme.typography.body,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: Theme.colors.card,
    marginHorizontal: Theme.spacing.md,
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  cardUnread: {
    borderColor: 'rgba(59,130,246,0.2)',
    backgroundColor: '#fafcff',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    borderTopLeftRadius: 18,

  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingLeft: 18,
    gap: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typePill: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cardTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
    letterSpacing: -0.1,
  },
  cardTitleUnread: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  cardDesc: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  eventChipText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardActions: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  // Action Menu Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.border,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Theme.spacing.sm,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  sheetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetItemText: { flex: 1 },
  sheetItemLabel: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  sheetItemHint: {
    ...Theme.typography.caption,
    color: '#94a3b8',
    marginTop: 1,
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Theme.colors.background,
    marginVertical: 2,
  },

  // Detail Sheet
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: Theme.spacing.xs,
  },
  detailIconRing: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  detailScrollArea: { maxHeight: 480 },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 14,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Theme.colors.background,
    marginBottom: 14,
  },
  detailSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.sm,
  },
  detailBody: {
    ...Theme.typography.bodyMd,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '400',
  },
  detailEventBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Theme.spacing.md,
    borderRadius: 16,
    marginBottom: 20,
  },
  detailEventLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  detailEventValue: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  detailReceivedOn: {
    ...Theme.typography.caption,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
});
