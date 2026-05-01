import { AppRole } from '../constants/roles';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  VerifyOtp: {
    schoolId: string;
    identifier: string;
  };
  ResetPassword: {
    schoolId: string;
    identifier: string;
    resetToken: string;
  };
  MainTabs: undefined;
  Pricing: undefined;
  Loading: undefined;
  RegisterSchool: undefined;
  HMRegistrationPublic: undefined;
  StudentRegisterPublic: undefined;
  TeacherRegisterPublic: undefined;
  VisitForm: undefined;
  VisitSuccess: undefined;
};

export type CommonStackParamList = {
  Profile: undefined;
  Notifications: undefined;
};

export type StudentStackParamList = {
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentFee: undefined;
};

export type RoleStackParamList = {
  RoleDashboard: {
    role: AppRole;
  };
};

export type RootStackParamList = AuthStackParamList & CommonStackParamList & {
  MainTabs: undefined;
  // Admin Screens
  NotificationManager: undefined;
  SchoolDetails: undefined;
  AdminSettings: undefined;
  // Teacher Screens
  TeacherDashboard: undefined;
  TeacherAttendance: undefined;
  TeacherMarksEntry: undefined;
  TeacherHomeworkManagement: undefined;
  TeacherLeaveRequest: undefined;
  TeacherLeaveApproval: undefined;
  TeacherStudentList: undefined;
  TeacherSkinDisease: undefined;
  TeacherVitalScan: undefined;
  TeacherViewAttendance: undefined;
  MarkAttendance: undefined;
  // Student Screens
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentHomework: undefined;
  StudentFee: undefined;
  StudentLeave: undefined;
  StudentQuestionPapers: undefined;
  // HM Screens
  HMDashboard: undefined;
  HMAttendance: undefined;
  HMStudentManagement: undefined;
  HMTeacherManagement: undefined;
  HMExams: undefined;
  HMAnnouncements: undefined;
  HMReports: undefined;
  HMFeeManagement: undefined;
  HMExpense: undefined;
  HMSettings: undefined;
  HMStudentRegistration: undefined;
  // Principal Screens
  PrincipalDashboard: undefined;
  PrincipalBranchDetails: undefined;
  PrincipalHMRegistration: undefined;
  // Accountant Screens
  AccountantDashboard: undefined;
  AccountantPaymentEntry: undefined;
  AccountantPayroll: undefined;
  AccountantFeeManagement: undefined;
  AccountantExpense: undefined;
  AccountantReports: undefined;
  AccountantSettings: undefined;
  // Visitor Screens
  VisitorDashboard: undefined;
};