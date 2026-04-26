import API from './api';

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


