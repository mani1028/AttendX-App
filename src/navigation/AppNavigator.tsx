import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutGrid,
  Building2,
  Bell,
  Settings,
  UserPlus,
  Home,
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  LogIn,
  BarChart3,
  CreditCard,
  TrendingDown,
  Coins
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import CustomTabBar from '../components/layout/CustomTabBar';
import AccountantTabBar from '../components/layout/AccountantTabBar';
import TeacherTabBar from '../components/layout/TeacherTabBar';
import HMTabBar from '../components/layout/HMTabBar';

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

// ─── Admin Screens ──────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
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
import MarkAttendanceScreen from '../components/teacher/MarkAttendanceScreen';


// ─── Student Screens ────────────────────────────────────────────────────────
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentMarksScreen from '../screens/student/StudentMarksScreen';
import StudentHomeworkScreen from '../screens/student/HomeworkScreen';
import StudentFeeScreen from '../screens/student/StudentFeeScreen';
import StudentLeaveScreen from '../screens/student/LeaveScreen';

import StudentQuestionPapersScreen from '../screens/student/QuestionPapersScreen';

// Add the import for CalendarManagement at the top with other HM imports
import {
  HMDashboardScreen,
  AttendanceScreen as HMAttendanceScreen,
  StudentManagementScreen as HMStudentManagementScreen,
  TeacherManagementScreen as HMTeacherManagementScreen,
  ExamsScreen as HMExamsScreen,
  AnnouncementsScreen as HMAnnouncementsScreen,
  ReportsScreen as HMReportsScreen,
  FeeManagementScreen as HMFeeManagementScreen,
  ExpenseScreen as HMExpenseScreen,
  PaymentEntryScreen as HMPaymentEntryScreen,
  SettingsScreen as HMSettingsScreen,
  HMTeacherAssignmentsScreen,
  CalendarManagement // Add this line
} from '../screens/hm';
import HMStudentRegistrationScreen from '../screens/teacher/StudentRegistrationScreen';
import StudentAttendanceReportScreen from '../screens/hm/StudentAttendanceReport';

// ─── Principal Screens ──────────────────────────────────────────────────────
import PrincipalDashboardScreen from '../screens/principal/PrincipalDashboardScreen';
import PrincipalBranchDetailsScreen from '../screens/principal/BranchDetailsScreen';
import PrincipalHMRegistrationScreen from '../screens/principal/HMRegistrationScreen';

// ─── Accountant Screens ─────────────────────────────────────────────────────
import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';
import AccountantProfileScreen from '../screens/accountant/AccountantProfileScreen';
import AccountantPayrollScreen from '../screens/accountant/PayrollScreen';
import AccountantSettingsScreen from '../screens/accountant/SettingsScreen';
import SalariesManagement from '../screens/accountant/SalariesManagement';

// ─── Visitor Screens ────────────────────────────────────────────────────────
import VisitFormScreen from '../screens/visitor/VisitFormScreen';
import VisitSuccessScreen from '../screens/visitor/VisitSuccessScreen';
import VisitorDashboardScreen from '../screens/visitor/VisitorDashboardScreen';

// ─── Public Screens ─────────────────────────────────────────────────────────
import HMRegistrationPublicScreen from '../screens/public/HMRegistrationPublicScreen';
import StudentRegisterPublicScreen from '../screens/public/StudentRegisterPublicScreen';
import TeacherRegisterPublicScreen from '../screens/public/TeacherRegisterPublicScreen';

