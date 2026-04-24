import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AttendXIntro from './src/components/common/AttendXIntro';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return (
      <AttendXIntro
        onComplete={() => setShowIntro(false)}
        duration={2800} // optional, defaults to 3200
      />
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}