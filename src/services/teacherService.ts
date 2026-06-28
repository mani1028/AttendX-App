import AsyncStorage from '@react-native-async-storage/async-storage';
import API, { buildApiUrl } from './api';
import { isSunday } from '../utils/holidayUtils';
import { safeJsonParse } from '../utils/storage';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';


const PROFILE_ENDPOINTS = [
  'staff/profile',
];

const PROFILE_PHOTO_ENDPOINT = 'profile-photo/teacher';
const STUDENT_PHOTO_ENDPOINT = 'profile-photo/student';

const UPDATE_PROFILE_ENDPOINTS = [
  'staff/profile/update',
  'manage/staff/update',
  'manage/update',
];

const FALLBACK_404_CONFIG = {
  suppressFallback404Log: true,
} as const;

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function firstDefined<T = any>(...values: Array<T | undefined | null>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) {return value as T;}
  }
  return undefined;
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {return value;}
  if (typeof value === 'number') {return String(value);}
  return fallback;
}

function normalizePhotoSource(value: unknown): string | null {
  const photo = toText(value, '').trim();
  if (!photo) {return null;}
  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  const compact = photo.replace(/\s+/g, '');
  const likelyBase64 = compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
  if (likelyBase64) {
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    return `data:image/jpeg;base64,${normalized}`;
  }

  return buildApiUrl(`/${photo}`);
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
  if (!raw) {return 'image/jpeg';}
  if (raw.includes('image/png')) {return 'image/png';}
  if (raw.includes('image/webp')) {return 'image/webp';}
  if (raw.includes('image/gif')) {return 'image/gif';}
  return 'image/jpeg';
}

async function getFirstSuccessful<T>(endpoints: string[], config: any = {}) {
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);
  const teacherId = await AsyncStorage.getItem('teacher_id') || await AsyncStorage.getItem('teacherId') || await storage.getString(StorageKeys.EMPLOYEE_ID);
  const suppressLogs = config.suppressFallback404Log;

  const errors: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const { params, ...restConfig } = config;
      const defaultHeaders = {
        'X-School-Code': schoolCode || undefined,
        'X-Branch-Id': branchId || undefined,
        'x_school_code': schoolCode || undefined,
        'x_branch_id': branchId || undefined,
      };
      const response = await API.get<T>(endpoint, {
        ...restConfig,
        params: {
          school_code: schoolCode,
          school_id: schoolCode,
          teacher_id: teacherId,
          employee_id: teacherId,
          ...params,
        },
        headers: {
          ...defaultHeaders,
          ...(restConfig && restConfig.headers ? restConfig.headers : {}),
        },
      });
      if (__DEV__ && !suppressLogs && endpoint !== endpoints[0]) {
        console.log(`[Service] GET ${endpoint} succeeded after ${endpoints[0]} failed`);
      }
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isLastEndpoint = endpoint === endpoints[endpoints.length - 1];

      if (status && status !== 404 && status !== 405) {
        if (status === 401 || status === 403) {throw error;}
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

  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE);
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);

  // Retry configuration for temporary service issues
  const maxRetries = config.maxRetries || 0;
  const retryDelayMs = config.retryDelayMs || 1000;
  const retryableStatuses = config.retryableStatuses || [503, 502, 504]; // Service Unavailable, Bad Gateway, Gateway Timeout

  for (const endpoint of endpoints) {
    let lastError: any = null;

    // Retry loop for transient errors
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers = {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
          'x_school_code': schoolCode || undefined,
          'x_branch_id': branchId || undefined,
          ...(config.headers || {}),
        };
        const response = await API.post<T>(endpoint, data, {
          ...config,
          headers,
          suppressFallback404Log: true,
        });
        return response.data;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message;
        const isLastAttempt = attempt === maxRetries;

        if (__DEV__) {
          const attemptStr = maxRetries > 0 ? ` (attempt ${attempt + 1}/${maxRetries + 1})` : '';
          console.log(`[Service] POST ${endpoint} failed (${status || 'network error'})${attemptStr}:`, detail);
        }

        // For temporary service issues (503, 502, 504), retry if we have attempts left
        if (retryableStatuses.includes(status) && !isLastAttempt) {
          const delayMs = retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          if (__DEV__) {
            console.log(`[Service] 📡 Retrying ${endpoint} in ${delayMs}ms due to ${status} error...`);
          }
          await new Promise<void>(resolve => setTimeout(resolve, delayMs));
          continue; // Retry this endpoint
        }

        if (status && status !== 404 && status !== 405) {
          throw error;
        }

        errors.push({ endpoint, status, message: detail });
        break; // Don't retry non-transient errors, move to next endpoint
      }
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
    'director/attendance/settings',
    'principal/attendance/settings',
    'teacher/attendance/settings',
  ];
  return getFirstSuccessful(endpoints, { headers });
}

