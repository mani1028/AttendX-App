import API, { buildApiUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFeesByStudent, getPaymentHistoryByFee } from './accountantService';
import { formatLocalDateKey, getMonthSundayDates } from '../utils/holidayUtils';
import { resolveStudentRollNumber } from '../utils/helpers';
import { safeJsonParse } from '../utils/storage';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';


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
  'student-dashboard/attendance',
  'manage/student-dashboard/attendance',
];

const MARKS_ENDPOINTS = [
  'student-dashboard/marks',
  'manage/student-dashboard/marks',
];
const EXAM_LIST_ENDPOINTS = [
  'student-dashboard/marks/exams',
  'manage/student-dashboard/marks/exams',
];
const PROFILE_PHOTO_ENDPOINT = 'profile-photo/student';
// Prefer the canonical `student` endpoints first (some backends expose these).
const QUESTION_PAPER_ENDPOINTS = [
  'student-dashboard/question-papers',
  'student/question-papers',
  'manage/student-dashboard/question-papers',
];
const EXAM_TYPES_ENDPOINTS = [
  'student-dashboard/question-papers/exam-types',
  'student/question-papers/exam-types',
  'manage/student-dashboard/question-papers/exam-types',
];

const SCHOOL_HOLIDAYS_ENDPOINTS = [
  'student-dashboard/school-holidays',
  'manage/student-dashboard/school-holidays',
];
const STUDENT_REGISTER_REQUEST_ENDPOINTS = [
  'student/register-request',
  'manage/student/register-request',
];

const LEAVE_TEACHERS_ENDPOINTS = [
  'student-dashboard/staff-for-leave',
  'student-dashboard/teachers-for-leave',
  'student/teachers-for-leave',
];
const LEAVE_REQUESTS_ENDPOINTS = [
  'student-dashboard/leave-requests',
  'manage/student-dashboard/leave-requests',
];
const SUBJECTS_ENDPOINTS = [
  'student-dashboard/subjects',
  'manage/student-dashboard/subjects',
];
const HOMEWORK_ENDPOINTS = [
  'student-dashboard/homework',
  'manage/student-dashboard/homework',
];


const FALLBACK_404_CONFIG = {
  suppressFallback404Log: true,
} as const;

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {return value;}
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
    if (value !== undefined && value !== null) {return value as T;}
  }
  return undefined;
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {return value;}
  if (typeof value === 'number') {return String(value);}
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {return [];}
  return value
    .map(item => toText(item, '').trim())
    .filter(Boolean);
}

function normalizePhotoSource(value: unknown): string | null {
  const photo = toText(value, '').trim();
  if (!photo) {return null;}
  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  // Backend sometimes returns relative media paths (e.g. /api/profile-photo/student/123).
  // React Native Image requires absolute URLs for remote images.
  if (photo.startsWith('/')) {
    return buildApiUrl(photo);
  }
  if (photo.toLowerCase().startsWith('api/')) {
    return buildApiUrl(`/${photo}`);
  }
  if (/^(profile-photo|uploads?|media|storage|images?)\//i.test(photo)) {
    return buildApiUrl(`/${photo}`);
  }

  const compact = photo.replace(/\s+/g, '');
  const likelyBase64 = compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
  if (likelyBase64) {
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    return `data:image/jpeg;base64,${normalized}`;
  }

  return buildApiUrl(`/${photo}`);
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
  if (!raw) {return 'image/jpeg';}
  if (raw.includes('image/png')) {return 'image/png';}
  if (raw.includes('image/webp')) {return 'image/webp';}
  if (raw.includes('image/gif')) {return 'image/gif';}
  return 'image/jpeg';
}

function firstNonEmptyStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const items = toStringArray(value);
    if (items.length > 0) {return items;}
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

function hasMarkFields(value: Record<string, any>): boolean {
  const subject = toText(firstDefined(value.subject_name, value.subject, value.name, value.subjectName), '').trim();
  const hasScoreField =
    firstDefined(
      value.marks_obtained,
      value.obtained_marks,
      value.score,
      value.marks,
      value.max_marks,
      value.total_marks,
      value.pass_marks,
    ) !== undefined;

  return Boolean(subject) || hasScoreField;
}

