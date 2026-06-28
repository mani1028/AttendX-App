import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import {
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
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  getAccountantProfile,
  type AccountantProfileData,
} from '../../services/accountantService';

const emptyProfile: AccountantProfileData = {
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

const formatRoleLabel = (role?: string): string => {
  const key = String(role || 'accountant').trim().toLowerCase();
  if (key === 'accountant') {
    return 'Accountant';
  }
  return key
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatJoinedDate = (value?: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

const displayValue = (value?: string) => (value?.trim() ? value.trim() : 'Not available');

export default function AccountantProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userName, userRole, logout, setTabBarVisible } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AccountantProfileData>(emptyProfile);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getAccountantProfile({
          name: userName || 'Accountant',
          role: userRole || 'accountant',
        });
        if (active) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading accountant profile:', error);
        if (active) {
          setProfile(prev => ({
            ...prev,
            name: userName || 'Accountant',
            role: userRole || 'accountant',
            designation: 'Accountant',
          }));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [userName, userRole]);

  const initials = useMemo(() => getInitials(profile.name), [profile.name]);
  const roleLabel = useMemo(() => formatRoleLabel(profile.role), [profile.role]);
  const joinedLabel = useMemo(() => formatJoinedDate(profile.joinedAt), [profile.joinedAt]);

  const fields = [
    { label: 'Email', value: displayValue(profile.email), icon: Mail },
    { label: 'Phone', value: displayValue(profile.phone), icon: Phone },
    { label: 'Employee ID', value: displayValue(profile.employeeId), icon: UserCircle2 },
    {
      label: 'Branch',
      value: displayValue(profile.branchName || profile.branchId),
      icon: Building2,
    },
    { label: 'School Code', value: displayValue(profile.schoolCode), icon: ShieldCheck },
    { label: 'Department', value: displayValue(profile.department), icon: Wallet },
  ];

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          title="Accountant Profile"
          subtitle={profile.name || 'Finance & Accounts'}
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          <AppCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.avatarInner}>
                <AppText style={styles.avatarText} weight="bold">{initials}</AppText>
              </View>
              <View style={styles.heroTextBlock}>
                <AppText style={styles.name} weight="bold">{profile.name || 'Accountant'}</AppText>
                <AppText style={styles.roleBadge}>{roleLabel.toUpperCase()}</AppText>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryPill}>
                <CalendarDays size={14} color={Theme.colors.primary} />
                <AppText style={styles.summaryPillText} weight="semibold">Finance Team</AppText>
              </View>
              <View style={styles.summaryPillSoft}>
                <MapPin size={14} color="#16a34a" />
                <AppText style={styles.summaryPillTextSoft} weight="semibold">
                  {profile.branchName || profile.branchId || 'Branch Linked'}
                </AppText>
              </View>
            </View>

            <AppText style={styles.summaryText}>
              Manage collections, dues, expenses, and payroll from a single finance workspace.
            </AppText>
          </AppCard>

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <AppText style={styles.loadingText}>Loading profile...</AppText>
            </View>
          ) : (
            <>
              <AppText style={styles.sectionTitle} weight="bold">Profile Details</AppText>
              <View style={styles.fieldGrid}>
                {fields.map(field => {
                  const IconComponent = field.icon;
                  return (
                    <AppCard key={field.label} style={styles.fieldCard}>
                      <View style={styles.fieldIconWrap}>
                        <IconComponent size={16} color={Theme.colors.primary} />
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
                  <AppText style={styles.infoValue}>{roleLabel}</AppText>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <AppText style={styles.infoLabel}>Designation</AppText>
                  <AppText style={styles.infoValue}>{profile.designation || roleLabel}</AppText>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <AppText style={styles.infoLabel}>User ID</AppText>
                  <AppText style={styles.infoValue}>{displayValue(profile.userId)}</AppText>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <AppText style={styles.infoLabel}>Joined</AppText>
                  <AppText style={styles.infoValue}>{joinedLabel || 'Not available'}</AppText>
                </View>
              </AppCard>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
                <LogOut size={18} color={Theme.colors.card} />
                <AppText style={styles.logoutText} weight="semibold">Sign Out</AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  heroCard: {
    marginBottom: Theme.spacing.lg,
    borderRadius: 22,
    padding: 18,
    ...Theme.shadow.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Theme.colors.card,
    fontSize: 24,
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Theme.colors.text,
    fontSize: 22,
    marginBottom: 4,
  },
  roleBadge: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(30, 58, 138, 0.10)',
  },
  summaryPillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  summaryPillText: {
    color: Theme.colors.primary,
    ...Theme.typography.caption,
  },
  summaryPillTextSoft: {
    color: '#16a34a',
    ...Theme.typography.caption,
  },
  summaryText: {
    color: Theme.colors.textMuted,
    ...Theme.typography.body,
    lineHeight: 20,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 42,
  },
  loadingText: {
    marginTop: 12,
    color: Theme.colors.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    color: Theme.colors.text,
    marginBottom: 12,
    marginTop: Theme.spacing.xs,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Theme.spacing.md,
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
    backgroundColor: 'rgba(30, 58, 138, 0.10)',
    marginBottom: 12,
  },
  fieldLabel: {
    color: Theme.colors.text,
    ...Theme.typography.caption,
    marginBottom: 6,
  },
  fieldValue: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 18,
    marginBottom: Theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    color: Theme.colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    color: Theme.colors.text,
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 12,
  },
  logoutButton: {
    backgroundColor: Theme.colors.error,
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: Theme.spacing.lg,
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
    color: Theme.colors.card,
    ...Theme.typography.bodyMd,
  },
});
