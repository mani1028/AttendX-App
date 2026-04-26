import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';

const Stack = createNativeStackNavigator();

export default function AccountantStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AccountantDashboard"
        component={AccountantDashboardScreen}
        options={{ title: 'Accountant Home' }}
      />
    </Stack.Navigator>
  );
}