function normalizeMarkItem(item: Record<string, any>, index: number): Record<string, any> {
  const maxMarks = toNumber(firstDefined(item.max_marks, item.total_marks, item.maximum_marks, item.maxMarks), 0);
  const passMarks = toNumber(firstDefined(item.pass_marks, item.minimum_pass_marks, item.passMarks), 0);
  const marksObtained = toNumber(firstDefined(item.marks_obtained, item.obtained_marks, item.score, item.marks), 0);
  const computedResult = marksObtained >= passMarks ? 'PASS' : 'FAIL';

  return {
    ...item,
    mark_id: toText(firstDefined(item.mark_id, item.id, item.subject_id, item.subjectId), `mark-${index}`),
    subject_name: toText(firstDefined(item.subject_name, item.subject, item.name, item.subjectName), 'Subject'),
    max_marks: maxMarks,
    pass_marks: passMarks,
    marks_obtained: marksObtained,
    grade: toText(firstDefined(item.grade, item.letter_grade, item.grade_letter), ''),
    result_status: toText(firstDefined(item.result_status, item.result, item.status), computedResult).toUpperCase(),
    remarks: toText(firstDefined(item.remarks, item.comment, item.note), ''),
  };
}

function extractMarkItems(responseData: any): Record<string, any>[] {
  const root = asRecord(responseData);
  const dataRoot = asRecord(root.data);

  const directCandidates: unknown[] = [
    responseData,
    root.items,
    root.subjects,
    root.results,
    root.marks,
    root.marks_data,
    root.marks_details,
    root.subject_wise_results,
    root.subject_results,
    root.exam_subjects,
    dataRoot.items,
    dataRoot.subjects,
    dataRoot.results,
    dataRoot.marks,
    dataRoot.marks_data,
    dataRoot.marks_details,
    dataRoot.subject_wise_results,
    dataRoot.subject_results,
    dataRoot.exam_subjects,
  ];

  const collected: Record<string, any>[] = [];

  for (const candidate of directCandidates) {
    if (!Array.isArray(candidate)) {continue;}

    for (const entry of candidate) {
      const record = asRecord(entry);
      if (hasMarkFields(record)) {
        collected.push(record);
        continue;
      }

      const nestedArrays: unknown[] = [
        record.items,
        record.subjects,
        record.results,
        record.marks,
        record.marks_data,
        record.marks_details,
        record.subject_wise_results,
        record.subject_results,
      ];

      for (const nested of nestedArrays) {
        if (!Array.isArray(nested)) {continue;}
        for (const nestedEntry of nested) {
          const nestedRecord = asRecord(nestedEntry);
          if (hasMarkFields(nestedRecord)) {
            collected.push(nestedRecord);
          }
        }
      }
    }
  }

  return collected;
}

