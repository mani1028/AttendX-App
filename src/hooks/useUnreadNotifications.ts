import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../services/api';

export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const role = (await AsyncStorage.getItem('user_role')) || (await AsyncStorage.getItem('userRole'));

      if (!role) return;

      let endpoint = `/notifications/${role.toLowerCase()}/list`;

      // Some roles might have slightly different endpoint naming conventions if they don't follow the pattern
      // but based on current findings, they seem to follow /notifications/{role}/list

      const response = await API.get(endpoint);
      const items = response.data?.items || response.data?.data || [];

      const readStatus = await AsyncStorage.getItem('read_notifications');
      const readIds = readStatus ? JSON.parse(readStatus) : [];

      const unread = items.filter((item: any) => !readIds.includes(item.id)).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
