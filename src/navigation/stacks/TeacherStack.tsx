import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TeacherDashboardScreen from '../../screens/teacher/TeacherDashboardScreen';

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ title: 'Teacher Home' }} />
    </Stack.Navigator>
  );
}