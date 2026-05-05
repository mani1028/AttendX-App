import AsyncStorage from '@react-native-async-storage/async-storage';
import API, { buildApiUrl } from './api';
import { isSunday } from '../utils/holidayUtils';

const PROFILE_ENDPOINTS = [
  'profile/details',
  'teacher/profile',
  'teacher/marks/teacher-context',
  'teacher-dashboard/profile',
  'auth/teacher-capability',
  'hm/dashboard/profile'
];

const PROFILE_PHOTO_ENDPOINT = 'profile-photo/teacher';
const STUDENT_PHOTO_ENDPOINT = 'profile-photo/student';

const UPDATE_PROFILE_ENDPOINTS = [
  'teacher-dashboard/profile/update',
  'teacher/profile/update',
  'manage/teachers/update',
  'hm/teachers/update',
  'profile/update'
];

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
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
  const teacherId = await AsyncStorage.getItem('teacher_id') || await AsyncStorage.getItem('teacherId') || await AsyncStorage.getItem('employee_id');
  const suppressLogs = config.suppressFallback404Log;

  const errors: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const { params, ...restConfig } = config;
      const defaultHeaders = {
        'X-School-Code': schoolCode || undefined,
        'X-Branch-Id': branchId || undefined,
      };
      const response = await API.get<T>(endpoint, {
        ...restConfig,
        params: {
          school_code: schoolCode,
          school_id: schoolCode,
          teacher_id: teacherId,
          employee_id: teacherId,
          ...params
        },
        headers: {
          ...defaultHeaders,
          ...(restConfig && restConfig.headers ? restConfig.headers : {}),
        }
      });
      if (__DEV__ && !suppressLogs && endpoint !== endpoints[0]) {
        console.log(`[Service] GET ${endpoint} succeeded after ${endpoints[0]} failed`);
      }
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isLastEndpoint = endpoint === endpoints[endpoints.length - 1];

      // If it's a real error (not 404/405), we might want to throw early.
      // However, for GET fallback, sometimes different endpoints have different auth requirements.
      // For now, let's at least capture it.
      if (status && status !== 404 && status !== 405) {
        // If we get a 401 or 403, it's likely a real auth issue on a valid endpoint.
        if (status === 401 || status === 403) throw error;
      }

      if (__DEV__ && !suppressLogs) {
        console.log(`[Service] GET ${endpoint} failed (${status || 'network error'})${isLastEndpoint ? ' (all endpoints exhausted)' : ', trying next...'}`);
      }
      errors.push({ endpoint, status, message: error?.message });
    }
  }

  if (errors.length > 0 && !suppressLogs) {
    const detail = errors.map(e => `${e.endpoint} (${e.status || 'network error'})`).join(', ');
    throw new Error(`Teacher service GET endpoint not found. Tried: ${detail}`);
  }
  throw new Error('Teacher service GET endpoint not found');
}

async function postFirstSuccessful<T>(endpoints: string[], data: any, config: any = {}) {
  const errors: any[] = [];
  for (const endpoint of endpoints) {
    try {
      const response = await API.post<T>(endpoint, data, {
        ...config,
        suppressFallback404Log: true,
      });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message;

      if (__DEV__) {
        console.log(`[Service] POST ${endpoint} failed (${status || 'network error'}):`, detail);
      }

      // If it's a legitimate backend error (like 401 Unauthorized or 400 Bad Request),
      // we should stop and throw it, as the endpoint was found but rejected the request.
      if (status && status !== 404 && status !== 405) {
        throw error;
      }

      errors.push({ endpoint, status, message: detail });
      // Try next variant
    }
  }

  if (errors.length > 0) {
    const detail = errors.map(e => `${e.endpoint} (${e.status || 'network error'})`).join(', ');
    throw new Error(`Teacher service POST endpoint not found. Tried: ${detail}`);
  }
  throw new Error('Teacher service POST endpoint not found');
}

export async function getAttendanceSettings(headers: any): Promise<any> {
  const endpoints = [
    'hm/attendance/settings',
    'manage/attendance/settings'
  ];
  return getFirstSuccessful(endpoints, { headers });
}

