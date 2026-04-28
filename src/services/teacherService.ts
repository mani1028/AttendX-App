import AsyncStorage from '@react-native-async-storage/async-storage';
import API, { buildApiUrl } from './api';

const PROFILE_ENDPOINTS = [
  'profile/details',
  'teacher-dashboard/profile',
  'manage/teachers',
  'hm/teachers'
];

const PROFILE_PHOTO_ENDPOINT = 'profile-photo/teacher';

const FALLBACK_404_CONFIG = {
  suppressFallback404Log: true,
} as const;

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

async function getFirstSuccessful<T>(endpoints: string[], config: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, config);
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('Teacher service GET endpoint not found');
}

async function postFirstSuccessful<T>(endpoints: string[], data: any, config: any = {}) {
  for (const endpoint of endpoints) {
    try {
      const response = await API.post<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('Teacher service POST endpoint not found');
}

export async function getAttendanceSettings(headers: any): Promise<any> {
  const endpoints = [
    '/hm/attendance/settings',
    '/api/hm/attendance/settings',
    '/manage/attendance/settings'
  ];
  return getFirstSuccessful(endpoints, { headers });
}

export async function getClassesSections(branchId: string, schoolCode: string): Promise<any> {
  const endpoints = [
    '/manage/classes-sections',
    '/api/manage/classes-sections',
    '/teacher/classes-sections'
  ];
  return getFirstSuccessful(endpoints, {
    params: { branch_id: branchId },
    headers: { 'X-School-Code': schoolCode }
  });
}

export async function verifyTeacher(formData: FormData): Promise<any> {
  const endpoints = [
    '/manage/verify-teacher',
    '/api/manage/verify-teacher',
    '/teacher/verify'
  ];
  return postFirstSuccessful(endpoints, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export async function uploadStudentImage(payload: any): Promise<any> {
  const endpoints = [
    '/manage/attendance/student/upload-image',
    '/api/manage/attendance/student/upload-image',
    '/teacher/attendance/upload-image'
  ];
  return postFirstSuccessful(endpoints, payload);
}

export async function processAttendance(payload: any): Promise<any> {
  const endpoints = [
    '/manage/attendance/student/view',
    '/api/manage/attendance/student/view',
    '/teacher/attendance/process'
  ];
  return postFirstSuccessful(endpoints, payload);
}

export async function getAssignedClasses(schoolCode: string, branchId: string, employeeId: string): Promise<any[]> {
  const endpoints = [
    '/teacher/assigned-classes',
    '/api/teacher/assigned-classes',
    '/manage/teacher/assigned-classes'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      params: { branch_id: branchId, employee_id: employeeId },
      headers: { 'X-School-Code': schoolCode }
    });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getStudentsByClass(schoolCode: string, branchId: string, classGrade: string, section: string): Promise<any[]> {
  const endpoints = [
    '/teacher/students',
    '/api/teacher/students',
    '/manage/students'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      params: { branch_id: branchId, class_grade: classGrade, section: section },
      headers: { 'X-School-Code': schoolCode }
    });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getTeacherGallery(schoolCode: string, branchId: string, teacherId: string): Promise<any[]> {
  const endpoints = [
    '/manage/attendance/teacher/gallery',
    '/api/manage/attendance/teacher/gallery',
    '/teacher/attendance/gallery/teacher'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      params: { school_code: schoolCode, branch_id: branchId, teacher_id: teacherId },
      headers: { 'X-School-Code': schoolCode }
    });
    return data.images || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getStudentGallery(schoolCode: string, branchId: string, classGrade: string, section: string): Promise<any[]> {
  const endpoints = [
    '/manage/attendance/student/gallery',
    '/api/manage/attendance/student/gallery',
    '/teacher/attendance/gallery/student'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      params: { school_code: schoolCode, branch_id: branchId, class_grade: classGrade, section: section },
      headers: { 'X-School-Code': schoolCode }
    });
    return data.images || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getTeacherProfilePhotoUrl(teacherId?: string, schoolCode?: string): Promise<string | null> {
  const resolvedTeacherId =
    teacherId ||
    (await AsyncStorage.getItem('teacher_id')) ||
    (await AsyncStorage.getItem('teacherId')) ||
    (await AsyncStorage.getItem('employee_id')) ||
    '';

  if (!resolvedTeacherId) return null;

  const resolvedSchoolCode =
    schoolCode ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';

  const url = buildApiUrl(`/${PROFILE_PHOTO_ENDPOINT}/${encodeURIComponent(resolvedTeacherId)}`);
  if (!resolvedSchoolCode) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}school_code=${encodeURIComponent(resolvedSchoolCode)}`;
}

export async function getTeacherProfilePhotoDataUri(teacherId?: string, schoolCode?: string): Promise<string | null> {
  const resolvedTeacherId =
    teacherId ||
    (await AsyncStorage.getItem('teacher_id')) ||
    (await AsyncStorage.getItem('teacherId')) ||
    (await AsyncStorage.getItem('employee_id')) ||
    '';

  if (!resolvedTeacherId) return null;

  const resolvedSchoolCode =
    schoolCode ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';

  try {
    const response = await API.get<ArrayBuffer>(`${PROFILE_PHOTO_ENDPOINT}/${encodeURIComponent(resolvedTeacherId)}`, {
      params: resolvedSchoolCode ? { school_code: resolvedSchoolCode } : undefined,
      responseType: 'arraybuffer',
      ...FALLBACK_404_CONFIG,
    } as any);

    const contentType = normalizeContentType((response.headers as any)?.['content-type']);
    const base64 = arrayBufferToBase64(response.data);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function getTeacherProfile(): Promise<any> {
  try {
    const storedUserRaw = await AsyncStorage.getItem('user');
    const storedUser = storedUserRaw ? (() => {
      try {
        return JSON.parse(storedUserRaw);
      } catch {
        return {};
      }
    })() : {};

    const responseData = await getFirstSuccessful<any>(PROFILE_ENDPOINTS, FALLBACK_404_CONFIG as any);
    const root = asRecord(responseData);

    const teacherId = String(
      (await AsyncStorage.getItem('teacher_id')) ||
      (await AsyncStorage.getItem('teacherId')) ||
      (await AsyncStorage.getItem('employee_id')) ||
      root.teacher_id ||
      root.employee_id ||
      ''
    ).trim();

    const candidateList = [
      root.data,
      root.items,
      root.teachers,
      root.records,
      responseData,
    ].find(Array.isArray) as any[] | undefined;

    const listMatch = candidateList?.find((item: any) => {
      const row = asRecord(item);
      const rowId = String(firstDefined(row.teacher_id, row.teacherId, row.employee_id, row.employeeId, row.id, '') || '').trim();
      return teacherId ? rowId === teacherId : Boolean(rowId);
    });

    const raw = asRecord(firstDefined(listMatch, root.data, root.profile, root.teacher, root.user, storedUser, responseData));

    let photoSource = normalizePhotoSource(firstDefined(
      raw.teacher_photograph,
      raw.profile_photo_url,
      raw.photo_url,
      raw.photo,
      raw.avatar,
      root.teacher_photograph,
      root.profile_photo_url,
      storedUser?.teacher_photograph,
      storedUser?.profile_photo_url,
      storedUser?.photo_url,
    ));

    if (!photoSource) {
      const resolvedTeacherId = toText(firstDefined(raw.teacher_id, raw.teacherId, raw.employee_id, raw.employeeId, root.teacher_id, root.employee_id, storedUser?.teacher_id, storedUser?.employee_id)).trim();
      const resolvedSchoolCode = toText(firstDefined(raw.school_code, root.school_code, storedUser?.school_code)).trim();
      photoSource = await getTeacherProfilePhotoDataUri(resolvedTeacherId, resolvedSchoolCode);

      if (!photoSource) {
        photoSource = await getTeacherProfilePhotoUrl(resolvedTeacherId, resolvedSchoolCode);
      }
    }

    return {
      ...raw,
      profile_photo_url: photoSource || toText(firstDefined(raw.profile_photo_url, root.profile_photo_url)),
      teacher_photograph: toText(firstDefined(raw.teacher_photograph, root.teacher_photograph)),
      name: toText(firstDefined(raw.name, raw.full_name, raw.teacher_name, raw.teacher_full_name, root.name, root.teacher_name, storedUser?.name, storedUser?.full_name)),
      email: toText(firstDefined(raw.email, raw.email_address, raw.email_id, raw.teacher_email, root.email, root.email_id, storedUser?.email)),
      phone: toText(firstDefined(raw.phone, raw.mobile, raw.phone_number, raw.mobile_number, raw.contact_number, root.phone, root.mobile, storedUser?.phone)),
      teacher_id: toText(firstDefined(raw.teacher_id, raw.teacherId, storedUser?.teacher_id, storedUser?.teacherId)),
      employee_id: toText(firstDefined(raw.employee_id, raw.employeeId, storedUser?.employee_id, storedUser?.employeeId)),
      school_code: toText(firstDefined(raw.school_code, root.school_code, storedUser?.school_code)),
      school_name: toText(firstDefined(raw.school_name, raw.school, raw.schoolName, root.school_name, root.schoolName, storedUser?.school_name)),
      branch_id: toText(firstDefined(raw.branch_id, raw.branchId, root.branch_id, root.branchId, storedUser?.branch_id)),
      branch_name: toText(firstDefined(raw.branch_name, raw.branch, raw.branchName, root.branch_name, root.branchName, storedUser?.branch_name)),
      designation: toText(firstDefined(raw.designation, raw.teacher_designation, root.designation, storedUser?.designation)),
      department_subject: toText(firstDefined(raw.department_subject, raw.department, raw.subject, root.department_subject, storedUser?.department_subject)),
      date_of_joining: toText(firstDefined(raw.date_of_joining, storedUser?.date_of_joining)),
      qualification: toText(firstDefined(raw.qualification, storedUser?.qualification)),
      experience_years: toText(firstDefined(raw.experience_years, raw.experience, storedUser?.experience_years)),
      blood_group: toText(firstDefined(raw.blood_group, storedUser?.blood_group)),
      aadhaar_number: toText(firstDefined(raw.aadhaar_number, storedUser?.aadhaar_number)),
      address: toText(firstDefined(raw.address, storedUser?.address)),
      gender: toText(firstDefined(raw.gender, storedUser?.gender)),
      nationality: toText(firstDefined(raw.nationality, storedUser?.nationality)),
      mother_tongue: toText(firstDefined(raw.mother_tongue, storedUser?.mother_tongue)),
      religion: toText(firstDefined(raw.religion, storedUser?.religion)),
    };
  } catch {
    try {
      const storedUserRaw = await AsyncStorage.getItem('user');
      return storedUserRaw ? JSON.parse(storedUserRaw) : {};
    } catch {
      return {};
    }
  }
}


