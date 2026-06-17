import { Platform } from 'react-native';

export const API_CONFIG = {
  // Development URLs
  dev: {
    android: 'http://192.168.1.155:8002/api',  // Android Emulator (Localhost)
    ios: 'http://192.168.1.155:8002/api',      // iOS Simulator
    device: 'http://192.168.1.155:8002/api',   // Physical device
  },


  // Production URL
  production: 'http://192.168.1.155:8002/api',

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
    principal: {
      dashboard: 'principal/dashboard/stats',
      nextEmployeeId: 'principal/next-employee-id',
      teachers: 'principal/teachers',
      teacherAttendance: 'principal/staff/attendance',
      classes: 'principal/classes',
      students: 'principal/students',
      studentDirectory: 'principal/students/directory',
      exams: 'principal/exams/list',
      createExam: 'principal/exams/create',
      teacherAssignments: 'principal/teacher-assignments/details',
    },
    staff: {
      // Registration & Auth
      register: 'staff/register',
      sendOtp: 'staff/register/send-otp',
      verifyOtp: 'staff/register/verify-otp',

      // Context & Classes
      context: 'staff/marks/staff-context',
      classes: 'staff/marks/classes',
      exams: 'staff/marks/exams',

      // Student Registration Requests (Class Teacher only)
      studentRegistrationRequests: 'staff/student-registration-requests',
      approveStudentRegistration: 'staff/student-registration-requests/{id}/accept',
      rejectStudentRegistration: 'staff/student-registration-requests/{id}/reject',

      // Attendance
      markAttendance: 'staff/mark-attendance',
      videoAttendance: 'staff/video-attendance',
      attendanceHistory: 'staff/attendance-history',
      selfAttendance: 'staff/self-attendance',

      // Academics
      createHomework: 'staff/homework/create',
      marksEntry: 'staff/marks/entry',
      enterMarks: 'staff/marks/enter',
      marksBulk: 'staff/marks/bulk',
      uploadQuestionPapers: 'staff/question-papers/upload',

      // Leave Management
      applyLeave: 'staff/leave/apply',
      approveStudentLeave: 'staff/student-leave/approve',

      // AI Tools
      skinPrediction: 'staff/skin-prediction',
    },
    director: {
      registerPrincipal: 'director/register-principal',
      branches: 'director/branches',
      stats: 'director/stats',
      branchStats: 'director/branch/stats',
    },
    student: {
      attendance: 'student-dashboard/attendance',
      homework: 'student-dashboard/homework',
      marks: 'student-dashboard/marks',
      exams: 'student-dashboard/marks/exams',
      leave: 'student-dashboard/leave-requests',
      teachersForLeave: 'student-dashboard/staff-for-leave',
      subjects: 'student-dashboard/subjects',
      profile: 'student-dashboard/profile',
      profilePhoto: 'profile-photo/student',
      questionPapers: 'student-dashboard/question-papers',
      questionPaperDownload: 'student-dashboard/question-papers/{paper_id}/download',
      examTypes: 'student-dashboard/question-papers/exam-types',
      schoolHolidays: 'student/school-holidays',
      registerRequest: 'student/register-request',
      register: 'student/register',
    },
    manage: {
      classesSections: 'manage/classes-sections',
      students: 'manage/students',
      data: 'manage/data',
      verifyTeacher: 'manage/verify-staff',
      studentAttendance: 'manage/attendance/student/view',
      attendanceReport: 'manage/attendance/student/fetch-report',
      nextRollNumber: 'manage/next-roll-number',
      createHomework: 'manage/staff/homework/create',
      homeworkList: 'manage/staff/homework/list',
      upsertMarks: 'manage/staff/marks/upsert',
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
      process: 'vitalscan/process',
    },
    payment: {
      createOrder: 'payment/create-order',
      createOrderByPlan: 'payment/create-order-by-plan',
      verify: 'payment/verify',
    },
    notifications: {
      listTeacher: 'notifications/staff/list',
      listStudent: 'notifications/student/list',
    },
  },
};

export const ENV = {
  API_URL: __DEV__
    ? (Platform.OS === 'android' ? API_CONFIG.dev.android : API_CONFIG.dev.ios)
    : API_CONFIG.production,

  SOCKET_URL: 'https://socket.attendx.com',

  APP_NAME: 'AttendX',
  APP_VERSION: '1.0.0',
};
