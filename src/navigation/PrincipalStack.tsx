import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PrincipalDashboardScreen from '../screens/principal/PrincipalDashboardScreen';
import TeacherManagementScreen from '../screens/principal/TeacherManagementScreen';
import StudentManagementScreen from '../screens/principal/StudentManagementScreen';
import AttendanceScreen from '../screens/principal/AttendanceScreen';
import PrincipalFeeManagementScreen from '../screens/principal/FeeManagementScreen';
import ReportsScreen from '../screens/principal/ReportsScreen';
import ExamsScreen from '../screens/principal/ExamsScreen';
import ExpenseScreen from '../screens/principal/ExpenseScreen';
import SettingsScreen from '../screens/principal/SettingsScreen';
import AnnouncementsScreen from '../screens/principal/AnnouncementsScreen';
import DataExportScreen from '../screens/principal/DataExportScreen';
import TeacherAssignmentsScreen from '../screens/principal/TeacherAssignmentsScreen';
import TeacherRegistrationRequestsScreen from '../screens/principal/TeacherRegistrationRequestsScreen';
import StudentPromotionScreen from '../screens/principal/StudentPromotionScreen';
import PrincipalFaceReviewScreen from '../screens/principal/PrincipalFaceReviewScreen';
import Student360Screen from '../screens/principal/Student360Screen';

const Stack = createNativeStackNavigator();

export default function PrincipalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PrincipalDashboard" component={PrincipalDashboardScreen} options={{ title: 'Principal Home', headerShown: false }} />
      <Stack.Screen name="TeacherManagement" component={TeacherManagementScreen} options={{ title: 'Manage Teachers' }} />
      <Stack.Screen name="TeacherRegistrationRequests" component={TeacherRegistrationRequestsScreen} options={{ title: 'Registration Requests' }} />
      <Stack.Screen name="StudentManagement" component={StudentManagementScreen} options={{ title: 'Manage Students' }} />
      <Stack.Screen name="StudentPromotion" component={StudentPromotionScreen} options={{ title: 'Student Promotion', headerShown: false }} />
      <Stack.Screen name="TeacherAssignment" component={TeacherAssignmentsScreen} options={{ title: 'Teacher Assignment', headerShown: false }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <Stack.Screen name="FeeManagement" component={PrincipalFeeManagementScreen} options={{ title: 'Fee Management' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="Exams" component={ExamsScreen} options={{ title: 'Exams' }} />
      <Stack.Screen name="Expense" component={ExpenseScreen} options={{ title: 'Expenses' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Export Center' }} />
      <Stack.Screen name="PrincipalFaceReview" component={PrincipalFaceReviewScreen} options={{ title: 'Face Review' }} />
      <Stack.Screen name="Student360" component={Student360Screen} options={{ title: 'Student 360' }} />
    </Stack.Navigator>
  );
}
