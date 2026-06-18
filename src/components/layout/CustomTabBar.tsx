import React, { useState, useRef, useEffect } from 'react';
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
import {
  Home,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Plus,
  FileText,
  Wallet,
} from 'lucide-react-native';
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

const CustomTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { tabBarTranslate, isTabBarVisible } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const sizes = getResponsiveSizes();

  const tabs = [
    { name: 'Home', label: 'Home', icon: Home, routeIndex: 0 },
    { name: 'Homework', label: 'Homework', icon: BookOpen, routeIndex: 1 },
    { name: 'Leave', label: 'Leave', icon: CalendarCheck, routeIndex: 2 },
    { name: 'Marks', label: 'Marks', icon: GraduationCap, routeIndex: 3 },
  ];

  const hiddenPages = [
    { name: 'Fees', label: 'Fees', icon: Wallet, routeName: 'Fees' },
    { name: 'Papers', label: 'Papers', icon: FileText, routeName: 'Papers' },
  ];

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const animatedOpacity = tabBarTranslate
    ? tabBarTranslate.interpolate({
        inputRange: [0, 200],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

  const onNavigate = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) return;

    const isFocused = state.index === routeIndex;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
    if (isExpanded) toggleMenu();
  };

  const navigateToHidden = (routeName: string) => {
    navigation.navigate(routeName);
    if (isExpanded) toggleMenu();
  };

  const renderSubMenu = (
    item: { icon: any; routeName: string; label: string },
    translateX: number,
    translateY: number,
  ) => {
    const scale = animation.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    const moveX = animation.interpolate({ inputRange: [0, 1], outputRange: [0, translateX] });
    const moveY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, translateY] });
    const opacity = animation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
    const IconComponent = item.icon;

    return (
      <Animated.View
        key={item.routeName}
        style={[
          styles.subMenuItemWrapper,
          {
            transform: [{ translateX: moveX }, { translateY: moveY }, { scale }],
            opacity: opacity,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigateToHidden(item.routeName)}
          style={styles.subMenuButton}
          activeOpacity={0.8}
        >
          <IconComponent size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.subMenuLabel}>{item.label}</Text>
      </Animated.View>
    );
  };

  return (
    <>
      {/* Full screen invisible overlay to dismiss menu */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}
      <Animated.View
        pointerEvents={isTabBarVisible ? 'box-none' : 'none'}
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom,
            transform: [{ translateY: tabBarTranslate || new Animated.Value(0) }],
            opacity: animatedOpacity,
          },
        ]}
      >
        {/* Sub-menu items fanning out from FAB */}
        <View style={styles.subMenuContainer}>
          {renderSubMenu(hiddenPages[0], -65, -75)}
          {renderSubMenu(hiddenPages[1], 65, -75)}
        </View>

        {/* Tab bar pill */}
        <View style={styles.backgroundContainer}>
          <View style={styles.curvedBar}>
            {/* Left tabs */}
            {tabs.slice(0, 2).map((tab) => {
              const isFocused = state.index === tab.routeIndex;
              const IconComponent = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.name}
                  onPress={() => onNavigate(tab.routeIndex)}
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

            {/* Spacer for FAB */}
            <View style={styles.tabItem} />

            {/* Right tabs */}
            {tabs.slice(2).map((tab) => {
              const isFocused = state.index === tab.routeIndex;
              const IconComponent = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.name}
                  onPress={() => onNavigate(tab.routeIndex)}
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

        {/* Center FAB */}
        <View style={[styles.fabContainer, { top: -(sizes.centerButtonSize / 2) - 4 }]}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={toggleMenu} 
            style={[
              styles.fab,
              {
                width: sizes.centerButtonSize,
                height: sizes.centerButtonSize,
                borderRadius: sizes.centerButtonSize / 2,
              },
              isExpanded && styles.activeFab,
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                ],
              }}
            >
              <Plus size={sizes.centerIconSize} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
          <Text style={styles.moreLabel}>More</Text>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 998,
  },
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
  subMenuContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: -20, // Adjust relative to FAB
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  subMenuItemWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMenuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.active,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    ...Platform.select({
      android: { elevation: 6 },
    }),
  },
  subMenuLabel: {
    marginTop: 6,
    color: '#374151',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#ffffffaa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default CustomTabBar;