export async function getClassesSections(branchId: string, schoolCode: string): Promise<any> {
  const endpoints = [
    'director/classes',
    'principal/classes',
    'teacher/classes',
    'manage/classes-sections',
  ];
  return getFirstSuccessful(endpoints, {
    params: { branch_id: branchId },
    headers: { 'X-School-Code': schoolCode },
  });
}

export async function verifyTeacher(payload: any): Promise<any> {
  const endpoints = [
    'director/staff/register',
    'manage/verify-staff',
    'manage/verify-teacher',
  ];
  // Backend expects JSON by default now
  // Suppress global 401 logout for face-verification requests so we can show an error
  // message instead of logging the user out when recognition fails.
  return postFirstSuccessful(endpoints, payload, { suppressLogoutOn401: true, suppressErrorLog: true });
}

export async function uploadStudentImage(payload: any): Promise<any> {
  const endpoints = [
    'manage/attendance/student/upload-image',
    'manage/attendance/student/attendance-images',
  ];
  return postFirstSuccessful(endpoints, payload);
}

export async function processAttendance(payload: any): Promise<any> {
  const endpoints = [
    'manage/attendance/student/view',
  ];
  // Suppress logout on 401 for preview/processing to avoid session loss during attendance workflow
  // Add retry logic for temporary service issues (503, 502, 504) with exponential backoff
  return postFirstSuccessful(endpoints, payload, {
    suppressLogoutOn401: true,
    maxRetries: 2, // Retry up to 2 times on service unavailable
    retryDelayMs: 1500, // Start with 1.5s delay, exponentially backoff
    retryableStatuses: [503, 502, 504], // Service Unavailable, Bad Gateway, Gateway Timeout
  });
}

