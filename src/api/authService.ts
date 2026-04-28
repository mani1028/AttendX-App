import axios from 'axios';
import API, { buildApiUrl } from './client';
import { AppRole } from '../constants/roles';
import { normalizeBackendRole } from '../utils/roleMapper';

type LoginResponse = {
  status?: string;
  token?: string;
  access_token?: string;
  role?: string;
  user_role?: string;
  school_code?: string;
  school_id?: string;
  schoolCode?: string;
  user?: {
    id?: string | number;
    student_id?: string;
    employee_id?: string;
    branch_id?: string;
    full_name?: string;
    username?: string;
    name?: string;
  };
  data?: LoginResponse;
};

export type NormalizedLoginResponse = {
  token?: string;
  role: AppRole;
  schoolCode?: string;
  user?: {
    userId?: string;
    studentId?: string;
    employeeId?: string;
    branchId?: string;
    name?: string;
  };
};

async function postWithFallback<TPayload>(endpoints: string[], payload: TPayload, useCleanInstance = false) {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      if (useCleanInstance) {
        const url = buildApiUrl(endpoint);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        // Extract school code from payload to ensure multi-tenancy routing works
        const p = payload as any;
        const schoolCode = p.school_code || p.schoolCode || p.school_id;
        if (schoolCode) {
          headers['X-School-Code'] = schoolCode;
        }

        console.log(`[authService] Attempting clean post to: ${url}`, { headers });
        const res = await axios.post(url, payload, { headers, timeout: 30000 });
        console.log(`[authService] Clean post success: ${endpoint}`);
        return res;
      }
      return await API.post(endpoint, payload);
    } catch (error: any) {
      console.log(`[authService] Error posting to ${endpoint}:`, error?.response?.data || error.message);
      lastError = error;
    }
  }

  throw lastError;
}

function normalizeLoginResponse(data: LoginResponse, fallbackRole: AppRole): NormalizedLoginResponse {
  const payload = data.data ?? data;
  const role = normalizeBackendRole(payload.role ?? payload.user_role) ?? fallbackRole;
  const token = payload.token ?? payload.access_token;
  const name = payload.user?.name ?? payload.user?.full_name ?? payload.user?.username;

  return {
    token,
    role,
    schoolCode: payload.school_code ?? payload.schoolCode ?? payload.school_id,
    user: {
      userId: payload.user?.id != null ? String(payload.user.id) : undefined,
      studentId: payload.user?.student_id,
      employeeId: payload.user?.employee_id,
      branchId: payload.user?.branch_id,
      name,
    },
  };
}

export const authService = {
  async login(schoolId: string, username: string, password: string, fallbackRole: AppRole = 'student') {
    // We use a clean instance for login to prevent stale AsyncStorage tokens from causing 403s
    // We also include both snake_case and camelCase for school code to match web logic
    const response = await postWithFallback(['/auth/login', '/login'], {
      school_id: schoolId,
      school_code: schoolId,
      schoolCode: schoolId,
      username,
      password,
      role: fallbackRole,
    }, true);
    return normalizeLoginResponse(response.data as LoginResponse, fallbackRole);
  },
  requestOtp(schoolId: string, identifier: string) {
    return postWithFallback(['/auth/forgot-password', '/auth/request-otp'], {
      school_id: schoolId,
      school_code: schoolId,
      identifier,
    }, true);
  },
  forgotPasswordReset(
    schoolId: string,
    identifier: string,
    otp: string,
    resetToken: string,
    newPassword: string,
  ) {
    return postWithFallback(['/auth/forgot-password'], {
      school_id: schoolId,
      school_code: schoolId,
      identifier,
      otp,
      reset_token: resetToken,
      new_password: newPassword,
      confirm_password: newPassword,
    }, true);
  },
  verifyOtp(schoolId: string, identifier: string, otp: string) {
    return postWithFallback(
      ['/auth/verify-otp', '/auth/forgot-password/verify-otp', '/auth/forgot-password'],
      {
      school_id: schoolId,
      school_code: schoolId,
      identifier,
      otp,
      },
      true,
    );
  },
  resetPassword(schoolId: string, identifier: string, resetToken: string, password: string) {
    return postWithFallback(['/auth/forgot-password', '/auth/reset-password', '/auth/forgot-password/reset-password'], {
      school_id: schoolId,
      school_code: schoolId,
      identifier,
      reset_token: resetToken,
      new_password: password,
      confirm_password: password,
    }, true);
  },
  async checkTeacherCapability(schoolId: string, employeeId: string) {
    const response = await API.get('/auth/teacher-capability', {
      params: {
        school_id: schoolId,
        employee_id: employeeId,
      },
      headers: {
        'X-School-Code': schoolId,
      },
    });
    return response.data;
  },
};