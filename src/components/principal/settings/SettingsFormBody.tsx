import React from 'react';
import { View, TouchableOpacity, Switch, TextInput, ActivityIndicator, Platform } from 'react-native';
import {
  Save, Calendar, Bell, CheckCircle2, Sliders, BookOpen, GraduationCap,
  CalendarDays, Fingerprint, BellRing, RefreshCw, AlertCircle,
} from 'lucide-react-native';
import AppText from '../../common/AppText';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { Theme, C } from '../../../theme/tokens';
import { settingsStyles as styles } from './settingsStyles';

export interface SettingsFormBodyProps {
  dailySessions: 1 | 2;
  setDailySessions: (v: 1 | 2) => void;
  adminLocked: boolean;
  aadhaarRequired: boolean;
  manualAttendanceEnabled: boolean;
  setManualAttendanceEnabled: (v: boolean) => void;
  marksNotificationEnabled: boolean;
  setMarksNotificationEnabled: (v: boolean) => void;
  pushNotificationsEnabled: boolean;
  setPushNotificationsEnabled: (v: boolean) => void;
  casualLeave: string;
  setCasualLeave: (v: string) => void;
  sickLeave: string;
  setSickLeave: (v: string) => void;
  paidLeave: string;
  setPaidLeave: (v: string) => void;
  compOff: string;
  setCompOff: (v: string) => void;
  minAttendance: string;
  setMinAttendance: (v: string) => void;
  minMarks: string;
  setMinMarks: (v: string) => void;
  allowWithDues: boolean;
  setAllowWithDues: (v: boolean) => void;
  loading: boolean;
  saving: boolean;
  sendingMarks: boolean;
  forcingCredits: boolean;
  totalLeaveDays: number;
  msg: string;
  msgType: 'success' | 'error';
  saveSettings: () => void;
  forceMonthlyCredits: () => void;
  sendMarksNotifications: () => void;
}

export default function SettingsFormBody(props: SettingsFormBodyProps) {
  const {
    dailySessions, setDailySessions, adminLocked, aadhaarRequired,
    manualAttendanceEnabled, setManualAttendanceEnabled,
    marksNotificationEnabled, setMarksNotificationEnabled,
    pushNotificationsEnabled, setPushNotificationsEnabled,
    casualLeave, setCasualLeave, sickLeave, setSickLeave,
    paidLeave, setPaidLeave, compOff, setCompOff,
    minAttendance, setMinAttendance, minMarks, setMinMarks,
    allowWithDues, setAllowWithDues,
    loading, saving, sendingMarks, forcingCredits, totalLeaveDays,
    msg, msgType, saveSettings, forceMonthlyCredits, sendMarksNotifications,
  } = props;

  return (
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
                    trackColor={{ false: Theme.colors.textSec, true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : manualAttendanceEnabled ? Theme.colors.card : Theme.colors.card}
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
                    trackColor={{ false: Theme.colors.textSec, true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : marksNotificationEnabled ? Theme.colors.card : Theme.colors.card}
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
                <View style={[styles.settingRow, { marginTop: Theme.spacing.md }]}>
                  <View style={styles.settingTextContainer}>
                    <AppText weight="bold" style={styles.settingTitle}>Allow with Dues</AppText>
                    <AppText style={styles.settingDescription}>Allow promotion when fees are pending</AppText>
                  </View>
                  <Switch
                    value={allowWithDues}
                    onValueChange={setAllowWithDues}
                    disabled={loading || saving}
                    trackColor={{ false: Theme.colors.textSec, true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : allowWithDues ? Theme.colors.card : Theme.colors.card}
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
                    trackColor={{ false: Theme.colors.textSec, true: C.primary }}
                    thumbColor={Platform.OS === 'ios' ? Theme.colors.card : pushNotificationsEnabled ? Theme.colors.card : Theme.colors.card}
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
                  <ScreenSkeleton variant="list" />
                  <AppText style={styles.loadingText}>Loading settings...</AppText>
                </View>
              )}
    </View>
  );
}
