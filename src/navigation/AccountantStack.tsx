import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';

const Stack = createNativeStackNavigator();

export default function AccountantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AccountantDashboard"
        component={AccountantDashboardScreen}
      />
    </Stack.Navigator>
  );
}