function isHolidayAttendanceItem(item: Record<string, any>): boolean {
  const status = normalizeAttendanceStatus(item.status);
  if (status === 'HOLIDAY' || status === 'SUNDAY_HOLIDAY') {return true;}

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
  const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || '').trim();
  let branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);
  const studentId = (await AsyncStorage.getItem('student_id') ||
                    await AsyncStorage.getItem('studentId') ||
                    await AsyncStorage.getItem('roll_no') ||
                    await AsyncStorage.getItem('roll_number') || '').trim().toUpperCase();
  const perEndpointTimeoutMs = 15000;

  // Normalize numeric branch IDs (e.g. "01" -> "1") to avoid strict DB matches
  try {
    if (typeof branchId === 'string' && /^\d+$/.test(branchId)) {
      branchId = String(Number(branchId));
    }
  } catch (e) {
    // ignore normalization errors and keep original branchId
  }

  // Special flag: additionalParams.__omitBranch -> omit X-Branch-Id header and branch_id param
  const omitBranch = Boolean(additionalParams && additionalParams.__omitBranch);
  if (omitBranch && additionalParams && typeof additionalParams === 'object') {
    // remove the internal flag so it is not sent to the backend
    delete additionalParams.__omitBranch;
  }

  for (const endpoint of endpoints) {
    try {
      const headers = {
        'X-School-Code': schoolCode || undefined,
        ...(omitBranch ? {} : { 'X-Branch-Id': branchId || undefined }),
        'X-Student-Id': studentId || undefined,
        'X-Roll-No': studentId || undefined,
        ...(additionalParams && additionalParams.headers ? additionalParams.headers : {}),
      };

      const response = await API.get<T>(endpoint, {
        timeout: perEndpointTimeoutMs,
        params: {
          school_code: schoolCode,
          school_id: schoolCode,
          ...(omitBranch ? {} : { branch_id: branchId }),
          student_id: studentId,
          roll_no: studentId,
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
      // 404/405 from a fallback endpoint is expected; skip noisy logs for those
      const status = error.response?.status;
      if (status && (status === 404 || status === 405)) {
        // continue to next endpoint silently
      } else {
        console.warn(`[Service] Failed ${endpoint}: ${error.message}`);
      }
    }
  }
  throw new Error('No backend endpoint responded for this resource.');
}

export async function getStudentAttendance(params: any = {}): Promise<AttendanceData & { items?: any[] }> {
  try {
    const responseData = (await getFirstSuccessful<any>(ATTENDANCE_ENDPOINTS, params)) as any;

    const summary = asRecord(responseData?.summary || responseData?.data?.summary);
    const data = responseData?.data || responseData?.summary || responseData;
    const items = responseData?.items || responseData?.data?.items || [];
    const normalizedItems = Array.isArray(items)
      ? items.map((item: any) => normalizeAttendanceItem(item))
      : [];

    if (Object.keys(summary).length > 0) {
      return {
        percentage: toNumber(summary.attendance_percentage ?? summary.percentage),
        presentDays: toNumber(summary.present_days ?? summary.present),
        absentDays: toNumber(summary.absent_days ?? summary.absent),
        halfDays: toNumber(summary.half_day_count ?? summary.half_days ?? summary.halfDays ?? summary.late_days),
        totalDays: toNumber(summary.total_days ?? summary.totalDays ?? summary.total),
        items: normalizedItems,
      };
    }

    const schoolDayItems = normalizedItems.filter((item) => !isHolidayAttendanceItem(item));
    if (schoolDayItems.length > 0) {
      const presentDays = schoolDayItems.filter((item: any) => item.status === 'PRESENT').length;
      const absentDays = schoolDayItems.filter((item: any) => item.status === 'ABSENT').length;
      const lateDays = schoolDayItems.filter((item: any) => item.status === 'LATE').length;
      const halfDayOnly = schoolDayItems.filter((item: any) => item.status === 'HALF_DAY' || item.status === 'HALF DAY').length;
      const total = schoolDayItems.length || 1;
      const percentage = Math.round(((presentDays + lateDays + (halfDayOnly * 0.5)) / total) * 100);
      return { percentage, presentDays, absentDays, halfDays: lateDays + halfDayOnly, totalDays: total, items: normalizedItems };
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
  const schoolCode = String(await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || '').trim();
  const studentId = String(await AsyncStorage.getItem('student_id') ||
                    await AsyncStorage.getItem('studentId') ||
                    await AsyncStorage.getItem('roll_no') ||
                    await AsyncStorage.getItem('roll_number') || '').trim().toUpperCase();
  let resolvedExamId = toText(examId, '').trim();

  if (!resolvedExamId) {
    const exams = await getStudentExams();
    const firstExam = Array.isArray(exams) ? exams[0] : undefined;
    resolvedExamId = String(
      firstExam?.exam_id ?? firstExam?.id ?? firstExam?.examId ?? ''
    ).trim();
  }

  if (!resolvedExamId) {
    console.warn('[Service] getStudentMarks skipped: missing required exam_id.');
    return { subjects: [], items: [] };
  }

  for (const endpoint of MARKS_ENDPOINTS) {
    try {
      const response = await API.get<any>(endpoint, {
        params: {
          school_code: schoolCode,
          student_id: studentId,
          roll_no: studentId,
          exam_id: resolvedExamId,
        },
        ...FALLBACK_404_CONFIG,
      } as any);

      const responseData = response.data;
      const list = extractMarkItems(responseData).map((item, index) => normalizeMarkItem(item, index));
      const responseSummary = responseData?.summary || responseData?.data?.summary;
      const computedSummary = {
        total_obtained: list.reduce((sum, row) => sum + toNumber(row.marks_obtained, 0), 0),
        total_max_marks: list.reduce((sum, row) => sum + toNumber(row.max_marks, 0), 0),
        percentage: 0,
        overall_result: list.every((row) => String(row.result_status || '').toUpperCase() === 'PASS') ? 'PASS' : 'FAIL',
      };
      computedSummary.percentage = computedSummary.total_max_marks > 0
        ? Number(((computedSummary.total_obtained / computedSummary.total_max_marks) * 100).toFixed(2))
        : 0;

      return {
        subjects: list.map((item: any) => ({
          subject: String(item.subject ?? item.name ?? item.subject_name ?? 'Subject'),
          score: toNumber(item.score ?? item.marks_obtained ?? item.marks ?? item.obtained_marks),
        })),
        summary: responseSummary || computedSummary,
        items: list,
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
  const studentId = String(await AsyncStorage.getItem('student_id') ||
                    await AsyncStorage.getItem('studentId') ||
                    await AsyncStorage.getItem('roll_no') ||
                    await AsyncStorage.getItem('roll_number') || '').trim().toUpperCase();

  try {
    const allFees = await getFeesByStudent(studentId);
    const fees = Array.isArray(allFees) ? allFees : [];

    if (fees.length === 0) {
      return { totalFee: 0, paidFee: 0, pendingFee: 0 };
    }

    const sortedFees = fees.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
    const latestFee = sortedFees[0];

    const totalFee = fees.reduce((sum, fee) => sum + toNumber(fee.total_fee || (fee as any).amount), 0);
    const paidFee = fees.reduce((sum, fee) => sum + toNumber(fee.paid_amount || (fee as any).paid), 0);
    const pendingFee = fees.reduce((sum, fee) => sum + toNumber(fee.due_amount || (fee as any).balance), 0);

    return {
      totalFee,
      paidFee,
      pendingFee: Math.max(pendingFee, Math.max(totalFee - paidFee, 0)),
      due_date: latestFee?.due_date || 'N/A',
    } as any;
  } catch (error) {
    return { totalFee: 0, paidFee: 0, pendingFee: 0 };
  }
}

export async function getPaymentHistory(): Promise<any[]> {
  const studentId = String(await AsyncStorage.getItem('student_id') ||
                    await AsyncStorage.getItem('studentId') ||
                    await AsyncStorage.getItem('roll_no') ||
                    await AsyncStorage.getItem('roll_number') || '').trim().toUpperCase();

  try {
    const allFees = await getFeesByStudent(studentId || '');
    const fees = Array.isArray(allFees) ? allFees : [];

    if (fees.length === 0) {
      return [];
    }

    const paymentGroups = await Promise.all(
      fees.map(async (fee) => {
        try {
          const payments = await getPaymentHistoryByFee(fee.id || (fee as any).fee_id);
          const pList = Array.isArray(payments) ? payments : [];
          return pList.map((payment, index) => ({
            id: payment.id || `${fee.id || 'fee'}-${index}`,
            amount: payment.amount,
            method: (payment.method || 'CASH').toUpperCase(),
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

  if (!resolvedStudentId) {return null;}

  const resolvedSchoolCode =
    schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';

  const url = buildApiUrl(`/profile-photo/student/${encodeURIComponent(resolvedStudentId)}`);
  if (!resolvedSchoolCode) {return url;}

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}school_code=${encodeURIComponent(resolvedSchoolCode)}`;
}

export async function getStudentProfilePhotoDataUri(studentId?: string, schoolCode?: string): Promise<string | null> {
  const resolvedStudentId =
    studentId ||
    (await AsyncStorage.getItem('student_id')) ||
    (await AsyncStorage.getItem('studentId')) ||
    '';

  if (!resolvedStudentId) {return null;}

  const resolvedSchoolCode =
    schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';

  try {
    const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);
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
      (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
      (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
      storedUser?.school_code ||
      ''
    ).trim();

    // The backend profile route requires both query params; avoid partial requests.
    if (!studentId || !schoolCode) {
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
        responseData.records,
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
      raw.photo_path,
      raw.photo,
      raw.avatar,
      root.student_photograph,
      root.profile_photo_url,
      root.photo_url,
      root.photo_path,
      root.photo,
      root.avatar,
      storedUser?.student_photograph,
      storedUser?.profile_photo_url,
      storedUser?.photo_url,
      storedUser?.photo_path,
      storedUser?.photo,
      storedUser?.avatar,
    ));

    const isBase64 = photoSource?.startsWith('data:');
    const isS3OrExternal = photoSource && (
      photoSource.includes('amazonaws.com') ||
      photoSource.includes('s3.') ||
      photoSource.includes('blob.core.windows.net') ||
      photoSource.includes('googleapis.com') ||
      photoSource.includes('cloudinary.com')
    );
    const isApiUrl = photoSource && !isBase64 && !isS3OrExternal;

    if (!photoSource || isApiUrl) {
      const resolvedStudentId = toText(firstDefined(raw.student_id, raw.studentId, root.student_id, storedUser?.student_id, storedUser?.studentId)).trim();
      const resolvedSchoolCode = toText(firstDefined(raw.school_code, root.school_code, storedUser?.school_code)).trim();
      const dataUri = await getStudentProfilePhotoDataUri(resolvedStudentId, resolvedSchoolCode);
      if (dataUri) {
        photoSource = dataUri;
      } else if (!photoSource) {
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

    const storedRollNo = String(
      (await AsyncStorage.getItem('roll_no')) ||
      (await AsyncStorage.getItem('roll_number')) ||
      storedUser?.roll_no ||
      storedUser?.roll_number ||
      ''
    ).trim();

    const rollNumber = toText(firstDefined(
      raw.roll_number,
      raw.roll_no,
      raw.rollNo,
      raw.roll,
      storedRollNo,
      storedUser?.roll_number,
      storedUser?.roll_no,
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
      roll_number: resolveStudentRollNumber(rollNumber),
      roll_no: resolveStudentRollNumber(rollNumber),
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
    const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);
    const response = await API.get('student-dashboard/profile', {
      params: {
        student_id: studentId || undefined,
        roll_no: studentId || undefined,
        school_code: schoolCode || undefined,
      },
      headers: { 'X-School-Code': schoolCode || undefined, 'X-Branch-Id': branchId || undefined },
      timeout: 60000,
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
  // Include branch headers/params by default; backend may require X-Branch-Id for question papers
  const requestParams = { ...(params || {}) };
  const data = await getFirstSuccessful<any>(QUESTION_PAPER_ENDPOINTS, requestParams);
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

  // Normalize subjects and papers to expected frontend shape
  const normalizedSubjects = (subjects || []).map((sub: any) => {
    const s = asRecord(sub);
    const subjectId = toText(firstDefined(s.subject_id, s.id, s.subjectId, s.subjectCode), '').trim();
    const subjectName = toText(firstDefined(s.subject_name, s.name, s.subjectName), '').trim() || toText(firstDefined(s.subject, s.title), '');

    const rawPapers = Array.isArray(s.papers)
      ? s.papers
      : Array.isArray(s.items)
      ? s.items
      : Array.isArray(s.question_papers)
      ? s.question_papers
      : Array.isArray(s.papers_list)
      ? s.papers_list
      : [];

    const papers = rawPapers.map((p: any) => {
      const paper = asRecord(p);
      return {
        paper_id: toText(firstDefined(paper.paper_id, paper.id, paper.paperId), ''),
        title: toText(firstDefined(paper.title, paper.name), ''),
        exam_type: toText(firstDefined(paper.exam_type, paper.type, paper.examType), ''),
        teacher_name: toText(firstDefined(paper.teacher_name, paper.author, paper.uploaded_by, paper.teacherName), ''),
        created_at: toText(firstDefined(paper.created_at, paper.uploaded_at, paper.date, paper.createdAt), ''),
        class_name: toText(firstDefined(paper.class_name, paper.className, paper.class), ''),
        section_name: toText(firstDefined(paper.section_name, paper.sectionName, paper.section), ''),
        file_size: toNumber(firstDefined(paper.file_size, paper.size, paper.fileSize), 0),
        file_type: toText(firstDefined(paper.file_type, paper.mime_type, paper.fileType), ''),
        // keep original raw for any extra fields
        raw: paper,
      };
    });

    return {
      subject_id: subjectId || String(subjectName),
      subject_name: subjectName || subjectId,
      subject_code: toText(firstDefined(s.subject_code, s.code, s.subjectCode), ''),
      papers,
    };
  });

  return {
    ...root,
    data: wrapped,
    subjects: normalizedSubjects,
  };
}

export async function getExamTypes(): Promise<any> {
  try {
    const data = await getFirstSuccessful<any>(EXAM_TYPES_ENDPOINTS, { __omitBranch: true });
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

export async function getLinkedProfiles(): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(['student-dashboard/linked-profiles'], { __omitBranch: true });
    return Array.isArray(data?.profiles) ? data.profiles : [];
  } catch (error) {
    console.error('[Service] Failed to fetch linked profiles:', error);
    return [];
  }
}

export async function switchProfile(targetRollNo: string): Promise<any> {
  try {
    const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
    const response = await API.post('student-dashboard/switch-profile', {
      target_roll_no: targetRollNo,
    }, {
      headers: { 'X-School-Code': schoolCode },
    });
    return response.data;
  } catch (error) {
    console.error('[Service] Failed to switch profile:', error);
    throw error;
  }
}

export async function downloadQuestionPaper(paperId: string): Promise<ArrayBuffer> {
  const encodedPaperId = encodeURIComponent(paperId);
  const endpoints = [
    `student-dashboard/question-papers/${encodedPaperId}/download`,
    `student/question-papers/${encodedPaperId}/download`,
    `manage/student-dashboard/question-papers/${encodedPaperId}/download`,
    `student-dashboard/question-papers/download/${encodedPaperId}`,
    `student/question-papers/download/${encodedPaperId}`,
    `student-dashboard/question-papers/${encodedPaperId}`,
    `student/question-papers/${encodedPaperId}`,
    // New query-param based fallbacks
    'student-dashboard/question-papers/download',
    'student/question-papers/download',
    'manage/student-dashboard/question-papers/download',
  ];
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  let branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);

  try {
    if (typeof branchId === 'string' && /^\d+$/.test(branchId)) {
      branchId = String(Number(branchId));
    }
  } catch (e) {}

  const studentId = (await AsyncStorage.getItem('student_id') ||
                await AsyncStorage.getItem('studentId') ||
                await AsyncStorage.getItem('roll_no') ||
                await AsyncStorage.getItem('roll_number') || '').trim().toUpperCase();

  for (const endpoint of endpoints) {
    try {
      console.log('[Service] downloadQuestionPaper trying (arraybuffer) ->', endpoint);
      const response = await API.get<ArrayBuffer>(endpoint, {
        responseType: 'arraybuffer',
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          student_id: studentId,
          roll_no: studentId,
          paper_id: paperId, // Pass paper_id as param even for path-segment routes as some backends use both
          id: paperId,
        },
        headers: {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
          'X-Student-Id': studentId || undefined,
          'X-Roll-No': studentId || undefined,
          'Authorization': (await storage.getSecure(StorageKeys.AUTH_TOKEN)) ? `Bearer ${await storage.getSecure(StorageKeys.AUTH_TOKEN)}` : undefined,
        },
        ...FALLBACK_404_CONFIG,
      } as any);

      console.log('[Service] downloadQuestionPaper response headers:', (response.headers || {}));
      if (response && response.data && response.status === 200) {
        // Double check if it's not an error message hidden in a successful response
        const contentType = (response.headers as any)?.['content-type'] || '';
        if (contentType.includes('application/json')) {
          // If we got JSON but asked for arraybuffer, it might be an error or a different response format
          console.log('[Service] downloadQuestionPaper: Received JSON instead of binary. Falling back to JSON processor.');
          throw new Error('JSON_RESPONSE_TRIGGER_FALLBACK');
        }
        return response.data;
      }
    } catch (error: any) {
      if (error.message === 'JSON_RESPONSE_TRIGGER_FALLBACK') {
        break; // Stop arraybuffer loop and go to JSON fallback loop
      }
      const status = error?.response?.status;

      let errorDetail = '';
      if (error?.response?.data instanceof ArrayBuffer) {
        try {
          // Convert array buffer to string (safe for typical error JSON payloads)
          const text = String.fromCharCode.apply(null, new Uint8Array(error.response.data) as any);
          const json = JSON.parse(text);
          if (json.detail) {errorDetail = String(json.detail);}
        } catch (e) {}
      } else if (error?.response?.data?.detail) {
        errorDetail = String(error.response.data.detail);
      }

      console.warn('[Service] downloadQuestionPaper arraybuffer attempt failed for', endpoint, 'status=', status, 'message=', error?.message, 'detail=', errorDetail);

      if (status === 404 && errorDetail && errorDetail.toLowerCase().includes('file not found')) {
        throw new Error(errorDetail);
      }

      if (status === 401 || status === 403) {
        throw error;
      }
    }
  }

  // Fallback: some deployments return JSON with base64-encoded PDF data or a remote URL.
  for (const endpoint of endpoints) {
    try {
      console.log('[Service] downloadQuestionPaper trying (json/base64/url) ->', endpoint);
      const resp = await API.get<any>(endpoint, {
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          student_id: studentId,
          roll_no: studentId,
          paper_id: paperId,
          id: paperId,
        },
        headers: {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
          'X-Student-Id': studentId || undefined,
          'X-Roll-No': studentId || undefined,
          'x_school_code': schoolCode || undefined,
          'x_branch_id': branchId || undefined,
          'Authorization': (await storage.getSecure(StorageKeys.AUTH_TOKEN)) ? `Bearer ${await storage.getSecure(StorageKeys.AUTH_TOKEN)}` : undefined,
        },
        ...FALLBACK_404_CONFIG,
      } as any);

      console.log('[Service] downloadQuestionPaper fallback response status=', resp.status, 'headers=', (resp.headers || {}));
      const data = resp.data;

      // If server returned a direct base64 string
      if (typeof data === 'string') {
        const candidateStr = data.trim();
        if (/^[A-Za-z0-9+\/=_\r\n-]+$/.test(candidateStr)) {
          const base64 = candidateStr.replace(/\r|\n/g, '');
          try {
            const buf = (globalThis as any).Buffer?.from(base64, 'base64');
            if (buf) {return buf.buffer as ArrayBuffer;}
          } catch (e) {
            // try browser-friendly conversion
            try {
              const binaryString = (globalThis as any).atob ? (globalThis as any).atob(base64) : undefined;
              if (binaryString) {
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {bytes[i] = binaryString.charCodeAt(i);}
                return bytes.buffer as ArrayBuffer;
              }
            } catch (e2) {}
          }
        }
      }

      // If server returned JSON with known fields
      const candidate = data?.base64 || data?.file || data?.data || data?.payload || data?.pdf || data?.file_data;
      if (candidate && typeof candidate === 'string') {
        const base64 = String(candidate).replace(/\r|\n/g, '');
        try {
          const buf = (globalThis as any).Buffer?.from(base64, 'base64');
          if (buf) {return buf.buffer as ArrayBuffer;}
        } catch (e) {
          try {
            const binaryString = (globalThis as any).atob ? (globalThis as any).atob(base64) : undefined;
            if (binaryString) {
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {bytes[i] = binaryString.charCodeAt(i);}
              return bytes.buffer as ArrayBuffer;
            }
          } catch (e2) {}
        }
      }

      // If server returned a remote URL to fetch
      const remoteUrl = data?.url || data?.file_url || data?.download_url;
      if (remoteUrl && typeof remoteUrl === 'string') {
        try {
          console.log('[Service] downloadQuestionPaper fetching remote url ->', remoteUrl);
          const remoteResp = await API.get<ArrayBuffer>(remoteUrl, { responseType: 'arraybuffer' } as any);
          return remoteResp.data;
        } catch (e: any) {
          console.warn('[Service] downloadQuestionPaper remote fetch failed', e?.message || e);
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      console.warn('[Service] downloadQuestionPaper fallback attempt failed for', endpoint, 'status=', status, 'err=', err?.message || err, 'detail=', detail);

      if (status === 404 && typeof detail === 'string' && detail.toLowerCase().includes('file not found')) {
        throw new Error(detail);
      }

      if (status && status !== 404 && status !== 405) {
        // continue to next
      }
    }
  }

  throw new Error('Could not download question paper from any known endpoint.');
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
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const studentId = (await AsyncStorage.getItem('student_id') ||
                    await AsyncStorage.getItem('studentId') ||
                    await AsyncStorage.getItem('roll_no') ||
                    await AsyncStorage.getItem('roll_number') || '').trim().toUpperCase();

  for (const endpoint of LEAVE_REQUESTS_ENDPOINTS) {
    try {
      const response = await API.post(endpoint, {
        ...requestData,
        school_code: schoolCode,
        student_id: studentId,
      }, { suppressLogoutOn401: true } as any);
      return response.data;
    } catch (error: any) {
       if (error.response?.status !== 404) {throw error;}
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
    // Normalize assigned_date to YYYY-MM-DD if present (backend expects a date)
    const normalizedParams = { ...(params || {}) };
    if (normalizedParams.assigned_date) {
      const v = normalizedParams.assigned_date;
      try {
        if (v instanceof Date) {
          normalizedParams.assigned_date = v.toISOString().split('T')[0];
        } else if (typeof v === 'string') {
          normalizedParams.assigned_date = v.slice(0, 10);
        }
      } catch (e) {
        // leave as-is if normalization fails
      }
    }

    const data = await getFirstSuccessful<any>(HOMEWORK_ENDPOINTS, normalizedParams);
    return data?.items || data?.homework || data?.data?.items || (Array.isArray(data) ? data : []);
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
  for (let index = 0; index < STUDENT_REGISTER_REQUEST_ENDPOINTS.length; index++) {
    const endpoint = STUDENT_REGISTER_REQUEST_ENDPOINTS[index];
    const isLastEndpoint = index === STUDENT_REGISTER_REQUEST_ENDPOINTS.length - 1;
    try {
      const response = await API.post(endpoint, formData, {
        headers: {
          'X-School-Code': await storage.getString(StorageKeys.SCHOOL_CODE) || undefined,
          'X-Branch-Id': await storage.getString(StorageKeys.BRANCH_ID) || undefined,
        },
        suppressFallback404Log: true,
        suppressErrorLog: !isLastEndpoint,
        ...FALLBACK_404_CONFIG,
      } as any);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404 || status === 405 || status === 503 || status === 502 || status === 504) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Could not submit student register request.');
}

export async function sendOtp(emailId: string): Promise<any> {
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);

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
        },
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function verifyOtp(emailId: string, otp: string): Promise<any> {
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);

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
        },
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function changePassword(emailId: string, newPassword: string, otp: string): Promise<any> {
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);

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
        },
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
        await storage.getString(StorageKeys.SCHOOL_CODE),
        await storage.getString(StorageKeys.SCHOOL_CODE),
        await storage.getString(StorageKeys.SCHOOL_CODE),
        await storage.getString(StorageKeys.SCHOOL_CODE),
      ),
    ).trim();

  const branchId =
    toText(
      firstDefined(
        data?.branch_id,
        data?.branchId,
        await storage.getString(StorageKeys.BRANCH_ID),
        await storage.getString(StorageKeys.BRANCH_ID),
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
    if (metadataKeys.has(key)) {continue;}
    if (key === 'roll_number' || key === 'roll_no' || key === 'rollNo') {continue;}
    if (value === undefined) {continue;}
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
