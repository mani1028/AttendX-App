import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, User, Settings, ShieldAlert, Users, ClipboardList } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const TAB_BAR_HEIGHT = 70;

const COLORS = {
  active: '#2563EB',
  inactive: '#8e8e93',
  fab: '#2563EB',
  white: '#FFFFFF',
  bar: '#FFFFFF',
};

const getResponsiveSizes = () => {
  if (width > 430) return { iconSize: 26, centerButtonSize: 68, centerIconSize: 32 };
  if (width > 390) return { iconSize: 24, centerButtonSize: 64, centerIconSize: 28 };
  return { iconSize: 22, centerButtonSize: 60, centerIconSize: 26 };
};

const AdminTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { tabBarTranslate, isTabBarVisible } = useAuth();
  const sizes = getResponsiveSizes();
  
  // Admin only has 3 tabs currently. We can map them differently or keep a center FAB.
  const tabs = [
    { name: 'Dashboard', label: 'Home', icon: LayoutDashboard, routeIndex: 0 },
    { name: 'Agents', label: 'Agents', icon: Users, routeIndex: 1 },
    { name: 'Plans', label: 'Plans', icon: ClipboardList, routeIndex: 2 },
    { name: 'Settings', label: 'Settings', icon: Settings, routeIndex: 3 },
  ];

  
  const animatedOpacity = tabBarTranslate
    ? tabBarTranslate.interpolate({
        inputRange: [0, 120],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

  const handlePress = (tab: any) => {
    const route = state.routes[tab.routeIndex];
    if (!route) return;

    const isFocused = state.index === tab.routeIndex;
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
        {
          paddingBottom: insets.bottom,
          transform: [{ translateY: tabBarTranslate || new Animated.Value(0) }],
          opacity: animatedOpacity,
        },
      ]}
    >
      <View style={styles.backgroundContainer}>
        <View style={styles.curvedBar}>
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isFocused = state.index === tab.routeIndex;
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => handlePress(tab)}
                style={styles.tabItem}
                activeOpacity={0.6}
              >
                <IconComponent
                  size={sizes.iconSize}
                  color={isFocused ? COLORS.active : COLORS.inactive}
                  strokeWidth={isFocused ? 2.5 : 2}
                />
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  backgroundContainer: {
    width: '100%',
    height: TAB_BAR_HEIGHT,
    backgroundColor: COLORS.bar,
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {},
    }),
  },
  curvedBar: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: COLORS.active,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  fab: {
    backgroundColor: COLORS.fab,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: COLORS.fab,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {},
    }),
  },
  activeFab: {
    backgroundColor: COLORS.active,
  },
  moreLabel: {
    color: '#6B7280',
    fontSize: 9,
    marginTop: 6,
    fontWeight: '500',
  },
  hiddenBar: {
    display: 'none',
  },
});

export default AdminTabBar;