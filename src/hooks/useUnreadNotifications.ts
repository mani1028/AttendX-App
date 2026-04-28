import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';
import notificationService from '../services/notificationService';

export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const role = (await AsyncStorage.getItem('user_role')) || (await AsyncStorage.getItem('userRole'));

      if (!role) {
        setUnreadCount(0);
        return;
      }

      let endpoint = `/notifications/${role.toLowerCase()}/list`;

      // Some roles might have slightly different endpoint naming conventions if they don't follow the pattern
      // but based on current findings, they seem to follow /notifications/{role}/list

      const response = await API.get(endpoint);
      const items = response.data?.items || response.data?.data || [];

      const readStatus = await AsyncStorage.getItem('read_notifications');
      const readIds = readStatus ? JSON.parse(readStatus) : [];

      const unread = items.filter((item: any) => !readIds.includes(item.id)).length;
      setUnreadCount(unread);
      
      // Update app badge count
      await notificationService.updateBadgeCount(unread);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Listen for notification updates
  useEffect(() => {
    let updateListener: any;

    const setupListener = async () => {
      try {
        // Check for notification updates periodically
        const checkUpdates = setInterval(() => {
          fetchUnreadCount();
        }, 5000); // Check every 5 seconds

        return () => clearInterval(checkUpdates);
      } catch (error) {
        console.error('Error setting up update listener:', error);
      }
    };

    setupListener().then((cleanup) => {
      updateListener = cleanup;
    });

    return () => {
      if (updateListener) updateListener();
    };
  }, [fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount, isLoading };
};
