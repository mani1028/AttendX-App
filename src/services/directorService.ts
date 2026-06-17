import API from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getFirstSuccessful<T>(endpoints: string[], params: any = {}) {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || await AsyncStorage.getItem('school_id') || await AsyncStorage.getItem('schoolId');
  const branchId = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');

  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, {
        params: {
          school_code: schoolCode,
          school_id: schoolCode,
          branch_id: branchId,
          ...params,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error(`[API] Unauthorized access to ${endpoint}.`);
        throw error;
      }
      // Try next variant
    }
  }
  throw new Error('Director service endpoint not found');
}

export async function getBranchTeachers(branchId: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/teachers`,
    `director/branch/${branchId}/teachers`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.teachers || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getBranchStudents(branchId: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/students`,
    `director/branch/${branchId}/students`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.students || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getClassesSections(branchId: string): Promise<any[]> {
  const endpoints = [`manage/classes-sections`];
  try {
    const data: any = await getFirstSuccessful(endpoints, { branch_id: branchId });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getBranchLeaves(branchId: string, limit?: number): Promise<any[]> {
  try {
    const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || await AsyncStorage.getItem('school_id') || await AsyncStorage.getItem('schoolId');
    const params = { school_code: schoolCode, school_id: schoolCode, branch_id: branchId, limit };
    
    const [teacherRes, studentRes] = await Promise.allSettled([
      API.get(`director/branch/${branchId}/teachers/leaves`, { params }),
      API.get(`director/branch/${branchId}/leaves`, { params })
    ]);
    
    let teacherLeaves: any[] = [];
    if (teacherRes.status === 'fulfilled') {
      const data = teacherRes.value.data || {};
      const list = data.leaves || (Array.isArray(data) ? data : []);
      teacherLeaves = list.map((item: any) => ({ ...item, leave_type: 'teacher' }));
    }
    
    let studentLeaves: any[] = [];
    if (studentRes.status === 'fulfilled') {
      const data = studentRes.value.data || {};
      const list = data.leaves || (Array.isArray(data) ? data : []);
      studentLeaves = list.map((item: any) => ({ ...item, leave_type: 'student' }));
    }
    
    const merged = [...teacherLeaves, ...studentLeaves];
    merged.sort((a, b) => new Date(b.created_at || b.from_date).getTime() - new Date(a.created_at || a.from_date).getTime());
    
    return limit ? merged.slice(0, limit) : merged;
  } catch (err) {
    console.error('Error in getBranchLeaves:', err);
    return [];
  }
}

export async function getBranchExams(branchId: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/exams`,
    `director/branch/${branchId}/exams`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.exams || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getExamMarks(branchId: string, examId: string, classGrade?: string, section?: string): Promise<any[]> {
  const endpoints = [
    `director/branch/${branchId}/exam/${examId}/marks`,
    `director/branch/${branchId}/exam/${examId}/marks`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { class_grade: classGrade, section });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getStudentAttendanceReport(schoolCode: string, branchId: string, classGrade: string, section: string, date: string): Promise<any> {
  const endpoint = '/manage/attendance/student/fetch-report';
  const res = await API.post(endpoint, {
    school_code: schoolCode,
    branch_id: branchId,
    class_grade: classGrade,
    section: section,
    attendance_date: date,
  });
  return res.data || { present: [], absent: [] };
}

export async function getTeacherAttendance(branchId: string, date: string): Promise<any> {
  const endpoints = [
    `director/branch/${branchId}/teachers/attendance`,
    `director/branch/${branchId}/teachers/attendance`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { date });
    return data;
  } catch (err) {
    return { items: [], summary: { total: 0, present: 0, absent: 0, attendance_pct: 0 } };
  }
}

export async function getStudentExamsData(studentId: string): Promise<any> {
  const endpoints = [
    `director/student/${studentId}/exams-data`,
    `director/student/${studentId}/exams-data`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data;
  } catch (err) {
    return null;
  }
}
