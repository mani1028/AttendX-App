import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import API from '../../services/api';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';

const ProfileScreen = () => {
  const { userRole, logout, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    schoolName: '',
    schoolCode: '',
    branchId: '',
  });

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await API.get('/profile');
      const data = response.data;

      const freshName = data.full_name || data.name || 'User';
      const freshEmail = data.email || '';
      setUserInfo({
        name: freshName,
        email: freshEmail,
        schoolName: data.school_name || 'My School',
        schoolCode: data.school_code || '',
        branchId: data.branch_id || 'Main',
      });

      // Sync fresh data back to storage and context (Web logic)
      await AsyncStorage.setItem('user_name', freshName);
      if (freshEmail) await AsyncStorage.setItem('user_email', freshEmail);
      if (data.school_code) await AsyncStorage.setItem('school_code', data.school_code);
      if (data.branch_id) await AsyncStorage.setItem('branch_id', data.branch_id);

      refreshAuth(); // Update global Header state
    } catch (error) {
      console.log('Profile Fetch Error, falling back to storage:', error);
      // Fallback to AsyncStorage if API fails or isn't ready
      const name = await AsyncStorage.getItem('user_name') || 'User';
      const email = await AsyncStorage.getItem('user_email') || '';
      const school = await AsyncStorage.getItem('school_code') || 'N/A';
      const branch = await AsyncStorage.getItem('branch_id') || 'Main';
      setUserInfo(prev => ({ ...prev, name, email, schoolCode: school, branchId: branch }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <AvatarBubble
          displayName={userInfo.name}
          size={80}
          textSize={28}
          primaryColor={colors.accent}
        />
        <AppText style={styles.name}>{userInfo.name}</AppText>
        <AppText style={styles.role}>{userRole?.toUpperCase()}</AppText>
        {userInfo.email ? <AppText style={styles.email}>{userInfo.email}</AppText> : null}
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Organization Details</AppText>
        <AppCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Icon name="shield" size={18} color={colors.accent} />
            </View>
            <AppText style={styles.infoLabel}>School</AppText>
            <AppText style={styles.infoValue}>{userInfo.schoolName}</AppText>
          </View>
          <View style={[styles.infoRow, styles.borderTop]}>
            <View style={styles.iconCircle}>
              <Icon name="hash" size={18} color={colors.accent} />
            </View>
            <AppText style={styles.infoLabel}>School Code</AppText>
            <AppText style={styles.infoValue}>{userInfo.schoolCode}</AppText>
          </View>
          <View style={[styles.infoRow, styles.borderTop]}>
            <View style={styles.iconCircle}>
              <Icon name="git-branch" size={18} color={colors.accent} />
            </View>
            <AppText style={styles.infoLabel}>Branch ID</AppText>
            <AppText style={styles.infoValue}>{userInfo.branchId}</AppText>
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Account Actions</AppText>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Icon name="edit-3" size={18} color={colors.textPrimary} />
          </View>
          <AppText style={styles.menuText}>Edit Profile (Web)</AppText>
          <Icon name="external-link" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Icon name="lock" size={18} color={colors.textPrimary} />
          </View>
          <AppText style={styles.menuText}>Security Settings</AppText>
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.logoutBtn]} onPress={handleLogout}>
          <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Icon name="log-out" size={18} color={colors.error} />
          </View>
          <AppText style={[styles.menuText, { color: colors.error }]}>Sign Out</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.version}>AttendX Mobile v1.0.2</AppText>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: 15 },
  role: { fontSize: 13, color: colors.accent, marginTop: 4, fontWeight: '700', letterSpacing: 1 },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  infoCard: { padding: 0, overflow: 'hidden', backgroundColor: colors.surface, borderColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, marginLeft: 12, fontSize: 14, color: colors.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  menuIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  logoutBtn: { marginTop: 10, borderColor: colors.error + '40', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginBottom: 30, marginTop: 10 }
});

export default ProfileScreen;
