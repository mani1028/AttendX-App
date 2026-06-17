import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import AccountSwitcherScreen from '../screens/auth/AccountSwitcherScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="AccountSwitcher" component={AccountSwitcherScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
