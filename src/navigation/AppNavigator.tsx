import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@react-native-vector-icons/ionicons';
import MarkAttendanceScreen from '../components/teacher/MarkAttendanceScreen';

import LoginScreen from '../screens/auth/LoginScreen';
import Header from '../components/common/Header';

import { useAuth } from '../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  VerifyOtp: undefined;
  ResetPassword: undefined;
  RegisterSchool: undefined;
  Pricing: undefined;
  VisitForm: { token: string };
  VisitSuccess: undefined;
  Profile: undefined;
  Notifications: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Tab Navigators ───────────────────────────────────────────────────────────

const TeacherNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Dashboard: ['grid', 'grid-outline'],
          Attendance: ['checkmark-circle', 'checkmark-circle-outline'],
          Homework: ['book', 'book-outline'],
          Students: ['people', 'people-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" getComponent={() => require('../screens/teacher/TeacherDashboardScreen').default} />
    <Tab.Screen name="Attendance" getComponent={() => require('../screens/teacher/AttendanceScreen').default} />
    <Tab.Screen name="Homework" getComponent={() => require('../screens/teacher/HomeworkManagementScreen').default} />
    <Tab.Screen name="Students" getComponent={() => require('../screens/teacher/StudentListScreen').default} />
  </Tab.Navigator>
);

const HMNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Home: ['home', 'home-outline'],
          Teachers: ['people', 'people-outline'],
          Students: ['school', 'school-outline'],
          Attendance: ['calendar', 'calendar-outline'],
          Visitors: ['log-in', 'log-in-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" getComponent={() => require('../screens/hm/HMDashboardScreen').default} />
    <Tab.Screen name="Teachers" getComponent={() => require('../screens/hm/TeacherManagementScreen').default} />
    <Tab.Screen name="Students" getComponent={() => require('../screens/hm/StudentManagementScreen').default} />
    <Tab.Screen name="Attendance" getComponent={() => require('../screens/hm/AttendanceScreen').default} />
    <Tab.Screen name="Visitors" getComponent={() => require('../screens/visitor/VisitorDashboardScreen').default} />
  </Tab.Navigator>
);

const StudentNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Attendance: ['checkmark-circle', 'checkmark-circle-outline'],
          Homework: ['book', 'book-outline'],
          Marks: ['stats-chart', 'stats-chart-outline'],
          Leave: ['mail', 'mail-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Attendance" getComponent={() => require('../screens/student/StudentAttendanceScreen').default} />
    <Tab.Screen name="Homework" getComponent={() => require('../screens/student/HomeworkScreen').default} />
    <Tab.Screen name="Marks" getComponent={() => require('../screens/student/StudentMarksScreen').default} />
    <Tab.Screen name="Leave" getComponent={() => require('../screens/student/LeaveScreen').default} />
  </Tab.Navigator>
);

const AccountantNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Dashboard: ['grid', 'grid-outline'],
          Transactions: ['receipt', 'receipt-outline'],
          Fees: ['cash', 'cash-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" getComponent={() => require('../screens/accountant/AccountantDashboardScreen').default} />
    <Tab.Screen name="Transactions" getComponent={() => require('../screens/accountant/AccountantDashboardScreen').default} />
    <Tab.Screen name="Fees" getComponent={() => require('../screens/accountant/AccountantDashboardScreen').default} />
  </Tab.Navigator>
);

const PrincipalNavigator = () => (
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
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" getComponent={() => require('../screens/principal/PrincipalDashboardScreen').default} />
    <Tab.Screen name="Branches" getComponent={() => require('../screens/principal/PrincipalDashboardScreen').default} />
    <Tab.Screen name="HM Registration" getComponent={() => require('../screens/principal/HMRegistrationScreen').default} />
  </Tab.Navigator>
);

const AdminNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header />,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Dashboard: ['grid', 'grid-outline'],
          'Register School': ['add-circle', 'add-circle-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" getComponent={() => require('../screens/admin/AdminDashboardScreen').default} />
    <Tab.Screen name="Register School" getComponent={() => require('../screens/auth/RegisterSchoolScreen').default} />
  </Tab.Navigator>
);

// ─── Role-based Tab Switcher ──────────────────────────────────────────────────

const MainTabs = () => {
  const { userRole } = useAuth();

  switch (userRole) {
    case 'admin':      return <AdminNavigator />;
    case 'principal':  return <PrincipalNavigator />;
    case 'hm':         return <HMNavigator />;
    case 'teacher':    return <TeacherNavigator />;
    case 'student':    return <StudentNavigator />;
    case 'accountant': return <AccountantNavigator />;
    default:           return <AdminNavigator />;
  }
};

// ─── Root Stack Navigator ─────────────────────────────────────────────────────

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
          // ─── Auth Stack ─────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" getComponent={() => require('../screens/auth/ForgotPasswordScreen').default} />
            <Stack.Screen name="VerifyOtp" getComponent={() => require('../screens/auth/VerifyOtpScreen').default} />
              
            <Stack.Screen name="ResetPassword" getComponent={() => require('../screens/auth/ResetPasswordScreen').default} />
            <Stack.Screen
              name="RegisterSchool"
              getComponent={() => require('../screens/auth/RegisterSchoolScreen').default}
              options={{ headerShown: true, title: 'Register School' }}
            />
            <Stack.Screen
              name="Pricing"
              getComponent={() => require('../screens/common/PricingScreen').default}
              options={{ headerShown: true, title: 'Pricing Plans' }}
            />
          </>
        ) : (
          // ─── Main Application Stack ─────────────────────────────────────────
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            {/* Common screens accessible after login but not in tabs */}
            <Stack.Screen
              name="VisitForm"
              getComponent={() => require('../screens/visitor/VisitFormScreen').default}
              options={{ headerShown: true, title: 'Visitor Registration' }}
            />
            <Stack.Screen
              name="VisitSuccess"
              getComponent={() => require('../screens/visitor/VisitSuccessScreen').default}
              options={{ headerShown: true, title: 'Registration Successful' }}
            />
            <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
            <Stack.Screen
              name="Profile"
              getComponent={() => require('../screens/common/ProfileScreen').default}
              options={{ headerShown: true, title: 'Profile' }}
            />
            <Stack.Screen
              name="Notifications"
              getComponent={() => require('../screens/common/NotificationsScreen').default}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
  );
}