export async function getAssignedClasses(schoolCode: string, branchId: string, employeeId: string): Promise<any[]> {
  const headers = {
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
    'X-Tenant-Id': schoolCode,
  };

  const extractList = (respData: any): any[] => {
    if (!respData) {return [];}
    if (Array.isArray(respData)) {return respData;}
    if (Array.isArray(respData.items)) {return respData.items;}
    if (Array.isArray(respData.data)) {return respData.data;}
    if (Array.isArray(respData.assigned_classes)) {return respData.assigned_classes;}
    if (Array.isArray(respData.assignedClasses)) {return respData.assignedClasses;}
    if (Array.isArray(respData.assignments)) {return respData.assignments;}
    if (Array.isArray(respData.results)) {return respData.results;}
    if (Array.isArray(respData.teachers)) {return respData.teachers;}
    if (Array.isArray(respData.students)) {return respData.students;}
    // nested shapes
    if (respData.teacher_context && Array.isArray(respData.teacher_context.assigned_classes)) {return respData.teacher_context.assigned_classes;}
    if (respData.teacher_context && Array.isArray(respData.teacher_context.items)) {return respData.teacher_context.items;}
    if (respData.context && Array.isArray(respData.context.assigned_classes)) {return respData.context.assigned_classes;}
    if (respData.data?.teacher_context && Array.isArray(respData.data.teacher_context.assigned_classes)) {return respData.data.teacher_context.assigned_classes;}
    if (respData.data?.teacher_context && Array.isArray(respData.data.teacher_context.items)) {return respData.data.teacher_context.items;}
    if (respData.data?.assignments && Array.isArray(respData.data.assignments)) {return respData.data.assignments;}
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

  try {
    const response = await API.get<any>('staff/marks/staff-context', {
      params: {
        school_code: schoolCode,
        branch_id: branchId,
        teacher_id: employeeId,
        employee_id: employeeId,
      },
      headers,
      suppressFallback404Log: true,
    } as any);

    const list = extractList(response.data || response).map(normalizeAssignment);
    if (__DEV__) {console.log('[getAssignedClasses] extracted list length:', Array.isArray(list) ? list.length : 'n/a');}
    return Array.isArray(list) ? list : [];
  } catch (error) {
    if (__DEV__) {console.warn('[getAssignedClasses] Failed to fetch staff context:', error);}
    return [];
  }
}

export async function getStudentsByClass(schoolCode: string, branchId: string, classGrade: string, section: string, employeeId?: string): Promise<any[]> {
  try {
    if (__DEV__) {
      console.log('[getStudentsByClass] Attempting to fetch students:', { schoolCode, branchId, classGrade, section });
    }

    // Normalize parameters to lowercase as required by backend
    const normalizedGrade = classGrade?.toLowerCase?.() || classGrade;
    const normalizedSection = section?.toLowerCase?.() || section;

    // Try multiple endpoints for robustness
    const endpoints = [
      'director/students',
      'manage/attendance/student/manual-students',
      'principal/students',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await API.get<any>(endpoint, {
          params: {
            class_grade: normalizedGrade,
            section: normalizedSection,
            school_code: schoolCode,
            branch_id: branchId,
            ...(employeeId ? { employee_id: employeeId } : {}),
          },
          headers: {
            'X-School-Code': schoolCode,
            'X-Branch-Id': branchId,
          },
        });

        const data = response.data;
        let studentsList: any[] = [];

        if (Array.isArray(data)) {
          studentsList = data;
        } else if (Array.isArray(data?.items)) {
          studentsList = data.items;
        } else if (Array.isArray(data?.students)) {
          studentsList = data.students;
        } else if (Array.isArray(data?.data)) {
          studentsList = data.data;
        }

        if (studentsList.length > 0) {
          if (__DEV__) {console.log(`[getStudentsByClass] ${endpoint} succeeded with ${studentsList.length} students`);}
          return studentsList;
        }
      } catch (err) {
        if (__DEV__) {console.log(`[getStudentsByClass] ${endpoint} failed, trying next...`);}
      }
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
    (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
    '';

  if (!resolvedTeacherId) {return null;}

  const resolvedSchoolCode =
    schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';

  const url = buildApiUrl(`/${PROFILE_PHOTO_ENDPOINT}/${encodeURIComponent(resolvedTeacherId)}`);
  if (!resolvedSchoolCode) {return url;}

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}school_code=${encodeURIComponent(resolvedSchoolCode)}`;
}

export async function getStudentProfilePhotoUrl(studentId: string, schoolCode?: string): Promise<string | null> {
  if (!studentId) {return null;}

  const resolvedSchoolCode =
    schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';

  const url = buildApiUrl(`/${STUDENT_PHOTO_ENDPOINT}/${encodeURIComponent(studentId)}`);
  if (!resolvedSchoolCode) {return url;}

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}school_code=${encodeURIComponent(resolvedSchoolCode)}`;
}

export async function getTeacherProfilePhotoDataUri(teacherId?: string, schoolCode?: string): Promise<string | null> {
  const resolvedTeacherId =
    teacherId ||
    (await AsyncStorage.getItem('teacher_id')) ||
    (await AsyncStorage.getItem('teacherId')) ||
    (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
    '';

  if (!resolvedTeacherId) {return null;}

  const resolvedSchoolCode =
    schoolCode ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    '';

  try {
    const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID);
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
    const storedUser = safeJsonParse<Record<string, any>>(storedUserRaw, {}, () => {
      AsyncStorage.setItem('user', JSON.stringify({})).catch(() => { });
    });

    // Retrieve all stored values (keep nulls intact, don't convert to '')
    const [
      storedEmail, storedPhone, storedBranchName, storedBranchId,
      storedSchoolName, storedSchoolCode, storedTeacherId, storedEmployeeId,
      storedDesignation, storedDepartment, storedAddress, storedBloodGroup,
    ] = await AsyncStorage.multiGet([
      'email', 'phone', 'branch_name', 'branch_id',
      'school_name', 'school_code', 'teacher_id', 'employee_id',
      'designation', 'department_subject', 'address', 'blood_group',
    ]).then(items => items.map(([, value]) => value));

    // CRITICAL: Validate required params exist before sending profile request
    // This prevents 422 Unprocessable Entity if AsyncStorage values are missing
    const resolvedTeacherId = toText(storedTeacherId || (await AsyncStorage.getItem('teacherId')) || (await storage.getString(StorageKeys.EMPLOYEE_ID)) || (await AsyncStorage.getItem('principal_employee_id')) || storedUser?.principal_employee_id, '').trim();
    const resolvedSchoolCode = toText(storedSchoolCode || (await storage.getString(StorageKeys.SCHOOL_CODE)) || (await storage.getString(StorageKeys.SCHOOL_CODE)), '').trim();

    const responseData = await getFirstSuccessful<any>(PROFILE_ENDPOINTS, {
      ...FALLBACK_404_CONFIG,
      params: {
        teacher_id: resolvedTeacherId || undefined,
        school_code: resolvedSchoolCode || undefined,
      },
    } as any);
    const root = asRecord(responseData);

    const teacherId = String(
      (await AsyncStorage.getItem('teacher_id')) ||
      (await AsyncStorage.getItem('teacherId')) ||
      (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
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

    const raw = asRecord(firstDefined(listMatch, root.teacher_data, root.data, root.profile, root.teacher, root.user, responseData, storedUser));

    let photoSource = normalizePhotoSource(firstDefined(
      raw.teacher_photograph,
      raw.profile_photo_url,
      raw.photo_url,
      raw.photo_path,
      raw.photo,
      raw.avatar,
      root.teacher_photograph,
      root.profile_photo_url,
      root.photo_path,
      storedUser?.teacher_photograph,
      storedUser?.profile_photo_url,
      storedUser?.photo_url,
      storedUser?.photo_path,
    ));

    const isBase64 = photoSource?.startsWith('data:');
    const isS3OrExternal = photoSource && (
      photoSource.includes('amazonaws.com') ||
      photoSource.includes('s3.') ||
      photoSource.includes('blob.core.windows.net') ||
      photoSource.includes('googleapis.com') ||
      photoSource.includes('cloudinary.com')
    );
    const isApiUrl = photoSource && !isBase64 && !isS3OrExternal;

    if (!photoSource || isApiUrl) {
      const resolvedTeacherId = toText(firstDefined(raw.teacher_id, raw.teacherId, raw.employee_id, raw.employeeId, root.teacher_id, root.employee_id, storedUser?.teacher_id, storedUser?.employee_id)).trim();
      const resolvedSchoolCode = toText(firstDefined(raw.school_code, root.school_code, storedUser?.school_code)).trim();
      const dataUri = await getTeacherProfilePhotoDataUri(resolvedTeacherId, resolvedSchoolCode);
      if (dataUri) {
        photoSource = dataUri;
      } else if (!photoSource) {
        photoSource = await getTeacherProfilePhotoUrl(resolvedTeacherId, resolvedSchoolCode);
      }
    }

    const combinedAddress = [
      raw.house_no,
      raw.street_locality,
      raw.village_town_city,
      raw.district,
      raw.state,
      raw.pin_code,
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
      email: toText(firstDefined(raw.email, raw.email_address, storedEmail, storedUser?.email, storedUser?.principal_email)),
      email_id: toText(firstDefined(raw.email_id, raw.emailId, emailId, storedUser?.principal_email)),
      phone: mobileNumber,
      mobile_number: mobileNumber,
      teacher_id: toText(firstDefined(raw.teacher_id, raw.teacherId, storedTeacherId, storedUser?.teacher_id, storedUser?.teacherId)),
      employee_id: toText(firstDefined(raw.employee_id, raw.employeeId, storedEmployeeId, storedUser?.employee_id, storedUser?.employeeId, storedUser?.principal_employee_id)),
      school_code: toText(firstDefined(raw.school_code, root.school_code, storedSchoolCode, storedUser?.school_code)),
      school_name: toText(firstDefined(
        raw.school_name,
        raw.schoolName,
        root.school_name,
        root.schoolName,
        typeof raw.school === 'object' && raw.school !== null ? (raw.school.school_name || raw.school.name) : raw.school,
        typeof root.school === 'object' && root.school !== null ? (root.school.school_name || root.school.name) : root.school,
        storedSchoolName,
        storedUser?.school_name
      )),
      branch_id: toText(firstDefined(raw.branch_id, raw.branchId, root.branch_id, root.branchId, storedBranchId, storedUser?.branch_id)),
      branch_name: toText(firstDefined(
        raw.branch_name,
        raw.branchName,
        root.branch_name,
        root.branchName,
        typeof raw.branch === 'object' && raw.branch !== null ? (raw.branch.branch_name || raw.branch.name) : raw.branch,
        typeof root.branch === 'object' && root.branch !== null ? (root.branch.branch_name || root.branch.name) : root.branch,
        storedBranchName,
        storedUser?.branch_name
      )),
      designation: toText(firstDefined(raw.designation, raw.teacher_designation, root.designation, storedDesignation, storedUser?.designation)),
      department_subject: toText(firstDefined(raw.department_subject, raw.department, raw.subject, root.department_subject, storedDepartment, storedUser?.department_subject)),
      date_of_joining: toText(firstDefined(raw.date_of_joining, storedUser?.date_of_joining)),
      qualification: toText(firstDefined(raw.qualification, storedUser?.qualification)),
      experience_years: toText(firstDefined(raw.experience_years, raw.experience, storedUser?.experience_years)),
      blood_group: toText(firstDefined(raw.blood_group, raw.bloodGroup, raw.blood_type, storedBloodGroup, storedUser?.blood_group)),
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
      return safeJsonParse<Record<string, any>>(storedUserRaw, {});
    } catch {
      return {};
    }
  }
}

export async function getTeacherCapability(schoolId: string, employeeId: string): Promise<any> {
  const response = await API.get('auth/teacher-capability', {
    params: {
      school_id: schoolId,
      employee_id: employeeId,
    },
    headers: {
      'X-School-Code': schoolId,
    },
    suppressFallback404Log: true,
  } as any);

  return response.data;
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

  const endpoints = ['manage/attendance/student/fetch-report'];
  return postFirstSuccessful(endpoints, {
    school_code: schoolCode,
    branch_id: branchId,
    attendance_date: attendanceDate,
    class_grade: String(classGrade).toLowerCase(),
    section: String(section).toLowerCase(),
  });
}

export async function getBranchStats(schoolCode: string, branchId: string): Promise<any> {
  const endpoints = ['director/dashboard/stats'];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
        'X-Tenant-Id': schoolCode,
      },
      suppressFallback404Log: true,
    } as any);
    return data;
  } catch (err: any) {
    const status = (err && err.response && err.response.status) || (err && err.status) || null;
    if (status === 401 || status === 403) {
      return { permissionDenied: true };
    }
    return null;
  }
}

