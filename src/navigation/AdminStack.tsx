import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AutoPayTrackerScreen from '../screens/admin/AutoPayTrackerScreen';
import ManualAttendanceManagerScreen from '../screens/admin/ManualAttendanceManagerScreen';
import PaymentHistoryScreen from '../screens/admin/PaymentHistoryScreen';
import NotificationManagerScreen from '../screens/admin/NotificationManagerScreen';
import SchoolDetailsScreen from '../screens/admin/SchoolDetailsScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Home' }} />
      <Stack.Screen name="AutoPayTracker" component={AutoPayTrackerScreen} options={{ title: 'Auto Pay Tracker' }} />
      <Stack.Screen name="ManualAttendanceManager" component={ManualAttendanceManagerScreen} options={{ title: 'Manual Attendance' }} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment History' }} />
      <Stack.Screen name="NotificationManager" component={NotificationManagerScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} options={{ title: 'School Details' }} />
    </Stack.Navigator>
  );
}
