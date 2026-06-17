import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DirectorDashboardScreen from '../screens/director/DirectorDashboardScreen';
import DirectorBranchDetailsScreen from '../screens/director/BranchDetailsScreen';
import PrincipalRegistrationScreen from '../screens/director/PrincipalRegistrationScreen';
import DirectorBillingScreen from '../screens/director/DirectorBillingScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import RenewalPaymentScreen from '../screens/director/RenewalPaymentScreen';

const Stack = createNativeStackNavigator();

export default function DirectorStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="DirectorDashboard"
        component={DirectorDashboardScreen}
        options={{ title: 'Director Home' }}
      />
      <Stack.Screen
        name="DirectorBranchDetails"
        component={DirectorBranchDetailsScreen}
        options={{ title: 'Branch Details' }}
      />
      <Stack.Screen
        name="PrincipalRegistration"
        component={PrincipalRegistrationScreen}
        options={{ title: 'Principal Registration' }}
      />
      <Stack.Screen
        name="DirectorBilling"
        component={DirectorBillingScreen}
        options={{ title: 'Subscription & Billing' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="RenewalPayment"
        component={RenewalPaymentScreen}
        options={{ title: 'Renewal & Payment' }}
      />
    </Stack.Navigator>
  );
}
