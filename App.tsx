import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AttendXIntro from './src/components/common/AttendXIntro';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

<<<<<<< HEAD
=======
  const handleIntroComplete = () => {
    setShowIntro(false);
  };

>>>>>>> 9e4494193dddbf451bbfc9bbe59d1bb5ba1a23b5
  if (showIntro) {
    return (
      <AttendXIntro
        onComplete={() => setShowIntro(false)}
        duration={2800}
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