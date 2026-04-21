import API from './client';
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

async function postWithFallback<TPayload>(endpoints: string[], payload: TPayload) {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      return await API.post(endpoint, payload);
    } catch (error) {
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
    const response = await postWithFallback(['/auth/login', '/login'], {
      school_id: schoolId,
      school_code: schoolId,
      username,
      password,
      role: fallbackRole,
    });
    return normalizeLoginResponse(response.data as LoginResponse, fallbackRole);
  },
  requestOtp(schoolId: string, identifier: string) {
    return postWithFallback(['/auth/forgot-password', '/auth/request-otp'], {
      school_id: schoolId,
      identifier,
    });
  },
  verifyOtp(schoolId: string, identifier: string, otp: string) {
    return postWithFallback(
      ['/auth/verify-otp', '/auth/forgot-password/verify-otp', '/auth/forgot-password'],
      {
      school_id: schoolId,
      identifier,
      otp,
      },
    );
  },
  resetPassword(schoolId: string, identifier: string, resetToken: string, password: string) {
    return postWithFallback(['/auth/reset-password', '/auth/forgot-password/reset-password'], {
      school_id: schoolId,
      identifier,
      reset_token: resetToken,
      new_password: password,
      confirm_password: password,
    });
  },
};