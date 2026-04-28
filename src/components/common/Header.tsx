import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Bell } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import AvatarBubble from './AvatarBubble';
import AppText from './AppText';

const Header = () => {
  const { userRole, userName } = useAuth();
  const navigation = useNavigation<any>();
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications();

  // Refresh unread count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      refreshUnreadCount();
    }, [refreshUnreadCount])
  );

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const displayName = userName || 'User';
  const firstName = displayName.split(' ')[0];

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.logoPlaceholder}>
          <Shield size={20} color={colors.accent} />
        </View>
        <View>
          <AppText style={styles.appName}>AttendX</AppText>
          <AppText style={styles.roleText}>{userRole?.toUpperCase()} • {firstName}</AppText>
        </View>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleNotificationsPress}
        >
          <View style={styles.bellContainer}>
            <Bell size={22} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleProfilePress}
        >
          <AvatarBubble
            displayName={displayName}
            size={34}
            textSize={12}
            primaryColor={colors.accent}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  roleText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  bellContainer: {
    position: 'relative',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  profileButton: {
    padding: 2,
  },
});

export default Header;
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  profileButton: {
    padding: 2,
  },
});

export default Header;
