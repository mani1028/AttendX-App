// const mock = require('../../docs/api/teacher-dashboard-mock.json');
const mock: Record<string, any> = {};

function delay<T>(value: T, ms = 200) {
  return new Promise<T>((res) => setTimeout(() => res(value), ms));
}

export async function getTeacherContext(teacherId: string) {
  const entry = mock['/api/staff/marks/staff-context'];
  if (!entry) return null;
  return delay(entry.response);
}

export async function getTeacherCapability(schoolId: string, employeeId: string) {
  const entry = mock['/api/auth/teacher-capability'];
  if (!entry) return null;
  return delay(entry.response);
}

export async function getAssignedClassesMock() {
  const ctx = mock['/api/staff/marks/staff-context'];
  const assigned = ctx?.response?.assigned_classes || [];
  return delay(assigned);
}

export async function getExamsMock() {
  const entry = mock['/api/teacher/marks/exams'];
  return delay(entry?.response ?? { exams: [] });
}

export async function getStudentsMock(classId: string, sectionId: string, subjectId: string) {
  const key = '/api/teacher/marks/students/{class_id}/{section_id}/{subject_id}';
  const entry = mock[key];
  if (entry) return delay(entry.response);
  const fallback = mock['/api/teacher/marks/students/{class_id}/{section_id}/{subject_id}'];
  return delay(fallback?.response ?? { students: [] });
}

export default {
  getTeacherContext,
  getTeacherCapability,
  getAssignedClassesMock,
  getExamsMock,
  getStudentsMock,
};