export async function getClassesSections(branchId: string, schoolCode: string): Promise<any> {
  const endpoints = [
    'manage/classes-sections',
    'teacher/classes-sections'
  ];
  return getFirstSuccessful(endpoints, {
    params: { branch_id: branchId },
    headers: { 'X-School-Code': schoolCode }
  });
}

export async function verifyTeacher(payload: any): Promise<any> {
  const endpoints = [
    'manage/verify-teacher',
    'teacher/verify'
  ];
  // Backend expects JSON by default now
  // Suppress global 401 logout for face-verification requests so we can show an error
  // message instead of logging the user out when recognition fails.
  return postFirstSuccessful(endpoints, payload, { suppressLogoutOn401: true });
}

export async function uploadStudentImage(payload: any): Promise<any> {
  const endpoints = [
    'manage/attendance/student/upload-image',
    'teacher/attendance/upload-image'
  ];
  return postFirstSuccessful(endpoints, payload);
}

export async function processAttendance(payload: any): Promise<any> {
  const endpoints = [
    'manage/attendance/student/view'
  ];
  return postFirstSuccessful(endpoints, payload);
}

export async function getAssignedClasses(schoolCode: string, branchId: string, employeeId: string): Promise<any[]> {
  const requestVariants = [
    {
      method: 'get' as const,
      endpoint: 'teacher/marks/teacher-context',
      params: { teacher_id: employeeId },
    },
    {
      method: 'get' as const,
      endpoint: 'teacher/assigned-classes',
      params: { teacher_id: employeeId },
    },
    {
      method: 'post' as const,
      endpoint: 'teacher/assigned-classes',
      data: { teacher_id: employeeId, branch_id: branchId, employee_id: employeeId },
    },
    {
      method: 'get' as const,
      endpoint: 'manage/teacher/assigned-classes',
      params: { teacher_id: employeeId },
    },
    {
      method: 'post' as const,
      endpoint: 'manage/teacher/assigned-classes',
      data: { teacher_id: employeeId, branch_id: branchId, employee_id: employeeId },
    },
    {
      method: 'get' as const,
      endpoint: 'teacher/assigned-classes',
      params: { employee_id: employeeId },
    },
    {
      method: 'post' as const,
      endpoint: 'teacher/assigned-classes',
      data: { employee_id: employeeId, branch_id: branchId },
    },
    {
      method: 'get' as const,
      endpoint: 'manage/teacher/assigned-classes',
      params: { employee_id: employeeId },
    },
    {
      method: 'post' as const,
      endpoint: 'manage/teacher/assigned-classes',
      data: { employee_id: employeeId, branch_id: branchId },
    },
    {
      method: 'get' as const,
      endpoint: 'teacher/assigned-classes',
      params: { branch_id: branchId, teacher_id: employeeId, employee_id: employeeId, teacherId: employeeId },
    },
    {
      method: 'post' as const,
      endpoint: 'teacher/assigned-classes',
      data: { branch_id: branchId, teacher_id: employeeId, employee_id: employeeId, teacherId: employeeId },
    },
  ];

  const normalizeText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
  };

  const headers = {
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
    'X-Tenant-Id': schoolCode,
  };

  const extractList = (respData: any): any[] => {
    if (!respData) return [];
    if (Array.isArray(respData)) return respData;
    if (Array.isArray(respData.items)) return respData.items;
    if (Array.isArray(respData.data)) return respData.data;
    if (Array.isArray(respData.assigned_classes)) return respData.assigned_classes;
    if (Array.isArray(respData.assignedClasses)) return respData.assignedClasses;
    if (Array.isArray(respData.assignments)) return respData.assignments;
    if (Array.isArray(respData.results)) return respData.results;
    if (Array.isArray(respData.teachers)) return respData.teachers;
    if (Array.isArray(respData.students)) return respData.students;
    // nested shapes
    if (respData.teacher_context && Array.isArray(respData.teacher_context.assigned_classes)) return respData.teacher_context.assigned_classes;
    if (respData.teacher_context && Array.isArray(respData.teacher_context.items)) return respData.teacher_context.items;
    if (respData.context && Array.isArray(respData.context.assigned_classes)) return respData.context.assigned_classes;
    if (respData.data?.teacher_context && Array.isArray(respData.data.teacher_context.assigned_classes)) return respData.data.teacher_context.assigned_classes;
    if (respData.data?.teacher_context && Array.isArray(respData.data.teacher_context.items)) return respData.data.teacher_context.items;
    if (respData.data?.assignments && Array.isArray(respData.data.assignments)) return respData.data.assignments;
    return [];
  };

  const normalizeAssignment = (item: any) => {
    const classGrade = String(item?.class_grade ?? item?.class_name ?? '').trim();
    const section = String(item?.section ?? item?.section_name ?? '').trim();
    return {
      ...item,
      class_grade: classGrade,
      section,
      class_name: String(item?.class_name ?? classGrade).trim(),
      section_name: String(item?.section_name ?? section).trim(),
    };
  };

  for (const variant of requestVariants) {
    try {
      if (__DEV__) {
        console.log('[getAssignedClasses] trying request:', variant.method.toUpperCase(), variant.endpoint, {
          params: variant.params,
          data: variant.data,
        });
      }
      const res = variant.method === 'get'
        ? await API.get<any>(variant.endpoint, {
            params: variant.params,
            headers,
            suppressFallback404Log: true,
          } as any)
        : await API.post<any>(variant.endpoint, variant.data, {
            headers,
            suppressFallback404Log: true,
          } as any);

      if (__DEV__) {
        try {
          const sample = res.data && (Array.isArray(res.data) ? `array(length=${res.data.length})` : `object(keys=${Object.keys(res.data || {}).slice(0,10).join(',')})`);
          console.log(`[getAssignedClasses] ${variant.endpoint} response sample:`, sample);
        } catch (e) {
          console.log(`[getAssignedClasses] ${variant.endpoint} response received`);
        }
      }
      const list = extractList(res.data || res).map(normalizeAssignment);
      if (__DEV__) console.log('[getAssignedClasses] extracted list length:', Array.isArray(list) ? list.length : 'n/a');
      if (Array.isArray(list) && list.length > 0) return list;
      // If backend returns a teacher context wrapper, fall back to data that may be nested elsewhere.
      const raw = res.data || {};
      const assignmentCount = normalizeText(raw.assignment_count || raw.data?.assignment_count || raw.teacher_context?.assignment_count);
      if (__DEV__) {
        console.log('[getAssignedClasses] assignment_count:', assignmentCount || 'n/a');
      }
    } catch (err: any) {
      if (__DEV__) console.log('[getAssignedClasses] request failed:', variant.endpoint, err?.message || err);
      // ignore and try next
    }
  }

  // If all endpoints returned empty/failed, return empty array
  return [];
}

