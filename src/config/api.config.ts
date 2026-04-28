import { Platform } from 'react-native';

export const API_CONFIG = {
  // Development URLs
  dev: {
    android: 'http://10.0.2.2:5000',  // Android Emulator
    ios: 'http://localhost:5000',      // iOS Simulator
    device: 'http://YOUR_IP:5000',     // Physical device (replace YOUR_IP)
  },
  
  // Production URL
  production: 'https://attendex-api.vshiftx.com/',
  
  // Timeout in milliseconds
  timeout: 30000,
  
  // Endpoints
  endpoints: {
    auth: {
      login: 'auth/login',
      logout: 'auth/logout',
      forgotPassword: 'auth/forgot-password',
      resetPassword: 'auth/reset-password',
      teacherCapability: 'auth/teacher-capability',
    },
    admin: {
      schools: 'admin/schools',
      allSchools: 'admin/schools/all',
    },
    school: {
      register: 'school/register',
      getSchools: 'school/list',
      updateSchool: 'school/update',
    },
    hm: {
      dashboard: 'hm/dashboard/stats',
      nextEmployeeId: 'hm/next-employee-id',
      teachers: 'hm/teachers',
      teacherAttendance: 'hm/teachers/attendance',
      classes: 'hm/classes',
      students: 'hm/students',
      studentDirectory: 'hm/students/directory',
      exams: 'hm/exams/list',
      createExam: 'hm/exams/create',
      teacherAssignments: 'hm/teacher-assignments/details',
    },
    teacher: {
      register: 'teacher/register',
      sendOtp: 'teacher/register/send-otp',
      verifyOtp: 'teacher/register/verify-otp',
      context: 'teacher/marks/teacher-context',
      classes: 'teacher/marks/classes',
      exams: 'teacher/marks/exams',
      enterMarks: 'teacher/marks/enter',
      marksBulk: 'teacher/marks/bulk',
    },
    principal: {
      registerHm: 'principal/register-hm',
      branches: 'principal/branches',
      stats: 'principal/stats',
      branchStats: 'principal/branch/stats',
    },
    student: {
      attendance: 'student-dashboard/attendance',
      homework: 'student-dashboard/homework',
      marks: 'student-dashboard/marks',
      exams: 'student-dashboard/marks/exams',
      leave: 'student-dashboard/leave-requests',
      teachersForLeave: 'student-dashboard/teachers-for-leave',
      subjects: 'student-dashboard/subjects',
      profile: 'manage/students',
      profilePhoto: 'profile-photo/student',
      questionPapers: 'student/question-papers',
      questionPaperDownload: 'student/question-papers/{paper_id}/download',
      examTypes: 'student/question-papers/exam-types',
      schoolHolidays: 'student/school-holidays',
      registerRequest: 'student/register-request',
      register: 'student/register',
    },
    manage: {
      classesSections: 'manage/classes-sections',
      students: 'manage/students',
      data: 'manage/data',
      verifyTeacher: 'manage/verify-teacher',
      studentAttendance: 'manage/attendance/student/view',
      attendanceReport: 'manage/attendance/student/fetch-report',
      nextRollNumber: 'manage/next-roll-number',
      createHomework: 'manage/teacher/homework/create',
      homeworkList: 'manage/teacher/homework/list',
      upsertMarks: 'manage/teacher/marks/upsert',
    },
    visitor: {
      generateQr: 'visitor/qr/generate',
      activeQr: 'visitor/qr/active',
      submit: 'visitor/submit',
      list: 'visitor/list',
      stats: 'visitor/stats/summary',
    },
    vitalscan: {
      predictSkin: 'vitalscan/predict/skin',
      predictGemini: 'vitalscan/predict',
    },
    payment: {
      createOrder: 'payment/create-order',
      createOrderByPlan: 'payment/create-order-by-plan',
      verify: 'payment/verify',
    },
  },
};

export const ENV = {
  API_URL: API_CONFIG.production,
  
  SOCKET_URL: 'https://socket.attendx.com',
  
  APP_NAME: 'AttendX',
  APP_VERSION: '1.0.0',
};
