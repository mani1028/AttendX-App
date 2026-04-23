import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  HMDashboardScreen,
  TeacherManagementScreen,
  StudentManagementScreen,
  AttendanceScreen,
  FeeManagementScreen,
  ReportsScreen,
  ExamsScreen,
  ExpenseScreen,
  SettingsScreen,
  AnnouncementsScreen,
  DataExportScreen
} from '../screens/hm';

const Stack = createNativeStackNavigator();

export default function HMStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HMDashboard" component={HMDashboardScreen} options={{ title: 'HM Home' }} />
      <Stack.Screen name="TeacherManagement" component={TeacherManagementScreen} options={{ title: 'Manage Teachers' }} />
      <Stack.Screen name="StudentManagement" component={StudentManagementScreen} options={{ title: 'Manage Students' }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <Stack.Screen name="FeeManagement" component={FeeManagementScreen} options={{ title: 'Fee Management' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="Exams" component={ExamsScreen} options={{ title: 'Exams' }} />
      <Stack.Screen name="Expense" component={ExpenseScreen} options={{ title: 'Expenses' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Export Center' }} />
    </Stack.Navigator>
  );
}
