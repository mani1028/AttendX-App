import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CreditCard,
  Home,
  Wallet,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Responsive sizing for large screens
const getResponsiveSizes = () => {
  if (width > 430) {
    return { iconSize: 28 };
  } else if (width > 390) {
    return { iconSize: 26 };
  }
  return { iconSize: 24 };
};

const tabs = [
  { name: 'Dashboard', label: 'Home', icon: Home },
  { name: 'Fees', label: 'Fees', icon: CreditCard },
  { name: 'Salaries', label: 'Salaries', icon: Users },
  { name: 'Payroll', label: 'Payroll', icon: Wallet },
  { name: 'Expenses', label: 'Expenses', icon: TrendingUp },
];

const AccountantTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { tabBarTranslate, isTabBarVisible } = useAuth();
  const sizes = getResponsiveSizes();

  const animatedOpacity = tabBarTranslate
    ? tabBarTranslate.interpolate({
        inputRange: [0, 120],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

  const onNavigate = (index: number) => {
    const route = state.routes[index];
    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <Animated.View
      pointerEvents={isTabBarVisible ? 'auto' : 'none'}
      style={[
        styles.container,
        { paddingBottom: insets.bottom || 10 },
        tabBarTranslate ? { transform: [{ translateY: tabBarTranslate }], opacity: animatedOpacity } : null,
      ]}
    >
      <View style={styles.content}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          const IconComponent = tab.icon;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => onNavigate(index)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <IconComponent
                size={sizes.iconSize}
                color={isFocused ? '#FFFFFF' : '#94a3b8'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
              <Text style={[styles.tabLabel, { color: isFocused ? '#FFFFFF' : '#94a3b8' }]}> 
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
    backgroundColor: '#001F3F',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
});

export default AccountantTabBar;