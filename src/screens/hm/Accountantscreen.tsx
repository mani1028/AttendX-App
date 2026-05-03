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
  StatusBar,
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

import { HM_THEME as C } from '../../constants/hmTheme';

// Local theme bridge

const AccountantDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  const [activeTab, setActiveTab] = useState('summary');
  const [schoolCode, setSchoolCode] = useState('');
  const [loading, setLoading] = useState(true);

  const checkAuthentication = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role');

      const code =
        (await AsyncStorage.getItem('school_code')) ||
        (await AsyncStorage.getItem('schoolCode'));

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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

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
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation, 'HMDashboard')}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
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
          {activeTab === 'summary' && <SummaryCards schoolCode={schoolCode} />}
          {activeTab === 'fees' && <FeeManagement schoolCode={schoolCode} />}
          {activeTab === 'payments' && <PaymentEntry schoolCode={schoolCode} />}
          {activeTab === 'expenses' && (
            <ExpenseManagement schoolCode={schoolCode} />
          )}
          {activeTab === 'reports' && <Reports schoolCode={schoolCode} />}
          {activeTab === 'pending' && (
            <PendingStudents schoolCode={schoolCode} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const TabButton = ({ title, active, onPress }: any) => {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTabButton]}
      onPress={onPress}
    >
      <AppText
        style={[styles.tabText, active && styles.activeTabText]}
        weight="semiBold"
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
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
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
    marginBottom: 24,
  },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
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
    fontSize: 15,
    color: C.text,
  },

  activeTabText: {
    color: '#ffffff',
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
