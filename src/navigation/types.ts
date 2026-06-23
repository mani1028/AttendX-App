export type RootStackParamList = {
  // Auth
  Login: undefined;
  ForgotPassword: undefined;
  VerifyOtp: undefined;
  ResetPassword: undefined;
  RegisterSchool: undefined;
  Pricing: undefined;

  // Main Tabs
  MainTabs: undefined;

  // Common
  Notifications: undefined;
  Loading: undefined;
  Profile: undefined;
  PaymentDue: { message?: string; schoolId?: string } | undefined;

  // Admin
  AdminDashboard: undefined;
  NotificationManager: undefined;
  SchoolDetails: undefined;
  AdminSettings: undefined;
  AutoPayTracker: undefined;
  ManualAttendanceManager: undefined;
  PricingManager: undefined;
  PaymentHistory: undefined;

  // Teacher
  TeacherDashboard: undefined;
  TeacherAttendance: undefined;
  TeacherMarksEntry: undefined;
  TeacherHomeworkManagement: undefined;
  TeacherHomeworkSubmissions: { homeworkId: string; title: string };
  TeacherLeaveRequest: undefined;
  TeacherLeaveApproval: undefined;
  TeacherStudentList: undefined;
  StudentRegistrationRequests: undefined;
  TeacherSkinDisease: undefined;
  TeacherVitalScan: undefined;
  TeacherViewAttendance: undefined;
  MarkAttendance: undefined;
  TeacherFaceReview: undefined;
  TeacherStudentRegistration: undefined;
  ManageData: undefined;
  TeacherMyAttendance: undefined;
  TeacherQuestionPapers: undefined;

  // Student
  StudentDashboard: undefined;
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentHomework: undefined;
  StudentFee: undefined;
  StudentLeave: undefined;
  StudentQuestionPapers: undefined;

  // Principal (Old HM)
  PrincipalDashboard: undefined;
  PrincipalAttendance: undefined;
  PrincipalStudentManagement: undefined;
  PrincipalTeacherManagement: undefined;
  PrincipalTeacherAssignment: undefined;
  PrincipalExams: undefined;
  PrincipalAnnouncements: undefined;
  PrincipalReports: undefined;
  PrincipalFeeManagement: { student_id?: string; studentId?: string } | undefined;
  PrincipalExpense: undefined;
  PrincipalSettings: undefined;
  PrincipalStudentRegistration: undefined;
  PrincipalStudentAttendanceReport: { studentId: string; studentName: string };
  PrincipalCalendarManagement: undefined;
  PrincipalTeacherRegistrationRequests: undefined;
  PrincipalStudentPromotion: undefined;
  PrincipalFaceReview: undefined;
  Student360: { studentId?: string; studentName?: string } | undefined;

  // Director (Old Principal)
  DirectorDashboard: undefined;
  DirectorBranchDetails: { branchId: string; branchName: string; principalName: string; principalEmail: string; branchStatus: string };
  DirectorPrincipalRegistration: undefined;
  DirectorBilling: undefined;
  RenewalPayment: undefined;

  // Accountant
  AccountantDashboard: undefined;
  AccountantProfile: undefined;
  AccountantPaymentEntry: undefined;
  AccountantPayroll: undefined;
  AccountantSalaries: undefined;
  AccountantFeeManagement: { student_id?: string; studentId?: string } | undefined;
  AccountantExpense: undefined;
  AccountantReports: undefined;
  AccountantSettings: undefined;
  AccountantStaffAttendance: undefined;

  // Visitor
  VisitForm: { token: string };
  VisitSuccess: { visitor_no: string };
  VisitorDashboard: undefined;

  // Public
  PrincipalRegistrationPublic: { school_code: string; branch_id: string };
  StudentRegisterPublic: { school_code: string; branch_id: string };
  TeacherRegisterPublic: { school_code: string; branch_id: string };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type StudentStackParamList = {
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentFee: undefined;
};
