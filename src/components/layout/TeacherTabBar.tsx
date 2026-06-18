import React, { useRef, useEffect } from 'react';
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
  ClipboardList,
  GraduationCap,
  Scan,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const TAB_BAR_HEIGHT = 70;

const COLORS = {
  active: '#3498db',
  inactive: '#8e8e93',
  fab: '#2563EB',
  white: '#FFFFFF',
  bar: '#FFFFFF',
};

const getResponsiveSizes = () => {
  if (width > 430) {
    return { iconSize: 26, centerButtonSize: 68, centerIconSize: 32 };
  }
  if (width > 390) {
    return { iconSize: 24, centerButtonSize: 64, centerIconSize: 28 };
  }
  return { iconSize: 22, centerButtonSize: 60, centerIconSize: 26 };
};

const TeacherTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { tabBarTranslate, isTabBarVisible } = useAuth();
  const sizes = getResponsiveSizes();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const tabs = [
    { name: 'Home', label: 'Home', icon: Home, routeIndex: 0 },
    { name: 'Homework', label: 'Homework', icon: BookOpen, routeIndex: 1 },
    { name: 'Scan', label: 'Verify', icon: Scan, routeIndex: 2, isCenter: true },
    { name: 'Leaves', label: 'Leave', icon: ClipboardList, routeIndex: 3 },
    { name: 'Marks', label: 'Marks', icon: GraduationCap, routeIndex: 4 },
  ];

  const animatedOpacity = tabBarTranslate
    ? tabBarTranslate.interpolate({
        inputRange: [0, 200],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

  const onNavigate = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) {
      return;
    }

    const isFocused = state.index === routeIndex;
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
          {tabs.slice(3).map((tab) => {
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

      {/* FAB */}
      <View style={[styles.fabContainer, { top: -(sizes.centerButtonSize / 2) - 4 }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onNavigate(2)}
            style={[
              styles.fab,
              {
                width: sizes.centerButtonSize,
                height: sizes.centerButtonSize,
                borderRadius: sizes.centerButtonSize / 2,
              },
              state.index === 2 && styles.activeFab,
            ]}
          >
            <Scan size={sizes.centerIconSize} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.moreLabel}>Scan</Text>
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
  moreLabel: {
    color: '#6B7280',
    fontSize: 9,
    marginTop: 6,
    fontWeight: '500',
  },
  hiddenBar: {
    display: 'none',
  },
  activeFab: {
    backgroundColor: COLORS.active,
  },
});

export default TeacherTabBar;
