import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Switch,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Save,
  Calendar,
  Bell,
  AlertCircle,
  CheckCircle2,
  Sliders,
  BookOpen,
  RefreshCw,
  GraduationCap,
  CalendarDays,
  Fingerprint,
  BellRing,
} from 'lucide-react-native';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';

import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';





export default function PrincipalSettingsPage() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dailySessions, setDailySessions] = useState<1 | 2>(1);
  const [adminLocked, setAdminLocked] = useState(false);
  const [aadhaarRequired, setAadhaarRequired] = useState(false);
  const [marksNotificationEnabled, setMarksNotificationEnabled] = useState(true);
  const [manualAttendanceEnabled, setManualAttendanceEnabled] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [casualLeave, setCasualLeave] = useState('1');
  const [sickLeave, setSickLeave] = useState('1');
  const [paidLeave, setPaidLeave] = useState('1');
  const [compOff, setCompOff] = useState('1');
  const [minAttendance, setMinAttendance] = useState('75');
  const [minMarks, setMinMarks] = useState('40');
  const [allowWithDues, setAllowWithDues] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forcingCredits, setForcingCredits] = useState(false);
  const [sendingMarks, setSendingMarks] = useState(false);
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
      const [attendanceRes, marksNotifRes, leavePolicyRes, promotionRes] = await Promise.all([
        API.get('/principal/attendance/settings', { headers: getHeaders() }),
        API.get('/principal/marks-notification/settings', { headers: getHeaders() }),
        API.get('/principal/settings/leave-policy', { headers: getHeaders() }),
        API.get('/principal/promotion/settings', { headers: getHeaders() }),
      ]);
      const appSettingsStr = await AsyncStorage.getItem('app_settings');
      if (appSettingsStr) {
        try {
          const appSettings = JSON.parse(appSettingsStr);
          setPushNotificationsEnabled(appSettings.notifications ?? true);
        } catch (e) {}
      }
      setDailySessions(Number(attendanceRes.data?.daily_sessions || 1) === 2 ? 2 : 1);
      setAdminLocked(Boolean(attendanceRes.data?.admin_locked));
      setAadhaarRequired(Boolean(attendanceRes.data?.aadhaar_required));
      setManualAttendanceEnabled(Boolean(attendanceRes.data?.enable_manual_attendance ?? false));
      setMarksNotificationEnabled(Boolean(marksNotifRes.data?.enabled ?? true));

      if (leavePolicyRes.data) {
        const d = leavePolicyRes.data;
        setCasualLeave(String(d.casual_leave_per_month ?? 1));
        setSickLeave(String(d.sick_leave_per_month ?? 1));
        setPaidLeave(String(d.paid_leave_per_month ?? 1));
        setCompOff(String(d.comp_off_per_month ?? 1));
      }

      const allRules = promotionRes.data?.settings?.find((s: { class_grade: string }) => s.class_grade === 'ALL');
      if (allRules) {
        setMinAttendance(String(allRules.min_attendance_pct ?? 75));
        setMinMarks(String(allRules.min_marks_pct ?? 40));
        setAllowWithDues(Boolean(allRules.allow_with_dues));
      }

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
        API.post('/principal/settings/leave-policy', {
          school_code: schoolCode,
          casual_leave: Number(casualLeave) || 0,
          sick_leave: Number(sickLeave) || 0,
          paid_leave: Number(paidLeave) || 0,
          comp_off: Number(compOff) || 0,
        }, { headers: getHeaders() }),
        API.post('/principal/promotion/settings', {
          class_grade: 'ALL',
          min_attendance_pct: Number(minAttendance) || 0,
          min_marks_pct: Number(minMarks) || 0,
          allow_with_dues: Boolean(allowWithDues),
        }, { headers: getHeaders() }),
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

      const totalLeave =
        (Number(casualLeave) || 0) + (Number(sickLeave) || 0) +
        (Number(paidLeave) || 0) + (Number(compOff) || 0);
      setMsgType('success');
      setMsg(
        `Attendance set to ${value} time${value === 2 ? 's' : ''} per day. ` +
        `Leave policy saved (${totalLeave} total days). ` +
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

  const forceMonthlyCredits = () => {
    Alert.alert(
      'Force Monthly Leaves',
      'Add monthly leave credits for all active teachers now? Existing balances will be updated (used leaves are preserved).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Credits',
          style: 'destructive',
          onPress: async () => {
            setForcingCredits(true);
            setMsg('');
            try {
              await API.post('/principal/force-leave-credits', {}, { headers: getHeaders() });
              setMsgType('success');
              setMsg('Monthly leave credits added successfully.');
            } catch (err: any) {
              setMsgType('error');
              setMsg(String(err?.response?.data?.detail || 'Failed to force leave credits.'));
            } finally {
              setForcingCredits(false);
            }
          },
        },
      ],
    );
  };

  const sendMarksNotifications = () => {
    Alert.alert(
      'Send Marks Notifications',
      'Send marks notifications to all students with recently saved marks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: async () => {
            setSendingMarks(true);
            setMsg('');
            try {
              const response = await API.post('/principal/marks/send-notifications', {}, { headers: getHeaders() });
              const data = response.data || {};
              setMsgType('success');
              setMsg(
                `${data.message || 'Notifications sent.'} ` +
                `Sent to ${data.students_notified ?? 0} students (${data.notifications_created ?? 0} created).`
              );
            } catch (err: any) {
              setMsgType('error');
              setMsg(String(err?.response?.data?.detail || 'Failed to send marks notifications.'));
            } finally {
              setSendingMarks(false);
            }
          },
        },
      ],
    );
  };

  const totalLeaveDays =
    (Number(casualLeave) || 0) + (Number(sickLeave) || 0) +
    (Number(paidLeave) || 0) + (Number(compOff) || 0);

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Settings"
        subtitle="Adjust system-wide preferences and notifications"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Refresh settings"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.settingsPanel}>
            <View style={styles.body}>

              {/* Daily Attendance Frequency */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRowHeader}>
                  <View style={styles.iconCircle}>
                    <Calendar size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Daily Attendance</AppText>
                    <AppText style={styles.settingDescription}>Number of times attendance is taken per day</AppText>
                  </View>
                </View>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.segment, dailySessions === 1 && styles.segmentActive]}
                    onPress={() => setDailySessions(1)}
                    disabled={loading || saving || adminLocked}
                  >
                    <AppText weight={dailySessions === 1 ? 'bold' : 'regular'} style={[styles.segmentText, dailySessions === 1 && styles.segmentTextActive]}>Once</AppText>
                  </TouchableOpacity>
                  {(!adminLocked || dailySessions === 2) && (
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.segment, dailySessions === 2 && styles.segmentActive]}
                      onPress={() => setDailySessions(2)}
                      disabled={loading || saving || adminLocked}
                    >
                      <AppText weight={dailySessions === 2 ? 'bold' : 'regular'} style={[styles.segmentText, dailySessions === 2 && styles.segmentTextActive]}>Twice</AppText>
                    </TouchableOpacity>
                  )}
                </View>
                {adminLocked ? (
                  <AppText style={styles.warningHint}>Locked to once per day by Super Admin.</AppText>
                ) : null}
              </View>

              <View style={styles.divider} />

              {/* Aadhaar Requirement (read-only) */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRowHeader}>
                  <View style={styles.iconCircle}>
                    <Fingerprint size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Student Aadhaar Requirement</AppText>
                    <AppText style={styles.settingDescription}>School-wide setting controlled by Super Admin</AppText>
                  </View>
                </View>
                <View style={[styles.statusPill, aadhaarRequired ? styles.statusPillOn : styles.statusPillOff]}>
                  <View style={[styles.statusDot, aadhaarRequired ? styles.statusDotOn : styles.statusDotOff]} />
                  <AppText
                    weight="semibold"
                    style={[styles.statusPillText, aadhaarRequired ? styles.statusTextOn : styles.statusTextOff]}
                  >
                    {aadhaarRequired ? 'Aadhaar column ENABLED' : 'Aadhaar column DISABLED'}
                  </AppText>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Manual Attendance Setting */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRow}>
                  <View style={styles.iconCircle}>
                    <Sliders size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Manual Attendance</AppText>
                    <AppText style={styles.settingDescription}>Allow staff to mark attendance manually</AppText>
                  </View>
                  <Switch
                    value={manualAttendanceEnabled}
                    onValueChange={setManualAttendanceEnabled}
                    disabled={loading || saving}
                    trackColor={{ false: '#cbd5e1', true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : manualAttendanceEnabled ? Theme.colors.card : '#ffffff'}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Marks Notification Setting */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRow}>
                  <View style={styles.iconCircle}>
                    <BookOpen size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Marks Notification</AppText>
                    <AppText style={styles.settingDescription}>Notify students when marks are updated</AppText>
                  </View>
                  <Switch
                    value={marksNotificationEnabled}
                    onValueChange={setMarksNotificationEnabled}
                    disabled={loading || saving}
                    trackColor={{ false: '#cbd5e1', true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : marksNotificationEnabled ? Theme.colors.card : '#ffffff'}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Manual Marks Notification */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRowHeader}>
                  <View style={styles.iconCircle}>
                    <BellRing size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Manual Marks Notification</AppText>
                    <AppText style={styles.settingDescription}>Trigger notifications for marks updated in the last 7 days</AppText>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.secondaryButton, (loading || sendingMarks) && styles.saveButtonDisabled]}
                  onPress={sendMarksNotifications}
                  disabled={loading || sendingMarks}
                >
                  {sendingMarks ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <>
                      <BellRing size={16} color={C.primary} />
                      <AppText style={styles.secondaryButtonText} weight="bold">Send Marks Notifications</AppText>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Promotion Eligibility Rules */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRowHeader}>
                  <View style={styles.iconCircle}>
                    <GraduationCap size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Promotion Eligibility Rules</AppText>
                    <AppText style={styles.settingDescription}>Thresholds for automatic promotion suggestions</AppText>
                  </View>
                </View>
                <View style={styles.numberGrid}>
                  <View style={styles.numberField}>
                    <AppText style={styles.numberLabel}>Min. Attendance (%)</AppText>
                    <TextInput
                      style={styles.numberInput}
                      value={minAttendance}
                      onChangeText={setMinAttendance}
                      keyboardType="number-pad"
                      editable={!loading && !saving}
                    />
                  </View>
                  <View style={styles.numberField}>
                    <AppText style={styles.numberLabel}>Min. Avg Marks (%)</AppText>
                    <TextInput
                      style={styles.numberInput}
                      value={minMarks}
                      onChangeText={setMinMarks}
                      keyboardType="number-pad"
                      editable={!loading && !saving}
                    />
                  </View>
                </View>
                <View style={[styles.settingRow, { marginTop: 12 }]}>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Allow with Dues</AppText>
                    <AppText style={styles.settingDescription}>Allow promotion when fees are pending</AppText>
                  </View>
                  <Switch
                    value={allowWithDues}
                    onValueChange={setAllowWithDues}
                    disabled={loading || saving}
                    trackColor={{ false: '#cbd5e1', true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : allowWithDues ? Theme.colors.card : '#ffffff'}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Monthly Leave Policy */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRowHeader}>
                  <View style={styles.iconCircle}>
                    <CalendarDays size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Monthly Leave Policy</AppText>
                    <AppText style={styles.settingDescription}>Leave days per month for payroll calculations</AppText>
                  </View>
                </View>
                <View style={styles.numberGrid}>
                  <View style={styles.numberField}>
                    <AppText style={styles.numberLabel}>Casual Leave</AppText>
                    <TextInput
                      style={styles.numberInput}
                      value={casualLeave}
                      onChangeText={setCasualLeave}
                      keyboardType="number-pad"
                      editable={!loading && !saving}
                    />
                  </View>
                  <View style={styles.numberField}>
                    <AppText style={styles.numberLabel}>Sick Leave</AppText>
                    <TextInput
                      style={styles.numberInput}
                      value={sickLeave}
                      onChangeText={setSickLeave}
                      keyboardType="number-pad"
                      editable={!loading && !saving}
                    />
                  </View>
                  <View style={styles.numberField}>
                    <AppText style={styles.numberLabel}>Paid Leave</AppText>
                    <TextInput
                      style={styles.numberInput}
                      value={paidLeave}
                      onChangeText={setPaidLeave}
                      keyboardType="number-pad"
                      editable={!loading && !saving}
                    />
                  </View>
                  <View style={styles.numberField}>
                    <AppText style={styles.numberLabel}>Comp Off</AppText>
                    <TextInput
                      style={styles.numberInput}
                      value={compOff}
                      onChangeText={setCompOff}
                      keyboardType="number-pad"
                      editable={!loading && !saving}
                    />
                  </View>
                </View>
                <AppText style={styles.totalHint}>Total available: {totalLeaveDays} days</AppText>
              </View>

              <View style={styles.divider} />

              {/* Push Notifications Setting */}
              <View style={styles.settingRowContainer}>
                <View style={styles.settingRow}>
                  <View style={styles.iconCircle}>
                    <Bell size={18} color={C.primary} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>App Push Notifications</AppText>
                    <AppText style={styles.settingDescription}>Receive alerts and announcements on your device</AppText>
                  </View>
                  <Switch
                    value={pushNotificationsEnabled}
                    onValueChange={setPushNotificationsEnabled}
                    disabled={loading || saving}
                    trackColor={{ false: '#cbd5e1', true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : pushNotificationsEnabled ? Theme.colors.card : '#ffffff'}
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
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.warningButton, (loading || forcingCredits) && styles.saveButtonDisabled]}
                  onPress={forceMonthlyCredits}
                  disabled={loading || forcingCredits}
                >
                  {forcingCredits ? (
                    <ActivityIndicator size="small" color={Theme.colors.card} />
                  ) : (
                    <>
                      <RefreshCw size={16} color={Theme.colors.card} />
                      <AppText style={styles.saveButtonText} weight="bold">Force Monthly Leaves</AppText>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  settingsPanel: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  settingRowContainer: {
    paddingVertical: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginTop: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  actionRow: {
    marginTop: 24,
    marginBottom: 10,
    gap: 12,
  },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
  },
  secondaryButtonText: {
    color: C.primary,
    fontSize: 14,
  },
  warningButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  warningHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  statusPill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  statusPillOn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bcf0da',
  },
  statusPillOff: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOn: { backgroundColor: '#22c55e' },
  statusDotOff: { backgroundColor: '#ef4444' },
  statusPillText: { fontSize: 13 },
  statusTextOn: { color: '#166534' },
  statusTextOff: { color: '#991b1b' },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  numberField: {
    width: '47%',
    minWidth: 120,
  },
  numberLabel: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 6,
  },
  numberInput: {
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: C.text,
    backgroundColor: '#fff',
  },
  totalHint: {
    marginTop: 10,
    fontSize: 12,
    color: C.textMuted,
  },
  saveButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: Theme.colors.card,
    fontSize: 15,
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
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    ...Theme.typography.body,
    color: C.textMuted,
  },
});
