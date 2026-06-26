import API, { buildApiUrl } from './client';
import { AppRole } from '../constants/roles';
import { normalizeBackendRole } from '../utils/roleMapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginResponse = {
  status?: string;
  token?: string;
  access_token?: string;
  accessToken?: string;
  role?: string;
  user_role?: string;
  school_code?: string;
  school_id?: string;
  schoolCode?: string;
  user?: {
    id?: string | number;
    student_id?: string;
    roll_no?: string;       // Student login returns roll_no here
    roll_number?: string;
    employee_id?: string;
    branch_id?: string;
    full_name?: string;
    username?: string;
    user_name?: string;
    name?: string;
    is_class_teacher?: boolean;
    token?: string;
    access_token?: string;
    principal_employee_id?: string;
    principal_email?: string;
    principal_address?: string;
    principal_mobile?: string;
    blood_group?: string;
    bloodGroup?: string;
    branch_name?: string;
  };
  principal_employee_id?: string;
  principal_email?: string;
  principal_address?: string;
  principal_mobile?: string;
  blood_group?: string;
  bloodGroup?: string;
  school_name?: string;
  schoolName?: string;
  school?: {
    school_name?: string;
    name?: string;
  };
  branch_name?: string;
  branchName?: string;
  branch?: {
    branch_name?: string;
    name?: string;
  };
  data?: LoginResponse;
};

export type NormalizedLoginResponse = {
  token?: string;
  accessToken?: string;
  role: AppRole;
  schoolCode?: string;
  user?: {
    userId?: string;
    studentId?: string;
    employeeId?: string;
    branchId?: string;
    name?: string;
    isClassTeacher?: boolean;
    bloodGroup?: string;
    principal_employee_id?: string;
    principal_email?: string;
    principal_address?: string;
    principal_mobile?: string;
  };
  schoolName?: string;
  branchName?: string;
};

function pickTokenValue(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {return value;}
  }
  return undefined;
}

async function postCleanJson<TResponse>(url: string, payload: unknown, headers: Record<string, string>, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await response.text();
    let data: any = null;
    if (rawText) {
      try { data = JSON.parse(rawText); } catch { data = rawText; }
    }

    if (!response.ok) {
      const error: any = new Error(`Request failed with status ${response.status}`);
      error.response = { status: response.status, data, url };
      throw error;
    }

    return { status: response.status, data: data as TResponse };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function postWithFallback<TPayload>(endpoints: string[], payload: TPayload, useCleanInstance = false, signal?: AbortSignal) {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      if (useCleanInstance) {
        const url = buildApiUrl(endpoint);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tunnel-Skip-Anti-Phishing-Page': 'true',
        };
        const p = payload as any;
        const schoolCode = p.school_code || p.schoolCode || p.school_id;
        if (schoolCode) {headers['X-School-Code'] = schoolCode;}
        const res = await postCleanJson(url, payload, headers, signal);
        return res;
      }
      return await API.post(endpoint, payload);
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      // If we have a response status that suggests credentials/input issue (like 400, 401, 403, 422),
      // throw immediately. Otherwise, continue trying fallback endpoints (like 404, 405, 5xx, or network timeouts).
      if (status && [400, 401, 403, 422].includes(status)) {
        throw error;
      }
      if (__DEV__) {
        console.log(`[postWithFallback] Attempt for ${endpoint} failed (${status || 'network/timeout error'}), trying next fallback...`);
      }
    }
  }
  throw lastError;
}

