import API, { buildApiUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  'student-dashboard/profile'
];
const QUESTION_PAPER_ENDPOINTS = [
  'student/question-papers'
];
const EXAM_TYPES_ENDPOINTS = [
  'student/question-papers/exam-types'
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

/**
 * Tries multiple endpoint variants to find a working one.
 * It also tries prefixes like /api/v1/ and /mobile/ automatically.
 */
async function getFirstSuccessful<T>(endpoints: string[], additionalParams: any = {}) {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const studentId = await AsyncStorage.getItem('student_id') || await AsyncStorage.getItem('studentId');
  const perEndpointTimeoutMs = 15000;

  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, {
        timeout: perEndpointTimeoutMs,
        params: {
          school_code: schoolCode,
          student_id: studentId,
          ...additionalParams
        },
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
          feeIds.map(async feeId => {
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

export async function getStudentProfile(): Promise<any> {
  try {
    const responseData = await getFirstSuccessful<any>(PROFILE_ENDPOINTS);
    const root = asRecord(responseData);
    const raw = asRecord(firstDefined(root.data, root.profile, root.student, root.user, responseData));

    return {
      ...raw,
      name: toText(firstDefined(raw.name, raw.full_name, raw.student_name)),
      email: toText(firstDefined(raw.email, raw.email_address)),
      phone: toText(firstDefined(raw.phone, raw.mobile)),
      student_id: toText(firstDefined(raw.student_id, root.student_id)),
      class_grade: toText(firstDefined(raw.class_grade, raw.class_name)),
      section: toText(firstDefined(raw.section, raw.section_name)),
      school_name: toText(firstDefined(raw.school_name, raw.school)),
    };
  } catch (error) {
    return {};
  }
}

export async function getQuestionPapers(params?: any): Promise<any> {
  const data = await getFirstSuccessful<any>(QUESTION_PAPER_ENDPOINTS, params);
  return data;
}

export async function getExamTypes(): Promise<any> {
  try {
    const data = await getFirstSuccessful<any>(EXAM_TYPES_ENDPOINTS);
    return data;
  } catch (error) {
    return { exam_types: [] };
  }
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
