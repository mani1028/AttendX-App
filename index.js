/**
 * @format
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

// Polyfill for Array.prototype.findLastIndex and findLast for older JS engines
if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function (predicate, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) return i;
    }
    return -1;
  };
}

if (!Array.prototype.findLast) {
  Array.prototype.findLast = function (predicate, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  };
}

// Firebase Cloud Messaging background handler (must be registered before app starts)
// This runs when the app is closed, minimized, or the phone is asleep
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM Background] Message received while app is closed/background:', remoteMessage);

  if (remoteMessage?.notification || remoteMessage?.data) {
    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'New Notification';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new notification';
    const notificationId = remoteMessage.data?.notificationId || remoteMessage.messageId;

    try {
      // Display notification using Notifee so it appears on lock screen
      await notifee.displayNotification({
        title,
        body,
        data: remoteMessage.data || {},
        android: {
          channelId: 'default',
          visibility: notifee.AndroidVisibility.PUBLIC, // Shows on lock screen
          importance: notifee.AndroidImportance.HIGH,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
          fullScreenAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
          badgeIncrement: true,
          launchImageName: 'LaunchScreen',
        },
      });

      console.log('[FCM Background] Notification displayed:', title);
    } catch (error) {
      console.error('[FCM Background] Failed to display notification:', error);
    }
  }
});

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import App from './App';

AppRegistry.registerComponent(appName, () => App);
