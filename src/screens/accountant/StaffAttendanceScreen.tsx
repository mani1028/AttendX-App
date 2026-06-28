import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
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



/* ── helpers ── */
const getHeaders = async (): Promise<Record<string, string>> => {
  const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
  const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || (await storage.getString(StorageKeys.BRANCH_ID)) || '01';
  const tok = (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || '';
  return { 'X-School-Code': sc, 'X-Branch-Id': bid, Authorization: `Bearer ${tok}` };
};

const toDateString = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY';

const normalizeStatus = (value: unknown): AttendanceStatus => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PRESENT' || normalized === 'ABSENT' || normalized === 'HALF_DAY') {
    return normalized;
  }
  return 'ABSENT';
};

const staffMemberKey = (staff: Pick<StaffMember, 'id' | 'employee_id'>): string =>
  String(staff.employee_id || staff.id || '').trim();

const normalizeStaffMember = (raw: Record<string, unknown>): StaffMember => {
  const employeeId = String(raw.employee_id ?? raw.staff_id ?? raw.id ?? '').trim();
  const session1 = normalizeStatus(raw.session1_status ?? raw.status);
  const sessionsPerDay = Math.max(1, Number(raw.sessions_per_day ?? 1) || 1);
  return {
    id: employeeId,
    employee_id: employeeId,
    name: String(raw.name ?? raw.staff_name ?? 'Unknown').trim(),
    role: String(raw.role ?? raw.staff_role ?? 'staff').toLowerCase(),
    sessions_per_day: sessionsPerDay,
    session1_status: session1,
    session2_status:
      raw.session2_status != null ? normalizeStatus(raw.session2_status) : undefined,
    status: raw.status != null ? normalizeStatus(raw.status) : session1,
  };
};

const combinedSessionStatus = (
  session1: AttendanceStatus,
  session2?: AttendanceStatus,
): AttendanceStatus => {
  if (!session2) {
    return session1;
  }
  if (session1 === 'PRESENT' && session2 === 'PRESENT') {
    return 'PRESENT';
  }
  if (session1 === 'ABSENT' && session2 === 'ABSENT') {
    return 'ABSENT';
  }
  return 'HALF_DAY';
};

interface StaffMember {
  id: string;
  employee_id?: string;
  name: string;
  role: string;
  sessions_per_day: number;
  session1_status: AttendanceStatus;
  session2_status?: AttendanceStatus;
  status?: AttendanceStatus;
}

interface CalendarDay {
  date: string;
  status: string | null;
  has_leave?: boolean;
  leave_status?: string;
  leave_reason?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PRESENT:  { bg: '#bbf7d0', text: '#166534' },
  ABSENT:   { bg: '#fee2e2', text: '#991b1b' },
  HALF_DAY: { bg: '#ffedd5', text: '#9a3412' },
  ON_LEAVE: { bg: '#fef9c3', text: '#854d0e' },
};

/* ── Calendar Modal ── */
interface CalendarModalProps {
  teacher: StaffMember;
  onClose: () => void;
  publicHolidays: string[];
}

