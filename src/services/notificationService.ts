import notifee, { AndroidImportance, AndroidBadgeIconType, AuthorizationStatus } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '../utils/storage';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  notificationId?: string;
}

class NotificationService {
  private initialized = false;

  /**
   * Initialize notification service
   * Set up channels and request permissions
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Request user permission for notifications (iOS)
      const permission = await notifee.requestPermission();
      
      if (permission.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        console.log('Notification permission not granted');
      }

      // Create Android notification channels
      await this.createNotificationChannels();
      
      // Set up foreground notification handler
      this.setupForegroundHandler();
      
      this.initialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Create Android notification channels for different notification types
   */
  private async createNotificationChannels(): Promise<void> {
    try {
      // Main channel for all notifications
      await notifee.createChannel({
        id: 'general',
        name: 'General Notifications',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#007AFF',
      });

      // Channel for urgent notifications (appears on lock screen)
      await notifee.createChannel({
        id: 'urgent',
        name: 'Urgent Notifications',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#FF0000',
      });

      // Channel for lock screen notifications
      await notifee.createChannel({
        id: 'lockscreen',
        name: 'Lock Screen Notifications',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#007AFF',
      });

      console.log('Notification channels created');
    } catch (error) {
      console.error('Failed to create notification channels:', error);
    }
  }

  /**
   * Setup foreground notification handler
   * Called when app is in foreground
   */
  private setupForegroundHandler(): void {
    try {
      notifee.onForegroundEvent(({ type, detail }) => {
        console.log('Foreground notification received:', detail);
        
        // Handle notification pressed
        if (type === 1) { // PRESS
          const data = detail?.notification?.data as Record<string, string> | undefined;
          this.handleNotificationPress(data);
        }
      });

      // Setup background notification handler (app in background or closed)
      this.setupBackgroundHandler();
    } catch (error) {
      console.error('Failed to setup foreground handler:', error);
    }
  }

  /**
   * Setup background notification handler
   * Called when app is in background or closed
   */
  private setupBackgroundHandler(): void {
    try {
      notifee.onBackgroundEvent(async ({ type, detail }) => {
        console.log('[Background Notification]', type, detail);
        
        // Handle notification press while app is closed/background
        if (type === 1) { // PRESS
          const data = detail?.notification?.data as Record<string, string> | undefined;
          console.log('[Background] Notification pressed:', data);
          
          // Store the press action for the app to handle when it opens
          try {
            await AsyncStorage.setItem(
              'background_notification_action',
              JSON.stringify({ data, timestamp: Date.now() })
            );
          } catch (e) {
            console.error('Failed to store background notification action:', e);
          }
        }
      });

      console.log('Background notification handler setup complete');
    } catch (error) {
      console.error('Failed to setup background handler:', error);
    }
  }

  /**
   * Display notification
   * @param payload - Notification content
   * @param isUrgent - Whether this is an urgent notification
   * @param showOnLockscreen - Whether to show on lock screen
   */
  async displayNotification(
    payload: NotificationPayload,
    isUrgent: boolean = false,
    showOnLockscreen: boolean = true
  ): Promise<string> {
    try {
      const channelId = isUrgent ? 'urgent' : 'general';

      const notificationId = await notifee.displayNotification({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        android: {
          channelId,
          importance: isUrgent ? AndroidImportance.HIGH : AndroidImportance.HIGH,
          smallIcon: 'ic_launcher',
          badgeIconType: AndroidBadgeIconType.LARGE,
          pressAction: {
            id: 'default',
          },
          // Force show on lock screen
          ...(showOnLockscreen && {
            fullScreenAction: {
              id: 'default',
            },
          }),
        },
        ios: {
          sound: 'default',
        },
      });

      // Update unread notifications count
      await this.recordNotification(payload.notificationId || notificationId);

      return notificationId;
    } catch (error) {
      console.error('Failed to display notification:', error);
      throw error;
    }
  }

  /**
   * Record notification as received (for badge count)
   */
  private async recordNotification(notificationId: string): Promise<void> {
    try {
      const readStatus = await AsyncStorage.getItem('read_notifications');
      const readIds = safeJsonParse<string[]>(readStatus, [], () => {
        AsyncStorage.setItem('read_notifications', JSON.stringify([])).catch(() => {});
      });
      
      // Don't mark new notifications as read automatically
      // They will be marked as read when user views them
      
      // Update unread count (optional: trigger a refresh event)
      await AsyncStorage.setItem('notification_updated', JSON.stringify({ timestamp: Date.now() }));
    } catch (error) {
      console.error('Failed to record notification:', error);
    }
  }

  /**
   * Handle notification press event
   */
  private handleNotificationPress(data?: Record<string, string>): void {
    console.log('Notification pressed with data:', data);
    // Add logic to navigate to notifications screen or specific notification
    // This can be connected to React Navigation later
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const role = (await AsyncStorage.getItem('user_role')) || 
                   (await AsyncStorage.getItem('userRole')) || 
                   'student';

      const endpoint = `/notifications/${role.toLowerCase()}/list`;
      
      // This would be called from the hook, just providing the logic here
      return 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Update app badge count (total unread notifications)
   */
  async updateBadgeCount(count: number): Promise<void> {
    try {
      await notifee.setBadgeCount(count);
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    try {
      await AsyncStorage.setItem('read_notifications', JSON.stringify([]));
      await this.updateBadgeCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
