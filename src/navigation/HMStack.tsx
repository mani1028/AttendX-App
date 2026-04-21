import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HMDashboardScreen from '../screens/hm/HMDashboardScreen';

const Stack = createNativeStackNavigator();

export default function HMStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HMDashboard" component={HMDashboardScreen} options={{ title: 'HM Home' }} />
    </Stack.Navigator>
  );
}
