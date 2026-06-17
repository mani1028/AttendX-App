import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCircle2,
  Wallet,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { Director_THEME } from '../../constants/directorTheme';
import { colors } from '../../constants/theme';
import type { RootStackParamList } from '../../navigation/types';

type AccountantProfile = {
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  role: string;
  schoolCode: string;
  branchId: string;
  branchName: string;
  designation: string;
  department: string;
  userId: string;
  joinedAt: string;
};

const emptyProfile: AccountantProfile = {
  name: '',
  email: '',
  phone: '',
  employeeId: '',
  role: 'accountant',
  schoolCode: '',
  branchId: '',
  branchName: '',
  designation: 'Accountant',
  department: 'Accounts',
  userId: '',
  joinedAt: '',
};

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  return '';
};

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return '';
};

const getInitials = (name: string) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'A';
};

export default function AccountantProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { userName, userRole, logout, setTabBarVisible } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AccountantProfile>(emptyProfile);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedUserRaw = await AsyncStorage.getItem('user');
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};

        const [storedEmail, storedPhone, storedName, storedBranchName, storedBranchId, storedSchoolCode, storedEmployeeId, storedUserId, storedDesignation, storedJoinedAt] =
          await AsyncStorage.multiGet([
            'email',
            'phone',
            'user_name',
            'branch_name',
            'branch_id',
            'school_code',
            'employee_id',
            'user_id',
            'designation',
            'date_of_joining',
          ]).then(items => items.map(([, value]) => value || ''));

        setProfile({
          name: firstText(storedName, storedUser?.name, userName, 'Accountant'),
          email: firstText(storedEmail, storedUser?.email),
          phone: firstText(storedPhone, storedUser?.phone, storedUser?.mobile),
          employeeId: firstText(storedEmployeeId, storedUser?.employee_id, storedUser?.employeeId),
          role: firstText(userRole, storedUser?.role, 'accountant'),
          schoolCode: firstText(storedSchoolCode, storedUser?.school_code, storedUser?.schoolCode),
          branchId: firstText(storedBranchId, storedUser?.branch_id, storedUser?.branchId),
          branchName: firstText(storedBranchName, storedUser?.branch_name, storedUser?.branchName),
          designation: firstText(storedDesignation, storedUser?.designation, 'Accountant'),
          department: firstText(storedUser?.department, storedUser?.department_subject, 'Accounts'),
          userId: firstText(storedUserId, storedUser?.user_id, storedUser?.id),
          joinedAt: firstText(storedJoinedAt, storedUser?.date_of_joining, storedUser?.joined_at),
        });
      } catch (error) {
        console.error('Error loading accountant profile:', error);
        setProfile(prev => ({
          ...prev,
          name: userName || 'Accountant',
          role: userRole || 'accountant',
        }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userName, userRole]);

  const initials = useMemo(() => getInitials(profile.name), [profile.name]);

  const fields = [
    { label: 'Email', value: profile.email || 'Not available', icon: Mail },
    { label: 'Phone', value: profile.phone || 'Not available', icon: Phone },
    { label: 'Employee ID', value: profile.employeeId || 'Not available', icon: UserCircle2 },
    { label: 'Branch', value: profile.branchName || profile.branchId || 'Not available', icon: Building2 },
    { label: 'School Code', value: profile.schoolCode || 'Not available', icon: ShieldCheck },
    { label: 'Department', value: profile.department || 'Accounts', icon: Wallet },
  ];

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <View style={styles.heroRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <AppText style={styles.heroTitle} weight="bold">Accountant Profile</AppText>
          <View style={styles.backButtonSpacer} />
        </View>

        <View style={styles.avatarShell}>
          <View style={styles.avatarInner}>
            <AppText style={styles.avatarText} weight="bold">{initials}</AppText>
          </View>
        </View>

        <AppText style={styles.name} weight="bold">{profile.name || 'Accountant'}</AppText>
        <AppText style={styles.role}>{profile.designation || 'Accountant'}</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={Director_THEME.navy} />
            <AppText style={styles.loadingText}>Loading profile...</AppText>
          </View>
        ) : (
          <>
            <AppCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryPill}>
                  <CalendarDays size={14} color="#6648dc" />
                  <AppText style={styles.summaryPillText} weight="semibold">Finance Team</AppText>
                </View>
                <View style={styles.summaryPillSoft}>
                  <MapPin size={14} color="#16a34a" />
                  <AppText style={styles.summaryPillTextSoft} weight="semibold">{profile.branchName || 'Branch Linked'}</AppText>
                </View>
              </View>
              <AppText style={styles.summaryText}>
                Manage collections, dues, expenses, and payroll from a single finance workspace.
              </AppText>
            </AppCard>

            <AppText style={styles.sectionTitle} weight="bold">Profile Details</AppText>
            <View style={styles.fieldGrid}>
              {fields.map(field => {
                const IconComponent = field.icon;
                return (
                  <AppCard key={field.label} style={styles.fieldCard}>
                    <View style={styles.fieldIconWrap}>
                      <IconComponent size={16} color="#6648dc" />
                    </View>
                    <AppText style={styles.fieldLabel} weight="semibold">{field.label}</AppText>
                    <AppText style={styles.fieldValue} numberOfLines={2}>{field.value}</AppText>
                  </AppCard>
                );
              })}
            </View>

            <AppText style={styles.sectionTitle} weight="bold">Account Info</AppText>
            <AppCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>Role</AppText>
                <AppText style={styles.infoValue}>{profile.role || 'accountant'}</AppText>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>User ID</AppText>
                <AppText style={styles.infoValue}>{profile.userId || 'Not available'}</AppText>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>Joined</AppText>
                <AppText style={styles.infoValue}>{profile.joinedAt || 'Not available'}</AppText>
              </View>
            </AppCard>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
              <LogOut size={18} color="#fff" />
              <AppText style={styles.logoutText} weight="semibold">Sign Out</AppText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: Director_THEME.navy,
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  heroRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    width: 38,
    height: 38,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
  },
  avatarShell: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#2f6bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  role: {
    color: '#bfdbfe',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 42,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
  },
  summaryCard: {
    marginTop: -8,
    marginBottom: 16,
    borderRadius: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(102, 72, 220, 0.10)',
  },
  summaryPillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  summaryPillText: {
    color: '#6648dc',
    fontSize: 12,
  },
  summaryPillTextSoft: {
    color: '#16a34a',
    fontSize: 12,
  },
  summaryText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  fieldCard: {
    width: '48%',
    borderRadius: 18,
    minHeight: 124,
    justifyContent: 'flex-start',
  },
  fieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 72, 220, 0.10)',
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    marginBottom: 6,
  },
  fieldValue: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 18,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
  },
});