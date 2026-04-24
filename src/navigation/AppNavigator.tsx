import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@react-native-vector-icons/ionicons';

import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';

// ─── Auth Screens ───────────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import RegisterSchoolScreen from '../screens/auth/RegisterSchoolScreen';

// ─── Common Screens ─────────────────────────────────────────────────────────
import ProfileScreen from '../screens/common/ProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import PricingScreen from '../screens/common/PricingScreen';
import LoadingScreen from '../screens/common/LoadingScreen';

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
import TeacherSkinDiseaseScreen from '../screens/teacher/SkinDiseaseScreen';
import TeacherVitalScanScreen from '../screens/teacher/VitalScanScreen';
import TeacherViewAttendanceScreen from '../screens/teacher/ViewAttendanceScreen';
import TeacherAttendanceGalleryScreen from '../screens/teacher/AttendanceGalleryScreen';
import MarkAttendanceScreen from '../components/teacher/MarkAttendanceScreen';

// ─── Student Screens ────────────────────────────────────────────────────────
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentMarksScreen from '../screens/student/StudentMarksScreen';
import StudentHomeworkScreen from '../screens/student/HomeworkScreen';
import StudentFeeScreen from '../screens/student/StudentFeeScreen';
import StudentLeaveScreen from '../screens/student/LeaveScreen';
import StudentQuestionPapersScreen from '../screens/student/QuestionPapersScreen';

// ─── HM (Head Master) Screens ───────────────────────────────────────────────
import HMDashboardScreen from '../screens/hm/HMDashboardScreen';
import HMAttendanceScreen from '../screens/hm/AttendanceScreen';
import HMStudentManagementScreen from '../screens/hm/StudentManagementScreen';
import HMTeacherManagementScreen from '../screens/hm/TeacherManagementScreen';
import HMExamsScreen from '../screens/hm/ExamsScreen';
import HMAnnouncementsScreen from '../screens/hm/AnnouncementsScreen';
import HMReportsScreen from '../screens/hm/ReportsScreen';
import HMFeeManagementScreen from '../screens/hm/FeeManagementScreen';
import HMExpenseScreen from '../screens/hm/ExpenseScreen';
import HMSettingsScreen from '../screens/hm/SettingsScreen';
import HMStudentRegistrationScreen from '../screens/teacher/StudentRegistrationScreen';

// ─── Principal Screens ──────────────────────────────────────────────────────
import PrincipalDashboardScreen from '../screens/principal/PrincipalDashboardScreen';
import PrincipalBranchDetailsScreen from '../screens/principal/BranchDetailsScreen';
import PrincipalHMRegistrationScreen from '../screens/principal/HMRegistrationScreen';

