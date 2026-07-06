import API from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';
import { getSubscriptionStatus } from './paymentService';


async function getFirstSuccessful<T>(endpoints: string[], params: any = {}) {
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);

  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, {
        params: {
          school_code: schoolCode,
          school_id: schoolCode,
          branch_id: branchId,
          ...params,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error(`[API] Unauthorized access to ${endpoint}.`);
        throw error;
      }
      // Try next variant
    }
  }
  throw new Error('Director service endpoint not found');
}

export async function getBranchTeachers(branchId: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/teachers`,
    `director/branch/${branchId}/teachers`,
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.teachers || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getBranchStudents(branchId: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/students`,
    `director/branch/${branchId}/students`,
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.students || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getClassesSections(branchId: string): Promise<any[]> {
  const endpoints = ['manage/classes-sections'];
  try {
    const data: any = await getFirstSuccessful(endpoints, { branch_id: branchId });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getBranchLeaves(branchId: string, limit?: number): Promise<any[]> {
  try {
    const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
    const params = { school_code: schoolCode, school_id: schoolCode, branch_id: branchId, limit };

    const [teacherRes, studentRes] = await Promise.allSettled([
      API.get(`director/branch/${branchId}/teachers/leaves`, { params }),
      API.get(`director/branch/${branchId}/leaves`, { params }),
    ]);

    let teacherLeaves: any[] = [];
    if (teacherRes.status === 'fulfilled') {
      const data = teacherRes.value.data || {};
      const list = data.leaves || (Array.isArray(data) ? data : []);
      teacherLeaves = list.map((item: any) => ({ ...item, leave_type: 'teacher' }));
    }

    let studentLeaves: any[] = [];
    if (studentRes.status === 'fulfilled') {
      const data = studentRes.value.data || {};
      const list = data.leaves || (Array.isArray(data) ? data : []);
      studentLeaves = list.map((item: any) => ({ ...item, leave_type: 'student' }));
    }

    const merged = [...teacherLeaves, ...studentLeaves];
    merged.sort((a, b) => new Date(b.created_at || b.from_date).getTime() - new Date(a.created_at || a.from_date).getTime());

    return limit ? merged.slice(0, limit) : merged;
  } catch (err) {
    console.error('Error in getBranchLeaves:', err);
    return [];
  }
}

export async function getBranchExams(branchId: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/exams`,
    `director/branch/${branchId}/exams`,
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.exams || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getExamMarks(branchId: string, examId: string, classGrade?: string, section?: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/exam/${examId}/marks`,
    `director/branch/${branchId}/exam/${examId}/marks`,
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { class_grade: classGrade, section });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getStudentAttendanceReport(schoolCode: string, branchId: string, classGrade: string, section: string, date: string): Promise<any> {
  const endpoint = '/manage/attendance/student/fetch-report';
  const res = await API.post(endpoint, {
    school_code: schoolCode,
    branch_id: branchId,
    class_grade: classGrade,
    section: section,
    attendance_date: date,
  });
  return res.data || { present: [], absent: [] };
}

export async function getTeacherAttendance(branchId: string, date: string): Promise<any> {
  const endpoints = [
    `director/branch/${branchId}/teachers/attendance`,
    `director/branch/${branchId}/teachers/attendance`,
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { date });
    return data;
  } catch (err) {
    return { items: [], summary: { total: 0, present: 0, absent: 0, attendance_pct: 0 } };
  }
}

export async function getStudentExamsData(studentId: string): Promise<any> {
  const endpoints = [
    `director/student/${studentId}/exams-data`,
    `director/student/${studentId}/exams-data`,
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data;
  } catch (err) {
    return null;
  }
}

export interface DirectorDashboardStats {
  branches: number;
  teachers: number;
  students: number;
  activeBranches: number;
  inactiveBranches: number;
  principals: number;
  classes: number;
  sections: number;
  pendingLeaves: number;
  teacherAttendanceToday: number;
  studentAttendanceToday: number;
  teacherPresentToday: number | null;
  studentPresentToday: number | null;
}

function asNumber(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') { continue; }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) { return parsed; }
  }
  return 0;
}

/** Normalize attendance to 0–100% (web may send pct, present/total, or raw counts). */
export function resolveAttendancePercent(
  pctCandidates: unknown[],
  present?: unknown,
  total?: unknown,
): number {
  for (const candidate of pctCandidates) {
    const value = asNumber(candidate);
    if (value > 0 && value <= 100) { return Math.round(value); }
  }

  const presentCount = asNumber(present);
  const totalCount = asNumber(total);
  if (totalCount > 0) {
    if (presentCount >= 0) {
      return Math.round((presentCount / totalCount) * 100);
    }
    const raw = asNumber(...pctCandidates);
    if (raw > 0 && raw <= totalCount) {
      return Math.round((raw / totalCount) * 100);
    }
  }

  const raw = asNumber(...pctCandidates);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function parseDirectorDashboardPayload(data: any): {
  stats: DirectorDashboardStats;
  branches: any[];
} {
  const root = data && typeof data === 'object' ? data : {};
  const summary = root.summary || root.stats || root;
  const cards = summary.cards || root.cards || {};
  const breakdown = root.today_breakdown || summary.today_breakdown || {};
  const teachersBreakdown = breakdown.teachers || summary.teachers || {};
  const studentsBreakdown = breakdown.students || summary.students || {};

  const teachers = asNumber(summary.total_teachers, summary.staff, summary.teachers, cards.total_teachers);
  const students = asNumber(summary.total_students, summary.students, cards.total_students);
  const branchesTotal = asNumber(summary.total_branches, summary.branches);

  const rawBranches = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.branches)
      ? root.branches
      : [];

  const normalizeBranch = (branch: any) => {
    const teachersCount = asNumber(branch.teachers_count, branch.total_teachers, branch.teachers);
    const studentsCount = asNumber(branch.students_count, branch.total_students, branch.students);
    return {
      ...branch,
      branch_id: String(branch.branch_id ?? branch.id ?? branch.branch_code ?? ''),
      branch_name: branch.branch_name ?? branch.name ?? branch.branch_code ?? '',
      branch_status: branch.branch_status ?? branch.status ?? 'ACTIVE',
      teachers_count: teachersCount,
      students_count: studentsCount,
      classes_count: asNumber(branch.classes_count, branch.total_classes),
      sections_count: asNumber(branch.sections_count, branch.total_sections),
      pending_leave_requests: asNumber(branch.pending_leave_requests, branch.pending_leaves),
      teacher_attendance_today: resolveAttendancePercent(
        [
          branch.teacher_attendance_pct,
          branch.teacher_attendance_today,
          branch.teacher_attendance_marked_today,
          teachersBreakdown.attendance_pct,
        ],
        branch.teachers_present_today ?? branch.teachers_present,
        branch.teachers_count ?? teachersCount,
      ),
      student_attendance_today: resolveAttendancePercent(
        [
          branch.student_attendance_pct,
          branch.student_attendance_today,
          branch.student_attendance_marked_today,
          studentsBreakdown.attendance_pct,
        ],
        branch.students_present_today ?? branch.students_present,
        branch.students_count ?? studentsCount,
      ),
    };
  };

  const branches = rawBranches.map(normalizeBranch);

  return {
    stats: {
      branches: branchesTotal || branches.length,
      teachers,
      students,
      activeBranches: asNumber(
        summary.active_branches,
        branches.filter((b: any) => String(b.branch_status).toUpperCase() === 'ACTIVE').length,
      ),
      inactiveBranches: asNumber(
        summary.inactive_branches,
        branches.filter((b: any) => String(b.branch_status).toUpperCase() === 'INACTIVE').length,
      ),
      principals: asNumber(summary.total_directors, summary.total_principals, summary.total_hms),
      classes: asNumber(summary.total_classes, cards.total_classes),
      sections: asNumber(summary.total_sections),
      pendingLeaves: asNumber(summary.pending_leave_requests, summary.pending_leaves),
      teacherAttendanceToday: resolveAttendancePercent(
        [
          summary.teacher_attendance_pct,
          summary.teacher_attendance_today_pct,
          summary.teacher_attendance_marked_today,
          summary.teacher_attendance_today,
          teachersBreakdown.attendance_pct,
        ],
        teachersBreakdown.present,
        teachersBreakdown.total ?? teachers,
      ),
      studentAttendanceToday: resolveAttendancePercent(
        [
          summary.student_attendance_pct,
          summary.student_attendance_today_pct,
          summary.student_attendance_marked_today,
          summary.student_attendance_today,
          studentsBreakdown.attendance_pct,
        ],
        studentsBreakdown.present,
        studentsBreakdown.total ?? students,
      ),
      teacherPresentToday:
        teachersBreakdown.present !== undefined && teachersBreakdown.present !== null
          ? asNumber(teachersBreakdown.present)
          : null,
      studentPresentToday:
        studentsBreakdown.present !== undefined && studentsBreakdown.present !== null
          ? asNumber(studentsBreakdown.present)
          : null,
    },
    branches,
  };
}

export async function getDirectorDashboardOverview(schoolCode: string): Promise<{
  stats: DirectorDashboardStats;
  branches: any[];
}> {
  const endpoints = [
    'director/dashboard/overview',
    'director/stats',
    'director/dashboard/stats',
  ];

  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const response = await API.get(endpoint, {
        headers: { 'x-school-code': schoolCode, 'X-School-Code': schoolCode },
        suppressFallback404Log: true,
      } as any);
      const data = response?.data;
      if (
        data?.ok ||
        data?.summary ||
        data?.stats ||
        data?.total_branches !== undefined ||
        Array.isArray(data?.items) ||
        Array.isArray(data?.branches)
      ) {
        return parseDirectorDashboardPayload(data);
      }
    } catch (error) {
      lastError = error;
      if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 403) {
        throw error;
      }
    }
  }

  if (lastError) { throw lastError; }
  return parseDirectorDashboardPayload({});
}