// ─── Types ──────────────────────────────────────────────────────────────────

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

  // Admin
  Profile: undefined;
  AdminDashboard: undefined;
  NotificationManager: undefined;
  SchoolDetails: undefined;
  AdminSettings: undefined;

  // Teacher
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

  // Student
  StudentDashboard: undefined;
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentHomework: undefined;
  StudentFee: undefined;
  StudentLeave: undefined;
  StudentQuestionPapers: undefined;

  // In the HM section of RootStackParamList (around line 120-130)
  // HM
  HMDashboard: undefined;
  HMAttendance: undefined;
  HMStudentManagement: undefined;
  HMTeacherManagement: undefined;
  TeacherAssignment: undefined;
  HMExams: undefined;
  HMAnnouncements: undefined;
  HMReports: undefined;
  HMFeeManagement: undefined;
  HMExpense: undefined;
  HMSettings: undefined;
  HMStudentRegistration: undefined;
  StudentAttendanceReport: { studentId: string; studentName: string };
  CalendarManagement: undefined; // Add this line

  // Principal
  PrincipalDashboard: undefined;
  PrincipalBranchDetails: { branchId: string; branchName: string; hmName: string; hmEmail: string; branchStatus: string };
  PrincipalHMRegistration: undefined;

  // Accountant
  AccountantDashboard: undefined;
  AccountantProfile: undefined;
  AccountantPaymentEntry: undefined;
  AccountantPayroll: undefined;
  AccountantSalaries: undefined;
  AccountantFeeManagement: undefined;
  AccountantExpense: undefined;
  AccountantReports: undefined;
  AccountantSettings: undefined;

  // Visitor
  VisitForm: { token: string };
  VisitSuccess: { visitor_no: string };
  VisitorDashboard: undefined;

  // Public
  HMRegistrationPublic: { school_code: string; branch_id: string };
  StudentRegisterPublic: { school_code: string; branch_id: string };
  TeacherRegisterPublic: { school_code: string; branch_id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Role-based Tab Navigators ──────────────────────────────────────────────

const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, any> = {
          Dashboard: LayoutGrid,
          Schools: Building2,
          Notifications: Bell,
          Settings: Settings,
        };
        const IconComponent = icons[route.name] ?? LayoutGrid;
        return <IconComponent size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
    <Tab.Screen name="Schools" component={AdminDashboardScreen} />
    <Tab.Screen name="Notifications" component={NotificationManagerScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const PrincipalTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, any> = {
          Dashboard: LayoutGrid,
          Branches: Building2,
          'HM Registration': UserPlus,
        };
        const IconComponent = icons[route.name] ?? LayoutGrid;
        return <IconComponent size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" component={PrincipalDashboardScreen} />
    <Tab.Screen name="Branches" component={PrincipalDashboardScreen} />
    <Tab.Screen name="HM Registration" component={PrincipalHMRegistrationScreen} />
  </Tab.Navigator>
);

const HMTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <HMTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={HMDashboardScreen} />
    <Tab.Screen name="Staff" component={HMTeacherManagementScreen} />
    <Tab.Screen name="TeacherAssignment" component={HMTeacherAssignmentsScreen} />
    <Tab.Screen name="Students" component={HMStudentManagementScreen} />
    <Tab.Screen name="Settings" component={HMSettingsScreen} />
  </Tab.Navigator>
);

// Wrapper components for conditional Teacher Leaves screen
const TeacherLeavesWrapper = React.memo(() => {
  const { isClassTeacher } = useAuth();
  return isClassTeacher ? <TeacherLeaveApprovalScreen /> : <TeacherLeaveRequestScreen />;
});
TeacherLeavesWrapper.displayName = 'TeacherLeavesWrapper';
// Wrapper component for Salaries screen with schoolCode
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


const TeacherTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TeacherTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={TeacherDashboardScreen} />
      <Tab.Screen name="Homework" component={TeacherHomeworkManagementScreen} />
      <Tab.Screen name="Scan" component={TeacherAttendanceScreen} />
      {/* Leaves tab: Show Leave Approval for Class Teachers, Leave Request for Subject Teachers */}
      <Tab.Screen
        name="Leaves"
        component={TeacherLeavesWrapper}
      />
      <Tab.Screen name="Marks" component={TeacherMarksEntryScreen} />
    </Tab.Navigator>
  );
};

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

const AccountantTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <AccountantTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={AccountantDashboardScreen} />
      <Tab.Screen name="Fees" component={HMFeeManagementScreen} />
      <Tab.Screen name="Salaries" component={SalariesWrapper} />
      <Tab.Screen name="Payroll" component={AccountantPayrollScreen} />
      <Tab.Screen name="Expenses" component={HMExpenseScreen} />
    </Tab.Navigator>
  );
};

