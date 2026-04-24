import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AttendXIntro from './src/components/common/AttendXIntro';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIntroStatus = async () => {
      try {
        // Hide native splash screen
        await BootSplash.hide({ fade: true });

        // Check if user has seen intro
        const hasSeenIntro = await AsyncStorage.getItem('has_seen_intro');

        // Show intro only once or based on version
        if (hasSeenIntro === 'true') {
          setShowIntro(false);
        }
      } catch (error) {
        console.error('Error checking intro status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkIntroStatus();
  }, []);

  const handleIntroComplete = async () => {
    try {
      await AsyncStorage.setItem('has_seen_intro', 'true');
    } catch (error) {
      console.error('Error saving intro status:', error);
    }

    setShowIntro(false);
  };

  // Show nothing while checking (native splash should be visible)
  if (isLoading) {
    return null;
  }

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
