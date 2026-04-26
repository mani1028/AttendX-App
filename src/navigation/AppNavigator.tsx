import React from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  CheckCircle2,
  BarChart3,
  BookOpen,
  Mail,
  Camera,
  CreditCard,
  TrendingDown,
  Coins
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import CustomTabBar from '../components/layout/CustomTabBar';
import TeacherTabBar from '../components/layout/TeacherTabBar';

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
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, any> = {
          Home: Home,
          Teachers: Users,
          Students: GraduationCap,
          Attendance: CalendarCheck,
          Fees: Wallet,
          Visitors: LogIn,
        };
        const IconComponent = icons[route.name] ?? Home;
        return <IconComponent size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
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
    tabBar={(props) => <TeacherTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={TeacherDashboardScreen} />
    <Tab.Screen name="Homework" component={TeacherHomeworkManagementScreen} />
    <Tab.Screen name="Scan" component={TeacherVitalScanScreen} />
    <Tab.Screen name="Leaves" component={TeacherLeaveApprovalScreen} />
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
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, any> = {
          Dashboard: LayoutGrid,
          Payments: CreditCard,
          Payroll: Coins,
          Fees: GraduationCap,
          Expenses: TrendingDown,
          Reports: BarChart3,
        };
        const IconComponent = icons[route.name] ?? LayoutGrid;
        return <IconComponent size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
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
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          
          {/* Admin Screens */}
          <Stack.Screen name="NotificationManager" component={NotificationManagerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminSettings" component={SettingsScreen} options={{ headerShown: false }} />
          
          {/* Teacher Screens */}
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
          <Stack.Screen name="TeacherMarksEntry" component={TeacherMarksEntryScreen} />
          <Stack.Screen name="TeacherHomeworkManagement" component={TeacherHomeworkManagementScreen} />
          <Stack.Screen name="TeacherLeaveRequest" component={TeacherLeaveRequestScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherLeaveApproval" component={TeacherLeaveApprovalScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherStudentList" component={TeacherStudentListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherSkinDisease" component={TeacherSkinDiseaseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherVitalScan" component={TeacherVitalScanScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherViewAttendance" component={TeacherViewAttendanceScreen} options={{ headerShown: false }} />
          <Stack.Screen name="TeacherAttendanceGallery" component={TeacherAttendanceGalleryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} options={{ headerShown: false }} />
          
          {/* Student Screens */}
          <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
          <Stack.Screen name="StudentMarks" component={StudentMarksScreen} />
          <Stack.Screen name="StudentHomework" component={StudentHomeworkScreen} />
          <Stack.Screen name="StudentFee" component={StudentFeeScreen} />
          <Stack.Screen name="StudentLeave" component={StudentLeaveScreen} />
          <Stack.Screen name="StudentQuestionPapers" component={StudentQuestionPapersScreen} options={{ headerShown: false }} />
          
          {/* HM Screens */}
          <Stack.Screen name="HMDashboard" component={HMDashboardScreen} />
          <Stack.Screen name="HMAttendance" component={HMAttendanceScreen} />
          <Stack.Screen name="HMStudentManagement" component={HMStudentManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMTeacherManagement" component={HMTeacherManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMExams" component={HMExamsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMAnnouncements" component={HMAnnouncementsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMReports" component={HMReportsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMFeeManagement" component={HMFeeManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMExpense" component={HMExpenseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMSettings" component={HMSettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HMStudentRegistration" component={HMStudentRegistrationScreen} options={{ headerShown: false }} />
          
          {/* Principal Screens */}
          <Stack.Screen name="PrincipalDashboard" component={PrincipalDashboardScreen} />
          <Stack.Screen name="PrincipalBranchDetails" component={PrincipalBranchDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PrincipalHMRegistration" component={PrincipalHMRegistrationScreen} options={{ headerShown: false }} />
          
          {/* Accountant Screens */}
          <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} />
          <Stack.Screen name="AccountantPaymentEntry" component={AccountantPaymentEntryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantPayroll" component={AccountantPayrollScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantFeeManagement" component={AccountantFeeManagementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantExpense" component={AccountantExpenseScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantReports" component={AccountantReportsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AccountantSettings" component={AccountantSettingsScreen} options={{ headerShown: false }} />
          
          {/* Visitor Screens (Logged In) */}
          <Stack.Screen name="VisitorDashboard" component={VisitorDashboardScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}