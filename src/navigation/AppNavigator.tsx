import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

// ─── Tab Bar Components ───────────────────────────────────────────────────
import RoleTabBar from '../components/layout/RoleTabBar';
import StudentTabBar from '../components/layout/StudentTabBar';
import {
  accountantTabs,
  adminTabs,
  agentTabs,
  directorTabs,
  principalTabs,
  teacherTabs,
} from '../components/layout/tabBarConfigs';
import { Theme } from '../theme/tokens';

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
import AutoPayTrackerScreen from '../screens/admin/AutoPayTrackerScreen';
import ManualAttendanceManagerScreen from '../screens/admin/ManualAttendanceManagerScreen';
import PaymentHistoryScreen from '../screens/admin/PaymentHistoryScreen';

// ─── Teacher Screens ────────────────────────────────────────────────────────
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherAttendanceScreen from '../screens/teacher/AttendanceScreen';
import TeacherMarksEntryScreen from '../screens/teacher/MarksEntryScreen';
import TeacherHomeworkManagementScreen from '../screens/teacher/HomeworkManagementScreen';
import HomeworkSubmissionsScreen from '../screens/teacher/HomeworkSubmissionsScreen';
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
import TeacherMyAttendanceScreen from '../screens/teacher/TeacherMyAttendanceScreen';
import TeacherQuestionPapersScreen from '../screens/teacher/TeacherQuestionPapersScreen';
// ─── Student Screens ────────────────────────────────────────────────────────
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentMarksScreen from '../screens/student/StudentMarksScreen';
import StudentHomeworkScreen from '../screens/student/HomeworkScreen';
import StudentFeeScreen from '../screens/student/StudentFeeScreen';
import StudentLeaveScreen from '../screens/student/LeaveScreen';
import StudentQuestionPapersScreen from '../screens/student/QuestionPapersScreen';

// ─── Principal Screens (Old HM) ─────────────────────────────────────────────
import PrincipalDashboardScreen from '../screens/principal/PrincipalDashboardScreen';
import PrincipalAttendanceScreen from '../screens/principal/AttendanceScreen';
import PrincipalStudentManagementScreen from '../screens/principal/StudentManagementScreen';
import PrincipalTeacherManagementScreen from '../screens/principal/TeacherManagementScreen';
import PrincipalExamsScreen from '../screens/principal/ExamsScreen';
import PrincipalAnnouncementsScreen from '../screens/principal/AnnouncementsScreen';
import PrincipalReportsScreen from '../screens/principal/ReportsScreen';
import PrincipalFeeManagementScreen from '../screens/principal/FeeManagementScreen';
import PrincipalExpenseScreen from '../screens/principal/ExpenseScreen';
import PrincipalPaymentEntryScreen from '../screens/principal/PaymentEntryScreen';
import PrincipalSettingsScreen from '../screens/principal/SettingsScreen';
import PrincipalCalendarManagement from '../screens/principal/CalendarManagement';
import PrincipalTeacherAssignmentsScreen from '../screens/principal/TeacherAssignmentsScreen';
import PrincipalTeacherRegistrationRequestsScreen from '../screens/principal/TeacherRegistrationRequestsScreen';
import PrincipalStudentPromotionScreen from '../screens/principal/StudentPromotionScreen';
import StudentAttendanceReportScreen from '../screens/principal/StudentAttendanceReport';
import PrincipalFaceReviewScreen from '../screens/principal/PrincipalFaceReviewScreen';
import Student360Screen from '../screens/principal/Student360Screen';

// ─── Director Screens (Old Principal) ───────────────────────────────────────
import DirectorDashboardScreen from '../screens/director/DirectorDashboardScreen';
import DirectorBranchDetailsScreen from '../screens/director/BranchDetailsScreen';
import PrincipalRegistrationScreen from '../screens/director/PrincipalRegistrationScreen';
import DirectorBillingScreen from '../screens/director/DirectorBillingScreen';
import RenewalPaymentScreen from '../screens/director/RenewalPaymentScreen';

// ─── Accountant Screens ─────────────────────────────────────────────────────
import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';
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
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';
import ManageDataScreen from '../screens/teacher/ManageDataScreen';
import PrincipalDataExportScreen from '../screens/principal/DataExportScreen';
import TeacherLeaveScreen from '../screens/principal/TeacherLeaveScreen';
import AttendanceGalleryScreen from '../screens/teacher/AttendanceGalleryScreen';
import AdminRevenueScreen from '../screens/admin/AdminRevenueScreen';
import AdminBlogManagerScreen from '../screens/admin/AdminBlogManagerScreen';
import AdminFormLeadsScreen from '../screens/admin/AdminFormLeadsScreen';
import DeleteSchoolScreen from '../screens/admin/DeleteSchoolScreen';
import AccountantPaymentHistoryScreen from '../screens/accountant/AccountantPaymentHistoryScreen';
import AccountantReportsScreen from '../screens/accountant/ReportsScreen';
import PendingStudentsScreen from '../screens/principal/PendingStudentsScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Wrapper Components ────────────────────────────────────────────────────

