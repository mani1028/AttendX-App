import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentFeeScreen from '../screens/student/StudentFeeScreen';
import StudentMarksScreen from '../screens/student/StudentMarksScreen';
import { StudentStackParamList } from './types';

const Stack = createNativeStackNavigator<StudentStackParamList>();

export default function StudentStack() {
  return (
    <Stack.Navigator initialRouteName="StudentAttendance">
      <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} options={{ title: 'Attendance' }} />
      <Stack.Screen name="StudentMarks" component={StudentMarksScreen} options={{ title: 'Marks' }} />
      <Stack.Screen name="StudentFee" component={StudentFeeScreen} options={{ title: 'Fee' }} />
    </Stack.Navigator>
  );
}
