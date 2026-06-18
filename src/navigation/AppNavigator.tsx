import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// ─── Tab Bar Components ───────────────────────────────────────────────────
import CustomTabBar from '../components/layout/CustomTabBar';
import AccountantTabBar from '../components/layout/AccountantTabBar';
import TeacherTabBar from '../components/layout/TeacherTabBar';
import AdminTabBar from '../components/layout/AdminTabBar';
import DirectorTabBar from '../components/layout/DirectorTabBar';
import PrincipalTabBar from '../components/layout/PrincipalTabBar';

// ─── Auth Screens ───────────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import RegisterSchoolScreen from '../screens/auth/RegisterSchoolScreen';

// ─── Common Screens ─────────────────────────────────────────────────────────
import NotificationsScreen from '../screens/common/NotificationsScreen';
import PricingScreen from '../screens/common/PricingScreen';
import LoadingScreen from '../screens/common/LoadingScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import PaymentDueScreen from '../screens/common/PaymentDueScreen';

// ─── Admin Screens ──────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminAgentsScreen from '../screens/admin/AdminAgentsScreen';
import AdminPlansScreen from '../screens/admin/AdminPlansScreen';
import NotificationManagerScreen from '../screens/admin/NotificationManagerScreen';
import SchoolDetailsScreen from '../screens/admin/SchoolDetailsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';

// ─── Teacher Screens ────────────────────────────────────────────────────────
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherAttendanceScreen from '../screens/teacher/AttendanceScreen';
import TeacherMarksEntryScreen from '../screens/teacher/MarksEntryScreen';
import TeacherHomeworkManagementScreen from '../screens/teacher/HomeworkManagementScreen';
import TeacherLeaveRequestScreen from '../screens/teacher/LeaveRequestScreen';
import TeacherLeaveApprovalScreen from '../screens/teacher/LeaveApprovalScreen';
import TeacherStudentListScreen from '../screens/teacher/StudentListScreen';
import StudentRegistrationRequestsScreen from '../screens/teacher/StudentRegistrationRequestsScreen';
import TeacherSkinDiseaseScreen from '../screens/teacher/SkinDiseaseScreen';
import TeacherVitalScanScreen from '../screens/teacher/VitalScanScreen';
import TeacherViewAttendanceScreen from '../screens/teacher/ViewAttendanceScreen';
import MarkAttendanceScreen from '../screens/teacher/MarkAttendanceScreen';
import TeacherFaceReviewScreen from '../screens/teacher/TeacherFaceReviewScreen';
import TeacherStudentRegistrationScreen from '../screens/teacher/StudentRegistrationScreen';
// ─── Student Screens ────────────────────────────────────────────────────────
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentMarksScreen from '../screens/student/StudentMarksScreen';
import StudentHomeworkScreen from '../screens/student/HomeworkScreen';
import StudentFeeScreen from '../screens/student/StudentFeeScreen';
import StudentLeaveScreen from '../screens/student/LeaveScreen';
import StudentQuestionPapersScreen from '../screens/student/QuestionPapersScreen';

// ─── Principal Screens (Old HM) ─────────────────────────────────────────────
import {
  PrincipalDashboardScreen,
  AttendanceScreen as PrincipalAttendanceScreen,
  StudentManagementScreen as PrincipalStudentManagementScreen,
  TeacherManagementScreen as PrincipalTeacherManagementScreen,
  ExamsScreen as PrincipalExamsScreen,
  AnnouncementsScreen as PrincipalAnnouncementsScreen,
  ReportsScreen as PrincipalReportsScreen,
  FeeManagementScreen as PrincipalFeeManagementScreen,
  ExpenseScreen as PrincipalExpenseScreen,
  PaymentEntryScreen as PrincipalPaymentEntryScreen,
  SettingsScreen as PrincipalSettingsScreen,
  CalendarManagement as PrincipalCalendarManagement,
  TeacherAssignmentsScreen as PrincipalTeacherAssignmentsScreen,
  TeacherRegistrationRequestsScreen as PrincipalTeacherRegistrationRequestsScreen,
  StudentPromotionScreen as PrincipalStudentPromotionScreen,
} from '../screens/principal';
import StudentAttendanceReportScreen from '../screens/principal/StudentAttendanceReport';
import PrincipalFaceReviewScreen from '../screens/principal/PrincipalFaceReviewScreen';