function normalizeLoginResponse(data: LoginResponse, fallbackRole: AppRole): NormalizedLoginResponse {
  const payload = data.data ?? data;
  const role = normalizeBackendRole(payload.role ?? payload.user_role) ?? fallbackRole;
  const token = pickTokenValue(payload.token, payload.access_token, payload.accessToken, payload.user?.token, payload.user?.access_token);
  const name = payload.user?.name ?? payload.user?.full_name ?? payload.user?.username ?? payload.user?.user_name;
  // Student login returns roll_no in user object; fall back to student_id for other cases
  const studentId = payload.user?.student_id ?? payload.user?.roll_no ?? payload.user?.roll_number;

  const principalEmployeeId = payload.user?.principal_employee_id ?? payload.principal_employee_id;
  const principalEmail = payload.user?.principal_email ?? payload.principal_email;
  const principalAddress = payload.user?.principal_address ?? payload.principal_address;
  const principalMobile = payload.user?.principal_mobile ?? payload.principal_mobile;

  return {
    token,
    accessToken: token,
    role,
    schoolCode: payload.school_code ?? payload.schoolCode ?? payload.school_id,
    user: {
      userId: payload.user?.id != null ? String(payload.user.id) : undefined,
      studentId: studentId ? String(studentId) : undefined,
      employeeId: payload.user?.employee_id ?? principalEmployeeId,
      branchId: payload.user?.branch_id,
      name,
      isClassTeacher: payload.user?.is_class_teacher ?? false,
      bloodGroup: payload.user?.blood_group ?? payload.user?.bloodGroup ?? payload.blood_group ?? payload.bloodGroup,
      principal_employee_id: principalEmployeeId,
      principal_email: principalEmail,
      principal_address: principalAddress,
      principal_mobile: principalMobile,
    },
    schoolName: payload.school_name ?? payload.schoolName ?? payload.school?.school_name ?? payload.school?.name,
    branchName: payload.branch_name ?? payload.branchName ?? payload.user?.branch_name ?? payload.branch?.branch_name ?? payload.branch?.name,
  };
}

export const authService = {
  async login(schoolId: string, username: string, password: string, fallbackRole: AppRole = 'student', signal?: AbortSignal) {
    const response = await postWithFallback(
      ['/auth/login', '/login'],
      {
        school_id: schoolId,
        school_code: schoolId,
        schoolCode: schoolId,
        username,
        password,
        role: fallbackRole,
      },
      true,
      signal,
    );
    return normalizeLoginResponse(response.data as LoginResponse, fallbackRole);
  },

  async requestOtp(schoolId: string, identifier: string) {
    return postWithFallback(
      ['/auth/forgot-password', '/auth/request-otp'],
      {
        school_id: schoolId,
        schoolCode: schoolId,
        school_code: schoolId,
        email: identifier,
        identifier,
        email_id: identifier,
      },
      true,
    );
  },

  async verifyOtp(schoolId: string, identifier: string, otp: string): Promise<{ reset_token?: string; detail?: string }> {
    const res = await postWithFallback(
      ['/auth/verify-otp', '/auth/forgot-password/verify-otp', '/auth/forgot-password'],
      {
        school_id: schoolId,
        schoolCode: schoolId,
        school_code: schoolId,
        email: identifier,
        identifier,
        email_id: identifier,
        otp,
      },
      true,
    );
    return (res.data as any) ?? {};
  },

  async resetPassword(schoolId: string, identifier: string, resetToken: string, newPassword: string, confirmPassword: string) {
    return postWithFallback(
    ['/auth/forgot-password', '/auth/reset-password', '/auth/forgot-password/reset-password'],
      {
        school_id: schoolId,
        schoolCode: schoolId,
        school_code: schoolId,
        email: identifier,
        identifier,
        email_id: identifier,
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      },
      true,
    );
  },

  async forgotPasswordReset(schoolId: string, identifier: string, otp: string, resetToken: string, newPassword: string) {
    return postWithFallback(
      ['/auth/forgot-password'],
      {
        school_id: schoolId,
        schoolCode: schoolId,
        school_code: schoolId,
        email: identifier,
        identifier,
        email_id: identifier,
        otp,
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: newPassword,
      },
      true,
    );
  },

  async checkTeacherCapability(schoolId: string, employeeId: string) {
    const response = await API.get('/auth/teacher-capability', {
      params: { school_id: schoolId, employee_id: employeeId },
      headers: { 'X-School-Code': schoolId },
    });
    return response.data;
  },
};
