import { Platform } from 'react-native';

export const API_CONFIG = {
  // Development URLs
  dev: {
    android: 'http://10.0.2.2:5000',  // Android Emulator
    ios: 'http://localhost:5000',      // iOS Simulator
    device: 'http://YOUR_IP:5000',     // Physical device (replace YOUR_IP)
  },
  
  // Production URL
  production: 'https://api.attendx.com',
  
  // Timeout in milliseconds
  timeout: 30000,
  
  // Endpoints
  endpoints: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
    },
    school: {
      register: '/api/school/register',
      getSchools: '/api/school/list',
      updateSchool: '/api/school/update',
    },
    hm: {
      dashboard: '/api/hm/dashboard',
      teachers: '/api/hm/teachers',
      students: '/api/hm/students',
      attendance: '/api/hm/attendance',
      exams: '/api/hm/exams',
    },
    teacher: {
      dashboard: '/api/teacher/dashboard',
      attendance: '/api/teacher/attendance',
      homework: '/api/teacher/homework',
      marks: '/api/teacher/marks',
      vitalscan: '/api/teacher/vitalscan',
      skinPrediction: '/api/teacher/skin-prediction',
    },
    student: {
      attendance: '/api/student/attendance',
      homework: '/api/student/homework',
      marks: '/api/student/marks',
      leave: '/api/student/leave',
    },
    visitor: {
      register: '/api/visitor/register',
      list: '/api/visitor/list',
      verify: '/api/visitor/verify',
    },
  },
};

export const ENV = {
  API_URL: __DEV__ 
    ? (Platform.OS === 'android' ? API_CONFIG.dev.android : API_CONFIG.dev.ios)
    : API_CONFIG.production,
  
  SOCKET_URL: __DEV__
    ? (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000')
    : 'https://socket.attendx.com',
  
  APP_NAME: 'AttendX',
  APP_VERSION: '1.0.0',
};
