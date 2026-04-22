// App.tsx - Complete React Native conversion

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Import all your existing components (converted to React Native)
import AdminLogin from './src/screens/auth/LoginScreen';
import SchoolRegistration from './src/screens/auth/RegisterSchoolScreen';
import PricingPage from './src/screens/common/PricingScreen';
import ForgotPassword from './src/screens/auth/ForgotPasswordScreen';

// Role-based imports
import PrincipalDashboard from './src/screens/principal/PrincipalDashboardScreen';
import HMRegistrationInternal from './src/screens/principal/HMRegistrationScreen';

// HM Screens
import HMHome from './src/screens/hm/HMDashboardScreen';
import HMTeachers from './src/screens/hm/TeacherManagementScreen';
import HMStudents from './src/screens/hm/StudentManagementScreen';
import HMAttendance from './src/screens/hm/AttendanceScreen';
import HMExams from './src/screens/hm/ExamsScreen';
import HMTeacherAssignments from './src/screens/hm/HMTeacherAssignmentsscreen';

// Teacher Screens
import TeacherDashboard from './src/screens/teacher/ViewAttendanceScreen';
import TeacherEnroll from './src/screens/teacher/StudentRegistrationScreen';
import TeacherManage from './src/screens/teacher/StudentListScreen';
import TeacherHomework from './src/screens/teacher/HomeworkManagementScreen';
import TeacherLeaveApproval from './src/screens/teacher/LeaveApprovalScreen';
import TeacherMarksEntry from './src/screens/teacher/MarksEntryScreen';
import TeacherVerify from './src/screens/teacher/AttendanceScreen';
import VitalScan from './src/screens/teacher/VitalScanScreen';
import SkinDiseasePrediction from './src/screens/teacher/SkinDiseaseScreen';

// Student Screens
import StudentAttendance from './src/screens/student/StudentAttendanceScreen';
import StudentHomework from './src/screens/student/HomeworkScreen';
import StudentLeave from './src/screens/student/LeaveScreen';
import StudentMarks from './src/screens/student/StudentMarksScreen';

// Visitor Management
import VisitFormPage from './src/screens/visitor/VisitFormScreen';
import VisitSuccessPage from './src/screens/visitor/VisitSuccessScreen';
import VisitorDashboardPage from './src/screens/visitor/VisitorDashboardScreen';

// Utils & Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { getStoredRole, isAuthenticated } from './src/utils/authSession';

export type RootStackParamList = {
  Login: undefined;
  RegisterSchool: undefined;
  ForgotPassword: undefined;
  Pricing: undefined;
  VisitForm: { token: string };
  VisitSuccess: undefined;
  MainApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ================= TEACHER NAVIGATOR =================
const TeacherNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            case 'Homework':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={TeacherDashboard} />
      <Tab.Screen name="Attendance" component={TeacherVerify} />
      <Tab.Screen name="Homework" component={TeacherHomework} />
      <Tab.Screen name="Profile" component={TeacherManage} />
    </Tab.Navigator>
  );
};

// ================= HM NAVIGATOR =================
const HMNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Teachers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Students':
              iconName = focused ? 'school' : 'school-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Visitors':
              iconName = focused ? 'log-in' : 'log-in-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HMHome} />
      <Tab.Screen name="Teachers" component={HMTeachers} />
      <Tab.Screen name="Students" component={HMStudents} />
      <Tab.Screen name="Attendance" component={HMAttendance} />
      <Tab.Screen name="Visitors" component={VisitorDashboardPage} />
    </Tab.Navigator>
  );
};

// ================= STUDENT NAVIGATOR =================
const StudentNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Attendance':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            case 'Homework':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Marks':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Leave':
              iconName = focused ? 'mail' : 'mail-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Attendance" component={StudentAttendance} />
      <Tab.Screen name="Homework" component={StudentHomework} />
      <Tab.Screen name="Marks" component={StudentMarks} />
      <Tab.Screen name="Leave" component={StudentLeave} />
    </Tab.Navigator>
  );
};

// ================= PRINCIPAL NAVIGATOR =================
const PrincipalNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Branches':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'HM Registration':
              iconName = focused ? 'person-add' : 'person-add-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={PrincipalDashboard} />
      <Tab.Screen name="Branches" component={PrincipalDashboard} />
      <Tab.Screen name="HM Registration" component={HMRegistrationInternal} />
    </Tab.Navigator>
  );
};

// ================= ADMIN NAVIGATOR =================
const AdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Schools':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={SchoolRegistration} />
      <Tab.Screen name="Schools" component={SchoolRegistration} />
      <Tab.Screen name="Settings" component={SchoolRegistration} />
    </Tab.Navigator>
  );
};

// ================= MAIN APP CONTENT =================
const AppContent = () => {
  const { userRole, isLoading, setIsLoading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<'Login' | 'MainApp'>('Login');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await isAuthenticated();
      const role = await getStoredRole();
      
      if (authenticated && role) {
        setInitialRoute('MainApp');
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen 
          name="Login" 
          component={AdminLogin}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RegisterSchool" 
          component={SchoolRegistration}
          options={{ title: 'Register School' }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPassword}
          options={{ title: 'Forgot Password' }}
        />
        <Stack.Screen 
          name="Pricing" 
          component={PricingPage}
          options={{ title: 'Pricing Plans' }}
        />
        <Stack.Screen 
          name="VisitForm" 
          component={VisitFormPage}
          options={{ title: 'Visitor Registration' }}
        />
        <Stack.Screen 
          name="VisitSuccess" 
          component={VisitSuccessPage}
          options={{ title: 'Registration Successful' }}
        />
        <Stack.Screen 
          name="MainApp" 
          component={MainAppNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// ================= ROLE-BASED MAIN NAVIGATOR =================
const MainAppNavigator = () => {
  const { userRole } = useAuth();

  switch (userRole) {
    case 'admin':
      return <AdminNavigator />;
    case 'principal':
      return <PrincipalNavigator />;
    case 'hm':
      return <HMNavigator />;
    case 'teacher':
      return <TeacherNavigator />;
    case 'student':
      return <StudentNavigator />;
    default:
      return <AdminLogin navigation={null} />;
  }
};

// ================= APP WRAPPER =================
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}