export interface DirectorBillingData {
  school: Record<string, unknown> | null;
  subscription: Record<string, unknown> | null;
  payments: any[];
}

function directorSchoolHeaders(schoolCode: string) {
  return { 'x-school-code': schoolCode, 'X-School-Code': schoolCode };
}

/** Subscription + payment history — same sources as the web director billing pages. */
export async function getDirectorBillingData(schoolCode: string): Promise<DirectorBillingData> {
  if (!schoolCode) {
    return { school: null, subscription: null, payments: [] };
  }

  const headers = directorSchoolHeaders(schoolCode);
  let school: Record<string, unknown> | null = null;
  let subscription: Record<string, unknown> | null = null;
  let payments: any[] = [];

  try {
    const response = await API.get('director/dashboard/overview', {
      headers,
      suppressFallback404Log: true,
    } as any);
    const data = response?.data || {};
    if (data.ok || data.subscription || data.payments || data.school) {
      school = (data.school as Record<string, unknown>) || null;
      subscription = (data.subscription as Record<string, unknown>) || null;
      payments = Array.isArray(data.payments) ? data.payments : [];
    }
  } catch {
    // fall through to other sources
  }

  try {
    const status = await getSubscriptionStatus(schoolCode);
    if (status && typeof status === 'object') {
      subscription = { ...(subscription || {}), ...status };
    }
  } catch {
    // subscription-status is optional when overview already returned data
  }

  if (payments.length === 0) {
    try {
      const payRes = await API.get('director/payments', {
        headers,
        params: { school_code: schoolCode },
        suppressFallback404Log: true,
      } as any);
      const data = payRes?.data || {};
      const list = data.payments || data.data || data.items;
      if (Array.isArray(list)) {
        payments = list;
      }
    } catch {
      // no dedicated payments endpoint
    }
  }

  return { school, subscription, payments };
}
