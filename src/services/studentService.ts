import API, { buildApiUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatLocalDateKey, getMonthSundayDates } from '../utils/holidayUtils';

type AttendanceData = {
  percentage: number;
  presentDays: number;
  absentDays: number;
};

type MarksData = {
  subjects: Array<{ subject: string; score: number }>;
};

type FeeData = {
  totalFee: number;
  paidFee: number;
  pendingFee: number;
};

const ATTENDANCE_ENDPOINTS = [
  'student-dashboard/attendance'
];
const MARKS_ENDPOINTS = [
  'student-dashboard/marks'
];
const EXAM_LIST_ENDPOINTS = [
  'student-dashboard/marks/exams'
];
const FEE_ENDPOINTS = [
  'student-dashboard/fees'
];
const PROFILE_ENDPOINTS = [
  'hm/students/directory',
  'manage/students',
  'student-dashboard/profile'
];
const PROFILE_PHOTO_ENDPOINT = 'profile-photo/student';
const QUESTION_PAPER_ENDPOINTS = [
  'student/question-papers',
  'student-dashboard/question-papers',
  'student-dashboard/papers'
];
const EXAM_TYPES_ENDPOINTS = [
  'student/question-papers/exam-types',
  'student-dashboard/question-papers/exam-types',
  'student-dashboard/papers/exam-types'
];
const SCHOOL_HOLIDAYS_ENDPOINTS = [
  'student/school-holidays'
];
const STUDENT_REGISTER_REQUEST_ENDPOINTS = [
  'student/register-request'
];
const LEAVE_TEACHERS_ENDPOINTS = [
  'student-dashboard/teachers-for-leave'
];
const LEAVE_REQUESTS_ENDPOINTS = [
  'student-dashboard/leave-requests'
];
const SUBJECTS_ENDPOINTS = [
  'student-dashboard/subjects'
];
const HOMEWORK_ENDPOINTS = [
  'student-dashboard/homework'
];

const FALLBACK_404_CONFIG = {
  suppressFallback404Log: true,
} as const;

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function firstDefined<T = any>(...values: Array<T | undefined | null>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => toText(item, '').trim())
    .filter(Boolean);
}

function normalizePhotoSource(value: unknown): string | null {
  const photo = toText(value, '').trim();
  if (!photo) return null;
  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  const lower = photo.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)(\?.*)?$/.test(lower)) {
    return photo;
  }

  const compact = photo.replace(/\s+/g, '');
  const likelyBase64 = compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
  if (likelyBase64) {
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    return `data:image/jpeg;base64,${normalized}`;
  }

  return photo;
}

function arrayBufferToBase64(data: ArrayBuffer): string {
  const runtimeBuffer = (globalThis as any).Buffer;
  if (runtimeBuffer?.from) {
    return runtimeBuffer.from(data).toString('base64');
  }

  const bytes = new Uint8Array(data);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  const btoaFn = (globalThis as any).btoa;
  if (typeof btoaFn === 'function') {
    return btoaFn(binary);
  }

  throw new Error('Base64 encoder is unavailable');
}

function normalizeContentType(value: unknown): string {
  const raw = toText(value, '').trim().toLowerCase();
  if (!raw) return 'image/jpeg';
  if (raw.includes('image/png')) return 'image/png';
  if (raw.includes('image/webp')) return 'image/webp';
  if (raw.includes('image/gif')) return 'image/gif';
  return 'image/jpeg';
}

function firstNonEmptyStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const items = toStringArray(value);
    if (items.length > 0) return items;
  }
  return [];
}

/**
 * Tries multiple endpoint variants to find a working one.
 * It also tries prefixes like /api/v1/ and /mobile/ automatically.
 */
