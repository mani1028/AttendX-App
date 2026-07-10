import { buildApiUrl } from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import type { UserProfile } from './types';

export const toText = (value: unknown): string => {
  if (typeof value === 'string') { return value.trim(); }
  if (typeof value === 'number') { return String(value).trim(); }
  return '';
};

export const firstNonEmptyText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = toText(value);
    if (text) { return text; }
  }
  return '';
};

export const normalizeRoleBucket = (role: string): 'student' | 'teacher' => {
  const key = String(role || '').trim().toLowerCase();
  return key === 'student' || key === 'students' ? 'student' : 'teacher';
};

export const getPhotoCacheKey = (roleBucket: 'student' | 'teacher', id: string, schoolCode: string): string | null => {
  if (!id) { return null; }
  return `profile_photo_url:${roleBucket}:${schoolCode || 'unknown'}:${id}`;
};

export const normalizePhotoUri = (value: unknown): string | null => {
  const photo = toText(value);
  if (!photo) { return null; }

  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  if (photo.startsWith('/')) {
    return buildApiUrl(photo);
  }

  const compact = photo.replace(/\s+/g, '');
  const likelyBase64 = compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
  if (likelyBase64) {
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    return `data:image/jpeg;base64,${normalized}`;
  }

  return buildApiUrl(`/${photo}`);
};

export const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T | null> => {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

export const isOwnApiUrl = (url: string | null): boolean => {
  if (!url) { return false; }
  if (url.startsWith('/') || url.startsWith('api/')) { return true; }
  if (url.startsWith('data:') || url.startsWith('file:') || url.startsWith('content:')) { return false; }

  const cleanUrl = url.toLowerCase();

  if (
    cleanUrl.includes('amazonaws.com') ||
    cleanUrl.includes('s3.') ||
    cleanUrl.includes('blob.core.windows.net') ||
    cleanUrl.includes('googleapis.com') ||
    cleanUrl.includes('cloudinary.com')
  ) {
    return false;
  }

  return (
    cleanUrl.includes('attendx.ai') ||
    cleanUrl.includes('attendx.com') ||
    cleanUrl.includes('192.168.') ||
    cleanUrl.includes('localhost') ||
    cleanUrl.includes('10.0.2.2')
  );
};

export const isStrongPassword = (pwd: string): boolean => {
  const p = String(pwd || '');
  return (
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /\d/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
};

export const getPasswordStrength = (pwd: string) => ({
  minLength: String(pwd || '').length >= 8,
  hasUpper: /[A-Z]/.test(String(pwd || '')),
  hasLower: /[a-z]/.test(String(pwd || '')),
  hasNumber: /\d/.test(String(pwd || '')),
  hasSpecial: /[^A-Za-z0-9]/.test(String(pwd || '')),
});

export const getRoleFlags = (role: string) => {
  const roleKey = String(role || '').trim().toLowerCase();
  const isAgent = roleKey === 'agent' || roleKey === 'marketing agent' || roleKey === 'marketing_agent';
  const isStudent = !isAgent && (roleKey === 'student' || roleKey === 'students');
  const isAccountant = !isAgent && roleKey === 'accountant';
  const isAdminPanel =
    roleKey === 'admin' ||
    roleKey === 'superadmin' ||
    roleKey === 'super_admin' ||
    roleKey === 'super admin' ||
    roleKey === 'administrator';
  const isDirector = !isAgent && (roleKey === 'director' || roleKey === 'principal' || isAdminPanel);
  const isTeacher = !isAgent && !isAccountant && (roleKey === 'teacher' || roleKey === 'teachers' || roleKey === 'staff');

  return { roleKey, isAgent, isStudent, isAdminPanel, isDirector, isTeacher, isAccountant };
};

export const getSystemSettingsRoute = (roleKey: string): string | null => {
  switch (roleKey) {
    case 'principal': return 'PrincipalSettings';
    case 'admin':
    case 'superadmin':
    case 'super_admin':
    case 'super admin':
      return 'AdminSettings';
    case 'accountant': return 'AccountantSettings';
    default: return null;
  }
};

export const mapOtpErrorMessage = (detail: any): string => {
  const raw = formatErrorMessage(detail);
  const msg = raw.toLowerCase();
  if (
    msg.includes('otp not found') ||
    msg.includes('invalid otp') ||
    msg.includes('incorrect otp') ||
    msg.includes('wrong otp')
  ) {
    return 'The OTP you entered is incorrect. Please try again.';
  }
  if (msg.includes('expired')) {
    return 'This OTP has expired. Please request a new one.';
  }
  return raw;
};

export const getProfileSubtitle = (
  userInfo: UserProfile,
  roleKey: string,
  isAgent: boolean,
  isAdminPanel: boolean,
  studentRollNumber: string,
): string => {
  const rolePart = userInfo.role?.toUpperCase() || 'STUDENT';
  if (isAgent) {
    return userInfo.username ? `${rolePart} • @${userInfo.username}` : rolePart;
  }
  if (roleKey === 'director' || isAdminPanel) {
    return userInfo.employee_id ? `${rolePart} • ID: ${userInfo.employee_id}` : rolePart;
  }
  if (roleKey === 'student' && studentRollNumber) {
    return `${rolePart} • Roll No: ${studentRollNumber}`;
  }
  if (roleKey === 'accountant' && userInfo.employee_id) {
    return `${rolePart} • ID: ${userInfo.employee_id}`;
  }
  if (userInfo.employee_id) {
    return `${rolePart} • ID: ${userInfo.employee_id}`;
  }
  return rolePart;
};
