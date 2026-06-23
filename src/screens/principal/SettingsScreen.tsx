import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Settings,
  Check,
  Info,
  Save,
  Calendar,
  Bell,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';





export default function PrincipalSettingsPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dailySessions, setDailySessions] = useState<1 | 2>(1);
  const [marksNotificationEnabled, setMarksNotificationEnabled] = useState(true);
  const [manualAttendanceEnabled, setManualAttendanceEnabled] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  // Load credentials from storage
  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode && branchId) {
      loadSettings();
    }
  }, [schoolCode, branchId]);

  const loadCredentials = async () => {
    try {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';

      const branch = await storage.getString(StorageKeys.BRANCH_ID) ||
        await storage.getString(StorageKeys.BRANCH_ID) ||
        await AsyncStorage.getItem('branch_code') ||
        await AsyncStorage.getItem('branchCode') || '';

      setSchoolCode(code);
      setBranchId(branch);
    } catch (error) {
      console.error('Error loading credentials:', error);
      setMsgType('error');
      setMsg('Failed to load credentials');
    }
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'x-school-code': schoolCode,
    'X-Branch-Id': branchId,
    'x-branch-id': branchId,
  });

  const loadSettings = async () => {
    if (!schoolCode || !branchId) {return;}

    setLoading(true);
    try {
      const [attendanceRes, marksNotifRes] = await Promise.all([
        API.get('/principal/attendance/settings', { headers: getHeaders() }),
        API.get('/principal/marks-notification/settings', { headers: getHeaders() }),
      ]);
      const appSettingsStr = await AsyncStorage.getItem('app_settings');
      if (appSettingsStr) {
        try {
          const appSettings = JSON.parse(appSettingsStr);
          setPushNotificationsEnabled(appSettings.notifications ?? true);
        } catch (e) {}
      }
      setDailySessions(Number(attendanceRes.data?.daily_sessions || 1) === 2 ? 2 : 1);
      setManualAttendanceEnabled(Boolean(attendanceRes.data?.enable_manual_attendance ?? false));
      setMarksNotificationEnabled(Boolean(marksNotifRes.data?.enabled ?? true));
      setMsg('');
    } catch (err: any) {
      setMsgType('error');
      const detail = err?.response?.data?.detail || 'Failed to load settings.';
      setMsg(String(detail));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const saveSettings = async () => {
    if (!schoolCode || !branchId) {
      Alert.alert('Error', 'School code or branch ID missing');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const value = Number(dailySessions) === 2 ? 2 : 1;
      await Promise.all([
        API.put('/principal/attendance/settings', {
          daily_sessions: value,
          enable_manual_attendance: Boolean(manualAttendanceEnabled),
        }, { headers: getHeaders() }),
        API.put('/principal/marks-notification/settings', { enabled: Boolean(marksNotificationEnabled) }, { headers: getHeaders() }),
      ]);

      const appSettingsStr = await AsyncStorage.getItem('app_settings');
      let appSettings = {
        notifications: true, emailAlerts: true, pushNotifications: true,
        autoSave: true, language: 'English',
      };
      if (appSettingsStr) {
        try { appSettings = JSON.parse(appSettingsStr); } catch (e) {}
      }
      appSettings.notifications = pushNotificationsEnabled;
      await AsyncStorage.setItem('app_settings', JSON.stringify(appSettings));

      setMsgType('success');
      setMsg(
        `Attendance set to ${value} time${value === 2 ? 's' : ''} per day. ` +
        `Manual attendance is ${manualAttendanceEnabled ? 'enabled' : 'disabled'}.`
      );

      // Auto clear message after 5 seconds
      setTimeout(() => {
        setMsg('');
      }, 5000);
    } catch (err: any) {
      setMsgType('error');
      const detail = err?.response?.data?.detail || 'Failed to save settings.';
      setMsg(String(detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>


      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          >
            <ChevronLeft size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Settings</AppText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>Configurations</AppText>
          <AppText style={styles.headerSubtext}>Adjust system-wide preferences and notifications</AppText>
        </View>
      </View>

      <View style={styles.contentOverlap}>
        <ScrollView
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Settings size={18} color={C.text} />
              <AppText style={styles.title} weight="bold">Principal Settings</AppText>
            </View>

              <View style={styles.body}>

                {/* Daily Attendance Frequency */}
                <View style={styles.settingRowContainer}>
                  <View style={styles.settingRowHeader}>
                    <View style={styles.settingTextContainer}>
                      <AppText weight="bold" style={styles.settingTitle}>Daily Attendance</AppText>
                      <AppText style={styles.settingDescription}>Number of times attendance is taken per day</AppText>
                    </View>
                  </View>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.segment, dailySessions === 1 && styles.segmentActive]}
                      onPress={() => setDailySessions(1)}
                      disabled={loading || saving}
                    >
                      <AppText weight={dailySessions === 1 ? 'bold' : 'regular'} style={[styles.segmentText, dailySessions === 1 && styles.segmentTextActive]}>Once</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.segment, dailySessions === 2 && styles.segmentActive]}
                      onPress={() => setDailySessions(2)}
                      disabled={loading || saving}
                    >
                      <AppText weight={dailySessions === 2 ? 'bold' : 'regular'} style={[styles.segmentText, dailySessions === 2 && styles.segmentTextActive]}>Twice</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Manual Attendance Setting */}
                <View style={styles.settingRowContainer}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingTextContainer}>
                      <AppText weight="bold" style={styles.settingTitle}>Manual Attendance</AppText>
                      <AppText style={styles.settingDescription}>Allow staff to mark attendance manually</AppText>
                    </View>
                    <Switch
                      value={manualAttendanceEnabled}
                      onValueChange={setManualAttendanceEnabled}
                      disabled={loading || saving}
                      trackColor={{ false: '#cbd5e1', true: C.primary }}
                      thumbColor={Platform.OS === 'ios' ? Theme.colors.card : manualAttendanceEnabled ? Theme.colors.card : Theme.colors.background}
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Marks Notification Setting */}
                <View style={styles.settingRowContainer}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingTextContainer}>
                      <AppText weight="bold" style={styles.settingTitle}>Marks Notification</AppText>
                      <AppText style={styles.settingDescription}>Notify students when marks are updated</AppText>
                    </View>
                    <Switch
                      value={marksNotificationEnabled}
                      onValueChange={setMarksNotificationEnabled}
                      disabled={loading || saving}
                      trackColor={{ false: '#cbd5e1', true: C.primary }}
                      thumbColor={Platform.OS === 'ios' ? Theme.colors.card : marksNotificationEnabled ? Theme.colors.card : Theme.colors.background}
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Push Notifications Setting */}
                <View style={styles.settingRowContainer}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingTextContainer}>
                      <AppText weight="bold" style={styles.settingTitle}>App Push Notifications</AppText>
                      <AppText style={styles.settingDescription}>Receive alerts and announcements on your device</AppText>
                    </View>
                    <Switch
                      value={pushNotificationsEnabled}
                      onValueChange={setPushNotificationsEnabled}
                      disabled={loading || saving}
                      trackColor={{ false: '#cbd5e1', true: C.primary }}
                      thumbColor={Platform.OS === 'ios' ? Theme.colors.card : pushNotificationsEnabled ? Theme.colors.card : Theme.colors.background}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.saveButton, (loading || saving) && styles.saveButtonDisabled]}
                    onPress={saveSettings}
                    disabled={loading || saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={Theme.colors.card} />
                    ) : (
                      <>
                        <Save size={16} color={Theme.colors.card} />
                        <AppText style={styles.saveButtonText} weight="bold">Save Settings</AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Message */}
                {msg ? (
                  <View
                    style={[
                      styles.messageContainer,
                      msgType === 'error' ? styles.errorMessage : styles.successMessage,
                    ]}
                  >
                    {msgType === 'error' ? (
                      <AlertCircle size={16} color={C.errorText} />
                    ) : (
                      <CheckCircle2 size={16} color={C.successText} />
                    )}
                    <AppText
                      style={[
                        styles.messageText,
                        msgType === 'error' ? styles.errorText : styles.successText,
                      ]}
                      weight="semibold"
                    >
                      {msg}
                    </AppText>
                  </View>
                ) : null}

                {/* Loading Overlay */}
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <AppText style={styles.loadingText}>Loading settings...</AppText>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  headerStandard: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  contentOverlap: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    marginTop: -HEADER_CONSTANTS.BORDER_RADIUS,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Theme.colors.card,
    fontSize: 18,
    textAlign: 'center',
  },
  headerContent: {
    marginTop: Theme.spacing.lg,
  },
  headerGreeting: {
    color: Theme.colors.card,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    margin: Theme.spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 17,
    color: C.text,
  },
  body: {
    padding: Theme.spacing.md,
  },
  settingRowContainer: {
    paddingVertical: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: Theme.spacing.md,
  },
  settingTitle: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  settingDescription: {
    fontSize: 13,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: 8,
    padding: Theme.spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: Theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  segmentTextActive: {
    color: Theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.background,
  },
  actionRow: {
    marginTop: 20,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: Theme.colors.card,
    ...Theme.typography.bodyMd,
  },
  infoRow: {
    gap: 12,
    marginBottom: Theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    ...Theme.typography.caption,
    color: C.textMuted,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: Theme.spacing.md,
  },
  successMessage: {
    backgroundColor: C.successBg,
  },
  errorMessage: {
    backgroundColor: C.errorBg,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
  },
  successText: {
    color: C.successText,
  },
  errorText: {
    color: C.errorText,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bg + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  loadingText: {
    marginTop: 12,
    ...Theme.typography.body,
    color: C.textMuted,
  },
});