async function getFirstSuccessful<T>(endpoints: string[], additionalParams: any = {}) {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');
  const perEndpointTimeoutMs = 15000;

  for (const endpoint of endpoints) {
    try {
      const headers = {
        'X-School-Code': schoolCode || undefined,
        'X-Branch-Id': branchId || undefined,
        ...(additionalParams && additionalParams.headers ? additionalParams.headers : {}),
      };

      const response = await API.get<T>(endpoint, {
        timeout: perEndpointTimeoutMs,
        params: {
          school_code: schoolCode,
          student_id: studentId,
          ...additionalParams
        },
        headers,
        ...FALLBACK_404_CONFIG,
      } as any);

      if (response.status === 200 && response.data) {
         return response.data;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error(`[API] Unauthorized access to ${endpoint}. Token might be missing or invalid.`);
        throw error; // Don't try other endpoints if unauthorized
      }
      console.warn(`[Service] Failed ${endpoint}: ${error.message}`);
    }
  }
  throw new Error('No backend endpoint responded for this resource.');
}

export async function getStudentAttendance(params: any = {}): Promise<AttendanceData & { items?: any[] }> {
  try {
    const responseData = (await getFirstSuccessful<any>(ATTENDANCE_ENDPOINTS, params)) as any;

    const data = responseData?.data || responseData?.summary || responseData;
    const items = responseData?.items || responseData?.data?.items || [];

    if (Array.isArray(items) && items.length > 0) {
      const presentDays = items.filter((item: any) => String(item.status).toLowerCase() === 'present').length;
      const total = items.length || 1;
      const absentDays = Math.max(total - presentDays, 0);
      return {
        percentage: responseData.summary?.attendance_percentage ?? Math.round((presentDays / total) * 100),
        presentDays: responseData.summary?.present_days ?? presentDays,
        absentDays: responseData.summary?.absent_days ?? absentDays,
        items,
      };
    }

    const presentDays = toNumber(data.present_days ?? data.present);
    const absentDays = toNumber(data.absent_days ?? data.absent);
    const fallbackTotal = Math.max(presentDays + absentDays, 1);
    const percentage = toNumber(data.attendance_percentage ?? data.percentage, Math.round((presentDays / fallbackTotal) * 100));

    return { percentage, presentDays, absentDays, items: [] };
  } catch (error) {
    return { percentage: 0, presentDays: 0, absentDays: 0, items: [] };
  }
}

/**
 * Fetches attendance data for a specific month and year.
 * Normalizes the items to include 'date' and 'status' fields.
 */
export async function getStudentAttendanceByMonth(month: string, year: string): Promise<any[]> {
  try {
    const res = await getStudentAttendance({ month, year });
    const items = res.items || [];
    const normalizedItems = items.map((item: any) => ({
      ...item,
      date: item.date || item.attendance_date || item.day || '',
      status: String(item.status || '').toUpperCase(),
    }));

    const monthIndex = Math.max(Number(month) - 1, 0);
    const yearValue = Number(year);
    if (!Number.isFinite(yearValue)) {
      return normalizedItems;
    }

    const sundayItems = getMonthSundayDates(monthIndex, yearValue)
      .map((date) => formatLocalDateKey(date))
      .filter((dateKey) => !normalizedItems.some((item: any) => item.date === dateKey))
      .map((dateKey) => ({
        date: dateKey,
        status: 'HOLIDAY',
        holiday_name: 'Sunday Holiday',
      }));

    return [...normalizedItems, ...sundayItems].sort((left, right) => left.date.localeCompare(right.date));
  } catch (error) {
    return [];
  }
}

export async function getStudentMarks(examId?: string): Promise<MarksData & { summary?: any; items?: any[] }> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');

  for (const endpoint of MARKS_ENDPOINTS) {
    try {
      const response = await API.get<any>(endpoint, {
        params: { school_code: schoolCode, student_id: studentId, exam_id: examId },
        ...FALLBACK_404_CONFIG,
      } as any);

      const responseData = response.data;
      const list = Array.isArray(responseData) ? responseData :
                   Array.isArray(responseData?.items) ? responseData.items :
                   responseData?.subjects ?? responseData?.data?.subjects ?? [];

      return {
        subjects: list.map((item: any) => ({
          subject: String(item.subject ?? item.name ?? item.subject_name ?? 'Subject'),
          score: toNumber(item.score ?? item.marks ?? item.obtained_marks),
        })),
        summary: responseData?.summary || responseData?.data?.summary,
        items: list
      };
    } catch (error) {}
  }
  return { subjects: [], items: [] };
}

export async function getStudentExams(): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(EXAM_LIST_ENDPOINTS);
    return data?.items || data?.exams || (Array.isArray(data) ? data : []);
  } catch (error) {
    return [];
  }
}

