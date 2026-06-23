import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import notificationService from '../services/notificationService';
import { safeJsonParse } from '../utils/storage';
import eventEmitter from '../utils/eventEmitter';
import { isJwtExpired } from '../utils/jwt';
import { loadScopedNotificationIds } from '../utils/notificationStorage';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';


interface NotificationContextType {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: (force?: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Global polling instance to ensure only one interval runs
let globalPollingInterval: ReturnType<typeof setInterval> | null = null;
let activeSubscribers = 0;
let unreadCountInFlight: Promise<void> | null = null;
let lastUnreadCountFetchAt = 0;
let lastUnreadCount = 0;
let consecutiveUnreadFailures = 0;
let lastUnreadFailureAt = 0;
let unreadFailureWarningLogged = false;

const UNREAD_COUNT_MIN_INTERVAL_MS = 5000;
const UNREAD_COUNT_FAILURE_COOLDOWN_MS = 60000;

export const NotificationContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const fetchUnreadCount = useCallback(async (force: boolean = false) => {
    if (unreadCountInFlight) {
      return unreadCountInFlight;
    }

    const now = Date.now();
    if (!force && now - lastUnreadCountFetchAt < UNREAD_COUNT_MIN_INTERVAL_MS) {
      setUnreadCount(lastUnreadCount);
      return;
    }

    if (
      !force &&
      consecutiveUnreadFailures > 0 &&
      now - lastUnreadFailureAt < UNREAD_COUNT_FAILURE_COOLDOWN_MS
    ) {
      setUnreadCount(lastUnreadCount);
      return;
    }

    unreadCountInFlight = (async () => {
    try {
      setIsLoading(true);
      const role = (await AsyncStorage.getItem('user_role')) || (await storage.getString(StorageKeys.USER_ROLE));
      const token = (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || null;

      // If there is no token or token is expired, stop polling and trigger logout
      if (!token || isJwtExpired(token)) {
        setUnreadCount(0);
        try {
          // Ensure global polling stops when auth is invalid
          if (globalPollingInterval) {
            clearInterval(globalPollingInterval);
            globalPollingInterval = null;
          }
        } catch (e) {}
        // Notify app to logout so auth flow can handle token refresh/login
        eventEmitter.emit('app-logout');
        return;
      }

      if (!role) {
        setUnreadCount(0);
        return;
      }

      let normalizedRole = role.toLowerCase();
      if (normalizedRole !== 'principal' && normalizedRole !== 'student') {
        normalizedRole = 'staff';
      }
      const endpoint = `/notifications/${normalizedRole}/list`;
      let response: any = null;
      let attempt = 0;
      const maxAttempts = 2;
      // simple retry on transient network errors
      while (attempt < maxAttempts) {
        try {
          response = await API.get(endpoint);
          break;
        } catch (e) {
          attempt += 1;
          if (attempt >= maxAttempts) {throw e;}
          // small backoff before retrying
          await new Promise<void>(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
      if (!response) {
        throw new Error('No response received while fetching unread notifications');
      }
      const items = response.data?.items || response.data?.data || [];
      const previousUnreadCount = lastUnreadCount;

      const [readIds, deletedIds] = await Promise.all([
        loadScopedNotificationIds('read'),
        loadScopedNotificationIds('deleted'),
      ]);

      const unread = items.filter((item: any) => !readIds.includes(item.id) && !deletedIds.includes(item.id)).length;
      lastUnreadCount = unread;
      lastUnreadCountFetchAt = Date.now();
      consecutiveUnreadFailures = 0;
      unreadFailureWarningLogged = false;
      setUnreadCount(unread);

      if (appStateRef.current !== 'active' && unread > previousUnreadCount) {
        const firstNewItem = items.find((item: any) => !readIds.includes(item.id) && !deletedIds.includes(item.id));
        const title = firstNewItem?.title || 'New Notification';
        const body = firstNewItem?.description || `You have ${unread} unread notification${unread !== 1 ? 's' : ''}`;

        await notificationService.displayNotification({
          title,
          body,
          data: {
            notificationId: String(firstNewItem?.id || ''),
            source: 'notification_poll',
          },
        });
      }

      // Update app badge count
      await notificationService.updateBadgeCount(unread);
    } catch (err) {
      consecutiveUnreadFailures += 1;
      lastUnreadFailureAt = Date.now();

      if (!unreadFailureWarningLogged) {
        console.warn(
          'Unread notification polling is temporarily backing off because the API is unreachable.',
        );
        unreadFailureWarningLogged = true;
      }

      console.error('Error fetching unread count:', err);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
      unreadCountInFlight = null;
    }
    })();

    return unreadCountInFlight;
  }, []);

  // Setup global polling when provider mounts
  useEffect(() => {
    activeSubscribers++;

    // Only start polling if this is the first subscriber
    if (activeSubscribers === 1 && !globalPollingInterval) {
      // Fetch immediately (this will validate token and may stop polling)
      fetchUnreadCount();

      // Setup polling interval (10 seconds instead of 5 to reduce load)
      globalPollingInterval = setInterval(() => {
        fetchUnreadCount();
      }, 10000);

      console.log('[Notifications] Global polling started');
    }

    return () => {
      activeSubscribers--;

      // Stop polling when last subscriber unmounts
      if (activeSubscribers === 0 && globalPollingInterval) {
        clearInterval(globalPollingInterval);
        globalPollingInterval = null;
        console.log('[Notifications] Global polling stopped');
      }
    };
  }, [fetchUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, isLoading, refreshUnreadCount: fetchUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useUnreadNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useUnreadNotifications must be used within NotificationContextProvider');
  }

  return context;
};