export async function getStudentsByClass(schoolCode: string, branchId: string, classGrade: string, section: string): Promise<any[]> {
  try {
    if (__DEV__) {
      console.log('[getStudentsByClass] Attempting to fetch students:', { schoolCode, branchId, classGrade, section });
    }

    // Normalize parameters to lowercase as required by backend
    const normalizedGrade = classGrade?.toLowerCase?.() || classGrade;
    const normalizedSection = section?.toLowerCase?.() || section;

    // Try direct API call first (matching HM implementation)
    try {
      const response = await API.get<any>('hm/students', {
        params: {
          class_grade: normalizedGrade,
          section: normalizedSection,
        },
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
        }
      });
      
      if (__DEV__) {
        console.log('[getStudentsByClass] hm/students response:', response.data);
      }
      
      // Handle expected response format
      if (response.data?.items && Array.isArray(response.data.items)) {
        return response.data.items;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      return [];
    } catch (directErr) {
      if (__DEV__) {
        console.log('[getStudentsByClass] hm/students failed, trying fallback endpoints');
      }
    }

    // Fallback to getFirstSuccessful with multiple endpoints
    const endpoints = [
      'teacher/students',
      'manage/students',
      'students'
    ];
    
    const data = await getFirstSuccessful<any>(endpoints, {
      params: { 
        branch_id: branchId, 
        class_grade: normalizedGrade, 
        section: normalizedSection 
      },
      headers: { 'X-School-Code': schoolCode },
      suppressFallback404Log: true
    });
    
    if (__DEV__) {
      console.log('[getStudentsByClass] Fallback response data:', data);
      console.log('[getStudentsByClass] Data type:', typeof data, 'Is array:', Array.isArray(data));
    }
    
    // Handle different response formats
    if (data?.items && Array.isArray(data.items)) {
      return data.items;
    }
    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data?.students && Array.isArray(data.students)) {
      return data.students;
    }
    if (Array.isArray(data)) {
      return data;
    }
    
    if (__DEV__) {
      console.warn('[getStudentsByClass] Unexpected response format:', data);
    }
    return [];
  } catch (err) {
    if (__DEV__) {
      console.error('[getStudentsByClass] Error fetching students:', err);
    }
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

export async function getStudentProfilePhotoUrl(studentId: string, schoolCode?: string): Promise<string | null> {
  if (!studentId) return null;

  const resolvedSchoolCode =
    schoolCode ||
    (await AsyncStorage.getItem('school_code')) ||
    (await AsyncStorage.getItem('schoolCode')) ||
    '';

  const url = buildApiUrl(`/${STUDENT_PHOTO_ENDPOINT}/${encodeURIComponent(studentId)}`);
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
    const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
    const response = await API.get<ArrayBuffer>(`${PROFILE_PHOTO_ENDPOINT}/${encodeURIComponent(resolvedTeacherId)}`, {
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

    // Retrieve all stored values
    const [
      storedEmail, storedPhone, storedBranchName, storedBranchId,
      storedSchoolName, storedSchoolCode, storedTeacherId, storedEmployeeId,
      storedDesignation, storedDepartment, storedAddress, storedBloodGroup
    ] = await AsyncStorage.multiGet([
      'email', 'phone', 'branch_name', 'branch_id',
      'school_name', 'school_code', 'teacher_id', 'employee_id',
      'designation', 'department_subject', 'address', 'blood_group'
    ]).then(items => items.map(([, value]) => value || ''));

    const responseData = await getFirstSuccessful<any>(PROFILE_ENDPOINTS, {
      ...FALLBACK_404_CONFIG,
    } as any);
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
      root.teacher,
      responseData,
    ].find(Array.isArray) as any[] | undefined;

    const listMatch = candidateList?.find((item: any) => {
      const row = asRecord(item);
      const rowId = String(firstDefined(row.teacher_id, row.teacherId, row.employee_id, row.employeeId, row.id, '') || '').trim();
      return teacherId ? rowId === teacherId : Boolean(rowId);
    });

    const raw = asRecord(firstDefined(listMatch, root.teacher_data, root.data, root.profile, root.teacher, root.user, storedUser, responseData));

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

    const combinedAddress = [
      raw.house_no,
      raw.street_locality,
      raw.village_town_city,
      raw.district,
      raw.state,
      raw.pin_code
    ].filter(v => toText(v).trim()).join(', ');

    const teacherFullName = toText(firstDefined(
      raw.teacher_full_name,
      raw.full_name,
      raw.teacher_name,
      raw.name,
      root.teacher_full_name,
      root.full_name,
      root.teacher_name,
      root.name,
      storedUser?.teacher_full_name,
      storedUser?.full_name,
      storedUser?.name,
    ));

    const emailId = toText(firstDefined(
      raw.email_id,
      raw.email,
      raw.email_address,
      raw.teacher_email,
      root.email_id,
      root.email,
      storedEmail,
      storedUser?.email_id,
      storedUser?.email,
    ));

    const mobileNumber = toText(firstDefined(
      raw.mobile_number,
      raw.phone_number,
      raw.mobile,
      raw.phone,
      raw.contact_number,
      root.mobile_number,
      root.phone,
      storedPhone,
      storedUser?.mobile_number,
      storedUser?.phone,
    ));

    return {
      ...raw,
      profile_photo_url: photoSource || toText(firstDefined(raw.profile_photo_url, root.profile_photo_url)),
      teacher_photograph: toText(firstDefined(raw.teacher_photograph, root.teacher_photograph)),
      name: teacherFullName,
      teacher_full_name: teacherFullName,
      email: emailId,
      email_id: emailId,
      phone: mobileNumber,
      mobile_number: mobileNumber,
      teacher_id: toText(firstDefined(raw.teacher_id, raw.teacherId, storedTeacherId, storedUser?.teacher_id, storedUser?.teacherId)),
      employee_id: toText(firstDefined(raw.employee_id, raw.employeeId, storedEmployeeId, storedUser?.employee_id, storedUser?.employeeId)),
      school_code: toText(firstDefined(raw.school_code, root.school_code, storedSchoolCode, storedUser?.school_code)),
      school_name: toText(firstDefined(raw.school_name, raw.school, raw.schoolName, root.school_name, root.schoolName, storedSchoolName, storedUser?.school_name)),
      branch_id: toText(firstDefined(raw.branch_id, raw.branchId, root.branch_id, root.branchId, storedBranchId, storedUser?.branch_id)),
      branch_name: toText(firstDefined(raw.branch_name, raw.branch, raw.branchName, root.branch_name, root.branchName, storedBranchName, storedUser?.branch_name)),
      designation: toText(firstDefined(raw.designation, raw.teacher_designation, root.designation, storedDesignation, storedUser?.designation)),
      department_subject: toText(firstDefined(raw.department_subject, raw.department, raw.subject, root.department_subject, storedDepartment, storedUser?.department_subject)),
      date_of_joining: toText(firstDefined(raw.date_of_joining, storedUser?.date_of_joining)),
      qualification: toText(firstDefined(raw.qualification, storedUser?.qualification)),
      experience_years: toText(firstDefined(raw.experience_years, raw.experience, storedUser?.experience_years)),
      blood_group: toText(firstDefined(raw.blood_group, storedBloodGroup, storedUser?.blood_group)),
      aadhaar_number: toText(firstDefined(raw.aadhaar_number, storedUser?.aadhaar_number)),
      address: toText(firstDefined(raw.address, combinedAddress, storedAddress, storedUser?.address)),
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

export async function getTeacherCapability(schoolId: string, employeeId: string): Promise<any> {
  const endpoints = [
    'auth/teacher-capability',
    'teacher/capability',
    'manage/teacher/capability'
  ];
  return getFirstSuccessful(endpoints, {
    params: { 
      school_id: schoolId, 
      employee_id: employeeId,
      branch_id: schoolId,
      teacher_id: employeeId
    },
    suppressFallback404Log: true,
  } as any);
}

export async function getAttendanceReport(schoolCode: string, branchId: string, attendanceDate: string, classGrade: string, section: string): Promise<any> {
  if (isSunday(attendanceDate)) {
    return {
      present: [],
      absent: [],
      total: 0,
      attendance_date: attendanceDate,
      holiday: true,
      holiday_name: 'Sunday Holiday',
    };
  }

  const endpoints = [
    'manage/attendance/student/fetch-report',
    'teacher/attendance/report',
    'manage/attendance/fetch-report'
  ];
  return postFirstSuccessful(endpoints, {
    school_code: schoolCode,
    branch_id: branchId,
    attendance_date: attendanceDate,
    class_grade: String(classGrade).toLowerCase(),
    section: String(section).toLowerCase()
  });
}

export async function getBranchStats(schoolCode: string, branchId: string): Promise<any> {
  const endpoints = [
    'hm/dashboard/stats',
    'teacher/dashboard/stats'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      headers: { 
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
        'X-Tenant-Id': schoolCode
      },
      suppressFallback404Log: true,
    } as any);
    return data;
  } catch (err) {
    return null;
  }
}

export async function getTeacherAttendance(schoolCode: string, branchId: string, onDate?: string): Promise<any[]> {
  const endpoints = [
    'hm/teachers/attendance',
    'teacher/attendance/status'
  ];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      params: { 
        on_date: onDate || new Date().toISOString().split('T')[0],
        branch_id: branchId 
      },
      headers: { 'X-School-Code': schoolCode },
      suppressFallback404Log: true,
    } as any);
    return data.items || data || [];
  } catch (err) {
    return [];
  }
}