export async function getStudentFee(): Promise<FeeData> {
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');
  const feeEndpoints = studentId
    ? [`accountant/fees/${encodeURIComponent(studentId)}`, ...FEE_ENDPOINTS]
    : FEE_ENDPOINTS;

  let data: any;
  try {
    data = (await getFirstSuccessful<any>(feeEndpoints)) as any;
  } catch (error) {
    return { totalFee: 0, paidFee: 0, pendingFee: 0 };
  }

  const root = asRecord(data);
  const nested = asRecord(firstDefined(root.data, root.summary, root.fee_summary, root.fees_summary));
  const nested2 = asRecord(firstDefined(asRecord(root.data).summary, asRecord(root.data).fee_summary, asRecord(root.data).fees_summary));
  const feesList =
    (Array.isArray(root.items) && root.items) ||
    (Array.isArray(root.records) && root.records) ||
    (Array.isArray(root.fees) && root.fees) ||
    (Array.isArray(root.history) && root.history) ||
    (Array.isArray(asRecord(root.data).items) && asRecord(root.data).items) ||
    (Array.isArray(asRecord(root.data).fees) && asRecord(root.data).fees) ||
    (Array.isArray(asRecord(root.data).records) && asRecord(root.data).records) ||
    (Array.isArray(asRecord(root.data).history) && asRecord(root.data).history) ||
    (Array.isArray(data) ? data : []);

  if (Array.isArray(feesList) && feesList.length > 0) {
    const totalFee = feesList.reduce((sum, item) => {
      const row = asRecord(item);
      return sum + toNumber(firstDefined(row.amount, row.total_fee, row.total_amount, row.fee_amount));
    }, 0);
    const paidFee = feesList.reduce((sum, item) => {
      const row = asRecord(item);
      const explicitPaid = toNumber(firstDefined(row.paid_amount, row.paid_fee, row.paid));
      if (explicitPaid > 0) return sum + explicitPaid;
      const explicitPending = toNumber(firstDefined(row.pending_fee, row.pending_amount, row.due_amount, row.balance), -1);
      if (explicitPending >= 0) {
        const totalAmount = toNumber(firstDefined(row.amount, row.total_fee, row.total_amount, row.fee_amount));
        return sum + Math.max(totalAmount - explicitPending, 0);
      }
      const status = String(firstDefined(row.status, row.payment_status, '')).toLowerCase();
      const amount = toNumber(firstDefined(row.amount, row.total_fee, row.total_amount, row.fee_amount));
      return status === 'paid' ? sum + amount : sum;
    }, 0);

    return { totalFee, paidFee, pendingFee: Math.max(totalFee - paidFee, 0) };
  }

  const totalFee = toNumber(firstDefined(root.total_fee, root.total, nested.total_fee, nested.total, nested2.total_fee, nested2.total));
  const paidFee = toNumber(firstDefined(root.paid_fee, root.paid, nested.paid_fee, nested.paid, nested2.paid_fee, nested2.paid));
  const pendingFee = toNumber(firstDefined(root.pending_fee, root.pending, nested.pending_fee, nested.pending), Math.max(totalFee - paidFee, 0));

  return { totalFee, paidFee, pendingFee };
}

