import API from './api';
import { coerceAttendanceStatus } from '../utils/helpers';

async function getFirstSuccessful<T>(endpoints: string[], headers: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, { headers, suppressFallback404Log: true } as any);
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('Principal service endpoint not found');
}

function normalizeTeacherList(data: any): any[] {
  const rows = data?.items || data?.teachers || data?.records || data?.data || data;
  const items = Array.isArray(rows) ? rows : [];

  return items.filter(Boolean).map((teacher: any) => ({
    ...teacher,
    teacher_full_name: teacher.teacher_full_name || teacher.staff_full_name || '',
    // ponytail: `status` is attendance (PRESENT/ABSENT), not employment — use staff_status
    teacher_status: String(teacher.teacher_status || teacher.staff_status || 'ACTIVE').toUpperCase(),
  }));
}

export async function getPrincipalStats(headers: any): Promise<any> {
  const endpoints = [
    'principal/dashboard/stats',
    'principal/dashboard/stats',
  ];
  return getFirstSuccessful(endpoints, headers);
}

export async function getPrincipalClasses(headers: any): Promise<any[]> {
  const endpoints = [
    'principal/classes',
    'principal/classes',
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, headers);
    return (data as any).items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getPrincipalTeachers(headers: any): Promise<any[]> {
  const endpoints = [
    'principal/staff',
    'principal/teachers',
  ];

  try {
    const data = await getFirstSuccessful<any>(endpoints, headers);
    const items = normalizeTeacherList(data);
    if (items.length) {
      return items;
    }
  } catch (err) {
    console.warn('Primary teacher endpoint failed:', err);
    // Fall through to the attendance-backed teacher list.
  }

  try {
    // Attempt fallback to principal/staff/attendance first
    const endpointsAttendance = [
      'principal/staff/attendance',
      'principal/staff/attendance',
    ];

    let responseData;
    for (const ep of endpointsAttendance) {
      try {
        const response = await API.get(ep, {
          headers,
          params: { on_date: new Date().toISOString().split('T')[0] },
          suppressFallback404Log: true,
        } as any);
        responseData = response.data;
        break;
      } catch (e) {}
    }

    if (responseData) {
      const items = normalizeTeacherList(responseData);
      if (items.length) {
        return items;
      }
    }
  } catch (err) {
    console.warn('Attendance-based teacher fetch failed:', err);
  }

  return [];
}

export interface PrincipalStudentSearchResult {
  roll_no: string;
  roll_number?: string;
  student_id?: string;
  student_full_name?: string;
  name?: string;
  class_grade?: string;
  section?: string;
  admission_number?: string;
}

export async function searchPrincipalStudents(
  query: string,
  headers: Record<string, string>,
): Promise<PrincipalStudentSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) { return []; }

  const response = await API.get('principal/students-search', {
    headers,
    params: { q: trimmed },
    suppressFallback404Log: true,
  } as any);

  const rows = response.data?.items || response.data?.students || response.data || [];
  return Array.isArray(rows) ? rows : [];
}

export async function getStudentPromotionHistory(
  rollNo: string,
  headers: Record<string, string>,
): Promise<any[]> {
  try {
    const response = await API.get(`principal/promotion/history/${encodeURIComponent(rollNo)}`, {
      headers,
      suppressFallback404Log: true,
    } as any);
    return response.data?.history || response.data?.items || [];
  } catch {
    return [];
  }
}

export interface PrincipalStudentAttendanceRecord {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
  remarks?: string;
}

const ATTENDANCE_ENDPOINTS = [
  'student-dashboard/attendance',
  'manage/student-dashboard/attendance',
];

function normalizeAttendanceStatus(value: unknown): PrincipalStudentAttendanceRecord['status'] {
  const status = coerceAttendanceStatus(value);
  if (status === 'PRESENT' || status === 'ABSENT' || status === 'HALF_DAY') {
    return status;
  }
  return 'ABSENT';
}

function normalizeAttendanceRecord(item: Record<string, any>): PrincipalStudentAttendanceRecord | null {
  const date = String(item.date || item.attendance_date || item.day || '').trim().slice(0, 10);
  if (!date) { return null; }
  return {
    date,
    status: normalizeAttendanceStatus(item.status ?? item.attendance_status ?? item.type),
    remarks: item.remarks || item.remark || item.note || undefined,
  };
}

function studentRefMatches(row: Record<string, any>, studentRef: string): boolean {
  const target = studentRef.trim().toUpperCase();
  if (!target) { return false; }
  const candidates = [row.student_id, row.studentId, row.id, row.roll_number, row.roll_no, row.admission_number];
  return candidates.some((value) => String(value || '').trim().toUpperCase() === target);
}

function iterDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) { return dates; }
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function mapPrincipalStudentProfile(row: Record<string, any>): Record<string, any> {
  const addressParts = [
    row.house_no,
    row.street_locality,
    row.village_town_city,
    row.mandal_taluk,
    row.district,
    row.state,
    row.pin_code,
  ].filter(Boolean);

  return {
    ...row,
    student_full_name: row.student_full_name || row.name || row.full_name,
    roll_number: row.roll_number || row.roll_no,
    roll_no: row.roll_no || row.roll_number,
    student_id: row.student_id || row.id,
    parent_name: row.father_guardian_name || row.parent_guardian_name || row.parent_name,
    phone: row.father_guardian_mobile || row.parent_guardian_mobile || row.mobile_number || row.phone,
    emergency_contact: row.emergency_contact_number || row.emergency_contact,
    email: row.parent_guardian_email || row.email_id || row.email,
    dob: row.date_of_birth || row.dob,
    address: addressParts.length ? addressParts.join(', ') : row.address,
  };
}

export async function getPrincipalStudentProfile(
  studentRef: string,
  headers: Record<string, string>,
): Promise<Record<string, any> | null> {
  const trimmed = studentRef.trim();
  if (!trimmed) { return null; }

  const searchRows = await searchPrincipalStudents(trimmed, headers);
  const searchMatch = searchRows.find((row) =>
    [row.roll_no, row.roll_number, row.student_id, row.admission_number]
      .some((value) => String(value || '').trim().toUpperCase() === trimmed.toUpperCase()),
  ) || searchRows[0];

  const profileEndpoints = ['student-dashboard/profile', 'manage/student-dashboard/profile'];
  for (const endpoint of profileEndpoints) {
    try {
      const response = await API.get(endpoint, {
        headers,
        params: {
          student_id: trimmed,
          roll_no: trimmed,
        },
        suppressFallback404Log: true,
      } as any);

      const payload = response.data;
      const root = payload && typeof payload === 'object' ? payload : {};
      const list = [payload, root.data, root.profile, root.student, root.user]
        .find(Array.isArray) as any[] | undefined;
      const matched = list?.find((item) => studentRefMatches(item || {}, trimmed)) || list?.[0];
      const profileRow = mapPrincipalStudentProfile(matched || (payload && typeof payload === 'object' ? payload : {}));
      if (profileRow.student_full_name || profileRow.roll_number || profileRow.student_id) {
        return { ...searchMatch, ...profileRow };
      }
    } catch {
      // try next endpoint
    }
  }

  if (searchMatch) {
    return mapPrincipalStudentProfile(searchMatch as Record<string, any>);
  }

  return null;
}

export async function getPrincipalStudentAttendance(
  studentRef: string,
  headers: Record<string, string>,
  options: {
    start_date: string;
    end_date: string;
    class_grade?: string;
    section?: string;
  },
): Promise<PrincipalStudentAttendanceRecord[]> {
  const trimmed = studentRef.trim();
  if (!trimmed) { return []; }

  for (const endpoint of ATTENDANCE_ENDPOINTS) {
    try {
      const response = await API.get(endpoint, {
        headers,
        params: {
          student_id: trimmed,
          roll_no: trimmed,
          start_date: options.start_date,
          end_date: options.end_date,
          from_date: options.start_date,
          to_date: options.end_date,
        },
        suppressFallback404Log: true,
      } as any);

      const payload = response.data || {};
      const items = payload.items || payload.data?.items || payload.records || payload.data?.records || [];
      if (Array.isArray(items)) {
        const records = items
          .map((item: Record<string, any>) => normalizeAttendanceRecord(item))
          .filter(Boolean) as PrincipalStudentAttendanceRecord[];
        if (records.length > 0 || response.status === 200) {
          return records.sort((a, b) => b.date.localeCompare(a.date));
        }
      }
    } catch {
      // try next endpoint
    }
  }

  if (!options.class_grade || !options.section) {
    throw new Error('Unable to load attendance for this student. Class and section are required.');
  }

  const schoolCode = headers['X-School-Code'] || headers['x-school-code'] || '';
  const branchId = headers['X-Branch-Id'] || headers['x-branch-id'] || '';
  const records: PrincipalStudentAttendanceRecord[] = [];

  // ponytail: one request per day via fetch-report; bulk student endpoint would replace this loop
  for (const date of iterDates(options.start_date, options.end_date)) {
    try {
      const response = await API.post('manage/attendance/student/fetch-report', {
        school_code: schoolCode,
        branch_id: branchId,
        attendance_date: date,
        class_grade: String(options.class_grade).toLowerCase(),
        section: String(options.section).toLowerCase(),
      });

      const data = response.data || {};
      if (data.holiday) { continue; }

      const present = Array.isArray(data.present) ? data.present : [];
      const absent = Array.isArray(data.absent) ? data.absent : [];
      const match = [...present, ...absent].find((row) => studentRefMatches(row || {}, trimmed));
      if (!match) { continue; }

      const isPresent = present.some((row: Record<string, any>) => studentRefMatches(row || {}, trimmed));
      records.push({
        date,
        status: isPresent ? 'PRESENT' : 'ABSENT',
        remarks: match.remarks || match.remark,
      });
    } catch {
      // skip failed day
    }
  }

  return records.sort((a, b) => b.date.localeCompare(a.date));
}
