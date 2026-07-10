import { Theme } from '../../../theme/tokens';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY';

export interface StaffMember {
  id: string;
  employee_id?: string;
  name: string;
  role: string;
  sessions_per_day: number;
  session1_status: AttendanceStatus;
  session2_status?: AttendanceStatus;
  status?: AttendanceStatus;
}

export interface CalendarDay {
  date: string;
  status: string | null;
  has_leave?: boolean;
  leave_status?: string;
  leave_reason?: string;
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PRESENT: { bg: '#bbf7d0', text: '#166534' },
  ABSENT: { bg: Theme.colors.redLight, text: '#991b1b' },
  HALF_DAY: { bg: '#ffedd5', text: '#9a3412' },
  ON_LEAVE: { bg: '#fef9c3', text: '#854d0e' },
};

export const getHeaders = async (): Promise<Record<string, string>> => {
  const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
  const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || '01';
  const tok = (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || '';
  return { 'X-School-Code': sc, 'X-Branch-Id': bid, Authorization: `Bearer ${tok}` };
};

export const toDateString = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const normalizeStatus = (value: unknown): AttendanceStatus => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PRESENT' || normalized === 'ABSENT' || normalized === 'HALF_DAY') {
    return normalized;
  }
  return 'ABSENT';
};

export const staffMemberKey = (staff: Pick<StaffMember, 'id' | 'employee_id'>): string =>
  String(staff.employee_id || staff.id || '').trim();

export const normalizeStaffMember = (raw: Record<string, unknown>): StaffMember => {
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
    session2_status: raw.session2_status != null ? normalizeStatus(raw.session2_status) : undefined,
    status: raw.status != null ? normalizeStatus(raw.status) : session1,
  };
};

export const combinedSessionStatus = (
  session1: AttendanceStatus,
  session2?: AttendanceStatus,
): AttendanceStatus => {
  if (!session2) return session1;
  if (session1 === 'PRESENT' && session2 === 'PRESENT') return 'PRESENT';
  if (session1 === 'ABSENT' && session2 === 'ABSENT') return 'ABSENT';
  return 'HALF_DAY';
};
