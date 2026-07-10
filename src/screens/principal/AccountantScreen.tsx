import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
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
import { LayoutDashboard } from 'lucide-react-native';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';

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
        <ScreenSkeleton variant="list" />
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


      <ScrollView
         style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Financial Overview"
        subtitle="Manage school finances, fees, and reports"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
      />

          <View style={styles.headerRow}>
            <LayoutDashboard size={28} color={C.primary} />
            <AppText style={styles.header} weight="bold">
              Dashboard Overview
            </AppText>
          </View>

          <ScrollView
            style={innerPageLayoutStyles.scrollViewFront} horizontal
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
  contentOverlap: {
    flex: 1,
        backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    fontSize: Theme.typography.h1.fontSize,
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
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginRight: Theme.spacing.md,
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
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 30,
  },
});
