import API, { buildApiUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFeesByStudent, getPaymentHistoryByFee } from './accountantService';
import { formatLocalDateKey, getMonthSundayDates } from '../utils/holidayUtils';
import { safeJsonParse } from '../utils/storage';

type AttendanceData = {
  percentage: number;
  presentDays: number;
  absentDays: number;
  halfDays?: number;
  totalDays?: number;
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
const PROFILE_PHOTO_ENDPOINT = 'profile-photo/student';
const QUESTION_PAPER_ENDPOINTS = ['student/question-papers'];
const EXAM_TYPES_ENDPOINTS = ['student/question-papers/exam-types'];
const SCHOOL_HOLIDAYS_ENDPOINTS = ['student/school-holidays'];
const STUDENT_REGISTER_REQUEST_ENDPOINTS = ['student/register-request'];
const LEAVE_TEACHERS_ENDPOINTS = ['student-dashboard/teachers-for-leave'];
const LEAVE_REQUESTS_ENDPOINTS = ['student-dashboard/leave-requests'];
const SUBJECTS_ENDPOINTS = ['student-dashboard/subjects'];
const HOMEWORK_ENDPOINTS = ['student-dashboard/homework'];

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

function normalizeAttendanceStatus(value: unknown): string {
  return toText(value, '').trim().toUpperCase();
}

function normalizeAttendanceItem(item: Record<string, any>): Record<string, any> {
  const status = normalizeAttendanceStatus(
    item.status ?? item.attendance_status ?? item.type ?? item.attendanceType
  );

  return {
    ...item,
    date: toText(item.date ?? item.attendance_date ?? item.day ?? item.attendanceDate, '').trim(),
    status,
  };
}

function isHolidayAttendanceItem(item: Record<string, any>): boolean {
  const status = normalizeAttendanceStatus(item.status);
  if (status === 'HOLIDAY' || status === 'SUNDAY_HOLIDAY') return true;

  if (item.holiday === true || item.is_holiday === true || item.isHoliday === true) {
    return true;
  }

  const holidayLabel = toText(item.holiday_name ?? item.holidayName ?? item.name ?? item.title, '').trim();
  return /holiday/i.test(holidayLabel);
}

/**
 * Tries multiple endpoint variants to find a working one.
 * It also tries prefixes like /api/v1/ and /mobile/ automatically.
 */
async function getFirstSuccessful<T>(endpoints: string[], additionalParams: any = {}) {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || await AsyncStorage.getItem('school_id') || await AsyncStorage.getItem('schoolId');
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
          school_id: schoolCode,
          branch_id: branchId,
          student_id: studentId,
          ...additionalParams,
        },
        headers,
        ...FALLBACK_404_CONFIG,
      } as any);

      if (response.status === 200 && response.data) {
         return response.data;
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
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
    const normalizedItems = Array.isArray(items)
      ? items.map((item: any) => normalizeAttendanceItem(item))
      : [];
    const schoolDayItems = normalizedItems.filter((item) => !isHolidayAttendanceItem(item));

    if (schoolDayItems.length > 0) {
      const presentDays = schoolDayItems.filter((item: any) => item.status === 'PRESENT').length;
      const absentDays = schoolDayItems.filter((item: any) => item.status === 'ABSENT').length;
      const lateDays = schoolDayItems.filter((item: any) => item.status === 'LATE').length;
      const halfDayOnly = schoolDayItems.filter((item: any) => item.status === 'HALF_DAY' || item.status === 'HALF DAY').length;
      const total = schoolDayItems.length || 1;
      const percentage = Math.round(((presentDays + lateDays + (halfDayOnly * 0.5)) / total) * 100);
      return {
        percentage: responseData.summary?.attendance_percentage ?? percentage,
        presentDays: responseData.summary?.present_days ?? presentDays,
        absentDays: responseData.summary?.absent_days ?? absentDays,
        halfDays: responseData.summary?.half_days ?? responseData.summary?.halfDays ?? (lateDays + halfDayOnly),
        totalDays: responseData.summary?.total_days ?? responseData.summary?.totalDays ?? total,
        items: normalizedItems,
      };
    }

    const presentDays = toNumber(data.present_days ?? data.present);
    const absentDays = toNumber(data.absent_days ?? data.absent);
    const fallbackTotal = Math.max(presentDays + absentDays, 1);
    const percentage = toNumber(data.attendance_percentage ?? data.percentage, Math.round((presentDays / fallbackTotal) * 100));

    return { percentage, presentDays, absentDays, halfDays: toNumber(data.half_days ?? data.halfDays), totalDays: fallbackTotal, items: [] };
  } catch (error) {
    return { percentage: 0, presentDays: 0, absentDays: 0, halfDays: 0, totalDays: 0, items: [] };
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
  try {
    // FIX: Use the student-specific fetcher instead of the bulk list
    const allFees = await getFeesByStudent(studentId || '');
    const matchingFees = studentId
      ? allFees.filter((fee) => String(fee.student_id || '').trim() === String(studentId).trim())
      : allFees;
    const fees = matchingFees.length > 0 ? matchingFees : allFees;

    if (fees.length === 0) {
      return { totalFee: 0, paidFee: 0, pendingFee: 0 };
    }

    const totalFee = fees.reduce((sum, fee) => sum + toNumber(fee.total_fee), 0);
    const paidFee = fees.reduce((sum, fee) => sum + toNumber(fee.paid_amount), 0);
    const pendingFee = fees.reduce((sum, fee) => sum + toNumber(fee.due_amount), 0);

    return { totalFee, paidFee, pendingFee: Math.max(pendingFee, Math.max(totalFee - paidFee, 0)) };
  } catch (error) {
    return { totalFee: 0, paidFee: 0, pendingFee: 0 };
  }
}

