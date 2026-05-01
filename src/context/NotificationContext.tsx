import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import notificationService from '../services/notificationService';
import { safeJsonParse } from '../utils/storage';
import eventEmitter from '../utils/eventEmitter';
import { isJwtExpired } from '../utils/jwt';

interface NotificationContextType {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Global polling instance to ensure only one interval runs
let globalPollingInterval: ReturnType<typeof setInterval> | null = null;
let activeSubscribers = 0;
let unreadCountInFlight: Promise<void> | null = null;
let lastUnreadCountFetchAt = 0;
let lastUnreadCount = 0;

const UNREAD_COUNT_MIN_INTERVAL_MS = 5000;

export const NotificationContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (unreadCountInFlight) {
      return unreadCountInFlight;
    }

    const now = Date.now();
    if (now - lastUnreadCountFetchAt < UNREAD_COUNT_MIN_INTERVAL_MS) {
      setUnreadCount(lastUnreadCount);
      return;
    }

    unreadCountInFlight = (async () => {
    try {
      setIsLoading(true);
      const role = (await AsyncStorage.getItem('user_role')) || (await AsyncStorage.getItem('userRole'));
      const token = (await AsyncStorage.getItem('token')) || null;

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

      const endpoint = `/notifications/${role.toLowerCase()}/list`;
      const response = await API.get(endpoint);
      const items = response.data?.items || response.data?.data || [];

      const readStatus = await AsyncStorage.getItem('read_notifications');
      const readIds = safeJsonParse<string[]>(readStatus, [], () => {
        AsyncStorage.setItem('read_notifications', JSON.stringify([])).catch(() => {});
      });

      const unread = items.filter((item: any) => !readIds.includes(item.id)).length;
      lastUnreadCount = unread;
      lastUnreadCountFetchAt = Date.now();
      setUnreadCount(unread);
      
      // Update app badge count
      await notificationService.updateBadgeCount(unread);
    } catch (err) {
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