// ─── Role-based Tab Switcher ────────────────────────────────────────────────

const MainTabs = () => {
  const { userRole } = useAuth();

  switch (userRole?.toLowerCase()) {
    case 'admin': return <AdminTabNavigator />;
    case 'principal': return <PrincipalTabNavigator />;
    case 'hm': return <HMTabNavigator />;
    case 'teacher': return <TeacherTabNavigator />;
    case 'class_teacher':
    case 'class teacher':
    case 'classteacher':
      return <TeacherTabNavigator />;
    case 'student': return <StudentTabNavigator />;
    case 'accountant': return <AccountantTabNavigator />;
    default: return <StudentTabNavigator />;
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
          <Stack.Screen name="HMRegistrationPublic" component={HMRegistrationPublicScreen} />
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

          {/* Common Screens */}
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />

          {/* Admin Screens */}
          <Stack.Screen name="NotificationManager" component={NotificationManagerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminSettings" component={SettingsScreen} options={{ headerShown: false }} />

          {/* Teacher Screens */}
          {/* Teacher Screens */}
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
          <Stack.Screen name="TeacherMarksEntry" component={TeacherMarksEntryScreen} />
          <Stack.Screen name="TeacherHomeworkManagement" component={TeacherHomeworkManagementScreen} />
          <Stack.Screen name="StudentRegistrationRequests" component={StudentRegistrationRequestsScreen} />
          <Stack.Screen name="TeacherLeaveRequest" component={TeacherLeaveRequestScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherLeaveApproval" component={TeacherLeaveApprovalScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherStudentList" component={TeacherStudentListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherSkinDisease" component={TeacherSkinDiseaseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherVitalScan" component={TeacherVitalScanScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherViewAttendance" component={TeacherViewAttendanceScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} options={{ headerShown: false }} />
          {/* Student Screens */}
          <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
          <Stack.Screen name="StudentMarks" component={StudentMarksScreen} />
          <Stack.Screen name="StudentHomework" component={StudentHomeworkScreen} />
          <Stack.Screen name="StudentFee" component={StudentFeeScreen} />

          <Stack.Screen name="StudentLeave" component={StudentLeaveScreen} />
          <Stack.Screen name="StudentQuestionPapers" component={StudentQuestionPapersScreen} options={{ headerShown: false }} />++9

          {/* HM Screens */}
          {/* HM Screens */}
          <Stack.Screen name="HMDashboard" component={HMDashboardScreen} />
          <Stack.Screen name="HMAttendance" component={HMAttendanceScreen} />
          <Stack.Screen name="HMStudentManagement" component={HMStudentManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMTeacherManagement" component={HMTeacherManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherAssignment" component={HMTeacherAssignmentsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMExams" component={HMExamsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMAnnouncements" component={HMAnnouncementsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMReports" component={HMReportsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMFeeManagement" component={HMFeeManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMExpense" component={HMExpenseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMSettings" component={HMSettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMStudentRegistration" component={HMStudentRegistrationScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StudentAttendanceReport" component={StudentAttendanceReportScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CalendarManagement" component={CalendarManagement} options={{ headerShown: false }} /> {/* Add this line */}

          {/* Principal Screens */}
          <Stack.Screen name="PrincipalDashboard" component={PrincipalDashboardScreen} />
          <Stack.Screen name="PrincipalBranchDetails" component={PrincipalBranchDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PrincipalHMRegistration" component={PrincipalHMRegistrationScreen} options={{ headerShown: false }} />

          {/* Accountant Screens */}
          <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} />
          <Stack.Screen name="AccountantProfile" component={AccountantProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantPaymentEntry" component={HMPaymentEntryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantPayroll" component={AccountantPayrollScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantFeeManagement" component={HMFeeManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantExpense" component={HMExpenseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantReports" component={HMReportsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantSettings" component={AccountantSettingsScreen} options={{ headerShown: false }} />

          {/* Visitor Screens (Logged In) */}
          <Stack.Screen name="VisitorDashboard" component={VisitorDashboardScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}