export async function getPaymentHistory(): Promise<any[]> {
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');

  try {
    // FIX: Use the student-specific fetcher instead of the bulk list
    const allFees = await getFeesByStudent(studentId || '');
    const matchingFees = studentId
      ? allFees.filter((fee) => String(fee.student_id || '').trim() === String(studentId).trim())
      : allFees;
    const fees = matchingFees.length > 0 ? matchingFees : allFees;

    if (fees.length === 0) {
      return [];
    }

    const paymentGroups = await Promise.all(
      fees.map(async (fee) => {
        try {
          const payments = await getPaymentHistoryByFee(fee.id);
          return payments.map((payment, index) => ({
            id: payment.id || `${fee.id}-${index}`,
            amount: payment.amount,
            method: payment.method.toUpperCase(),
            date: payment.paid_at || payment.created_at || new Date().toISOString(),
            receipt_no: payment.receipt_no || undefined,
            transaction_id: payment.transaction_id || undefined,
          }));
        } catch (error) {
          return [];
        }
      }),
    );

    const flattened = paymentGroups.flat();
    return flattened.sort((left, right) => String(right.date).localeCompare(String(left.date)));
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
    const storedUser = safeJsonParse<Record<string, any>>(storedUserRaw, {}, () => {
      AsyncStorage.setItem('user', JSON.stringify({})).catch(() => {});
    });

    const studentId = String(
      (await AsyncStorage.getItem('student_id')) ||
      (await AsyncStorage.getItem('studentId')) ||
      storedUser?.student_id ||
      storedUser?.studentId ||
      ''
    ).trim();
    const schoolCode = String(
      (await AsyncStorage.getItem('school_code')) ||
      (await AsyncStorage.getItem('schoolCode')) ||
      storedUser?.school_code ||
      ''
    ).trim();

    if (!studentId && !schoolCode) {
      return storedUser || {};
    }

    const responseData = await getProfile(studentId, schoolCode);

    // Normalize response if it's a list instead of a single object
    let profileData = responseData;
    if (Array.isArray(responseData)) {
      profileData = responseData[0];
    } else if (responseData && typeof responseData === 'object') {
      const candidateList = [
        responseData.data,
        responseData.items,
        responseData.students,
        responseData.records
      ].find(Array.isArray);

      if (candidateList && candidateList.length > 0) {
        profileData = candidateList[0];
      }
    }

    const root = asRecord(profileData);
    const raw = asRecord(firstDefined(root.data, root.profile, root.student, root.user, profileData, storedUser));
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
      return safeJsonParse<Record<string, any>>(storedUserRaw, {});
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
    const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
    const response = await API.get('student-dashboard/profile', {
      params: {
        student_id: studentId || undefined,
        school_code: schoolCode || undefined,
      },
      headers: { 'X-School-Code': schoolCode || undefined, 'X-Branch-Id': branchId || undefined },
      timeout: 15000,
    });
    const responseData = response.data;
    const root = asRecord(responseData);

    const candidateList = [
      responseData,
      root.data,
      root.items,
      root.students,
      root.records,
      root.profile,
      root.student,
      root.user,
    ].find(Array.isArray) as any[] | undefined;

    const matchedRecord = candidateList?.find((item: any) => {
      const row = asRecord(item);
      const rowId = String(firstDefined(row.student_id, row.studentId, row.id, row.code, row.student_no, row.roll_number, '') || '').trim();
      return studentId ? rowId === studentId : Boolean(rowId);
    });

    if (matchedRecord) {
      return asRecord(matchedRecord);
    }

    if (Array.isArray(responseData)) {
      return asRecord(responseData[0]);
    }

    if (Array.isArray(root.data) && root.data.length > 0) {
      return asRecord(root.data[0]);
    }

    if (Array.isArray(root.items) && root.items.length > 0) {
      return asRecord(root.items[0]);
    }

    return root;
  } catch (error) {
    console.error('[Service] Failed to fetch profile from student-dashboard/profile.');
    throw error;
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
  const endpoint = `student/question-papers/${encodeURIComponent(paperId)}/download`;
  const response = await API.get<ArrayBuffer>(endpoint, {
    responseType: 'arraybuffer',
  });
  return response.data;
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
  const response = await API.post('student/register-request', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function sendOtp(emailId: string): Promise<any> {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || await AsyncStorage.getItem('school_id') || await AsyncStorage.getItem('schoolId');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  // We try a few common OTP sending endpoints
  const endpoints = ['/auth/forgot-password', '/auth/request-otp', '/teacher/register/send-otp'];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, {
        email: emailId,
        email_id: emailId,
        identifier: emailId,
        school_id: schoolCode,
        schoolCode,
        school_code: schoolCode,
      }, {
        headers: {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
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
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || await AsyncStorage.getItem('school_id') || await AsyncStorage.getItem('schoolId');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  const endpoints = ['/auth/forgot-password', '/auth/verify-otp', '/auth/forgot-password/verify-otp', '/teacher/register/verify-otp'];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, {
        email: emailId,
        email_id: emailId,
        identifier: emailId,
        otp,
        school_id: schoolCode,
        schoolCode,
        school_code: schoolCode,
      }, {
        headers: {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
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
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || await AsyncStorage.getItem('school_id') || await AsyncStorage.getItem('schoolId');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  const endpoints = ['/auth/forgot-password', '/auth/reset-password', '/auth/forgot-password/reset-password'];

  let lastError: any;
  for (const endpoint of endpoints) {
    try {
      const response = await API.post(endpoint, {
        email: emailId,
        email_id: emailId,
        identifier: emailId,
        otp,
        new_password: newPassword,
        confirm_password: newPassword,
        school_id: schoolCode,
        schoolCode,
        school_code: schoolCode,
      }, {
        headers: {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
        }
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function updateStudentProfile(data: any): Promise<any> {
  const schoolCode =
    toText(
      firstDefined(
        data?.school_code,
        data?.schoolCode,
        await AsyncStorage.getItem('school_code'),
        await AsyncStorage.getItem('schoolCode'),
        await AsyncStorage.getItem('school_id'),
        await AsyncStorage.getItem('schoolId'),
      ),
    ).trim();

  const branchId =
    toText(
      firstDefined(
        data?.branch_id,
        data?.branchId,
        await AsyncStorage.getItem('branch_id'),
        await AsyncStorage.getItem('branchId'),
      ),
    ).trim();

  let storedUser: Record<string, any> = {};
  try {
    const storedUserRaw = await AsyncStorage.getItem('user');
    storedUser = asRecord(safeJsonParse(storedUserRaw, {}));
  } catch {
    storedUser = {};
  }

  const source = Object.keys(asRecord(data?.data)).length > 0 ? asRecord(data?.data) : asRecord(data);

  const studentPrimaryId = toText(
    firstDefined(
      source.student_id,
      source.studentId,
      data?.student_id,
      data?.studentId,
      await AsyncStorage.getItem('student_id'),
      await AsyncStorage.getItem('studentId'),
      storedUser.student_id,
      storedUser.studentId,
    ),
  ).trim();

  if (!studentPrimaryId) {
    throw new Error('Student ID is required to update student profile.');
  }

  const rollNumber = toText(firstDefined(source.roll_number, source.rollNo, source.roll_no, data?.roll_number, data?.rollNo, data?.roll_no)).trim();
  const admissionNumber = toText(
    firstDefined(
      source.admission_number,
      source.admissionNumber,
      source.admission_no,
      data?.admission_number,
      data?.admissionNumber,
      data?.admission_no,
      storedUser.admission_number,
      storedUser.admissionNumber,
      studentPrimaryId,
    ),
  ).trim();

  const headers = {
    'X-School-Code': schoolCode || undefined,
    'x-school-code': schoolCode || undefined,
    'X-Branch-Id': branchId || undefined,
  };

  const metadataKeys = new Set([
    'school_code',
    'schoolCode',
    'branch_id',
    'branchId',
    'data_type',
    'dataType',
    'data',
  ]);

  const generalStudentData: Record<string, any> = { student_id: studentPrimaryId };
  for (const [key, value] of Object.entries(source)) {
    if (metadataKeys.has(key)) continue;
    if (key === 'roll_number' || key === 'roll_no' || key === 'rollNo') continue;
    if (value === undefined) continue;
    generalStudentData[key] = value;
  }

  const hasGeneralFields = Object.keys(generalStudentData).some(key => key !== 'student_id');
  let generalUpdateResponse: any = null;
  let rollUpdateResponse: any = null;
  let lastError: any;

  if (hasGeneralFields) {
    try {
      const response = await API.put('manage/update', {
        school_code: schoolCode || undefined,
        branch_id: branchId || undefined,
        data_type: 'students',
        data: generalStudentData,
      }, { headers });
      generalUpdateResponse = response.data;
    } catch (error) {
      lastError = error;
    }
  }

  if (rollNumber) {
    if (!admissionNumber) {
      throw new Error('Admission number is required to update roll number.');
    }

    try {
      const response = await API.post('manage/student/update-roll-number', {
        school_code: schoolCode || undefined,
        branch_id: branchId || undefined,
        student_id: admissionNumber,
        roll_number: rollNumber,
      }, { headers });
      rollUpdateResponse = response.data;
    } catch (error) {
      lastError = error;
    }
  }

  if (generalUpdateResponse || rollUpdateResponse) {
    return {
      ...(generalUpdateResponse && asRecord(generalUpdateResponse)),
      ...(rollUpdateResponse && asRecord(rollUpdateResponse)),
      general_update: generalUpdateResponse,
      roll_update: rollUpdateResponse,
    };
  }

  if (!hasGeneralFields && !rollNumber) {
    throw new Error('No updatable student profile fields were provided.');
  }

  throw lastError || new Error('Failed to update student profile.');
}
