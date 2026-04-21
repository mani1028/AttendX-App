import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VisitorDashboardScreen from '../../screens/visitor/VisitorDashboardScreen';

const Stack = createNativeStackNavigator();

export default function VisitorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="VisitorDashboard" component={VisitorDashboardScreen} options={{ title: 'Visitor Home' }} />
    </Stack.Navigator>
  );
}