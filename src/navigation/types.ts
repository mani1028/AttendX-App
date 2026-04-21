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
};

export type StudentStackParamList = {
  StudentDashboard: undefined;
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentFee: undefined;
};

export type RoleStackParamList = {
  RoleDashboard: {
    role: AppRole;
  };
};

export type RootStackParamList = AuthStackParamList;