export async function updateTeacherProfile(data: any): Promise<any> {
  // Preferred API: PUT /hm/teachers/{teacher_id}
  const teacherId = data?.teacher_id || data?.teacherId || data?.employee_id || data?.employeeId || await AsyncStorage.getItem('teacher_id') || await AsyncStorage.getItem('teacherId') || await AsyncStorage.getItem('employee_id');
  if (teacherId) {
    try {
      const response = await API.put(`hm/teachers/${encodeURIComponent(teacherId)}`, data);
      return response.data;
    } catch (err) {
      // continue to fallbacks
    }
  }

  return postFirstSuccessful(UPDATE_PROFILE_ENDPOINTS, data);
}

/* ============ STUDENT REGISTRATION REQUESTS (Class Teacher Only) ============ */

export async function getStudentRegistrationRequests(
  schoolCode: string,
  branchId: string,
  params?: any
): Promise<any> {
  return getFirstSuccessful<any>(
    ['teacher/student-registration-requests'],
    {
      params: {
        branch_id: branchId,
        ...params
      },
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
      suppressFallback404Log: false,
    } as any
  );
}

export async function approveStudentRegistration(
  schoolCode: string,
  branchId: string,
  requestId: string
): Promise<any> {
  const endpoint = `teacher/student-registration-requests/${requestId}/accept`;
  return postFirstSuccessful(
    [endpoint],
    {},
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

export async function rejectStudentRegistration(
  schoolCode: string,
  branchId: string,
  requestId: string
): Promise<any> {
  const endpoint = `teacher/student-registration-requests/${requestId}/reject`;
  return API.delete(endpoint, {
    headers: {
      'X-School-Code': schoolCode,
      'X-Branch-Id': branchId,
    },
  });
}

/* ============ ATTENDANCE ENDPOINTS ============ */

export async function markAttendance(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/mark-attendance'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

export async function uploadVideoAttendance(
  schoolCode: string,
  branchId: string,
  formData: FormData
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/video-attendance'],
    formData,
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
}

export async function getAttendanceHistory(
  schoolCode: string,
  branchId: string,
  classGrade: string,
  section: string,
  date?: string,
  params?: any
): Promise<any> {
  return getFirstSuccessful<any>(
    ['teacher/attendance-history'],
    {
      params: {
        class_grade: String(classGrade).toLowerCase(),
        section: String(section).toLowerCase(),
        date: date || new Date().toISOString().split('T')[0],
        branch_id: branchId,
        ...params
      },
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
      suppressFallback404Log: false,
    } as any
  );
}

export async function markSelfAttendance(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/self-attendance'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

/* ============ HOMEWORK & ACADEMICS ============ */

export async function createHomework(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/homework/create'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

export async function submitMarksEntry(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/marks/entry'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

export async function uploadQuestionPapers(
  schoolCode: string,
  branchId: string,
  formData: FormData
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/question-papers/upload'],
    formData,
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
}

/* ============ LEAVE MANAGEMENT ============ */

export async function applyLeave(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/leave/apply'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

export async function approveStudentLeave(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/student-leave/approve'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

/* ============ AI TOOLS & DIAGNOSTICS ============ */

export async function predictSkinCondition(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['teacher/skin-prediction'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

export async function processVitalScan(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['vitalscan/process'],
    {
      school_code: schoolCode,
      branch_id: branchId,
      ...payload,
    },
    {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
    }
  );
}

/* ============ NOTIFICATIONS ============ */

export async function getTeacherNotifications(
  schoolCode: string,
  branchId: string,
  params?: any
): Promise<any> {
  return getFirstSuccessful<any>(
    ['notifications/teacher/list'],
    {
      params: {
        branch_id: branchId,
        ...params
      },
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
      suppressFallback404Log: false,
    } as any
  );
}


