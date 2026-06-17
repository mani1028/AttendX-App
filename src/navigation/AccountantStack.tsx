import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';
import StaffAttendanceScreen from '../screens/accountant/StaffAttendanceScreen';

const Stack = createNativeStackNavigator();

export default function AccountantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AccountantDashboard"
        component={AccountantDashboardScreen}
      />
      <Stack.Screen
        name="AccountantStaffAttendance"
        component={StaffAttendanceScreen}
        options={{ headerShown: true, title: 'Staff Attendance' }}
      />
    </Stack.Navigator>
  );
}
