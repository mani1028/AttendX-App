import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, FlatList } from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Calendar,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  ChevronDown,
  CheckCircle2,
  ChevronLeft as ChevronLeftSmall,
  ChevronRight,
} from 'lucide-react-native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import API from '../../services/api';

import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { staffAttendanceStyles as styles } from '../../components/accountant/staffAttendance/staffAttendanceStyles';



import {
  getHeaders,
  toDateString,
  parseDate,
  normalizeStaffMember,
  staffMemberKey,
  combinedSessionStatus,
  STATUS_COLORS,
  type StaffMember,
  type AttendanceStatus,
} from '../../components/accountant/staffAttendance/helpers';
import CalendarModal from '../../components/accountant/staffAttendance/CalendarModal';

export default function StaffAttendanceScreen() {
  const navigation = useNavigation();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(toDateString(new Date()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarTeacher, setCalendarTeacher] = useState<StaffMember | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<string[]>([]);
  const [statusPicker, setStatusPicker] = useState<{
    staffId: string;
    session: 1 | 2;
    value: AttendanceStatus;
  } | null>(null);

  const fetchHolidays = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await API.get('/principal/calendar', { headers });
      const data = res.data;
      const events: any[] = Array.isArray(data) ? data : (data?.events || []);
      const holidays = events.filter((e: any) => e.event_type === 'holiday').map((e: any) => e.event_date);
      setPublicHolidays(holidays);
    } catch {}
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = await getHeaders();
      const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || '01';
      const res = await API.post('/manage/accountant/staff-attendance', {
        school_code: sc,
        branch_id: bid,
        date: attendanceDate,
      }, { headers });
      setStaffList((res.data.staff || []).map((row: Record<string, unknown>) => normalizeStaffMember(row)));
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {setError('Session expired. Please login again.');}
      else if (status === 403) {setError("You don't have permission to access this.");}
      else {setError(e?.response?.data?.detail || e?.message || 'Failed to fetch staff');}
    } finally { setLoading(false); }
  }, [attendanceDate]);

  useEffect(() => { fetchStaff(); fetchHolidays(); }, [fetchStaff]);

  const handleStatusChange = (staffKey: string, status: AttendanceStatus, session: 1 | 2 = 1) => {
    setStaffList(prev => prev.map(s => {
      if (staffMemberKey(s) !== staffKey) {return s;}
      if (session === 1) {
        const next = { ...s, session1_status: status };
        return s.sessions_per_day === 1
          ? { ...next, status }
          : { ...next, status: combinedSessionStatus(status, next.session2_status) };
      }
      const next = { ...s, session2_status: status };
      return { ...next, status: combinedSessionStatus(next.session1_status, status) };
    }));
  };

  const openDatePicker = () => {
    const currentDate = parseDate(attendanceDate);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            setAttendanceDate(toDateString(date));
          }
        },
      });
      return;
    }
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getHeaders();
      const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || '01';
      const updates = staffList
        .filter(s => Boolean(staffMemberKey(s)))
        .map(s => {
          const staffId = staffMemberKey(s);
          const isTwoSession = s.sessions_per_day === 2;
          const session1 = s.session1_status || 'ABSENT';
          const session2 = s.session2_status || 'ABSENT';
          return {
            staff_id: staffId,
            employee_id: staffId,
            role: s.role,
            status: isTwoSession ? combinedSessionStatus(session1, session2) : session1,
            session1_status: session1,
            session2_status: isTwoSession ? session2 : undefined,
            sessions_per_day: s.sessions_per_day,
          };
        });
      await API.post('/manage/accountant/staff-attendance', {
        school_code: sc, branch_id: bid, date: attendanceDate, updates,
      }, { headers });
      Alert.alert('Success', 'Attendance saved successfully!');
      fetchStaff();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save attendance.');
    } finally { setSaving(false); }
  };

  const statusOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY'];
  const statusLabel: Record<AttendanceStatus, string> = { PRESENT: 'Present', ABSENT: 'Absent', HALF_DAY: 'Half Day' };
  const statusColor: Record<AttendanceStatus, { bg: string; text: string }> = {
    PRESENT:  { bg: '#dcfce7', text: '#166534' },
    ABSENT:   { bg: Theme.colors.redLight, text: '#991b1b' },
    HALF_DAY: { bg: '#ffedd5', text: '#9a3412' },
  };

  const renderStatusDropdown = (
    staffId: string,
    session: 1 | 2,
    value: AttendanceStatus,
  ) => (
    <TouchableOpacity
      accessibilityRole="button"
      style={[
        styles.statusDropdown,
        {
          backgroundColor: statusColor[value].bg,
          borderColor: statusColor[value].text,
        },
      ]}
      onPress={() => setStatusPicker({ staffId, session, value })}
    >
      <Text style={[styles.statusDropdownText, { color: statusColor[value].text }]}>
        {statusLabel[value]}
      </Text>
      <ChevronDown size={16} color={statusColor[value].text} />
    </TouchableOpacity>
  );

  const renderStaffRow = (staff: StaffMember) => {
    const staffKey = staffMemberKey(staff);
    const isTwoSession = staff.sessions_per_day === 2;
    return (
      <View key={staffKey} style={styles.staffRow}>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{staff.name}</Text>
          <Text style={styles.staffMeta}>
            {staff.employee_id || staff.id} ·{' '}
            <Text style={{ textTransform: 'capitalize' }}>{staff.role}</Text>
          </Text>
        </View>

        <View style={styles.staffControls}>
          {isTwoSession ? (
            <>
              <View style={styles.sessionBlock}>
                <Text style={styles.sessionLabel}>Morning</Text>
                {renderStatusDropdown(staffKey, 1, staff.session1_status || 'ABSENT')}
              </View>
              <View style={styles.sessionBlock}>
                <Text style={styles.sessionLabel}>Evening</Text>
                {renderStatusDropdown(staffKey, 2, (staff.session2_status as AttendanceStatus) || 'ABSENT')}
              </View>
            </>
          ) : (
            renderStatusDropdown(staffKey, 1, staff.session1_status || 'ABSENT')
          )}

          {staff.role === 'teacher' ? (
            <TouchableOpacity accessibilityRole="button" style={styles.calBtn} onPress={() => setCalendarTeacher(staff)}>
              <Calendar size={15} color={Theme.colors.primary} />
              <Text style={styles.calBtnText}>History</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          title="Staff Attendance"
          subtitle="Manage daily staff attendance and leaves"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={fetchStaff}
              accessibilityLabel="Refresh staff attendance"
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
        {/* Date picker row */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Date:</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.datePicker} onPress={openDatePicker}>
            <Calendar size={16} color={Theme.colors.primary} />
            <Text style={styles.dateText}>{attendanceDate}</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && showDatePicker ? (
            <DateTimePicker
              value={parseDate(attendanceDate)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, d) => {
                if (d) {
                  setAttendanceDate(toDateString(d));
                }
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && showDatePicker ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.dateDoneBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={15} color={Theme.colors.error} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : null}

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Attendance for {attendanceDate}</Text>
              {!loading && staffList.length > 0 ? (
                <Text style={styles.cardSubtitle}>{staffList.length} staff members</Text>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ScreenSkeleton variant="list" />
              <Text style={styles.loadingText}>Loading staff…</Text>
            </View>
          ) : staffList.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No staff records found for this branch/date.</Text>
            </View>
          ) : (
            <View style={styles.staffList}>
              {staffList.map(s => renderStaffRow(s))}
            </View>
          )}

          {!loading && staffList.length > 0 ? (
            <View style={styles.saveBar}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.saveButton, (saving || loading || staffList.length === 0) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || loading || staffList.length === 0}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Theme.colors.card} />
                ) : (
                  <>
                    <Save size={18} color={Theme.colors.card} />
                    <Text style={styles.saveButtonText}>Save Attendance</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        </View>
      </ScrollView>

      {/* Calendar modal */}
      {calendarTeacher ? (
        <CalendarModal
          teacher={calendarTeacher}
          onClose={() => setCalendarTeacher(null)}
          publicHolidays={publicHolidays}
        />
      ) : null}

      {/* Status picker */}
      <Modal
        visible={statusPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusPicker(null)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setStatusPicker(null)}
          />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Attendance</Text>
            {statusOptions.map(option => {
              const selected = statusPicker?.value === option;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={option}
                  style={[
                    styles.pickerOption,
                    {
                      backgroundColor: statusColor[option].bg,
                      borderColor: statusColor[option].text,
                    },
                    selected && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    if (statusPicker) {
                      handleStatusChange(statusPicker.staffId, option, statusPicker.session);
                    }
                    setStatusPicker(null);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: statusColor[option].text }]}>
                    {statusLabel[option]}
                  </Text>
                  {selected ? <CheckCircle2 size={18} color={statusColor[option].text} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Styles ─── */
