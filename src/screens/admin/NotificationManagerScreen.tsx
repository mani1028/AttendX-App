import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, Modal, Platform } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Send,
  Plus,
  Trash2,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import { Theme } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import { notificationManagerStyles as styles } from '../../components/admin/notificationManager/notificationManagerStyles';

interface Notification {
  id: string;
  title: string;
  message: string;
  target_role: string;
  priority: string;
  status: string;
  created_at: string;
  sent_by?: string;
}

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const TARGET_OPTIONS = ['all', 'principal', 'teacher', 'student', 'staff'];
const STATUS_OPTIONS = ['all', 'sent', 'pending', 'failed'];

const priorityColor: Record<string, string> = {
  low: Theme.colors.textMuted,
  normal: Theme.colors.blue,
  high: Theme.colors.warning,
  urgent: Theme.colors.error,
};

const NotificationManagerScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Compose state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeTarget, setComposeTarget] = useState('all');
  const [composePriority, setComposePriority] = useState('normal');
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (filterRole !== 'all') params.target_role = filterRole;
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await API.get('notifications/admin/list', { params });
      const data = response.data;
      const list = Array.isArray(data) ? data : (data.notifications || data.data || data.items || []);
      setNotifications(list.map((n: any) => ({
        id: String(n.id ?? n._id ?? ''),
        title: n.title ?? '',
        message: n.message ?? n.body ?? '',
        target_role: n.target_role ?? n.target ?? 'all',
        priority: n.priority ?? 'normal',
        status: n.status ?? 'sent',
        created_at: n.created_at ?? n.sent_at ?? '',
        sent_by: n.sent_by ?? '',
      })));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterRole, filterStatus]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSendNotification = async () => {
    if (!composeTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!composeMessage.trim()) {
      Alert.alert('Error', 'Message is required');
      return;
    }

    setSending(true);
    try {
      await API.post('notifications/admin/send', {
        title: composeTitle.trim(),
        message: composeMessage.trim(),
        target_role: composeTarget,
        priority: composePriority,
      });
      Alert.alert('Success', 'Notification sent successfully');
      setShowComposeModal(false);
      resetCompose();
      fetchNotifications();
    } catch (error) {
      Alert.alert('Error', formatErrorMessage(error) || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert('Delete', 'Delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`notifications/admin/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
          } catch (error) {
            Alert.alert('Error', formatErrorMessage(error) || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const resetCompose = () => {
    setComposeTitle('');
    setComposeMessage('');
    setComposeTarget('all');
    setComposePriority('normal');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderNotificationCard = (item: Notification) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: (priorityColor[item.priority] || Theme.colors.textMuted) + '20' }]}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor[item.priority] || Theme.colors.textMuted }]} />
          <AppText style={[styles.priorityText, { color: priorityColor[item.priority] || Theme.colors.textMuted }]}>
            {item.priority.toUpperCase()}
          </AppText>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteNotification(item.id)}
        >
          <Trash2 size={16} color={Theme.colors.error || Theme.colors.error} />
        </TouchableOpacity>
      </View>

      <AppText style={styles.cardTitle} numberOfLines={2}>{item.title}</AppText>
      <AppText style={styles.cardMessage} numberOfLines={3}>{item.message}</AppText>

      <View style={styles.cardFooter}>
        <View style={styles.tag}>
          <Bell size={12} color={Theme.colors.textSec} />
          <AppText style={styles.tagText}>{item.target_role}</AppText>
        </View>
        <AppText style={styles.dateText}>{formatDate(item.created_at)}</AppText>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          title="Notification Manager"
          onBackPress={() => safeGoBack(navigation as any)}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Filter size={16} color={Theme.colors.primary} />
            <AppText style={styles.filterBtnText}>Filter</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.composeBtn} onPress={() => setShowComposeModal(true)}>
            <Plus size={18} color={Theme.colors.card} />
            <AppText style={styles.composeBtnText}>New Notification</AppText>
          </TouchableOpacity>
        </View>

        {(filterRole !== 'all' || filterStatus !== 'all') && (
          <View style={styles.activeFilters}>
            {filterRole !== 'all' && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilterRole('all')}>
                <AppText style={styles.filterChipText}>{filterRole}</AppText>
                <X size={12} color={Theme.colors.primary} />
              </TouchableOpacity>
            )}
            {filterStatus !== 'all' && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setFilterStatus('all')}>
                <AppText style={styles.filterChipText}>{filterStatus}</AppText>
                <X size={12} color={Theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <ScreenSkeleton variant="list" />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={Theme.colors.border} />
            <AppText style={styles.emptyText}>No notifications found</AppText>
            <AppText style={styles.emptySubtext}>Send your first notification using the button above</AppText>
          </View>
        ) : (
          notifications.map(renderNotificationCard)
        )}
        </View>
      </ScrollView>

      {/* Compose Modal */}
      <Modal visible={showComposeModal} animationType="slide" transparent onRequestClose={() => { setShowComposeModal(false); resetCompose(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>New Notification</AppText>
              <TouchableOpacity onPress={() => { setShowComposeModal(false); resetCompose(); }}>
                <X size={24} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
              <AppText style={styles.label}>Title</AppText>
              <TextInput
                style={styles.input}
                value={composeTitle}
                onChangeText={setComposeTitle}
                placeholder="Notification title"
                placeholderTextColor={Theme.colors.textMuted}
              />

              <AppText style={styles.label}>Message</AppText>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={composeMessage}
                onChangeText={setComposeMessage}
                placeholder="Notification message"
                placeholderTextColor={Theme.colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <AppText style={styles.label}>Target Audience</AppText>
              <View style={styles.optionRow}>
                {TARGET_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionChip, composeTarget === opt && styles.optionChipActive]}
                    onPress={() => setComposeTarget(opt)}
                  >
                    <AppText style={[styles.optionText, composeTarget === opt && styles.optionTextActive]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppText style={styles.label}>Priority</AppText>
              <View style={styles.optionRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionChip,
                      composePriority === opt && { backgroundColor: priorityColor[opt] || Theme.colors.primary },
                    ]}
                    onPress={() => setComposePriority(opt)}
                  >
                    <AppText style={[
                      styles.optionText,
                      composePriority === opt && { color: Theme.colors.card },
                    ]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowComposeModal(false); resetCompose(); }}
              >
                <AppText style={styles.cancelBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSendNotification}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Theme.colors.card} />
                ) : (
                  <>
                    <Send size={16} color={Theme.colors.card} />
                    <AppText style={styles.sendBtnText}>Send</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Filter Notifications</AppText>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <AppText style={styles.label}>Target Role</AppText>
              <View style={styles.optionRow}>
                {['all', ...TARGET_OPTIONS].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionChip, filterRole === opt && styles.optionChipActive]}
                    onPress={() => setFilterRole(opt)}
                  >
                    <AppText style={[styles.optionText, filterRole === opt && styles.optionTextActive]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppText style={styles.label}>Status</AppText>
              <View style={styles.optionRow}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionChip, filterStatus === opt && styles.optionChipActive]}
                    onPress={() => setFilterStatus(opt)}
                  >
                    <AppText style={[styles.optionText, filterStatus === opt && styles.optionTextActive]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setFilterRole('all'); setFilterStatus('all'); setShowFilterModal(false); }}
              >
                <AppText style={styles.cancelBtnText}>Reset</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <AppText style={styles.sendBtnText}>Apply</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NotificationManagerScreen;
