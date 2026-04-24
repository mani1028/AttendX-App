import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AttendXIntro from './src/components/common/AttendXIntro';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  // Check if intro was already shown
  useEffect(() => {
    // You can store this in AsyncStorage to show only once
    // const hasSeenIntro = await AsyncStorage.getItem('has_seen_intro');
    // if (hasSeenIntro) setShowIntro(false);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    // AsyncStorage.setItem('has_seen_intro', 'true');
  };

  if (showIntro) {
    return <AttendXIntro onComplete={handleIntroComplete} duration={2800} />;
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}