import TeacherLeavesTabScreen from '../screens/teacher/TeacherLeavesTabScreen';

const SalariesWrapper = React.memo(() => {
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    const loadSchoolCode = async () => {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) ||
        await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(code);
    };
    loadSchoolCode();
  }, []);

  return <SalariesManagement schoolCode={schoolCode} />;
});
SalariesWrapper.displayName = 'SalariesWrapper';

const AgentRegisterPlaceholder = () => <View style={{ flex: 1, backgroundColor: Theme.colors.background }} />;

const AccountantFaceVerifyScreen = () => <TeacherAttendanceScreen />;

const tabScreenOptions = {
  headerShown: false,
  sceneContainerStyle: { backgroundColor: Theme.colors.background },
};

const AdminTabNavigator = () => {
  const { userRole } = useAuth();
  const isAgent = userRole?.toLowerCase() === 'agent';

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <RoleTabBar
          {...props}
          tabs={isAgent ? agentTabs : adminTabs}
          accentColor={Theme.colors.primary}
        />
      )}
      screenOptions={tabScreenOptions}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      {!isAgent && <Tab.Screen name="Agents" component={AdminAgentsScreen} />}
      {!isAgent && <Tab.Screen name="Plans" component={AdminPlansScreen} />}
      {isAgent && (
        <Tab.Screen
          name="RegisterSchool"
          component={AgentRegisterPlaceholder}
          listeners={({ navigation: tabNav }) => ({
            tabPress: (e) => {
              e.preventDefault();
              tabNav.navigate('Dashboard', { openCreateModal: true });
            },
          })}
        />
      )}
      {!isAgent && <Tab.Screen name="Settings" component={SettingsScreen} />}
      {isAgent && <Tab.Screen name="Profile" component={ProfileScreen} />}
    </Tab.Navigator>
  );
};

const PrincipalTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <RoleTabBar {...props} tabs={principalTabs} accentColor={Theme.colors.accentPrincipal} />}
    screenOptions={tabScreenOptions}
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
    tabBar={(props) => <RoleTabBar {...props} tabs={directorTabs} accentColor={Theme.colors.accentDirector} />}
    screenOptions={tabScreenOptions}
  >
    <Tab.Screen name="Home" component={DirectorDashboardScreen} />
    <Tab.Screen name="Branches" component={DirectorDashboardScreen} />
    <Tab.Screen name="AddBranch" component={PrincipalRegistrationScreen} />
    <Tab.Screen
      name="Billing"
      component={DirectorBillingScreen}
      initialParams={{ variant: 'subscription' }}
    />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const TeacherTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <RoleTabBar {...props} tabs={teacherTabs} accentColor={Theme.colors.accentTeacher} />}
    screenOptions={tabScreenOptions}
  >
    <Tab.Screen name="Home" component={TeacherDashboardScreen} />
    <Tab.Screen name="Homework" component={TeacherHomeworkManagementScreen} />
    <Tab.Screen name="Scan" component={TeacherAttendanceScreen} />
    <Tab.Screen name="Leaves" component={TeacherLeavesTabScreen} />
    <Tab.Screen name="Marks" component={TeacherMarksEntryScreen} />
  </Tab.Navigator>
);

const StudentTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <StudentTabBar {...props} />}
    screenOptions={tabScreenOptions}
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
    tabBar={(props) => <RoleTabBar {...props} tabs={accountantTabs} accentColor={Theme.colors.accentAccountant} />}
    screenOptions={tabScreenOptions}
  >
    <Tab.Screen name="Dashboard" component={AccountantDashboardScreen} />
    <Tab.Screen name="Fees" component={PrincipalFeeManagementScreen} />
    <Tab.Screen name="Salaries" component={SalariesWrapper} />
    <Tab.Screen name="Payroll" component={AccountantPayrollScreen} />
    <Tab.Screen name="Expenses" component={PrincipalExpenseScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// ─── Role-based Tab Switcher ────────────────────────────────────────────────

const MainTabs = () => {
  const { userRole } = useAuth();

  if (!userRole) {return null;}

  switch (userRole?.toLowerCase()) {
    case 'admin':
    case 'superadmin':
    case 'super_admin':
    case 'super admin':
    case 'administrator':
    case 'agent':
      return <ErrorBoundary><Suspense fallback={null}><AdminTabNavigator /></Suspense></ErrorBoundary>;
    case 'principal': return <ErrorBoundary><Suspense fallback={null}><PrincipalTabNavigator /></Suspense></ErrorBoundary>;
    case 'director': return <ErrorBoundary><Suspense fallback={null}><DirectorTabNavigator /></Suspense></ErrorBoundary>;
    case 'teacher':
    case 'class_teacher':
    case 'class teacher':
    case 'classteacher':
      return <ErrorBoundary><Suspense fallback={null}><TeacherTabNavigator /></Suspense></ErrorBoundary>;
    case 'student': return <ErrorBoundary><Suspense fallback={null}><StudentTabNavigator /></Suspense></ErrorBoundary>;
    case 'accountant': return <ErrorBoundary><Suspense fallback={null}><AccountantTabNavigator /></Suspense></ErrorBoundary>;
    default: return null;
  }
};

// ─── Root Stack Navigator ───────────────────────────────────────────────────

export default function AppNavigator() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Theme.colors.info} />
      </View>
    );
  }

  return (
    <>
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
          <Stack.Screen name="AutoPayTracker" component={AutoPayTrackerScreen} />
          <Stack.Screen name="ManualAttendanceManager" component={ManualAttendanceManagerScreen} />
          <Stack.Screen name="AdminRevenue" component={AdminRevenueScreen} />
          <Stack.Screen name="AdminBlogManager" component={AdminBlogManagerScreen} />
          <Stack.Screen name="AdminFormLeads" component={AdminFormLeadsScreen} />
          <Stack.Screen name="DeleteSchool" component={DeleteSchoolScreen} />
          <Stack.Screen name="AttendanceGallery" component={AttendanceGalleryScreen} />
          <Stack.Screen name="AccountantFaceVerify" component={AccountantFaceVerifyScreen} />
          <Stack.Screen name="AccountantPaymentHistory" component={AccountantPaymentHistoryScreen} />
          <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
          <Stack.Screen name="TeacherMarksEntry" component={TeacherMarksEntryScreen} />
          <Stack.Screen name="TeacherHomeworkManagement" component={TeacherHomeworkManagementScreen} />
          <Stack.Screen name="TeacherHomeworkSubmissions" component={HomeworkSubmissionsScreen} />
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
          <Stack.Screen name="TeacherMyAttendance" component={TeacherMyAttendanceScreen} />
          <Stack.Screen name="RegisterSchool" component={RegisterSchoolScreen} />
          <Stack.Screen name="ManageData" component={ManageDataScreen} />
          <Stack.Screen name="TeacherQuestionPapers" component={TeacherQuestionPapersScreen} />
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
          <Stack.Screen name="PrincipalTeacherLeaves" component={TeacherLeaveScreen} />
          <Stack.Screen name="PrincipalDataExport" component={PrincipalDataExportScreen} />
          <Stack.Screen name="Student360" component={Student360Screen} />
          <Stack.Screen name="DirectorDashboard" component={DirectorDashboardScreen} />
          <Stack.Screen name="DirectorBranchDetails" component={DirectorBranchDetailsScreen} />
          <Stack.Screen name="DirectorPrincipalRegistration" component={PrincipalRegistrationScreen} />
          <Stack.Screen name="DirectorBilling" component={DirectorBillingScreen} />
          <Stack.Screen name="RenewalPayment" component={RenewalPaymentScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} />
          <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} />
          <Stack.Screen name="AccountantProfile" component={ProfileScreen} />
          <Stack.Screen name="AccountantPaymentEntry" component={PrincipalPaymentEntryScreen} />
          <Stack.Screen name="AccountantPayroll" component={AccountantPayrollScreen} />
          <Stack.Screen name="AccountantFeeManagement" component={PrincipalFeeManagementScreen} />
          <Stack.Screen name="AccountantExpense" component={PrincipalExpenseScreen} />
          <Stack.Screen name="AccountantReports" component={AccountantReportsScreen} />
          <Stack.Screen name="AccountantSettings" component={AccountantSettingsScreen} />
          <Stack.Screen name="AccountantStaffAttendance" component={AccountantStaffAttendanceScreen} />
          <Stack.Screen name="AccountantSalaries" component={SalariesWrapper} />
          <Stack.Screen name="AccountantPendingStudents" component={PendingStudentsScreen} />
          <Stack.Screen name="VisitorDashboard" component={VisitorDashboardScreen} />
        </>
      )}
    </Stack.Navigator>
    </>
  );
}
