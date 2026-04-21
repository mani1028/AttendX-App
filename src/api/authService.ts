import API from './client';
import { AppRole } from '../constants/roles';
import { normalizeBackendRole } from '../utils/roleMapper';

type LoginResponse = {
  token?: string;
  access_token?: string;
  role?: string;
  user_role?: string;
  school_code?: string;
  user?: {
    student_id?: string;
    branch_id?: string;
    name?: string;
  };
};

export type NormalizedLoginResponse = {
  token?: string;
  role: AppRole;
  schoolCode?: string;
  user?: {
    studentId?: string;
    branchId?: string;
    name?: string;
  };
};

function normalizeLoginResponse(data: LoginResponse, fallbackRole: AppRole): NormalizedLoginResponse {
  const role = normalizeBackendRole(data.role ?? data.user_role) ?? fallbackRole;
  const token = data.token ?? data.access_token;

  return {
    token,
    role,
    schoolCode: data.school_code,
    user: {
      studentId: data.user?.student_id,
      branchId: data.user?.branch_id,
      name: data.user?.name,
    },
  };
}

export const authService = {
  async login(schoolId: string, username: string, password: string, fallbackRole: AppRole = 'student') {
    const response = await API.post<LoginResponse>('/auth/login', {
      school_id: schoolId,
      username,
      password,
    });
    return normalizeLoginResponse(response.data, fallbackRole);
  },
  requestOtp(schoolId: string, identifier: string) {
    return API.post('/auth/forgot-password', {
      school_id: schoolId,
      identifier,
    });
  },
  verifyOtp(schoolId: string, identifier: string, otp: string) {
    return API.post('/auth/forgot-password', {
      school_id: schoolId,
      identifier,
      otp,
    });
  },
  resetPassword(schoolId: string, identifier: string, resetToken: string, password: string) {
    return API.post('/auth/reset-password', {
      school_id: schoolId,
      identifier,
      reset_token: resetToken,
      new_password: password,
      confirm_password: password,
    });
  },
};