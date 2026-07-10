import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, C } from '../../../theme/tokens';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import type { Event, HolidayItem } from './types';

export const CALENDAR_COLORS: Record<string, string> = {
  holiday: C.error,
  festival: C.warning,
  exam: Theme.colors.violet,
  event: C.success,
  primary: C.primary,
  primaryLight: Theme.colors.blueLight,
  success: C.success,
  danger: C.error,
  text: C.text,
  textSecondary: C.text2,
  textMuted: C.text3,
  border: C.border,
  bg: C.bg,
  cardBg: C.card,
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SUPPORTED_COUNTRIES = ['IN', 'US', 'GB', 'AU', 'CA', 'SG', 'MY', 'PK', 'BD'];
export const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const normalizeDateStr = (value?: string | null): string =>
  String(value || '').trim().slice(0, 10);

export const normalizeEvent = (event: Event): Event => ({
  ...event,
  event_date: normalizeDateStr(event.event_date),
});

export async function getCalendarHeaders(): Promise<Record<string, string>> {
  const schoolCode =
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';
  const branchId =
    (await storage.getString(StorageKeys.BRANCH_ID)) ||
    (await AsyncStorage.getItem('branch_id')) ||
    (await AsyncStorage.getItem('branchId')) ||
    '';
  return {
    'X-School-Code': schoolCode,
    'x-school-code': schoolCode,
    'X-Branch-Id': branchId,
    'x-branch-id': branchId,
  };
}

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

export const generateIndiaHolidays = (year: number): HolidayItem[] => {
  const holidays = [
    { name: "New Year's Day", date: new Date(year, 0, 1), category: 'national' },
    { name: 'Republic Day', date: new Date(year, 0, 26), category: 'national' },
    { name: 'Independence Day', date: new Date(year, 7, 15), category: 'national' },
    { name: 'Gandhi Jayanti', date: new Date(year, 9, 2), category: 'national' },
    { name: 'Guru Nanak Jayanti', date: new Date(year, 10, 5), category: 'national' },
    { name: 'Christmas', date: new Date(year, 11, 25), category: 'national' },
    { name: 'Dr. B.R. Ambedkar Jayanti', date: new Date(year, 3, 14), category: 'national' },
    {
      name: 'Good Friday',
      date: new Date(calculateEaster(year).getTime() - 2 * 24 * 60 * 60 * 1000),
      category: 'national',
    },
  ];

  return holidays
    .map((h) => ({
      name: h.name,
      date: formatLocalDate(h.date),
      category: h.category,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getDaysInMonth = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export const getFirstDayOfMonth = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), 1).getDay();

export const buildCalendarDays = (currentDate: Date): (Date | null)[] => {
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) { days.push(null); }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }
  return days;
};

export const getEventsForDate = (date: Date | null, events: Event[]): Event[] => {
  if (!date) { return []; }
  const dateStr = formatLocalDate(date);
  return events.filter((e) => normalizeDateStr(e.event_date) === dateStr);
};
