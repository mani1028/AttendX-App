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
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { Theme } from '../../theme/tokens';


export default function PaymentEntryScreen() {
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


      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed} title="Payment Entry" onBackPress={() => navigation.goBack()} />

        <AppText style={styles.title}>New Payment</AppText>
        <AppText style={styles.subtitle}>Record new payments and fee collections.</AppText>

        <View style={styles.placeholder}>
          <AppText style={styles.placeholderText}>Payment entry module is being prepared.</AppText>
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
    padding: Theme.spacing.xl,
    paddingBottom: 100,
        backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  title: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: colors.textMuted,
    marginBottom: Theme.spacing.lg,
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
