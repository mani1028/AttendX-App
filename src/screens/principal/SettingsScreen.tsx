import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshCw } from 'lucide-react-native';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';

import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { settingsStyles as styles } from '../../components/principal/settings/settingsStyles';
import SettingsFormBody from '../../components/principal/settings/SettingsFormBody';





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
      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
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
        <View style={styles.settingsPanel}>
          <SettingsFormBody
              dailySessions={dailySessions}
              setDailySessions={setDailySessions}
              adminLocked={adminLocked}
              aadhaarRequired={aadhaarRequired}
              manualAttendanceEnabled={manualAttendanceEnabled}
              setManualAttendanceEnabled={setManualAttendanceEnabled}
              marksNotificationEnabled={marksNotificationEnabled}
              setMarksNotificationEnabled={setMarksNotificationEnabled}
              pushNotificationsEnabled={pushNotificationsEnabled}
              setPushNotificationsEnabled={setPushNotificationsEnabled}
              casualLeave={casualLeave}
              setCasualLeave={setCasualLeave}
              sickLeave={sickLeave}
              setSickLeave={setSickLeave}
              paidLeave={paidLeave}
              setPaidLeave={setPaidLeave}
              compOff={compOff}
              setCompOff={setCompOff}
              minAttendance={minAttendance}
              setMinAttendance={setMinAttendance}
              minMarks={minMarks}
              setMinMarks={setMinMarks}
              allowWithDues={allowWithDues}
              setAllowWithDues={setAllowWithDues}
              loading={loading}
              saving={saving}
              sendingMarks={sendingMarks}
              forcingCredits={forcingCredits}
              totalLeaveDays={totalLeaveDays}
              msg={msg}
              msgType={msgType}
              saveSettings={saveSettings}
              forceMonthlyCredits={forceMonthlyCredits}
              sendMarksNotifications={sendMarksNotifications}
            />
        </View>
      </ScrollView>
    </View>
  );
}
