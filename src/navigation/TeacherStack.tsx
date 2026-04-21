import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AttendanceScreen from '../screens/teacher/AttendanceScreen';
import StudentListScreen from '../screens/teacher/StudentListScreen';
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherRegistrationScreen from '../screens/teacher/TeacherRegistrationScreen';

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={TeacherDashboardScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="StudentList" component={StudentListScreen} />
      <Stack.Screen name="TeacherRegistration" component={TeacherRegistrationScreen} />
    </Stack.Navigator>
  );
}
