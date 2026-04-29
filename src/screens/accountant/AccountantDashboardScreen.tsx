import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  RefreshCw,
  Calendar,
  DollarSign,
  CreditCard,
  TrendingUp,
  FileText,
  User,
  Search,
  UserPlus,
  Users,
  HeartPulse,
  ClipboardCheck,
  FileEdit,
  CheckSquare,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import AppCard from '../../components/common/AppCard';
import { colors } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

import { HM_THEME } from '../../constants/hmTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AccountantDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { userName, setTabBarVisible } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { unreadCount } = useUnreadNotifications();

  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Add data fetching logic here in the future
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={HM_THEME.navy} />

      {/* Standardized Navy Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
        <View style={{ width: 40 }} />
        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerTitle}>Accountant Portal</AppText>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Bell size={20} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} disabled={loading}>
            <RefreshCw size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Accountant'}!</AppText>
            <AppText style={styles.welcomeSub}>Manage fees and school finances today.</AppText>
          </View>
          <View style={styles.dateBadge}>
            <Calendar size={12} color={colors.textMuted} />
            <AppText style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </AppText>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <DollarSign size={20} color={colors.primary} style={{ marginBottom: 4 }} />
            <AppText style={styles.statValue}>₹0</AppText>
            <AppText style={styles.statTitle}>Collected Today</AppText>
          </View>
          <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <TrendingUp size={20} color={colors.success} style={{ marginBottom: 4 }} />
            <AppText style={styles.statValue}>0%</AppText>
            <AppText style={styles.statTitle}>Collection Rate</AppText>
          </View>
        </View>

        {/* Quick Actions */}
        <AppText style={styles.sectionTitle}>Quick Actions</AppText>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <ClipboardCheck size={22} color="#3B82F6" />
            </View>
            <AppText style={styles.actionLabel}>Mark{"\n"}Attendance</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <UserPlus size={22} color="#22C55E" />
            </View>
            <AppText style={styles.actionLabel}>Student{"\n"}Enrollment</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Users size={22} color="#A855F7" />
            </View>
            <AppText style={styles.actionLabel}>Manage{"\n"}Profiles</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <HeartPulse size={22} color="#EF4444" />
            </View>
            <AppText style={styles.actionLabel}>Vital Scan{"\n"}AI</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
              <CheckSquare size={22} color="#F97316" />
            </View>
            <AppText style={styles.actionLabel}>Leave{"\n"}Approval</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(20, 184, 166, 0.1)' }]}>
              <FileEdit size={22} color="#14B8A6" />
            </View>
            <AppText style={styles.actionLabel}>Question{"\n"}Paper</AppText>
          </TouchableOpacity>
        </View>

        <AppCard style={styles.card}>
          <AppText style={styles.cardTitle}>Recent Transactions</AppText>
          <View style={styles.emptyState}>
            <FileText size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
            <AppText style={styles.emptyText}>No recent transactions found.</AppText>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <AppText style={styles.cardTitle}>Pending Dues</AppText>
          <View style={styles.emptyState}>
            <User size={40} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 12 }} />
            <AppText style={styles.emptyText}>No pending dues to display.</AppText>
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerStandard: {
    backgroundColor: HM_THEME.navy,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: HM_THEME.navy,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 20,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 30,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statTitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    marginTop: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