// ─── Director Screens (Old Principal) ───────────────────────────────────────
import DirectorDashboardScreen from '../screens/director/DirectorDashboardScreen';
import DirectorBranchDetailsScreen from '../screens/director/BranchDetailsScreen';
import PrincipalRegistrationScreen from '../screens/director/PrincipalRegistrationScreen';
import DirectorBillingScreen from '../screens/director/DirectorBillingScreen';
import RenewalPaymentScreen from '../screens/director/RenewalPaymentScreen';

// ─── Accountant Screens ─────────────────────────────────────────────────────
import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';
import AccountantProfileScreen from '../screens/accountant/AccountantProfileScreen';
import AccountantPayrollScreen from '../screens/accountant/PayrollScreen';
import AccountantSettingsScreen from '../screens/accountant/SettingsScreen';
import SalariesManagement from '../screens/accountant/SalariesManagement';
import AccountantStaffAttendanceScreen from '../screens/accountant/StaffAttendanceScreen';

// ─── Visitor Screens ────────────────────────────────────────────────────────
import VisitFormScreen from '../screens/visitor/VisitFormScreen';
import VisitSuccessScreen from '../screens/visitor/VisitSuccessScreen';
import VisitorDashboardScreen from '../screens/visitor/VisitorDashboardScreen';

// ─── Public Screens ─────────────────────────────────────────────────────────
import PrincipalRegistrationPublicScreen from '../screens/public/PrincipalRegistrationPublicScreen';
import StudentRegisterPublicScreen from '../screens/public/StudentRegisterPublicScreen';
import TeacherRegisterPublicScreen from '../screens/public/TeacherRegisterPublicScreen';

import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Wrapper Components ────────────────────────────────────────────────────

const TeacherLeavesWrapper = React.memo(() => {
  const { isClassTeacher } = useAuth();
  return isClassTeacher ? <TeacherLeaveApprovalScreen /> : <TeacherLeaveRequestScreen />;
});
TeacherLeavesWrapper.displayName = 'TeacherLeavesWrapper';

const SalariesWrapper = React.memo(() => {
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    const loadSchoolCode = async () => {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') || '';
      setSchoolCode(code);
    };
    loadSchoolCode();
  }, []);

  return <SalariesManagement schoolCode={schoolCode} />;
});
SalariesWrapper.displayName = 'SalariesWrapper';

const AgentDummyScreen = () => null;

const AdminTabNavigator = () => {
  const { userRole } = useAuth();
  const isAgent = userRole?.toLowerCase() === 'agent';
  
  return (
    <Tab.Navigator
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      {!isAgent && <Tab.Screen name="Agents" component={AdminAgentsScreen} />}
      {!isAgent && <Tab.Screen name="Plans" component={AdminPlansScreen} />}
      {isAgent && <Tab.Screen name="RegisterSchool" component={AgentDummyScreen} />}
      {!isAgent && <Tab.Screen name="Settings" component={SettingsScreen} />}
      {isAgent && <Tab.Screen name="Profile" component={ProfileScreen} />}
    </Tab.Navigator>
  );
};

const PrincipalTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <PrincipalTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={PrincipalDashboardScreen} />
    <Tab.Screen name="Staff" component={PrincipalTeacherManagementScreen} />
    <Tab.Screen name="TeacherAssignment" component={PrincipalTeacherAssignmentsScreen} />
    <Tab.Screen name="Students" component={PrincipalStudentManagementScreen} />
    <Tab.Screen name="Reports" component={PrincipalReportsScreen} />
  </Tab.Navigator>
);

const DirectorTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <DirectorTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={DirectorDashboardScreen} />
    <Tab.Screen name="Branches" component={DirectorDashboardScreen} />
    <Tab.Screen name="AddBranch" component={PrincipalRegistrationScreen} />
    <Tab.Screen name="Billing" component={DirectorBillingScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const TeacherTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <TeacherTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={TeacherDashboardScreen} />
    <Tab.Screen name="Homework" component={TeacherHomeworkManagementScreen} />
    <Tab.Screen name="Scan" component={TeacherAttendanceScreen} />
    <Tab.Screen name="Leaves" component={TeacherLeavesWrapper} />
    <Tab.Screen name="Marks" component={TeacherMarksEntryScreen} />
  </Tab.Navigator>
);

const StudentTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={StudentDashboardScreen} />
    <Tab.Screen name="Homework" component={StudentHomeworkScreen} />
    <Tab.Screen name="Leave" component={StudentLeaveScreen} />
    <Tab.Screen name="Marks" component={StudentMarksScreen} />
    <Tab.Screen name="Fees" component={StudentFeeScreen} />
    <Tab.Screen name="Papers" component={StudentQuestionPapersScreen} />
  </Tab.Navigator>
);

const AccountantTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <AccountantTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Dashboard" component={AccountantDashboardScreen} />
    <Tab.Screen name="Fees" component={PrincipalFeeManagementScreen} />
    <Tab.Screen name="Salaries" component={SalariesWrapper} />
    <Tab.Screen name="Payroll" component={AccountantPayrollScreen} />
    <Tab.Screen name="Expenses" component={PrincipalExpenseScreen} />
  </Tab.Navigator>
);

// ─── Role-based Tab Switcher ────────────────────────────────────────────────

const MainTabs = () => {
  const { userRole } = useAuth();

  if (!userRole) return null;

  switch (userRole?.toLowerCase()) {
    case 'admin':
    case 'agent':
      return <AdminTabNavigator />;
    case 'principal': return <PrincipalTabNavigator />;
    case 'director': return <DirectorTabNavigator />;
    case 'teacher':
    case 'class_teacher':
    case 'class teacher':
    case 'classteacher':
      return <TeacherTabNavigator />;
    case 'student': return <StudentTabNavigator />;
    case 'accountant': return <AccountantTabNavigator />;
    default: return null;
  }
};

// ─── Root Stack Navigator ───────────────────────────────────────────────────