// ─── Accountant Screens ─────────────────────────────────────────────────────
import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';
import AccountantPaymentEntryScreen from '../screens/accountant/PaymentEntryScreen';
import AccountantPayrollScreen from '../screens/accountant/PayrollScreen';
import AccountantFeeManagementScreen from '../screens/accountant/FeeManagementScreen';
import AccountantExpenseScreen from '../screens/accountant/ExpenseScreen';
import AccountantReportsScreen from '../screens/accountant/ReportsScreen';
import AccountantSettingsScreen from '../screens/accountant/SettingsScreen';

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
  Profile: undefined;
  Notifications: undefined;
  Loading: undefined;
  
  // Admin
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
  TeacherAttendanceGallery: undefined;
  MarkAttendance: undefined;
  
  // Student
  StudentDashboard: undefined;
  StudentAttendance: undefined;
  StudentMarks: undefined;
  StudentHomework: undefined;
  StudentFee: undefined;
  StudentLeave: undefined;
  StudentQuestionPapers: undefined;
  
  // HM
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
  
  // Principal
  PrincipalDashboard: undefined;
  PrincipalBranchDetails: { branchId: string; branchName: string; hmName: string; hmEmail: string; branchStatus: string };
  PrincipalHMRegistration: undefined;
  
  // Accountant
  AccountantDashboard: undefined;
  AccountantPaymentEntry: undefined;
  AccountantPayroll: undefined;
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
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Dashboard: ['grid', 'grid-outline'],
          Schools: ['business', 'business-outline'],
          Notifications: ['notifications', 'notifications-outline'],
          Settings: ['settings', 'settings-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={(focused ? active : inactive) as any} size={size} color={color} />;
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
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Dashboard: ['grid', 'grid-outline'],
          Branches: ['business', 'business-outline'],
          'HM Registration': ['person-add', 'person-add-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={(focused ? active : inactive) as any} size={size} color={color} />;
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
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Home: ['home', 'home-outline'],
          Teachers: ['people', 'people-outline'],
          Students: ['school', 'school-outline'],
          Attendance: ['calendar', 'calendar-outline'],
          Fees: ['cash', 'cash-outline'],
          Visitors: ['log-in', 'log-in-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={(focused ? active : inactive) as any} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={HMDashboardScreen} />
    <Tab.Screen name="Teachers" component={HMTeacherManagementScreen} />
    <Tab.Screen name="Students" component={HMStudentManagementScreen} />
    <Tab.Screen name="Attendance" component={HMAttendanceScreen} />
    <Tab.Screen name="Fees" component={HMFeeManagementScreen} />
    <Tab.Screen name="Visitors" component={VisitorDashboardScreen} />
  </Tab.Navigator>
);

const TeacherTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Home: ['home', 'home-outline'],
          Attendance: ['checkmark-circle', 'checkmark-circle-outline'],
          Marks: ['stats-chart', 'stats-chart-outline'],
          Homework: ['book', 'book-outline'],
          Students: ['people', 'people-outline'],
          Leaves: ['mail', 'mail-outline'],
          Scan: ['camera', 'camera-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={(focused ? active : inactive) as any} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={TeacherDashboardScreen} />
    <Tab.Screen name="Attendance" component={TeacherAttendanceScreen} />
    <Tab.Screen name="Marks" component={TeacherMarksEntryScreen} />
    <Tab.Screen name="Homework" component={TeacherHomeworkManagementScreen} />
    <Tab.Screen name="Students" component={TeacherStudentListScreen} />
    <Tab.Screen name="Leaves" component={TeacherLeaveApprovalScreen} />
    <Tab.Screen name="Scan" component={TeacherVitalScanScreen} />
  </Tab.Navigator>
);

const StudentTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Home: ['home', 'home-outline'],
          Attendance: ['checkmark-circle', 'checkmark-circle-outline'],
          Marks: ['stats-chart', 'stats-chart-outline'],
          Homework: ['book', 'book-outline'],
          Fees: ['cash', 'cash-outline'],
          Leave: ['mail', 'mail-outline'],
          Papers: ['document-text', 'document-text-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={(focused ? active : inactive) as any} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={StudentDashboardScreen} />
    <Tab.Screen name="Attendance" component={StudentAttendanceScreen} />
    <Tab.Screen name="Marks" component={StudentMarksScreen} />
    <Tab.Screen name="Homework" component={StudentHomeworkScreen} />
    <Tab.Screen name="Fees" component={StudentFeeScreen} />
    <Tab.Screen name="Leave" component={StudentLeaveScreen} />
    <Tab.Screen name="Papers" component={StudentQuestionPapersScreen} />
  </Tab.Navigator>
);

const AccountantTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Dashboard: ['grid', 'grid-outline'],
          Payments: ['card', 'card-outline'],
          Payroll: ['cash', 'cash-outline'],
          Fees: ['school', 'school-outline'],
          Expenses: ['trending-down', 'trending-down-outline'],
          Reports: ['bar-chart', 'bar-chart-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={(focused ? active : inactive) as any} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" component={AccountantDashboardScreen} />
    <Tab.Screen name="Payments" component={AccountantPaymentEntryScreen} />
    <Tab.Screen name="Payroll" component={AccountantPayrollScreen} />
    <Tab.Screen name="Fees" component={AccountantFeeManagementScreen} />
    <Tab.Screen name="Expenses" component={AccountantExpenseScreen} />
    <Tab.Screen name="Reports" component={AccountantReportsScreen} />
  </Tab.Navigator>
);

// ─── Role-based Tab Switcher ────────────────────────────────────────────────

const MainTabs = () => {
  const { userRole } = useAuth();

  switch (userRole?.toLowerCase()) {
    case 'admin':      return <AdminTabNavigator />;
    case 'principal':  return <PrincipalTabNavigator />;
    case 'hm':         return <HMTabNavigator />;
    case 'teacher':    return <TeacherTabNavigator />;
    case 'student':    return <StudentTabNavigator />;
    case 'accountant': return <AccountantTabNavigator />;
    default:           return <StudentTabNavigator />;
  }
};

// ─── Root Stack Navigator ───────────────────────────────────────────────────

export default function AppNavigator() {
  const { userRole, userToken, isLoading } = useAuth();

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
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          
          {/* Admin Screens */}
          <Stack.Screen name="NotificationManager" component={NotificationManagerScreen} options={{ headerShown: true, title: 'Notifications' }} />
          <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} options={{ headerShown: true, title: 'School Details' }} />
          <Stack.Screen name="AdminSettings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
          
          {/* Teacher Screens */}
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
          <Stack.Screen name="TeacherMarksEntry" component={TeacherMarksEntryScreen} />
          <Stack.Screen name="TeacherHomeworkManagement" component={TeacherHomeworkManagementScreen} />
          <Stack.Screen name="TeacherLeaveRequest" component={TeacherLeaveRequestScreen} options={{ headerShown: true, title: 'Leave Request' }} />
          <Stack.Screen name="TeacherLeaveApproval" component={TeacherLeaveApprovalScreen} options={{ headerShown: true, title: 'Leave Approval' }} />
          <Stack.Screen name="TeacherStudentList" component={TeacherStudentListScreen} options={{ headerShown: true, title: 'My Students' }} />
          <Stack.Screen name="TeacherSkinDisease" component={TeacherSkinDiseaseScreen} options={{ headerShown: true, title: 'Skin Disease Analysis' }} />
          <Stack.Screen name="TeacherVitalScan" component={TeacherVitalScanScreen} options={{ headerShown: true, title: 'Vital Scan' }} />
          <Stack.Screen name="TeacherViewAttendance" component={TeacherViewAttendanceScreen} options={{ headerShown: true, title: 'View Attendance' }} />
          <Stack.Screen name="TeacherAttendanceGallery" component={TeacherAttendanceGalleryScreen} options={{ headerShown: true, title: 'Attendance Gallery' }} />
          <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} options={{ headerShown: true, title: 'Mark Attendance' }} />
          
          {/* Student Screens */}
          <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
          <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
          <Stack.Screen name="StudentMarks" component={StudentMarksScreen} />
          <Stack.Screen name="StudentHomework" component={StudentHomeworkScreen} />
          <Stack.Screen name="StudentFee" component={StudentFeeScreen} />
          <Stack.Screen name="StudentLeave" component={StudentLeaveScreen} />
          <Stack.Screen name="StudentQuestionPapers" component={StudentQuestionPapersScreen} options={{ headerShown: true, title: 'Question Papers' }} />
          
          {/* HM Screens */}
          <Stack.Screen name="HMDashboard" component={HMDashboardScreen} />
          <Stack.Screen name="HMAttendance" component={HMAttendanceScreen} />
          <Stack.Screen name="HMStudentManagement" component={HMStudentManagementScreen} options={{ headerShown: true, title: 'Student Management' }} />
          <Stack.Screen name="HMTeacherManagement" component={HMTeacherManagementScreen} options={{ headerShown: true, title: 'Teacher Management' }} />
          <Stack.Screen name="HMExams" component={HMExamsScreen} options={{ headerShown: true, title: 'Exam Management' }} />
          <Stack.Screen name="HMAnnouncements" component={HMAnnouncementsScreen} options={{ headerShown: true, title: 'Announcements' }} />
          <Stack.Screen name="HMReports" component={HMReportsScreen} options={{ headerShown: true, title: 'Reports' }} />
          <Stack.Screen name="HMFeeManagement" component={HMFeeManagementScreen} options={{ headerShown: true, title: 'Fee Management' }} />
          <Stack.Screen name="HMExpense" component={HMExpenseScreen} options={{ headerShown: true, title: 'Expenses' }} />
          <Stack.Screen name="HMSettings" component={HMSettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="HMStudentRegistration" component={HMStudentRegistrationScreen} options={{ headerShown: true, title: 'Register Student' }} />
          
          {/* Principal Screens */}
          <Stack.Screen name="PrincipalDashboard" component={PrincipalDashboardScreen} />
          <Stack.Screen name="PrincipalBranchDetails" component={PrincipalBranchDetailsScreen} options={{ headerShown: true, title: 'Branch Details' }} />
          <Stack.Screen name="PrincipalHMRegistration" component={PrincipalHMRegistrationScreen} options={{ headerShown: true, title: 'Register HM' }} />
          
          {/* Accountant Screens */}
          <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} />
          <Stack.Screen name="AccountantPaymentEntry" component={AccountantPaymentEntryScreen} options={{ headerShown: true, title: 'Payment Entry' }} />
          <Stack.Screen name="AccountantPayroll" component={AccountantPayrollScreen} options={{ headerShown: true, title: 'Payroll Management' }} />
          <Stack.Screen name="AccountantFeeManagement" component={AccountantFeeManagementScreen} options={{ headerShown: true, title: 'Fee Management' }} />
          <Stack.Screen name="AccountantExpense" component={AccountantExpenseScreen} options={{ headerShown: true, title: 'Expenses' }} />
          <Stack.Screen name="AccountantReports" component={AccountantReportsScreen} options={{ headerShown: true, title: 'Reports' }} />
          <Stack.Screen name="AccountantSettings" component={AccountantSettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
          
          {/* Visitor Screens (Logged In) */}
          <Stack.Screen name="VisitorDashboard" component={VisitorDashboardScreen} options={{ headerShown: true, title: 'Visitor Management' }} />
        </>
      )}
    </Stack.Navigator>
  );
}