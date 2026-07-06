import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { 
  getMessaging, 
  onNotificationOpenedApp, 
  getInitialNotification, 
  requestPermission 
} from '@react-native-firebase/messaging';
import AttendXIntro from './src/components/common/AttendXIntro';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationContextProvider } from './src/context/NotificationContext';
import notificationService from './src/services/notificationService';
import { offlineQueueSync } from './src/services/offlineQueueSync';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import { Theme } from './src/theme/tokens';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const messaging = getMessaging();

    // Initialize notification service on app startup
    const initializeNotifications = async () => {
      try {
        // Request notification permission on iOS
        const authStatus = await requestPermission(messaging);
        console.log('=== NOTIFICATION PERMISSION STATUS ===');
        console.log('Permission:', authStatus);

        await notificationService.initialize();
        console.log('App: Notifications initialized with Firebase support');

        // Get FCM token for backend
        const fcmToken = await notificationService.getFcmToken();
        console.log('=== FCM TOKEN ===');
        console.log('FCM TOKEN:', fcmToken);
        console.log('================================');

        await notificationService.ensureFcmTokenSynced();
      } catch (error) {
        console.error('App: Failed to initialize notifications:', error);
      }
    };

    // Handle notification opened when app is closed (user taps notification)
    const unsubscribe = onNotificationOpenedApp(messaging, (remoteMessage) => {
      console.log('App opened from notification:', remoteMessage);
      // You can navigate to the notification screen or specific notification here
      // navigation.navigate('Notifications');
    });

    // Check for initial notification when app is launched from a closed state
    getInitialNotification(messaging)
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App: Launched from closed state by notification:', remoteMessage);
          // You can navigate to notifications screen here
        }
      });

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
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationContextProvider>
            <ErrorBoundary>
              <BottomSheetModalProvider>
                <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
                  <NavigationContainer>
                    <AppNavigator />
                  </NavigationContainer>
                  {showIntro ? (
                    <AttendXIntro
                      onComplete={() => setShowIntro(false)}
                      duration={2800}
                    />
                  ) : null}
                </View>
              </BottomSheetModalProvider>
            </ErrorBoundary>
          </NotificationContextProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