export async function getTeacherAttendance(schoolCode: string, branchId: string, onDate?: string): Promise<any[]> {
  const endpoints = ['director/teachers/attendance'];
  try {
    const data = await getFirstSuccessful<any>(endpoints, {
      params: {
        on_date: onDate || new Date().toISOString().split('T')[0],
        branch_id: branchId,
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
  // Preferred API: PUT /director/teachers/{teacher_id}
  const teacherId = data?.teacher_id || data?.teacherId || data?.employee_id || data?.employeeId || await AsyncStorage.getItem('teacher_id') || await AsyncStorage.getItem('teacherId') || await storage.getString(StorageKeys.EMPLOYEE_ID);
  if (teacherId) {
    try {
      const response = await API.put(`director/teachers/${encodeURIComponent(teacherId)}`, data);
      return response.data;
    } catch (err) {
      // continue to fallbacks
    }
  }

  return postFirstSuccessful(UPDATE_PROFILE_ENDPOINTS, data);
}

/* ============ STUDENT REGISTRATION REQUESTS (Class Teacher Only) ============ */

const TEACHER_STUDENT_REGISTER_ENDPOINTS = [
  'manage/student/register-request',
  'student/register-request',
];

/** Submit a new student from the teacher registration form (multipart with photo). */
export async function submitStudentRegistration(
  schoolCode: string,
  branchId: string,
  formData: FormData,
): Promise<any> {
  const headers = {
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  };

  const tryNextStatuses = new Set([404, 405, 502, 503, 504]);
  const retryableStatuses = new Set([502, 503, 504]);
  const attempts: Array<{ endpoint: string; status?: number; message?: string }> = [];
  let lastError: any = null;

  for (let index = 0; index < TEACHER_STUDENT_REGISTER_ENDPOINTS.length; index++) {
    const endpoint = TEACHER_STUDENT_REGISTER_ENDPOINTS[index];
    const isLastEndpoint = index === TEACHER_STUDENT_REGISTER_ENDPOINTS.length - 1;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await API.post(endpoint, formData, {
          headers,
          suppressFallback404Log: true,
          suppressErrorLog: !isLastEndpoint,
        } as any);
        return response.data;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message;

        if (retryableStatuses.has(status) && attempt < 2) {
          await new Promise<void>(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        if (status && !tryNextStatuses.has(status)) {
          throw error;
        }

        attempts.push({ endpoint, status, message: typeof detail === 'string' ? detail : JSON.stringify(detail) });
        break;
      }
    }
  }

  const summary = attempts.map(item => `${item.endpoint} (${item.status || 'network'})`).join(', ');
  if (lastError) {
    throw lastError;
  }
  throw new Error(`Could not register student. Tried: ${summary}`);
}

export async function getStudentRegistrationRequests(
  schoolCode: string,
  branchId: string,
  params?: any
): Promise<any> {
  return getFirstSuccessful<any>(
    ['staff/student-registration-requests'],
    {
      params: {
        branch_id: branchId,
        ...params,
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
  const endpoint = `staff/student-registration-requests/${requestId}/accept`;
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
  const endpoint = `staff/student-registration-requests/${requestId}/reject`;
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
    [
      'manage/attendance/student/manual-save',
      'staff/mark-attendance',
    ],
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
    ['staff/video-attendance'],
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
    ['staff/attendance-history'],
    {
      params: {
        class_grade: String(classGrade).toLowerCase(),
        section: String(section).toLowerCase(),
        date: date || new Date().toISOString().split('T')[0],
        branch_id: branchId,
        ...params,
      },
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
      suppressFallback404Log: false,
    } as any
  );
}

function monthDateRange(month?: string, year?: string): { from_date: string; to_date: string } {
  const now = new Date();
  const monthIndex = month ? Math.max(Number(month) - 1, 0) : now.getMonth();
  const yearValue = year && Number.isFinite(Number(year)) ? Number(year) : now.getFullYear();
  const firstDay = new Date(yearValue, monthIndex, 1);
  const lastDay = new Date(yearValue, monthIndex + 1, 0);
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    from_date: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
    to_date: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
  };
}

function normalizeTeacherAttendanceItems(data: any): any[] {
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.attendance)
      ? data.attendance
      : Array.isArray(data?.days)
        ? data.days
        : Array.isArray(data)
          ? data
          : [];

  return items.map((item: any) => {
    let status = toText(firstDefined(item.status, item.attendance_status), '').toUpperCase();
    if (!status && item.has_leave) {
      status = 'LEAVE';
    }
    if (status === 'ON_LEAVE') {
      status = 'LEAVE';
    }

    return {
      ...item,
      date: toText(firstDefined(item.date, item.attendance_date), ''),
      status,
      session1_status: item.session1_status,
      session2_status: item.session2_status,
      dailySessions:
        Number(firstDefined(item.sessions_per_day, item.daily_sessions)) ||
        (item.session2_status ? 2 : 1),
    };
  });
}

export async function getTeacherMyAttendance(params: {
  school_code: string;
  employee_id: string;
  month?: string;
  year?: string;
}): Promise<any[]> {
  const branchId =
    (await storage.getString(StorageKeys.BRANCH_ID)) ||
    (await AsyncStorage.getItem('branch_id')) ||
    (await AsyncStorage.getItem('branchId')) ||
    '01';
  const { from_date, to_date } = monthDateRange(params.month, params.year);
  const headers = {
    'X-School-Code': params.school_code,
    'X-Branch-Id': branchId,
  };

  const attempts: Array<{ endpoint: string; params: Record<string, string | undefined> }> = [
    {
      endpoint: 'manage/staff/attendance/unified',
      params: {
        school_code: params.school_code,
        employee_id: params.employee_id,
        branch_id: branchId,
        from_date,
        to_date,
      },
    },
    {
      endpoint: 'manage/teacher/attendance/my-attendance',
      params: {
        school_code: params.school_code,
        employee_id: params.employee_id,
        month: params.month,
        year: params.year,
      },
    },
    {
      endpoint: 'staff/my-attendance',
      params: {
        school_code: params.school_code,
        employee_id: params.employee_id,
        month: params.month,
        year: params.year,
      },
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const data = await getRequest<any>(attempt.endpoint, {
        params: attempt.params,
        headers,
        suppressFallback404Log: true,
      } as any);
      return normalizeTeacherAttendanceItems(data);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function markSelfAttendance(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['staff/self-attendance'],
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
    ['staff/homework/create'],
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
    ['staff/marks/entry'],
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

export interface TeacherPaperSubject {
  subject_id: string | number;
  subject_name: string;
}

export interface TeacherPaperSection {
  section_id: string | number;
  section_name: string;
  subjects: TeacherPaperSubject[];
}

export interface TeacherPaperClassAssignment {
  class_id: string | number;
  class_name: string;
  sections: TeacherPaperSection[];
}

export async function getTeacherPaperAssignments(): Promise<TeacherPaperClassAssignment[]> {
  try {
    const data = await getFirstSuccessful(
      ['staff/assignments/classes-sections-subjects'],
      { suppressFallback404Log: true },
    );
    const root = asRecord(data);
    const wrapped = asRecord(firstDefined(root.data, root.result));
    const classes = firstNonEmptyArray(
      root.classes,
      wrapped.classes,
      Array.isArray(data) ? (data as any[]) : undefined,
    );

    return classes.map((item: any) => {
      const cls = asRecord(item);
      const sections = Array.isArray(cls.sections) ? cls.sections : [];
      return {
        class_id: firstDefined(cls.class_id, cls.id, cls.classId) ?? '',
        class_name: toText(firstDefined(cls.class_name, cls.name, cls.className), ''),
        sections: sections.map((sec: any) => {
          const section = asRecord(sec);
          const subjects = Array.isArray(section.subjects) ? section.subjects : [];
          return {
            section_id: firstDefined(section.section_id, section.id, section.sectionId) ?? '',
            section_name: toText(firstDefined(section.section_name, section.name, section.sectionName), ''),
            subjects: subjects.map((sub: any) => {
              const subject = asRecord(sub);
              return {
                subject_id: firstDefined(subject.subject_id, subject.id, subject.subjectId) ?? '',
                subject_name: toText(firstDefined(subject.subject_name, subject.name, subject.subjectName), ''),
              };
            }),
          };
        }),
      };
    });
  } catch (error) {
    console.error('[Service] getTeacherPaperAssignments failed:', error);
    return [];
  }
}

export async function getTeacherQuestionPaperExamTypes(): Promise<string[]> {
  try {
    const data = await getFirstSuccessful(
      ['staff/question-papers/exam-types'],
      { suppressFallback404Log: true },
    );
    const root = asRecord(data);
    const wrapped = asRecord(firstDefined(root.data, root.result));
    const examTypes = firstNonEmptyArray<string>(
      root.exam_types,
      root.examTypes,
      wrapped.exam_types,
      wrapped.examTypes,
      Array.isArray(data) ? (data as string[]) : undefined,
    );
    return examTypes.map(type => toText(type, '')).filter(Boolean);
  } catch (error) {
    console.error('[Service] getTeacherQuestionPaperExamTypes failed:', error);
    return [];
  }
}

function appendSchoolBranchToFormData(
  formData: FormData,
  schoolCode: string,
  branchId: string,
): void {
  try {
    if (formData && typeof (formData as any).append === 'function') {
      try {
        (formData as any).append('school_code', schoolCode);
        (formData as any).append('school_id', schoolCode);
      } catch (e) { /* noop */ }
      try {
        (formData as any).append('branch_id', branchId);
      } catch (e) { /* noop */ }
    }
  } catch (e) { /* noop */ }
}

export async function uploadQuestionPapers(
  schoolCode: string,
  branchId: string,
  formData: FormData
): Promise<any> {
  appendSchoolBranchToFormData(formData, schoolCode, branchId);

  return postFirstSuccessful(
    ['staff/question-papers/upload'],
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

export async function updateTeacherQuestionPaper(
  paperId: string,
  schoolCode: string,
  branchId: string,
  formData: FormData,
): Promise<any> {
  appendSchoolBranchToFormData(formData, schoolCode, branchId);
  const encodedPaperId = encodeURIComponent(paperId);
  const response = await API.put(`staff/question-papers/${encodedPaperId}`, formData, {
    headers: {
      'X-School-Code': schoolCode,
      'X-Branch-Id': branchId,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function deleteTeacherQuestionPaper(paperId: string): Promise<void> {
  const encodedPaperId = encodeURIComponent(paperId);
  await API.delete(`staff/question-papers/${encodedPaperId}`);
}

function mapTeacherQuestionPaperRecord(paper: any) {
  const p = asRecord(paper);
  return {
    paper_id: toText(firstDefined(p.paper_id, p.id, p.paperId), ''),
    title: toText(firstDefined(p.title, p.name), 'Untitled Paper'),
    description: toText(firstDefined(p.description, p.instructions), ''),
    exam_type: toText(firstDefined(p.exam_type, p.type, p.examType), ''),
    subject_id: firstDefined(p.subject_id, p.subjectId),
    subject_name: toText(firstDefined(p.subject_name, p.subject, p.subjectName), ''),
    class_id: firstDefined(p.class_id, p.classId),
    class_name: toText(firstDefined(p.class_name, p.className, p.class), ''),
    section_id: firstDefined(p.section_id, p.sectionId),
    section_name: toText(firstDefined(p.section_name, p.sectionName, p.section), ''),
    created_at: toText(firstDefined(p.created_at, p.uploaded_at, p.date), ''),
    file_size: Number(firstDefined(p.file_size, p.size, p.fileSize)) || 0,
    status: toText(firstDefined(p.status, p.publish_status), 'published').toLowerCase(),
    is_published: Boolean(firstDefined(p.is_published, p.isPublished, p.published) ?? true),
  };
}

const TEACHER_QUESTION_PAPER_LIST_ENDPOINTS = [
  'staff/question-papers',
  'staff/question-papers/list',
  'manage/staff/question-papers',
];

/** List question papers uploaded for teacher's classes (no mock data). */
export async function getTeacherQuestionPapers(params?: Record<string, any>): Promise<any[]> {
  try {
    const data = await getFirstSuccessful<any>(TEACHER_QUESTION_PAPER_LIST_ENDPOINTS, {
      params,
      suppressFallback404Log: true,
    });
    const root = asRecord(data);
    const wrapped = asRecord(firstDefined(root.data, root.result));

    const flat = firstNonEmptyArray(
      root.items,
      root.papers,
      root.question_papers,
      wrapped.items,
      wrapped.papers,
      wrapped.question_papers,
      Array.isArray(data) ? data : undefined,
    );

    if (flat.length) {
      return flat.map(mapTeacherQuestionPaperRecord);
    }

    const subjects = firstNonEmptyArray(
      root.subjects,
      root.papers_by_subject,
      wrapped.subjects,
      wrapped.papers_by_subject,
    );

    if (subjects.length) {
      const papers: any[] = [];
      subjects.forEach((sub: any) => {
        const s = asRecord(sub);
        const subjectName = toText(firstDefined(s.subject_name, s.name), '');
        const rawPapers = Array.isArray(s.papers) ? s.papers : [];
        rawPapers.forEach((p: any) => {
          const mapped = mapTeacherQuestionPaperRecord(p);
          papers.push({
            ...mapped,
            subject_name: subjectName || mapped.subject_name,
          });
        });
      });
      return papers;
    }

    return [];
  } catch (error) {
    console.error('[Service] getTeacherQuestionPapers failed:', error);
    throw error;
  }
}

/** Download a question paper file uploaded by staff. */
export async function downloadTeacherQuestionPaper(paperId: string): Promise<ArrayBuffer> {
  const encodedPaperId = encodeURIComponent(paperId);
  const endpoints = [
    `staff/question-papers/${encodedPaperId}/download`,
    `manage/staff/question-papers/${encodedPaperId}/download`,
    `staff/question-papers/download/${encodedPaperId}`,
    'staff/question-papers/download',
  ];
  const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
  const branchId = await storage.getString(StorageKeys.BRANCH_ID) || '';
  const employeeId =
    (await AsyncStorage.getItem('teacher_id')) ||
    (await AsyncStorage.getItem('teacherId')) ||
    (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
    '';

  for (const endpoint of endpoints) {
    try {
      const response = await API.get<ArrayBuffer>(endpoint, {
        responseType: 'arraybuffer',
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          employee_id: employeeId,
          paper_id: paperId,
          id: paperId,
        },
        headers: {
          'X-School-Code': schoolCode || undefined,
          'X-Branch-Id': branchId || undefined,
        },
        ...FALLBACK_404_CONFIG,
      } as any);

      if (response?.data && response.status === 200) {
        const contentType = (response.headers as any)?.['content-type'] || '';
        if (contentType.includes('application/json')) {
          throw new Error('JSON_RESPONSE_TRIGGER_FALLBACK');
        }
        return response.data;
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw error;
      }
    }
  }

  throw new Error('Could not download this question paper. The file may no longer be available.');
}

function firstNonEmptyArray<T>(...candidates: Array<T[] | undefined | null>): T[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

/* ============ LEAVE MANAGEMENT ============ */

export async function applyLeave(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  return postFirstSuccessful(
    ['staff/leave/apply'],
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
    ['staff/student-leave/approve'],
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
  const response = await API.post('vitalscan/predict/skin', {
    school_code: schoolCode,
    branch_id: branchId,
    ...payload,
  }, {
    headers: {
      'X-School-Code': schoolCode,
      'X-Branch-Id': branchId,
    },
  });

  return response.data;
}

export async function processVitalScan(
  schoolCode: string,
  branchId: string,
  payload: any
): Promise<any> {
  const scanType = String(payload?.scan_type ?? payload?.scanType ?? payload?.type ?? '').trim().toLowerCase();
  if (!scanType) {
    throw new Error('processVitalScan requires a scan_type value');
  }

  const response = await API.post(`vitalscan/predict/${encodeURIComponent(scanType)}`, {
    school_code: schoolCode,
    branch_id: branchId,
    ...payload,
  }, {
    headers: {
      'X-School-Code': schoolCode,
      'X-Branch-Id': branchId,
    },
  });

  return response.data;
}

/* ============ NOTIFICATIONS ============ */

export async function getTeacherNotifications(
  schoolCode: string,
  branchId: string,
  params?: any
): Promise<any> {
  return getFirstSuccessful<any>(
    ['notifications/staff/list'],
    {
      params: {
        branch_id: branchId,
        ...params,
      },
      headers: {
        'X-School-Code': schoolCode,
        'X-Branch-Id': branchId,
      },
      suppressFallback404Log: false,
    } as any
  );
}

/**
 * Manage student profiles (class teacher / principal)
 */
export async function getManageStudents(params: {
  school_code: string;
  branch_id: string;
  class_grade?: string;
  section?: string;
}): Promise<any[]> {
  const response = await API.get('manage/students', { params });
  const data = response.data || {};
  return Array.isArray(data.students) ? data.students : (Array.isArray(data) ? data : []);
}

export async function updateManageStudent(payload: {
  school_code: string;
  branch_id: string;
  data_type: 'students';
  data: Record<string, unknown>;
}): Promise<any> {
  const response = await API.put('manage/update', payload);
  return response.data;
}

export async function deleteManageStudent(payload: {
  school_code: string;
  branch_id: string;
  data_type: 'students';
  id: string;
}): Promise<any> {
  const response = await API.delete('manage/delete', { data: payload });
  return response.data;
}

export async function getStaffRegistrationRequests(summary = true): Promise<any[]> {
  const response = await API.get('staff/staff-registration-requests', {
    params: summary ? { summary: true } : undefined,
  });
  const data = response.data || {};
  return Array.isArray(data.requests) ? data.requests : [];
}

export async function getStaffRegistrationRequestDetail(id: string): Promise<any> {
  const response = await API.get(`staff/staff-registration-requests/${encodeURIComponent(id)}`);
  return response.data;
}

export async function acceptStaffRegistrationRequest(id: string, staffData: Record<string, unknown>): Promise<any> {
  const response = await API.post(
    `staff/staff-registration-requests/${encodeURIComponent(id)}/accept`,
    staffData,
  );
  return response.data;
}

export async function rejectStaffRegistrationRequest(id: string): Promise<any> {
  const response = await API.delete(`staff/staff-registration-requests/${encodeURIComponent(id)}/reject`);
  return response.data;
}

/**
 * Generic GET request helper for teacher service
 * @param url Full or relative URL
 * @param config Axios request configuration
 */
export async function getRequest<T = any>(url: string, config: any = {}): Promise<T> {
  const response = await API.get<T>(url, config);
  return response.data;
}