export async function getPaymentHistory(): Promise<any[]> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');

  if (studentId) {
    try {
      const feesResponse = await API.get<any>(`accountant/fees/${studentId}`, {
        params: { school_code: schoolCode },
        ...FALLBACK_404_CONFIG,
      } as any);

      const feeRoot = asRecord(feesResponse.data);
      const feeRows =
        (Array.isArray(feeRoot.items) && feeRoot.items) ||
        (Array.isArray(feeRoot.fees) && feeRoot.fees) ||
        (Array.isArray(feeRoot.history) && feeRoot.history) ||
        (Array.isArray(asRecord(feeRoot.data).items) && asRecord(feeRoot.data).items) ||
        (Array.isArray(asRecord(feeRoot.data).fees) && asRecord(feeRoot.data).fees) ||
        (Array.isArray(asRecord(feeRoot.data).history) && asRecord(feeRoot.data).history) ||
        (Array.isArray(feesResponse.data) ? feesResponse.data : []);

      const feeIds = feeRows
        .map((row: any) => toText(firstDefined(asRecord(row).id, asRecord(row).fee_id), ''))
        .filter(Boolean);

      if (feeIds.length > 0) {
        const paymentGroups = await Promise.all(
          feeIds.map(async (feeId: string) => {
            try {
              const paymentResponse = await API.get<any>(`accountant/payments/${feeId}`, {
                params: { school_code: schoolCode },
                ...FALLBACK_404_CONFIG,
              } as any);
              const root = asRecord(paymentResponse.data);
              const items =
                (Array.isArray(root.items) && root.items) ||
                (Array.isArray(root.payments) && root.payments) ||
                (Array.isArray(root.ledger) && root.ledger) ||
                (Array.isArray(asRecord(root.data).items) && asRecord(root.data).items) ||
                (Array.isArray(asRecord(root.data).payments) && asRecord(root.data).payments) ||
                (Array.isArray(asRecord(root.data).ledger) && asRecord(root.data).ledger) ||
                (Array.isArray(paymentResponse.data) ? paymentResponse.data : []);

              return items.map((item: any, index: number) => {
                const row = asRecord(item);
                return {
                  id: toText(firstDefined(row.id, row.payment_id, row.receipt_no), `${feeId}-${index}`),
                  amount: toNumber(firstDefined(row.amount, row.paid_amount)),
                  method: toText(firstDefined(row.method, row.payment_method), 'CASH'),
                  date: toText(firstDefined(row.date, row.paid_at, row.created_at), new Date().toISOString()),
                };
              });
            } catch (error) {
              return [];
            }
          }),
        );

        const flattened = paymentGroups.flat();
        if (flattened.length > 0) {
          return flattened.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        }
      }
    } catch (error) {
      // Fall back to legacy endpoint below.
    }
  }

  try {
    const response = await API.get<any>('student-dashboard/payments', {
      params: { school_code: schoolCode, student_id: studentId },
      ...FALLBACK_404_CONFIG,
    } as any);
    const root = asRecord(response.data);
    const rawItems =
      (Array.isArray(root.items) && root.items) ||
      (Array.isArray(root.payments) && root.payments) ||
      (Array.isArray(asRecord(root.data).items) && asRecord(root.data).items) ||
      (Array.isArray(asRecord(root.data).payments) && asRecord(root.data).payments) ||
      (Array.isArray(response.data) ? response.data : []);

    return rawItems.map((item: any, index: number) => {
      const row = asRecord(item);
      return {
        id: toText(firstDefined(row.id, row.payment_id, row.receipt_no), String(index)),
        amount: toNumber(firstDefined(row.amount, row.paid_amount)),
        method: toText(firstDefined(row.method, row.payment_method), 'CASH'),
        date: toText(firstDefined(row.date, row.created_at), new Date().toISOString()),
      };
    });
  } catch (error) {}

  return [];
}

