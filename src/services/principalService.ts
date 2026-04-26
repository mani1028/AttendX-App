import API from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getFirstSuccessful<T>(endpoints: string[], params: any = {}) {
  const schoolCode = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode');

  for (const endpoint of endpoints) {
    try {
      const response = await API.get<T>(endpoint, {
        params: {
          school_code: schoolCode,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      // Try next variant
    }
  }
  throw new Error('Principal service endpoint not found');
}

export async function getBranchTeachers(branchId: string): Promise<any[]> {
  const endpoints = [
    `/principal/branch/${branchId}/teachers`,
    `/manage/branch/${branchId}/teachers`,
    `/api/principal/branch/${branchId}/teachers`
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
    `/principal/branch/${branchId}/students`,
    `/manage/branch/${branchId}/students`,
    `/api/principal/branch/${branchId}/students`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data.students || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getClassesSections(branchId: string): Promise<any[]> {
  const endpoints = [
    `/manage/classes-sections`,
    `/principal/classes-sections`,
    `/api/manage/classes-sections`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { branch_id: branchId });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getBranchLeaves(branchId: string, limit?: number): Promise<any[]> {
  const endpoints = [
    `/principal/branch/${branchId}/leaves`,
    `/manage/branch/${branchId}/leaves`,
    `/api/principal/branch/${branchId}/leaves`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { limit });
    return data.leaves || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getBranchExams(branchId: string): Promise<any[]> {
  const endpoints = [
    `/principal/branch/${branchId}/exams`,
    `/manage/branch/${branchId}/exams`,
    `/api/principal/branch/${branchId}/exams`
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
    `/principal/branch/${branchId}/exam/${examId}/marks`,
    `/manage/branch/${branchId}/exam/${examId}/marks`,
    `/api/principal/branch/${branchId}/exam/${examId}/marks`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints, { class_grade: classGrade, section });
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err) {
    return [];
  }
}

export async function getStudentAttendanceReport(schoolCode: string, branchId: string, classGrade: string, section: string, date: string): Promise<any> {
  // POST usually doesn't need discovery as much but we'll try the known pattern
  const endpoints = [
    '/manage/attendance/student/fetch-report',
    '/principal/attendance/student/fetch-report'
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await API.post(endpoint, {
        school_code: schoolCode,
        branch_id: branchId,
        class_grade: classGrade,
        section: section,
        attendance_date: date,
      });
      return res.data || { present: [], absent: [] };
    } catch (err) {}
  }
  throw new Error('Attendance report endpoint not found');
}

export async function getTeacherAttendance(branchId: string, date: string): Promise<any> {
  const endpoints = [
    `/principal/branch/${branchId}/teachers/attendance`,
    `/manage/branch/${branchId}/teachers/attendance`
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
    `/principal/student/${studentId}/exams-data`,
    `/manage/student/${studentId}/exams-data`
  ];
  try {
    const data: any = await getFirstSuccessful(endpoints);
    return data;
  } catch (err) {
    return null;
  }
}
