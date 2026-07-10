import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { X, ChevronLeft as ChevronLeftSmall, ChevronRight } from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import API from '../../../services/api';
import { Theme } from '../../../theme/tokens';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import { calendarModalStyles as calStyles } from './calendarModalStyles';
import {
  getHeaders,
  toDateString,
  parseDate,
  MONTHS,
  WEEKDAYS,
  STATUS_COLORS,
  type StaffMember,
  type CalendarDay,
  type AttendanceStatus,
} from './helpers';

export interface CalendarModalProps {
  teacher: StaffMember;
  onClose: () => void;
  publicHolidays: string[];
}

export default function CalendarModal({ teacher, onClose, publicHolidays }: CalendarModalProps) {
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
            <View style={calStyles.centered}><ScreenSkeleton variant="list" /></View>
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
                  { color: Theme.colors.redLight, label: 'Absent' },
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
                {saving ? <ActivityIndicator size="small" color={Theme.colors.card} /> : <Text style={{ color: Theme.colors.card, fontWeight: 'bold', fontSize: Theme.typography.caption.fontSize }}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
