import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PrincipalDashboardScreen from '../screens/principal/PrincipalDashboardScreen';
import PrincipalBranchDetailsScreen from '../screens/principal/BranchDetailsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function PrincipalStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="PrincipalDashboard"
        component={PrincipalDashboardScreen}
        options={{ title: 'Principal Home' }}
      />
      <Stack.Screen
        name="PrincipalBranchDetails"
        component={PrincipalBranchDetailsScreen}
        options={{ title: 'Branch Details' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}
