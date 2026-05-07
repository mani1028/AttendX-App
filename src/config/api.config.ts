import { Platform } from 'react-native';

export const API_CONFIG = {
  // Development URLs
  dev: {
    android: 'https://portal-api.attendx.ai',  // Android Emulator
    ios: 'https://portal-api.attendx.ai',      // iOS Simulator
    device: 'https://portal-api.attendx.ai',   // Physical device
  },
  
  // Production URL
  production: 'https://portal-api.attendx.ai/',
  
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
      // Registration & Auth
      register: 'teacher/register',
      sendOtp: 'teacher/register/send-otp',
      verifyOtp: 'teacher/register/verify-otp',
      
      // Context & Classes
      context: 'teacher/marks/teacher-context',
      classes: 'teacher/marks/classes',
      exams: 'teacher/marks/exams',
      
      // Student Registration Requests (Class Teacher only)
      studentRegistrationRequests: 'teacher/student-registration-requests',
      approveStudentRegistration: 'teacher/student-registration-requests/{id}/accept',
      rejectStudentRegistration: 'teacher/student-registration-requests/{id}/reject',
      
      // Attendance
      markAttendance: 'teacher/mark-attendance',
      videoAttendance: 'teacher/video-attendance',
      attendanceHistory: 'teacher/attendance-history',
      selfAttendance: 'teacher/self-attendance',
      
      // Academics
      createHomework: 'teacher/homework/create',
      marksEntry: 'teacher/marks/entry',
      enterMarks: 'teacher/marks/enter',
      marksBulk: 'teacher/marks/bulk',
      uploadQuestionPapers: 'teacher/question-papers/upload',
      
      // Leave Management
      applyLeave: 'teacher/leave/apply',
      approveStudentLeave: 'teacher/student-leave/approve',
      
      // AI Tools
      skinPrediction: 'teacher/skin-prediction',
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
      process: 'vitalscan/process',
    },
    payment: {
      createOrder: 'payment/create-order',
      createOrderByPlan: 'payment/create-order-by-plan',
      verify: 'payment/verify',
    },
    notifications: {
      listTeacher: 'notifications/teacher/list',
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
