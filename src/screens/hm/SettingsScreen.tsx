import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';

const C = {
  bg: colors.bg,
  card: colors.surface,
  text: colors.textPrimary,
  textMuted: colors.textMuted,
  border: colors.border,
  primary: colors.primary,
  primaryHover: colors.secondary,
  successBg: colors.successSoft,
  successText: colors.success,
  errorBg: colors.errorSoft,
  errorText: colors.error,
};

export default function HMSettingsPage() {
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dailySessions, setDailySessions] = useState<1 | 2>(1);
  const [marksNotificationEnabled, setMarksNotificationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  // Load credentials from storage
  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    if (schoolCode && branchId) {
      loadSettings();
    }
  }, [schoolCode, branchId]);

  const loadCredentials = async () => {
    try {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') || '';
      
      const branch = await AsyncStorage.getItem('branch_id') ||
        await AsyncStorage.getItem('branchId') ||
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
    if (!schoolCode || !branchId) return;

    setLoading(true);
    try {
      const [attendanceRes, marksNotifRes] = await Promise.all([
        API.get('/hm/attendance/settings', { headers: getHeaders() }),
        API.get('/hm/marks-notification/settings', { headers: getHeaders() }),
      ]);
      setDailySessions(Number(attendanceRes.data?.daily_sessions || 1) === 2 ? 2 : 1);
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
        API.put('/hm/attendance/settings', { daily_sessions: value }, { headers: getHeaders() }),
        API.put('/hm/marks-notification/settings', { enabled: Boolean(marksNotificationEnabled) }, { headers: getHeaders() }),
      ]);
      
      setMsgType('success');
      setMsg(
        `Attendance set to ${value} time${value === 2 ? 's' : ''} per day. ` +
        `Marks notification is ${marksNotificationEnabled ? 'enabled' : 'disabled'}.`
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Icon name="settings" size={18} color={C.text} />
            <AppText style={styles.title}>HM Settings</AppText>
          </View>

          <View style={styles.body}>
            {/* Daily Attendance Frequency */}
            <View style={styles.settingGroup}>
              <AppText style={styles.label}>Daily Attendance Frequency</AppText>
              <View style={styles.optionContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    dailySessions === 1 && styles.optionButtonActive,
                  ]}
                  onPress={() => setDailySessions(1)}
                  disabled={loading || saving}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      dailySessions === 1 && styles.optionTextActive,
                    ]}
                  >
                    Take attendance 1 time per day
                  </AppText>
                  {dailySessions === 1 && (
                    <Icon name="check" size={16} color={C.primary} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    dailySessions === 2 && styles.optionButtonActive,
                  ]}
                  onPress={() => setDailySessions(2)}
                  disabled={loading || saving}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      dailySessions === 2 && styles.optionTextActive,
                    ]}
                  >
                    Take attendance 2 times per day
                  </AppText>
                  {dailySessions === 2 && (
                    <Icon name="check" size={16} color={C.primary} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.hintContainer}>
                <Icon name="info" size={12} color={C.textMuted} />
                <AppText style={styles.hintText}>
                  Once configured, the system allows attendance only this many times per day.
                  Extra attempts are blocked automatically.
                </AppText>
              </View>
            </View>

            {/* Marks Notification Setting */}
            <View style={styles.settingGroup}>
              <AppText style={styles.label}>Marks Notification to Student Dashboard</AppText>
              <View style={styles.optionContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    marksNotificationEnabled && styles.optionButtonActive,
                  ]}
                  onPress={() => setMarksNotificationEnabled(true)}
                  disabled={loading || saving}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      marksNotificationEnabled && styles.optionTextActive,
                    ]}
                  >
                    Enabled: send marks update notifications
                  </AppText>
                  {marksNotificationEnabled && (
                    <Icon name="check" size={16} color={C.primary} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    !marksNotificationEnabled && styles.optionButtonActive,
                  ]}
                  onPress={() => setMarksNotificationEnabled(false)}
                  disabled={loading || saving}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      !marksNotificationEnabled && styles.optionTextActive,
                    ]}
                  >
                    Disabled: do not send marks notifications
                  </AppText>
                  {!marksNotificationEnabled && (
                    <Icon name="check" size={16} color={C.primary} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.hintContainer}>
                <Icon name="info" size={12} color={C.textMuted} />
                <AppText style={styles.hintText}>
                  When enabled, saving marks in teacher marks entry posts a marks notification that
                  students can see in student dashboard notifications.
                </AppText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.saveButton, (loading || saving) && styles.saveButtonDisabled]}
                onPress={saveSettings}
                disabled={loading || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={16} color="#fff" />
                    <AppText style={styles.saveButtonText}>Save Setting</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Info Icons Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="calendar" size={14} color={C.textMuted} />
                <AppText style={styles.infoText}>
                  Applies to teacher verification and student attendance marking.
                </AppText>
              </View>
              <View style={styles.infoItem}>
                <Icon name="bell" size={14} color={C.textMuted} />
                <AppText style={styles.infoText}>
                  Applies to marks updates pushed to student notifications.
                </AppText>
              </View>
            </View>

            {/* Message */}
            {msg ? (
              <View
                style={[
                  styles.messageContainer,
                  msgType === 'error' ? styles.errorMessage : styles.successMessage,
                ]}
              >
                <Icon
                  name={msgType === 'error' ? 'alert-circle' : 'check-circle'}
                  size={16}
                  color={msgType === 'error' ? C.errorText : C.successText}
                />
                <AppText
                  style={[
                    styles.messageText,
                    msgType === 'error' ? styles.errorText : styles.successText,
                  ]}
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
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    margin: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
  },
  body: {
    padding: 16,
  },
  settingGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
    marginBottom: 12,
  },
  optionContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  optionButtonActive: {
    borderColor: C.primary,
    backgroundColor: colors.primary + '15',
  },
  optionText: {
    fontSize: 14,
    color: C.text,
    flex: 1,
  },
  optionTextActive: {
    color: C.primary,
    fontWeight: '500',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 8,
    marginBottom: 16,
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  infoRow: {
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: C.textMuted,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
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
    fontSize: 14,
    color: C.textMuted,
  },
});