export async function getStudentProfilePhotoUrl(studentId?: string, schoolCode?: string): Promise<string | null> {
  const resolvedStudentId =
    studentId ||
    (await AsyncStorage.getItem('student_id')) ||
    (await AsyncStorage.getItem('studentId')) ||
    '';

  if (!resolvedStudentId) return null;

  const resolvedSchoolCode =
    schoolCode ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';

  const url = buildApiUrl(`/profile-photo/student/${encodeURIComponent(resolvedStudentId)}`);
  if (!resolvedSchoolCode) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}school_code=${encodeURIComponent(resolvedSchoolCode)}`;
}

export async function getStudentProfilePhotoDataUri(studentId?: string, schoolCode?: string): Promise<string | null> {
  const resolvedStudentId =
    studentId ||
    (await AsyncStorage.getItem('student_id')) ||
    (await AsyncStorage.getItem('studentId')) ||
    '';

  if (!resolvedStudentId) return null;

  const resolvedSchoolCode =
    schoolCode ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';

  try {
    const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
    const response = await API.get<ArrayBuffer>(`${PROFILE_PHOTO_ENDPOINT}/${encodeURIComponent(resolvedStudentId)}`, {
      params: resolvedSchoolCode ? { school_code: resolvedSchoolCode } : undefined,
      responseType: 'arraybuffer',
      headers: {
        'X-School-Code': resolvedSchoolCode || undefined,
        'X-Branch-Id': branchId || undefined,
      },
      ...FALLBACK_404_CONFIG,
    } as any);

    const contentType = normalizeContentType((response.headers as any)?.['content-type']);
    const base64 = arrayBufferToBase64(response.data);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function getStudentProfile(): Promise<any> {
  try {
    const storedUserRaw = await AsyncStorage.getItem('user');
    const storedUser = storedUserRaw ? (() => {
      try {
        return JSON.parse(storedUserRaw);
      } catch {
        return {};
      }
    })() : {};

    const responseData = await getFirstSuccessful<any>(PROFILE_ENDPOINTS);
    const root = asRecord(responseData);
    const studentId = String(
      (await AsyncStorage.getItem('student_id')) ||
      (await AsyncStorage.getItem('studentId')) ||
      root.student_id ||
      ''
    ).trim();

    const candidateList = [
      root.data,
      root.items,
      root.students,
      root.records,
      responseData,
    ].find(Array.isArray) as any[] | undefined;

    const listMatch = candidateList?.find((item: any) => {
      const row = asRecord(item);
      const rowId = String(firstDefined(row.student_id, row.studentId, row.id, row.code, row.student_no, row.roll_number, '') || '').trim();
      return studentId ? rowId === studentId : Boolean(rowId);
    });

    const raw = asRecord(firstDefined(listMatch, root.data, root.profile, root.student, root.user, storedUser, responseData));
    let photoSource = normalizePhotoSource(firstDefined(
      raw.student_photograph,
      raw.profile_photo_url,
      raw.photo_url,
      raw.photo,
      raw.avatar,
      root.student_photograph,
      root.profile_photo_url,
      root.photo_url,
      root.photo,
      root.avatar,
      storedUser?.student_photograph,
      storedUser?.profile_photo_url,
      storedUser?.photo_url,
      storedUser?.photo,
      storedUser?.avatar,
    ));

    if (!photoSource) {
      const resolvedStudentId = toText(firstDefined(raw.student_id, raw.studentId, root.student_id, storedUser?.student_id, storedUser?.studentId)).trim();
      const resolvedSchoolCode = toText(firstDefined(raw.school_code, root.school_code, storedUser?.school_code)).trim();
      photoSource = await getStudentProfilePhotoDataUri(resolvedStudentId, resolvedSchoolCode);

      if (!photoSource) {
        photoSource = await getStudentProfilePhotoUrl(resolvedStudentId, resolvedSchoolCode);
      }
    }

    const studentFullName = toText(firstDefined(
      raw.student_full_name,
      raw.full_name,
      raw.student_name,
      raw.name,
      root.student_full_name,
      root.full_name,
      root.student_name,
      root.name,
      storedUser?.student_full_name,
      storedUser?.full_name,
      storedUser?.name,
    ));

    const parentGuardianEmail = toText(firstDefined(
      raw.parent_guardian_email,
      raw.parent_email,
      raw.guardian_email,
      raw.father_guardian_email,
      raw.mother_email,
      root.parent_guardian_email,
      storedUser?.parent_guardian_email,
      storedUser?.parent_email,
      storedUser?.guardian_email,
    ));

    const fatherGuardianName = toText(firstDefined(
      raw.father_guardian_name,
      raw.father_name,
      raw.guardian_name,
      raw.father,
      raw.parent_name,
      storedUser?.father_guardian_name,
      storedUser?.father_name,
    ));

    const bloodGroup = toText(firstDefined(
      raw.blood_group,
      raw.blood_type,
      raw.bloodGroup,
      storedUser?.blood_group,
    ));

    const rollNumber = toText(firstDefined(
      raw.roll_number,
      raw.roll_no,
      raw.rollNo,
      raw.roll,
      storedUser?.roll_number,
    ));

    return {
      ...raw,
      profile_photo_url: photoSource || toText(firstDefined(raw.profile_photo_url, root.profile_photo_url)),
      student_photograph: toText(firstDefined(raw.student_photograph, root.student_photograph)),
      name: studentFullName,
      student_full_name: studentFullName,
      email: toText(firstDefined(raw.email, raw.email_address, storedUser?.email)),
      phone: toText(firstDefined(raw.phone, raw.mobile, raw.phone_number, storedUser?.phone)),
      student_id: toText(firstDefined(raw.student_id, raw.studentId, root.student_id, storedUser?.student_id, storedUser?.studentId)),
      class_grade: toText(firstDefined(raw.class_grade, raw.class_name, raw.student_class, storedUser?.class_grade, storedUser?.class_name)),
      section: toText(firstDefined(raw.section, raw.section_name, storedUser?.section)),
      roll_number: rollNumber,
      school_code: toText(firstDefined(raw.school_code, root.school_code, storedUser?.school_code)),
      school_name: toText(firstDefined(raw.school_name, raw.school, storedUser?.school_name)),
      branch_id: toText(firstDefined(raw.branch_id, storedUser?.branch_id)),
      branch_name: toText(firstDefined(raw.branch_name, storedUser?.branch_name)),
      blood_group: bloodGroup,
      father_guardian_name: fatherGuardianName,
      parent_guardian_email: parentGuardianEmail,
    };
  } catch (error) {
    try {
      const storedUserRaw = await AsyncStorage.getItem('user');
      return storedUserRaw ? JSON.parse(storedUserRaw) : {};
    } catch {
      return {};
    }
  }
}

/**
 * Fetches student profile from the dedicated student dashboard endpoint.
 * This is a direct call to the profile endpoint with explicit parameters.
 */
export async function getProfile(studentId: string, schoolCode: string): Promise<any> {
  try {
    // Try student-dashboard/profile as primary endpoint
    const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
    const response = await API.get('student-dashboard/profile', {
      params: { student_id: studentId, school_code: schoolCode },
      headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId || undefined },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    console.error('[Service] Failed to fetch profile (student-dashboard/profile), trying fallback...', error);
    try {
      // Fall back to hm/students/directory
      const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
      const response = await API.get('hm/students/directory', {
        params: { student_id: studentId, school_code: schoolCode },
        headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId || undefined },
        timeout: 15000,
      });
      return response.data;
    } catch (fallbackError) {
      console.error('[Service] Failed to fetch profile from both endpoints.');
      throw fallbackError;
    }
  }
}

export async function getQuestionPapers(params?: any): Promise<any> {
  const data = await getFirstSuccessful<any>(QUESTION_PAPER_ENDPOINTS, params);
  const root = asRecord(data);
  const wrapped = asRecord(firstDefined(root.data, root.result));

  const subjects =
    (Array.isArray(root.subjects) && root.subjects) ||
    (Array.isArray(root.papers_by_subject) && root.papers_by_subject) ||
    (Array.isArray(root.items) && root.items) ||
    (Array.isArray(root.grouped_by_subject) && root.grouped_by_subject) ||
    (Array.isArray(root.question_papers_by_subject) && root.question_papers_by_subject) ||
    (Array.isArray(wrapped.subjects) && wrapped.subjects) ||
    (Array.isArray(wrapped.papers_by_subject) && wrapped.papers_by_subject) ||
    (Array.isArray(wrapped.items) && wrapped.items) ||
    (Array.isArray(wrapped.grouped_by_subject) && wrapped.grouped_by_subject) ||
    (Array.isArray(wrapped.question_papers_by_subject) && wrapped.question_papers_by_subject) ||
    [];

  return {
    ...root,
    data: wrapped,
    subjects,
  };
}

export async function getExamTypes(): Promise<any> {
  try {
    const data = await getFirstSuccessful<any>(EXAM_TYPES_ENDPOINTS);
    const root = asRecord(data);
    const wrapped = asRecord(firstDefined(root.data, root.result));
    const examTypes = firstNonEmptyStringArray(
      root.exam_types,
      root.examTypes,
      root.items,
      wrapped.exam_types,
      wrapped.examTypes,
      wrapped.items,
      data,
    );

    return {
      ...root,
      data: wrapped,
      exam_types: examTypes,
    };
  } catch (error) {
    // Some deployments do not expose a dedicated exam-type endpoint.
    // Fallback: infer exam types from question papers response.
    try {
      const papersResponse = await getQuestionPapers();
      const subjects = Array.isArray(papersResponse?.subjects) ? papersResponse.subjects : [];
      const types = new Set<string>();

      subjects.forEach((subject: any) => {
        const papers = Array.isArray(subject?.papers) ? subject.papers : [];
        papers.forEach((paper: any) => {
          const type = toText(paper?.exam_type, '').trim();
          if (type) {
            types.add(type);
          }
        });
      });

      return { exam_types: Array.from(types) };
    } catch (fallbackError) {
      return { exam_types: [] };
    }
  }
}

export async function downloadQuestionPaper(paperId: string): Promise<ArrayBuffer> {
  const endpoints = [
    `student/question-papers/${encodeURIComponent(paperId)}/download`,
    `student-dashboard/question-papers/${encodeURIComponent(paperId)}/download`,
    `student-dashboard/papers/${encodeURIComponent(paperId)}/download`,
  ];

  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await API.get<ArrayBuffer>(endpoint, {
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error: any) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('Could not download question paper');
}

export async function getTeachersForLeave(): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(LEAVE_TEACHERS_ENDPOINTS);
    return data?.items || data?.teachers || (Array.isArray(data) ? data : []);
  } catch (error) {
    return [];
  }
}

export async function getLeaveRequests(): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(LEAVE_REQUESTS_ENDPOINTS);
    return data?.items || data?.requests || (Array.isArray(data) ? data : []);
  } catch (error) {
    return [];
  }
}

export async function submitLeaveRequest(requestData: any): Promise<any> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');

  for (const endpoint of LEAVE_REQUESTS_ENDPOINTS) {
    try {
      const response = await API.post(endpoint, {
        ...requestData,
        school_code: schoolCode,
        student_id: studentId
      });
      return response.data;
    } catch (error: any) {
       if (error.response?.status !== 404) throw error;
    }
  }
  throw new Error('Could not submit leave request');
}

export async function getSubjects(): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(SUBJECTS_ENDPOINTS);
    return data?.items || data?.subjects || (Array.isArray(data) ? data : []);
  } catch (error) {
    return [];
  }
}

export async function getHomework(params: any): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(HOMEWORK_ENDPOINTS, params);
    return data?.items || data?.homework || (Array.isArray(data) ? data : []);
  } catch (error) {
    return [];
  }
}

export async function getSchoolHolidays(params: any = {}): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(SCHOOL_HOLIDAYS_ENDPOINTS, params);
    return data?.items || data?.holidays || data?.calendar || (Array.isArray(data) ? data : []);
  } catch (error) {
    return [];
  }
}

export async function submitStudentRegisterRequest(formData: FormData): Promise<any> {
  let lastError: unknown;

  for (const endpoint of STUDENT_REGISTER_REQUEST_ENDPOINTS) {
    try {
      const response = await API.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('Could not submit student registration request');
}

export async function sendOtp(emailId: string): Promise<any> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  // We try a few common OTP sending endpoints
  const endpoints = ['/auth/request-otp', '/auth/forgot-password', '/teacher/register/send-otp'];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, {
        email_id: emailId,
        identifier: emailId,
        school_code: schoolCode,
      }, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        }
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function verifyOtp(emailId: string, otp: string): Promise<any> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  const endpoints = ['/auth/verify-otp', '/auth/forgot-password/verify-otp', '/teacher/register/verify-otp'];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, {
        email_id: emailId,
        identifier: emailId,
        otp,
        school_code: schoolCode,
      }, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        }
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function changePassword(emailId: string, newPassword: string, otp: string): Promise<any> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');

  const endpoints = ['/auth/reset-password', '/auth/forgot-password/reset-password', '/auth/forgot-password'];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, {
        email_id: emailId,
        identifier: emailId,
        otp,
        new_password: newPassword,
        confirm_password: newPassword,
        school_code: schoolCode,
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function updateStudentProfile(data: any): Promise<any> {
  // Preferred API: PUT /manage/update with data_type=student
  try {
    const payload = { ...data, data_type: 'student' };
    const response = await API.put('manage/update', payload);
    return response.data;
  } catch (err) {
    // Fallbacks: existing endpoints (POST) kept for backward compatibility
  }

  const endpoints = ['manage/students/update', 'profile/update', 'student-dashboard/profile/update'];
  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, data);
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
