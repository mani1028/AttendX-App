import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Bell } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import AvatarBubble from './AvatarBubble';
import AppText from './AppText';

const Header = () => {
  const { userRole, userName } = useAuth();
  const navigation = useNavigation<any>();

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
          <Bell size={22} color={colors.textPrimary} />
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
  profileButton: {
    padding: 2,
  },
});

export default Header;
