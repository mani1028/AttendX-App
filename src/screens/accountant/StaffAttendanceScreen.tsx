import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Calendar,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  ChevronLeft as ChevronLeftSmall,
  ChevronRight,
} from 'lucide-react-native';
import AccountantPageHeader from '../../components/layout/AccountantPageHeader';
import API from '../../services/api';
import { Theme } from '../../theme/theme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

/* ── helpers ── */
const getHeaders = async (): Promise<Record<string, string>> => {
  const sc = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';
  const bid = (await AsyncStorage.getItem('branch_id')) || (await AsyncStorage.getItem('branchId')) || '01';
  const tok = (await AsyncStorage.getItem('token')) || '';
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
      const sc = (await AsyncStorage.getItem('school_code')) || '';
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
    if (dateStr > today) return true;
    if (parseDate(dateStr).getDay() === 0) return true;
    if (publicHolidays.includes(dateStr)) return true;
    return false;
  };

  const handleDayTap = (dateStr: string) => {
    if (isBlocked(dateStr)) return;
    const existing = calDays.find(d => d.date === dateStr);
    let next: AttendanceStatus = 'PRESENT';
    if (existing?.status === 'PRESENT') next = 'ABSENT';
    else if (existing?.status === 'ABSENT') next = 'HALF_DAY';
    else if (existing?.status === 'HALF_DAY') next = 'PRESENT';
    setCalDays(prev => {
      const filtered = prev.filter(d => d.date !== dateStr);
      return [...filtered, { ...(existing || {}), date: dateStr, status: next }];
    });
  };

  const saveCalendar = async () => {
    setSaving(true);
    try {
      const headers = await getHeaders();
      const sc = (await AsyncStorage.getItem('school_code')) || '';
      const bid = (await AsyncStorage.getItem('branch_id')) || '01';
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
  for (let i = 0; i < firstWeekday; i++) gridCells.push(null);
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
            <TouchableOpacity onPress={onClose}><X size={22} color={Theme.colors.textMuted} /></TouchableOpacity>
          </View>

          {modalLoading ? (
            <View style={calStyles.centered}><ActivityIndicator size="large" color={Theme.colors.primary} /></View>
          ) : (
            <ScrollView style={calStyles.scroll}>
              {/* Month navigator */}
              <View style={calStyles.monthNav}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={calStyles.navBtn}>
                  <ChevronLeftSmall size={18} color={Theme.colors.primary} />
                </TouchableOpacity>
                <Text style={calStyles.monthText}>{MONTHS[month]} {year}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={calStyles.navBtn}>
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
                  if (!cell) return <View key={`e-${idx}`} style={calStyles.emptyCell} />;
                  const dayData = calDays.find(d => d.date === cell.dateStr);
                  const status = dayData?.status;
                  const blocked = isBlocked(cell.dateStr);
                  const displayStatus = status === 'ON_LEAVE' ? 'ABSENT' : (status as AttendanceStatus | null);
                  const colorSet = displayStatus ? STATUS_COLORS[displayStatus] : null;
                  return (
                    <TouchableOpacity
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
                  { color: '#f1f5f9', label: 'Blocked' },
                ].map(l => (
                  <View key={l.label} style={calStyles.legendItem}>
                    <View style={[calStyles.legendDot, { backgroundColor: l.color, borderWidth: 1, borderColor: '#e2e8f0' }]} />
                    <Text style={calStyles.legendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={calStyles.blockedNote}>Tap to cycle: Present → Absent → Half Day</Text>

              <TouchableOpacity
                style={[calStyles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveCalendar}
                disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={calStyles.saveBtnText}>Save Changes</Text>}
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
  const insets = useSafeAreaInsets();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(toDateString(new Date()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarTeacher, setCalendarTeacher] = useState<StaffMember | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<string[]>([]);

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
      const sc = (await AsyncStorage.getItem('school_code')) || '';
      const bid = (await AsyncStorage.getItem('branch_id')) || '01';
      const res = await API.post('/manage/accountant/staff-attendance', {
        school_code: sc,
        branch_id: bid,
        date: attendanceDate,
      }, { headers });
      setStaffList(res.data.staff || []);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setError('Session expired. Please login again.');
      else if (status === 403) setError("You don't have permission to access this.");
      else setError(e?.response?.data?.detail || e?.message || 'Failed to fetch staff');
    } finally { setLoading(false); }
  }, [attendanceDate]);

  useEffect(() => { fetchStaff(); fetchHolidays(); }, [fetchStaff]);

  const handleStatusChange = (staffId: string, status: AttendanceStatus, session: 1 | 2 = 1) => {
    setStaffList(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      if (session === 1) return { ...s, session1_status: status };
      return { ...s, session2_status: status };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getHeaders();
      const sc = (await AsyncStorage.getItem('school_code')) || '';
      const bid = (await AsyncStorage.getItem('branch_id')) || '01';
      const updates = staffList.map(s => ({
        staff_id: s.id,
        role: s.role,
        status: s.sessions_per_day === 1 ? s.session1_status : s.status,
        session1_status: s.session1_status,
        session2_status: s.session2_status,
        sessions_per_day: s.sessions_per_day,
      }));
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
    PRESENT:  { bg: '#bbf7d0', text: '#166534' },
    ABSENT:   { bg: '#fee2e2', text: '#991b1b' },
    HALF_DAY: { bg: '#ffedd5', text: '#9a3412' },
  };

  const renderStatusToggle = (value: AttendanceStatus, onPress: (v: AttendanceStatus) => void, twoSession = false) => (
    <View style={styles.statusToggleRow}>
      {(twoSession ? statusOptions.slice(0, 2) : statusOptions).map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.statusChip, value === opt && { backgroundColor: statusColor[opt].bg, borderColor: statusColor[opt].text }]}
          onPress={() => onPress(opt)}>
          <Text style={[styles.statusChipText, value === opt && { color: statusColor[opt].text, fontWeight: '700' }]}>
            {statusLabel[opt]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStaffRow = (staff: StaffMember) => {
    const isTwoSession = staff.sessions_per_day === 2;
    return (
      <View key={staff.id} style={styles.staffRow}>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{staff.name}</Text>
          <Text style={styles.staffMeta}>{staff.employee_id || staff.id} · <Text style={{ textTransform: 'capitalize' }}>{staff.role}</Text></Text>
        </View>
        <View style={styles.staffControls}>
          {isTwoSession ? (
            <>
              <Text style={styles.sessionLabel}>Morning</Text>
              {renderStatusToggle(staff.session1_status || 'ABSENT', v => handleStatusChange(staff.id, v, 1), true)}
              <Text style={[styles.sessionLabel, { marginTop: 6 }]}>Evening</Text>
              {renderStatusToggle((staff.session2_status as AttendanceStatus) || 'ABSENT', v => handleStatusChange(staff.id, v, 2), true)}
            </>
          ) : (
            renderStatusToggle(staff.session1_status || 'ABSENT', v => handleStatusChange(staff.id, v, 1))
          )}
          {staff.role === 'teacher' ? (
            <TouchableOpacity style={styles.calBtn} onPress={() => setCalendarTeacher(staff)}>
              <Calendar size={15} color={Theme.colors.primary} />
              <Text style={styles.calBtnText}>History</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <AccountantPageHeader 
        title="Staff Attendance" 
        greeting="Staff Attendance"
        subtext="Manage daily staff attendance and leaves"
        onBackPress={() => navigation.goBack()} 
      />

      <View style={styles.contentOverlap}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date picker row */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Date:</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
            <Calendar size={16} color={Theme.colors.primary} />
            <Text style={styles.dateText}>{attendanceDate}</Text>
          </TouchableOpacity>
          {showDatePicker ? (
            <DateTimePicker
              value={parseDate(attendanceDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) setAttendanceDate(toDateString(d));
              }}
            />
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
            <Text style={styles.cardTitle}>Attendance for {attendanceDate}</Text>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || loading || staffList.length === 0) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving || loading || staffList.length === 0}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <><Save size={14} color="#fff" /><Text style={styles.saveBtnText}>Save</Text></>
              )}
            </TouchableOpacity>
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
              {/* Column headers */}
              <View style={styles.colHeader}>
                <Text style={[styles.colHeaderText, { flex: 1 }]}>Staff Member</Text>
                <Text style={[styles.colHeaderText, { flex: 1.2 }]}>Attendance</Text>
              </View>
              {staffList.map(s => renderStaffRow(s))}
            </View>
          )}
        </View>
        </ScrollView>
      </View>

      {/* Calendar modal */}
      {calendarTeacher ? (
        <CalendarModal
          teacher={calendarTeacher}
          onClose={() => setCalendarTeacher(null)}
          publicHolidays={publicHolidays}
        />
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  contentOverlap: {
    flex: 1,
    marginTop: -20,
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
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  refreshBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE, height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dateLabel: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.colors.card, borderRadius: 10, borderWidth: 1,
    borderColor: Theme.colors.border, paddingVertical: 8, paddingHorizontal: 14,
  },
  dateText: { fontSize: 14, color: Theme.colors.text, fontWeight: '500' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Theme.colors.errorBg, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorBoxText: { flex: 1, color: Theme.colors.error, fontSize: 13 },

  card: {
    backgroundColor: Theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Theme.colors.text },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0D7377', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  centered: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 8 },
  emptyText: { color: Theme.colors.textMuted, fontSize: 14 },

  staffList: { padding: 12, gap: 0 },
  colHeader: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Theme.colors.border, marginBottom: 4,
  },
  colHeaderText: { fontSize: 11, fontWeight: '800', color: Theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  staffRow: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: `${Theme.colors.border}88`, gap: 8,
    alignItems: 'flex-start',
  },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 14, fontWeight: '700', color: Theme.colors.text },
  staffMeta: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2 },
  staffControls: { flex: 1.2 },

  sessionLabel: { fontSize: 10, fontWeight: '700', color: Theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },

  statusToggleRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  statusChip: {
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6,
    borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.background,
  },
  statusChipText: { fontSize: 11, color: Theme.colors.textMuted, fontWeight: '500' },

  calBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}10`, alignSelf: 'flex-start',
  },
  calBtnText: { color: Theme.colors.primary, fontSize: 12, fontWeight: '600' },
});

/* ── Calendar Modal Styles ── */
const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  box: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '88%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
  },
  headTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  centered: { alignItems: 'center', paddingVertical: 40 },
  scroll: { padding: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8, borderRadius: 8, backgroundColor: Theme.colors.background },
  monthText: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16 },
  dayCell: {
    width: '12.5%', aspectRatio: 1, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc', position: 'relative',
  },
  dayCellBlocked: { backgroundColor: '#f1f5f9', opacity: 0.55 },
  dayCellToday: { borderWidth: 2, borderColor: Theme.colors.primary },
  dayNum: { fontSize: 13, fontWeight: '500', color: Theme.colors.text },
  dayNumBlocked: { color: '#94a3b8' },
  leaveDot: { position: 'absolute', bottom: 2, right: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: '#f59e0b' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, color: Theme.colors.textMuted },
  blockedNote: { textAlign: 'center', fontSize: 11, color: Theme.colors.textMuted, marginBottom: 14 },
  saveBtn: {
    backgroundColor: '#0D7377', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});