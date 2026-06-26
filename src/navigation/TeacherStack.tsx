import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AttendanceScreen from '../screens/teacher/AttendanceScreen';
import StudentListScreen from '../screens/teacher/StudentListScreen';
import TeacherFaceReviewScreen from '../screens/teacher/TeacherFaceReviewScreen';
import TeacherRegisterPublicScreen from '../screens/public/TeacherRegisterPublicScreen';
import TeacherMyAttendanceScreen from '../screens/teacher/TeacherMyAttendanceScreen';
import TeacherQuestionPapersScreen from '../screens/teacher/TeacherQuestionPapersScreen';

const Stack = createNativeStackNavigator();

export default function TeacherStack() {
  return (
    <Stack.Navigator initialRouteName="Attendance">
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="StudentList" component={StudentListScreen} />
      <Stack.Screen name="TeacherRegistration" component={TeacherRegisterPublicScreen} />
      <Stack.Screen name="TeacherFaceReview" component={TeacherFaceReviewScreen} options={{ title: 'Face Review' }} />
      <Stack.Screen name="TeacherMyAttendance" component={TeacherMyAttendanceScreen} options={{ title: 'My Attendance' }} />
      <Stack.Screen name="TeacherQuestionPapers" component={TeacherQuestionPapersScreen} options={{ title: 'Question Papers' }} />
    </Stack.Navigator>
  );
}
