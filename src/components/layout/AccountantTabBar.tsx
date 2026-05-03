import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CreditCard,
  Home,
  Wallet,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

interface AccountantTabBarProps extends BottomTabBarProps {}

const tabs = [
  { name: 'Dashboard', label: 'Home', icon: Home },
  { name: 'Fees', label: 'Fees', icon: CreditCard },
  { name: 'Salaries', label: 'Salaries', icon: Users },
  { name: 'Payroll', label: 'Payroll', icon: Wallet },
  { name: 'Expenses', label: 'Expenses', icon: TrendingUp },
];

const AccountantTabBar = ({ state, navigation }: AccountantTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { isTabBarVisible, tabBarTranslate } = useAuth();
  const fallbackTranslate = useRef(new Animated.Value(0)).current;
  const translateValue = tabBarTranslate ?? fallbackTranslate;
  const bottomPadding = Math.max(insets.bottom, 8);
  const hiddenOffset = bottomPadding + 104;
  const animatedTranslateY = translateValue.interpolate({
    inputRange: [0, 120],
    outputRange: [0, hiddenOffset],
    extrapolate: 'clamp',
  });
  const animatedOpacity = translateValue.interpolate({
    inputRange: [0, 96, 120],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  const navigate = (routeName: string, routeKey: string, index: number) => {
    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <Animated.View
      pointerEvents={isTabBarVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          paddingBottom: bottomPadding,
          transform: [{ translateY: animatedTranslateY }],
          opacity: animatedOpacity,
        },
      ]}
    >
      <View style={styles.row}>
        {tabs.map((tab, index) => {
          const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
          const route = routeIndex >= 0 ? state.routes[routeIndex] : undefined;
          const isFocused = routeIndex >= 0 ? state.index === routeIndex : false;
          const IconComponent = tab.icon;

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => route && routeIndex >= 0 && navigate(route.name, route.key, routeIndex)}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route?.key })}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                {isFocused && <View style={styles.activeDot} />}
                <IconComponent size={20} color={isFocused ? '#ffffff' : '#9aa7bd'} strokeWidth={2.2} />
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#062352',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingTop: 8,
    zIndex: 50,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: -6 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
  },
  activeDot: {
    position: 'absolute',
    top: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#60a5fa',
  },
  label: {
    color: '#9aa7bd',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    textAlign: 'center',
  },
  labelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default AccountantTabBar;