export default function AppNavigator() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken === null ? (
        // ─── Auth Stack (Not Logged In) ─────────────────────────────────────
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="RegisterSchool" component={RegisterSchoolScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} />
          <Stack.Screen name="Loading" component={LoadingScreen} />

          {/* Public Registration Routes */}
          <Stack.Screen name="PrincipalRegistrationPublic" component={PrincipalRegistrationPublicScreen} />
          <Stack.Screen name="StudentRegisterPublic" component={StudentRegisterPublicScreen} />
          <Stack.Screen name="TeacherRegisterPublic" component={TeacherRegisterPublicScreen} />

          {/* Visitor Routes (No Auth Required) */}
          <Stack.Screen name="VisitForm" component={VisitFormScreen} />
          <Stack.Screen name="VisitSuccess" component={VisitSuccessScreen} />
        </>
      ) : (
        // ─── Main Application Stack (Logged In) ────────────────────────────
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="PaymentDue" component={PaymentDueScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="NotificationManager" component={NotificationManagerScreen} />
          <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} />
          <Stack.Screen name="AdminSettings" component={SettingsScreen} />
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
          <Stack.Screen name="TeacherMarksEntry" component={TeacherMarksEntryScreen} />
          <Stack.Screen name="TeacherHomeworkManagement" component={TeacherHomeworkManagementScreen} />
          <Stack.Screen name="StudentRegistrationRequests" component={StudentRegistrationRequestsScreen} />
          <Stack.Screen name="TeacherLeaveRequest" component={TeacherLeaveRequestScreen} />
          <Stack.Screen name="TeacherLeaveApproval" component={TeacherLeaveApprovalScreen} />
          <Stack.Screen name="TeacherStudentList" component={TeacherStudentListScreen} />
          <Stack.Screen name="TeacherSkinDisease" component={TeacherSkinDiseaseScreen} />
          <Stack.Screen name="TeacherVitalScan" component={TeacherVitalScanScreen} />
          <Stack.Screen name="TeacherViewAttendance" component={TeacherViewAttendanceScreen} />
          <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
          <Stack.Screen name="TeacherFaceReview" component={TeacherFaceReviewScreen} />
          <Stack.Screen name="TeacherStudentRegistration" component={TeacherStudentRegistrationScreen} />
          <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
          <Stack.Screen name="StudentMarks" component={StudentMarksScreen} />
          <Stack.Screen name="StudentHomework" component={StudentHomeworkScreen} />
          <Stack.Screen name="StudentFee" component={StudentFeeScreen} />
          <Stack.Screen name="StudentLeave" component={StudentLeaveScreen} />
          <Stack.Screen name="StudentQuestionPapers" component={StudentQuestionPapersScreen} />
          <Stack.Screen name="PrincipalDashboard" component={PrincipalDashboardScreen} />
          <Stack.Screen name="PrincipalAttendance" component={PrincipalAttendanceScreen} />
          <Stack.Screen name="PrincipalStudentManagement" component={PrincipalStudentManagementScreen} />
          <Stack.Screen name="PrincipalTeacherManagement" component={PrincipalTeacherManagementScreen} />
          <Stack.Screen name="PrincipalTeacherAssignment" component={PrincipalTeacherAssignmentsScreen} />
          <Stack.Screen name="PrincipalExams" component={PrincipalExamsScreen} />
          <Stack.Screen name="PrincipalAnnouncements" component={PrincipalAnnouncementsScreen} />
          <Stack.Screen name="PrincipalReports" component={PrincipalReportsScreen} />
          <Stack.Screen name="PrincipalFeeManagement" component={PrincipalFeeManagementScreen} />
          <Stack.Screen name="PrincipalExpense" component={PrincipalExpenseScreen} />
          <Stack.Screen name="PrincipalSettings" component={PrincipalSettingsScreen} />
          <Stack.Screen name="PrincipalStudentRegistration" component={PrincipalDashboardScreen} />
          <Stack.Screen name="PrincipalStudentAttendanceReport" component={StudentAttendanceReportScreen} />
          <Stack.Screen name="PrincipalCalendarManagement" component={PrincipalCalendarManagement} />
          <Stack.Screen name="PrincipalTeacherRegistrationRequests" component={PrincipalTeacherRegistrationRequestsScreen} />
          <Stack.Screen name="PrincipalStudentPromotion" component={PrincipalStudentPromotionScreen} />
          <Stack.Screen name="PrincipalFaceReview" component={PrincipalFaceReviewScreen} />
          <Stack.Screen name="DirectorDashboard" component={DirectorDashboardScreen} />
          <Stack.Screen name="DirectorBranchDetails" component={DirectorBranchDetailsScreen} />
          <Stack.Screen name="DirectorPrincipalRegistration" component={PrincipalRegistrationScreen} />
          <Stack.Screen name="DirectorBilling" component={DirectorBillingScreen} />
          <Stack.Screen name="RenewalPayment" component={RenewalPaymentScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} />
          <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} />
          <Stack.Screen name="AccountantProfile" component={AccountantProfileScreen} />
          <Stack.Screen name="AccountantPaymentEntry" component={PrincipalPaymentEntryScreen} />
          <Stack.Screen name="AccountantPayroll" component={AccountantPayrollScreen} />
          <Stack.Screen name="AccountantFeeManagement" component={PrincipalFeeManagementScreen} />
          <Stack.Screen name="AccountantExpense" component={PrincipalExpenseScreen} />
          <Stack.Screen name="AccountantReports" component={PrincipalReportsScreen} />
          <Stack.Screen name="AccountantSettings" component={AccountantSettingsScreen} />
          <Stack.Screen name="AccountantStaffAttendance" component={AccountantStaffAttendanceScreen} />
          <Stack.Screen name="VisitorDashboard" component={VisitorDashboardScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
