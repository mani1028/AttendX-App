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

export async function uploadQuestionPapers(
  schoolCode: string,
  branchId: string,
  formData: FormData
): Promise<any> {
  try {
    if (formData && typeof (formData as any).append === 'function') {
      try {
        (formData as any).append('school_code', schoolCode);
      } catch (e) { }
      try {
        (formData as any).append('branch_id', branchId);
      } catch (e) { }
    }
  } catch (e) { }

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
 * Generic GET request helper for teacher service
 * @param url Full or relative URL
 * @param config Axios request configuration
 */
export async function getRequest<T = any>(url: string, config: any = {}): Promise<T> {
  const response = await API.get<T>(url, config);
  return response.data;
}


