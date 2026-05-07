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
    employee_id?: string;
    branch_id?: string;
    full_name?: string;
    username?: string;
    user_name?: string;
    name?: string;
    is_class_teacher?: boolean;
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
  };
};

function pickTokenValue(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
}

async function postCleanJson<TResponse>(url: string, payload: unknown, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data: any = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const error: any = new Error(`Request failed with status ${response.status} for ${url}`);
    error.response = {
      status: response.status,
      data,
      url,
    };
    console.error('[authService] postCleanJson error', { status: response.status, url, data });
    throw error;
  }

  return {
    status: response.status,
    data: data as TResponse,
  };
}

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
        const res = await postCleanJson(url, payload, headers);
        console.log(`[authService] Clean post success: ${endpoint}`);
        return res;
      }
      return await API.post(endpoint, payload);
    } catch (error: any) {
      console.log(`[authService] Error posting to ${endpoint}:`, error?.response?.data || error.message);
      lastError = error;

      const status = error?.response?.status;
      const shouldRetry = status === 404 || status === 405;

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function getTenantContext() {
  const schoolCode = await AsyncStorage.getItem('school_code')
    || await AsyncStorage.getItem('schoolCode')
    || await AsyncStorage.getItem('school_id')
    || await AsyncStorage.getItem('schoolId');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  return { schoolCode, branchId };
}

function normalizeLoginResponse(data: LoginResponse, fallbackRole: AppRole): NormalizedLoginResponse {
  const payload = data.data ?? data;
  const role = normalizeBackendRole(payload.role ?? payload.user_role) ?? fallbackRole;
  const token = pickTokenValue(payload.token, payload.access_token, payload.accessToken);
  const name =
    payload.user?.name ??
    payload.user?.full_name ??
    payload.user?.username ??
    payload.user?.user_name;

  return {
    token,
    accessToken: token,
    role,
    schoolCode: payload.school_code ?? payload.schoolCode ?? payload.school_id,
    user: {
      userId: payload.user?.id != null ? String(payload.user.id) : undefined,
      studentId: payload.user?.student_id,
      employeeId: payload.user?.employee_id,
      branchId: payload.user?.branch_id,
      name,
      isClassTeacher: payload.user?.is_class_teacher ?? false,
    },
  };
}

export const authService = {
  async login(schoolId: string, username: string, password: string, fallbackRole: AppRole = 'student') {
    // We use a clean instance for login to prevent stale AsyncStorage tokens from causing 403s
    // We also include both snake_case and camelCase for school code to match web logic
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
    );
    return normalizeLoginResponse(response.data as LoginResponse, fallbackRole);
  },
  async requestOtp(schoolId: string, identifier: string) {
    console.log('[authService.requestOtp] Called with:', { schoolId, identifier });

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
  async forgotPasswordReset(
    schoolId: string,
    identifier: string,
    otp: string,
    resetToken: string,
    newPassword: string,
  ) {
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
  async verifyOtp(schoolId: string, identifier: string, otp: string) {
    console.log('[authService.verifyOtp] Called with:', { schoolId, identifier });

    return postWithFallback(
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
  },
  async resetPassword(schoolId: string, identifier: string, resetToken: string, password: string) {
    console.log('[authService.resetPassword] Called with:', { schoolId, identifier, resetTokenProvided: !!resetToken });
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
        new_password: password,
        confirm_password: password,
      },
      true,
    );
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