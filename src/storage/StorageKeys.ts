export const StorageKeys = {
  // Authentication & Session
  AUTH_TOKEN: 'authToken',
  USER_ROLE: 'userRole',
  USER_EMAIL: 'userEmail',
  USER_NAME: 'userName',
  EMPLOYEE_ID: 'employeeId',
  USER_AVATAR: 'userAvatar',
  IS_CLASS_TEACHER: 'isClassTeacher',
  CLASS_TEACHER_INFO: 'classTeacherInfo',

  // School Context
  SCHOOL_CODE: 'schoolCode',
  BRANCH_ID: 'branchId',

  // UI/App State
  THEME_MODE: 'themeMode',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  SAVED_ACCOUNTS: 'savedAccounts',

  // Specific features
  FCM_TOKEN: 'fcmToken',
  LAST_SYNC: 'lastSync',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