function CalendarModal({ teacher, onClose, publicHolidays }: CalendarModalProps) {
  const [calDays, setCalDays] = useState<CalendarDay[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCalendar = useCallback(async (m: number, y: number) => {
    setModalLoading(true);
    try {
      const headers = await getHeaders();
      const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      const res = await API.get('/manage/staff/attendance/unified', {
        params: {
          school_code: sc,
          employee_id: teacher.employee_id || teacher.id,
          from_date: toDateString(firstDay),
          to_date: toDateString(lastDay),
        },
        headers,
      });
      const days: CalendarDay[] = (res.data?.days || []).map((d: any) => ({
        date: d.date,
        status: d.attendance_status || (d.has_leave ? 'ON_LEAVE' : null),
        has_leave: d.has_leave,
        leave_status: d.leave_status,
        leave_reason: d.leave_reason,
      }));
      setCalDays(days);
    } catch {
      Alert.alert('Error', 'Could not load attendance data.');
    } finally {
      setModalLoading(false);
    }
  }, [teacher]);

  useEffect(() => { fetchCalendar(month, year); }, []);

  const changeMonth = (dir: number) => {
    let nm = month + dir, ny = year;
    if (nm < 0) { nm = 11; ny--; }
    else if (nm > 11) { nm = 0; ny++; }
    setMonth(nm); setYear(ny);
    fetchCalendar(nm, ny);
  };

  const isBlocked = (dateStr: string): boolean => {
    const today = toDateString(new Date());
    if (dateStr > today) {return true;}
    if (parseDate(dateStr).getDay() === 0) {return true;}
    if (publicHolidays.includes(dateStr)) {return true;}
    return false;
  };

  const handleDayTap = (dateStr: string) => {
    if (isBlocked(dateStr)) {return;}
    const existing = calDays.find(d => d.date === dateStr);
    let next: AttendanceStatus = 'PRESENT';
    if (existing?.status === 'PRESENT') {next = 'ABSENT';}
    else if (existing?.status === 'ABSENT') {next = 'HALF_DAY';}
    else if (existing?.status === 'HALF_DAY') {next = 'PRESENT';}
    setCalDays(prev => {
      const filtered = prev.filter(d => d.date !== dateStr);
      return [...filtered, { ...(existing || {}), date: dateStr, status: next }];
    });
  };

  const saveCalendar = async () => {
    setSaving(true);
    try {
      const headers = await getHeaders();
      const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || '01';
      const editableDays = calDays.filter(d => !isBlocked(d.date));
      await API.post('/manage/accountant/teacher-attendance', {
        school_code: sc,
        branch_id: bid,
        employee_id: teacher.id,
        days: editableDays,
      }, { headers });
      Alert.alert('Success', 'Attendance updated successfully!');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Build grid
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateString(new Date());
  const gridCells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstWeekday; i++) {gridCells.push(null);}
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    gridCells.push({ day: d, dateStr });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <View style={calStyles.box}>
          <View style={calStyles.head}>
            <Text style={calStyles.headTitle}>📅 {teacher.name}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}><X size={22} color={Theme.colors.textMuted} /></TouchableOpacity>
          </View>

          {modalLoading ? (
            <View style={calStyles.centered}><ActivityIndicator size="large" color={Theme.colors.primary} /></View>
          ) : (
            <ScrollView style={calStyles.scroll}>
              {/* Month navigator */}
              <View style={calStyles.monthNav}>
                <TouchableOpacity accessibilityRole="button" onPress={() => changeMonth(-1)} style={calStyles.navBtn}>
                  <ChevronLeftSmall size={18} color={Theme.colors.primary} />
                </TouchableOpacity>
                <Text style={calStyles.monthText}>{MONTHS[month]} {year}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => changeMonth(1)} style={calStyles.navBtn}>
                  <ChevronRight size={18} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Weekday labels */}
              <View style={calStyles.weekRow}>
                {WEEKDAYS.map(w => <Text key={w} style={calStyles.weekDay}>{w}</Text>)}
              </View>

              {/* Days grid */}
              <View style={calStyles.daysGrid}>
                {gridCells.map((cell, idx) => {
                  if (!cell) {return <View key={`e-${idx}`} style={calStyles.emptyCell} />;}
                  const dayData = calDays.find(d => d.date === cell.dateStr);
                  const status = dayData?.status;
                  const blocked = isBlocked(cell.dateStr);
                  const displayStatus = status === 'ON_LEAVE' ? 'ABSENT' : (status as AttendanceStatus | null);
                  const colorSet = displayStatus ? STATUS_COLORS[displayStatus] : null;
                  return (
                    <TouchableOpacity accessibilityRole="button"
                      key={cell.dateStr}
                      style={[
                        calStyles.dayCell,
                        colorSet ? { backgroundColor: colorSet.bg } : {},
                        blocked && calStyles.dayCellBlocked,
                        cell.dateStr === today && calStyles.dayCellToday,
                      ]}
                      onPress={() => handleDayTap(cell.dateStr)}
                      disabled={blocked}>
                      <Text style={[calStyles.dayNum, colorSet ? { color: colorSet.text } : {}, blocked && calStyles.dayNumBlocked]}>
                        {cell.day}
                      </Text>
                      {dayData?.has_leave ? <View style={calStyles.leaveDot} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={calStyles.legend}>
                {[
                  { color: '#bbf7d0', label: 'Present' },
                  { color: '#fee2e2', label: 'Absent' },
                  { color: '#ffedd5', label: 'Half Day' },
                  { color: '#fef9c3', label: 'On Leave' },
                  { color: Theme.colors.background, label: 'Blocked' },
                ].map(l => (
                  <View key={l.label} style={calStyles.legendItem}>
                    <View style={[calStyles.legendDot, { backgroundColor: l.color, borderWidth: 1, borderColor: Theme.colors.border }]} />
                    <Text style={calStyles.legendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={calStyles.blockedNote}>Tap to cycle: Present → Absent → Half Day</Text>

              <TouchableOpacity accessibilityRole="button"
                style={[calStyles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveCalendar}
                disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Theme.colors.card} /> : <Text style={{ color: Theme.colors.card, fontWeight: 'bold', fontSize: 13 }}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────────────────────── */
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
    ABSENT:   { bg: '#fee2e2', text: '#991b1b' },
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
              <ActivityIndicator size="large" color={Theme.colors.primary} />
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
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  contentOverlap: {
    flex: 1,
      },

  header: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    gap: 10,
  },
  backBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE, height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: Theme.colors.card, fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', ...Theme.typography.caption, marginTop: 1 },
  refreshBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE, height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Theme.spacing.md, paddingBottom: 40 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Theme.spacing.md },
  dateLabel: { ...Theme.typography.body, fontWeight: '600', color: Theme.colors.text },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.colors.card, borderRadius: 10, borderWidth: 1,
    borderColor: Theme.colors.border, paddingVertical: Theme.spacing.sm, paddingHorizontal: 14,
  },
  dateText: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '500' },
  dateDoneBtn: {
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dateDoneText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 14 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.colors.errorBg, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorBoxText: { flex: 1, color: Theme.colors.error, fontSize: 13 },

  card: {
    backgroundColor: Theme.colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  cardHeaderText: { gap: 2 },
  cardTitle: { ...Theme.typography.bodyMd, fontWeight: '800', color: Theme.colors.text },
  cardSubtitle: { ...Theme.typography.caption, color: Theme.colors.textMuted },

  saveBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundAlt,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Theme.colors.card, fontSize: 15, fontWeight: '700' },

  centered: { alignItems: 'center', paddingVertical: Theme.spacing.xl },
  loadingText: { color: Theme.colors.textMuted, fontSize: 13, marginTop: Theme.spacing.sm },
  emptyText: { color: Theme.colors.textMuted, ...Theme.typography.body },

  staffList: { padding: 12, gap: 0 },

  staffRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: `${Theme.colors.border}88`,
    gap: 12,
  },
  staffInfo: { width: '100%' },
  staffName: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text },
  staffMeta: { ...Theme.typography.caption, color: Theme.colors.textMuted, marginTop: 2 },
  staffControls: { width: '100%', gap: 8 },

  sessionBlock: { gap: 6 },
  sessionLabel: { fontSize: 10, fontWeight: '700', color: Theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  statusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    minHeight: 44,
  },
  statusDropdownText: { ...Theme.typography.body, fontWeight: '700' },

  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    gap: 10,
  },
  pickerTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pickerOptionSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerOptionText: { ...Theme.typography.body, fontWeight: '700' },

  calBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Theme.spacing.sm,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}10`, alignSelf: 'flex-start',
  },
  calBtnText: { color: Theme.colors.primary, ...Theme.typography.caption, fontWeight: '600' },
});

/* ── Calendar Modal Styles ── */
const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  box: {
    backgroundColor: Theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '88%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
  },
  headTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  centered: { alignItems: 'center', paddingVertical: 40 },
  scroll: { padding: Theme.spacing.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md },
  navBtn: { padding: Theme.spacing.sm, borderRadius: 8, backgroundColor: Theme.colors.background },
  monthText: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  weekRow: { flexDirection: 'row', marginBottom: Theme.spacing.sm },
  weekDay: { flex: 1, textAlign: 'center', ...Theme.typography.caption, fontWeight: '700', color: Theme.colors.textMuted },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Theme.spacing.md },
  dayCell: {
    width: '12.5%', aspectRatio: 1, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.background, position: 'relative',
  },
  dayCellBlocked: { backgroundColor: Theme.colors.background, opacity: 0.55 },
  emptyCell: { width: '12.5%', aspectRatio: 1 },
  dayCellToday: { borderWidth: 2, borderColor: Theme.colors.primary },
  dayNum: { fontSize: 13, fontWeight: '500', color: Theme.colors.text },
  dayNumBlocked: { color: '#94a3b8' },
  leaveDot: { position: 'absolute', bottom: 2, right: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: '#f59e0b' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: Theme.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { ...Theme.typography.caption, color: Theme.colors.textMuted },
  blockedNote: { textAlign: 'center', ...Theme.typography.label, color: Theme.colors.textMuted, marginBottom: 14 },
  saveBtn: {
    backgroundColor: '#0D7377', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: Theme.spacing.lg,
  },
});
