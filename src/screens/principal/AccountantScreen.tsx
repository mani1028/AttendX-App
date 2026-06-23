import { useScrollTabBar } from '../../hooks/useScrollTabBar';
// AccountantDashboardScreen.tsx
// React Native Conversion (Android + iOS)
// Exact same logic preserved

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, LayoutDashboard } from 'lucide-react-native';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { safeGoBack } from '../../utils/navigationHelpers';

import SummaryCards from './SummaryCardsScreen';
import FeeManagement from './FeeManagementScreen';
import PaymentEntry from './PaymentEntryScreen';
import ExpenseManagement from './ExpenseScreen';
import Reports from './ReportsScreen';
import PendingStudents from './PendingStudentsScreen';


import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';




// Local theme bridge
const SummaryCardsComponent = SummaryCards as any;
const FeeManagementComponent = FeeManagement as any;
const PaymentEntryComponent = PaymentEntry as any;
const ExpenseManagementComponent = ExpenseManagement as any;
const ReportsComponent = Reports as any;
const PendingStudentsComponent = PendingStudents as any;

const AccountantDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [activeTab, setActiveTab] = useState('summary');
  const [schoolCode, setSchoolCode] = useState('');
  const [loading, setLoading] = useState(true);

  const checkAuthentication = useCallback(async () => {
    try {
      const token = await storage.getSecure(StorageKeys.AUTH_TOKEN);
      const role = await storage.getString(StorageKeys.USER_ROLE);

      const code =
        (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
        (await storage.getString(StorageKeys.SCHOOL_CODE));

      if (!token || role !== 'accountant') {
        navigation.navigate('LoginScreen' as never);
        return;
      }

      if (code) {
        setSchoolCode(code);
      }

      setLoading(false);
    } catch (error) {
      console.log('Auth Error:', error);
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    checkAuthentication();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [checkAuthentication, setTabBarVisible]);
  const handleScroll = useScrollTabBar();


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={C.primary} />
        <AppText style={styles.header}>Loading...</AppText>
      </View>
    );
  }

  if (!schoolCode) {
    return (
      <View style={styles.container}>
        <AppText style={styles.header}>Error: School code not found</AppText>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>


      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          >
            <ChevronLeft size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Accountant Module</AppText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>Financial Overview</AppText>
          <AppText style={styles.headerSubtext}>Manage school finances, fees, and reports</AppText>
        </View>
      </View>

      <View style={styles.contentOverlap}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.headerRow}>
            <LayoutDashboard size={28} color={C.primary} />
            <AppText style={styles.header} weight="bold">
              Dashboard Overview
            </AppText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
          >
            <TabButton
              title="Summary"
              active={activeTab === 'summary'}
              onPress={() => setActiveTab('summary')}
            />
            <TabButton
              title="Fee Management"
              active={activeTab === 'fees'}
              onPress={() => setActiveTab('fees')}
            />
            <TabButton
              title="Payments"
              active={activeTab === 'payments'}
              onPress={() => setActiveTab('payments')}
            />
            <TabButton
              title="Expenses"
              active={activeTab === 'expenses'}
              onPress={() => setActiveTab('expenses')}
            />
            <TabButton
              title="Reports"
              active={activeTab === 'reports'}
              onPress={() => setActiveTab('reports')}
            />
            <TabButton
              title="Pending"
              active={activeTab === 'pending'}
              onPress={() => setActiveTab('pending')}
            />
          </ScrollView>

          <View style={styles.content}>
            {activeTab === 'summary' && <SummaryCardsComponent schoolCode={schoolCode} />}
            {activeTab === 'fees' && <FeeManagementComponent schoolCode={schoolCode} />}
            {activeTab === 'payments' && <PaymentEntryComponent schoolCode={schoolCode} />}
            {activeTab === 'expenses' && (
              <ExpenseManagementComponent schoolCode={schoolCode} />
            )}
            {activeTab === 'reports' && <ReportsComponent schoolCode={schoolCode} />}
            {activeTab === 'pending' && (
              <PendingStudentsComponent schoolCode={schoolCode} />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const TabButton = ({ title, active, onPress }: any) => {
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.tabButton, active && styles.activeTabButton]}
      onPress={onPress}
    >
      <AppText
        style={[styles.tabText, active && styles.activeTabText]}
        weight="semibold"
      >
        {title}
      </AppText>
    </TouchableOpacity>
  );
};

export default AccountantDashboardScreen;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  contentOverlap: {
    flex: 1,
    marginTop: -HEADER_CONSTANTS.BORDER_RADIUS,
    backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
    fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
    textAlign: 'center',
  },
  headerContent: {
    marginTop: Theme.spacing.lg,
  },
  headerGreeting: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    opacity: HEADER_CONSTANTS.SUBTITLE_OPACITY,
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    fontSize: 28,
    color: C.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: Theme.spacing.lg,
  },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.lg,
    paddingBottom: 10,
  },

  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: C.card,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 12,
  },

  activeTabButton: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  tabText: {
    ...Theme.typography.bodyMd,
    color: C.text,
  },

  activeTabText: {
    color: Theme.colors.card,
  },

  content: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 30,
  },
});
