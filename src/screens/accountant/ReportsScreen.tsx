import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/tokens';

import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { Theme } from '../../theme/tokens';


export default function ReportsScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  useEffect(() => {
    setTabBarVisible(true);
    const unsubscribe = navigation.addListener('focus', () => {
      setTabBarVisible(true);
    });
    return unsubscribe;
  }, [navigation, setTabBarVisible]);
  const handleScroll = useScrollTabBar();


  return (
    <View style={styles.container}>


      <StandardPageHeader title="Financial Reports" onBackPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <AppText style={styles.title}>Reports & Analytics</AppText>
        <AppText style={styles.subtitle}>View detailed financial reports and trends.</AppText>

        <View style={styles.placeholder}>
          <AppText style={styles.placeholderText}>Reporting dashboards are being generated.</AppText>
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
  content: {
    padding: 20,
    paddingBottom: 100,
    marginTop: -20,
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: Theme.spacing.lg,
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
