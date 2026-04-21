import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PrincipalDashboardScreen from '../../screens/principal/PrincipalDashboardScreen';

const Stack = createNativeStackNavigator();

export default function PrincipalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PrincipalDashboard"
        component={PrincipalDashboardScreen}
        options={{ title: 'Principal Home' }}
      />
    </Stack.Navigator>
  );
}