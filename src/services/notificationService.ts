import notifee, { AndroidImportance, AndroidBadgeIconType, AuthorizationStatus, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getMessaging, 
  getToken, 
  requestPermission, 
  onMessage, 
  onTokenRefresh 
} from '@react-native-firebase/messaging';
import { safeJsonParse } from '../utils/storage';
import API from './api';

const TOKEN_SYNC_ENDPOINTS = [
  '/notifications/device-token/register',
  '/notifications/device-token',
  '/notifications/register-device',
  '/notifications/register-token',
  '/device-tokens/register',
  '/fcm/register-token',
  '/fcm/token',
];

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  notificationId?: string;
}

class NotificationService {
  private initialized = false;
  private tokenRefreshUnsubscribe: (() => void) | null = null;

  private toSafeString(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return fallback;
  }

  private normalizeNotificationData(data?: Record<string, any>): Record<string, string> {
    if (!data || typeof data !== 'object') return {};

    const normalized: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        normalized[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        normalized[key] = String(value);
      } else if (value != null) {
        normalized[key] = JSON.stringify(value);
      }
    });

    return normalized;
  }

  /**
   * Initialize notification service
   * Set up channels and request permissions
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const messaging = getMessaging();

    try {
      // Request user permission for notifications (iOS and Android 13+)
      const permission = await notifee.requestPermission();
      
      if (permission.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        console.log('Notification permission not fully granted');
      }

      // Request FCM permission (handles both iOS and Android)
      const fcmPermission = await requestPermission(messaging);
      console.log('FCM permission status:', fcmPermission);

      // Get and log FCM device token
      const fcmToken = await getToken(messaging);
      console.log('[FCM] Device token:', fcmToken);
      // You should send this token to your backend so it knows where to send push notifications
      await AsyncStorage.setItem('fcm_device_token', fcmToken);
      await this.syncFcmTokenWithBackend(fcmToken);

      if (!this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe = onTokenRefresh(messaging, async (newToken) => {
          console.log('[FCM] Token refreshed');
          await AsyncStorage.setItem('fcm_device_token', newToken);
          await AsyncStorage.removeItem('fcm_device_token_synced');
          await this.syncFcmTokenWithBackend(newToken);
        });
      }

      // Create Android notification channels
      await this.createNotificationChannels();
      
      // Set up foreground notification handler
      this.setupForegroundHandler();
      
      this.initialized = true;
      console.log('Notification service initialized with Firebase');
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
        visibility: AndroidVisibility.PUBLIC, // Shows on lock screen
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
        visibility: AndroidVisibility.PUBLIC, // Shows on lock screen
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#FF0000',
      });

      // Default channel (used by Firebase)
      await notifee.createChannel({
        id: 'default',
        name: 'Default Notifications',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC, // Shows on lock screen
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#007AFF',
      });

      // Channel for lock screen notifications
      await notifee.createChannel({
        id: 'lockscreen',
        name: 'Lock Screen Notifications',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC, // Shows on lock screen
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
    const messaging = getMessaging();

    try {
      // Notifee foreground event handler
      notifee.onForegroundEvent(({ type, detail }) => {
        console.log('Foreground notification received:', detail);
        
        // Handle notification pressed
        if (type === 1) { // PRESS
          const data = detail?.notification?.data as Record<string, string> | undefined;
          this.handleNotificationPress(data);
        }
      });

      // FCM foreground message handler (when app is open)
      onMessage(messaging, async (remoteMessage) => {
        console.log('[FCM Foreground] Message received while app is open:', remoteMessage);

        if (remoteMessage?.notification || remoteMessage?.data) {
          const title = this.toSafeString(
            remoteMessage.notification?.title ?? remoteMessage.data?.title,
            'New Notification',
          );
          const body = this.toSafeString(
            remoteMessage.notification?.body ?? remoteMessage.data?.body,
            'You have a new notification',
          );

          // Display notification even when app is in foreground
          await this.displayNotification({
            title,
            body,
            data: this.normalizeNotificationData(remoteMessage.data as Record<string, any> | undefined),
            notificationId: remoteMessage.messageId,
          });
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
      await this.initialize();

      const channelId = isUrgent ? 'urgent' : 'general';

      const notificationId = await notifee.displayNotification({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        android: {
          channelId,
          importance: isUrgent ? AndroidImportance.HIGH : AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC, // Shows content on lock screen
          smallIcon: 'ic_notification',
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
          badgeCount: 1,
          launchImageName: 'LaunchScreen',
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

      const normalizedRole = (role.toLowerCase() === 'teacher' || role.toLowerCase() === 'accountant') ? 'staff' : role.toLowerCase();
      const endpoint = `/notifications/${normalizedRole}/list`;

      const response = await API.get(endpoint, {
        params: { limit: 1 },
        suppressFallback404Log: true,
      } as any);

      const data = response.data;
      if (data && typeof data.unread_count === 'number') {
        return data.unread_count;
      }
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
   * Get FCM device token for sending push notifications
   */
  async getFcmToken(): Promise<string | null> {
    const messaging = getMessaging();
    try {
      const token = await getToken(messaging);
      return token || null;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Attempts to sync the current FCM token with backend endpoints.
   * This uses endpoint fallbacks because backend routes can differ by deployment.
   */
  async syncFcmTokenWithBackend(tokenInput?: string | null): Promise<boolean> {
    const messaging = getMessaging();
    try {
      const token = (tokenInput || (await getToken(messaging)) || '').trim();
      if (!token) return false;

      // Get session data to associate the token with the correct user/branch
      const storageData = await AsyncStorage.multiGet([
        'token',
        'fcm_device_token',
        'fcm_device_token_synced',
        'user_role',
        'role',
        'userRole',
        'user_id',
        'userId',
        'teacher_id',
        'teacherId',
        'employee_id',
        'employeeId',
        'student_id',
        'studentId',
        'school_code',
        'schoolCode',
        'branch_id',
        'branchId',
      ]);

      const dataMap: Record<string, string> = {};
      storageData.forEach(([key, value]) => {
        dataMap[key] = value || '';
      });

      const authToken = dataMap['token'];
      const storedFcmToken = dataMap['fcm_device_token'];
      const syncedFcmToken = dataMap['fcm_device_token_synced'];
      
      const finalFcmToken = token || storedFcmToken;
      if (!finalFcmToken) return false;

      // Skip sync if we don't have an active auth session
      if (!authToken) {
        console.log('[FCM] Skipping token sync: No active session (not logged in)');
        return false;
      }

      // Skip if already synced with this token
      if (syncedFcmToken === finalFcmToken) {
        return true;
      }

      const userRole = dataMap['user_role'] || dataMap['role'] || dataMap['userRole'];
      const userId = dataMap['user_id'] || dataMap['userId'];
      const teacherId = dataMap['teacher_id'] || dataMap['teacherId'] || dataMap['employee_id'] || dataMap['employeeId'];
      const studentId = dataMap['student_id'] || dataMap['studentId'];
      const schoolCode = dataMap['school_code'] || dataMap['schoolCode'];
      const branchId = dataMap['branch_id'] || dataMap['branchId'];

      const userRaw = await AsyncStorage.getItem('user');
      const user = safeJsonParse<Record<string, any>>(userRaw, {});

      const payload: Record<string, any> = {
        token: finalFcmToken,
        fcm_token: finalFcmToken,
        device_token: finalFcmToken,
        platform: 'react-native',
        app_platform: 'mobile',
        os: Platform.OS,
        role: userRole || user.role || user.user_role || 'student',
        user_id: userId || user.user_id || user.id || undefined,
        teacher_id: teacherId || user.teacher_id || user.employee_id || undefined,
        employee_id: teacherId || user.employee_id || undefined,
        student_id: studentId || user.student_id || undefined,
        school_code: schoolCode || user.school_code || 'default',
        branch_id: branchId || user.branch_id || undefined,
      };

      // X-Branch-Id is often required by the backend for notification registration
      // If we don't have it yet, we might want to wait, but we'll try with what we have.
      const headers: Record<string, string> = {
        'X-School-Code': payload.school_code,
        'X-Branch-Id': branchId || user.branch_id || 'default',
      };

      for (const endpoint of TOKEN_SYNC_ENDPOINTS) {
        try {
          const response = await API.post(endpoint, payload, {
            suppressFallback404Log: true,
            headers,
          } as any);

          if (response.status === 200 || response.status === 201) {
            await AsyncStorage.setItem('fcm_device_token_synced', finalFcmToken);
            console.log(`[FCM] Token synced via ${endpoint}`);
            return true;
          }
        } catch (error: any) {
          const status = error?.response?.status;

          // If 400 Bad Request, try wrapping the payload in a 'data' object
          if (status === 400) {
             try {
                await API.post(endpoint, { data: payload }, { 
                  suppressFallback404Log: true,
                  headers,
                } as any);
                await AsyncStorage.setItem('fcm_device_token_synced', finalFcmToken);
                console.log(`[FCM] Token synced via ${endpoint} (wrapped)`);
                return true;
             } catch (e) {}
          }

          if (status && ![404, 405].includes(status)) {
            console.warn(`[FCM] Token sync failed at ${endpoint} with status ${status}:`, error?.response?.data);
          }
        }
      }

      console.warn('[FCM] Token sync endpoint not available or rejected by backend. Token kept locally.');
      return false;
    } catch (error) {
      console.error('[FCM] Token sync error:', error);
      return false;
    }
  }

  async ensureFcmTokenSynced(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('fcm_device_token');
      await this.syncFcmTokenWithBackend(token);
    } catch (error) {
      console.error('[FCM] ensureFcmTokenSynced failed:', error);
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
