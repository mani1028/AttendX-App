import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  PrincipalDashboardScreen,
  TeacherManagementScreen,
  StudentManagementScreen,
  AttendanceScreen,
  FeeManagementScreen as PrincipalFeeManagementScreen,
  ReportsScreen,
  ExamsScreen,
  ExpenseScreen,
  SettingsScreen,
  AnnouncementsScreen,
  DataExportScreen,
  TeacherAssignmentsScreen,
  TeacherRegistrationRequestsScreen,
  StudentPromotionScreen,
  PrincipalFaceReviewScreen
} from '../screens/principal';

const Stack = createNativeStackNavigator();

export default function PrincipalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PrincipalDashboard" component={PrincipalDashboardScreen} options={{ title: 'Principal Home', headerShown: false }} />
      <Stack.Screen name="TeacherManagement" component={TeacherManagementScreen} options={{ title: 'Manage Teachers' }} />
      <Stack.Screen name="TeacherRegistrationRequests" component={TeacherRegistrationRequestsScreen} options={{ title: 'Registration Requests' }} />
      <Stack.Screen name="StudentManagement" component={StudentManagementScreen} options={{ title: 'Manage Students' }} />
      <Stack.Screen name="StudentPromotion" component={StudentPromotionScreen} options={{ title: 'Student Promotion' }} />
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
    </Stack.Navigator>
  );
}
