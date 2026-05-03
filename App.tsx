import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AttendXIntro from './src/components/common/AttendXIntro';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationContextProvider } from './src/context/NotificationContext';
import notificationService from './src/services/notificationService';
import { offlineQueueSync } from './src/services/offlineQueueSync';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Initialize notification service on app startup
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
        console.log('App: Notifications initialized');
      } catch (error) {
        console.error('App: Failed to initialize notifications:', error);
      }
    };

    // Initialize offline queue sync
    const initializeOfflineSync = () => {
      try {
        offlineQueueSync.startMonitoring();
        console.log('App: Offline sync initialized');
      } catch (error) {
        console.error('App: Failed to initialize offline sync:', error);
      }
    };

    initializeNotifications();
    initializeOfflineSync();

    // Cleanup on unmount
    return () => {
      offlineQueueSync.stopMonitoring();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationContextProvider>
            {showIntro ? (
              <AttendXIntro
                onComplete={() => setShowIntro(false)}
                duration={2800}
              />
            ) : (
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            )}
          </NotificationContextProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
