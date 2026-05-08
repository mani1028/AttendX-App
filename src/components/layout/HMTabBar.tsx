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
  Home,
  FileText,
  GraduationCap,
  Settings,
} from 'lucide-react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Responsive sizing for large screens
const getResponsiveSizes = () => {
  if (width > 430) {
    return { iconSize: 28, centerButtonSize: 72, centerIconSize: 22 };
  } else if (width > 390) {
    return { iconSize: 26, centerButtonSize: 68, centerIconSize: 21 };
  }
  return { iconSize: 24, centerButtonSize: 64, centerIconSize: 22 };
};

const tabs = [
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'Staff', label: 'Staff', icon: FileText },
  { name: 'TeacherAssignment', label: null, isCenterPlaceholder: true, icon: null },
  { name: 'Students', label: 'Students', icon: GraduationCap },
  { name: 'Settings', label: 'Settings', icon: Settings },
];

interface HMTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  /** Pass current scroll direction: true = scrolling down (hide), false = scrolling up (show) */
  isScrollingDown?: boolean;
}

const TeacherIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <Path d="M6 12v5c3 3 9 3 12 0v-5" />
  </Svg>
);

const HMTabBar = ({ state, descriptors, navigation, isScrollingDown = false }: HMTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { isTabBarVisible, tabBarTranslate } = useAuth();
  const sizes = getResponsiveSizes();
  const visibility = isTabBarVisible === false || isScrollingDown;
  const animatedOpacity = tabBarTranslate
    ? tabBarTranslate.interpolate({
        inputRange: [0, 120],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

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
      pointerEvents={visibility ? 'none' : 'auto'}
      style={[
        styles.container,
        { paddingBottom: insets.bottom || 10 },
        tabBarTranslate ? { transform: [{ translateY: tabBarTranslate }], opacity: animatedOpacity } : null,
      ]}
    >
      <View style={styles.content}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          const route = state.routes[index];

          if (tab.isCenterPlaceholder) {
            return (
              <View
                key={tab.name}
                style={styles.centerTabContainer}
              >
                <TouchableOpacity
                  style={[styles.centerButton, { width: sizes.centerButtonSize, height: sizes.centerButtonSize, borderRadius: sizes.centerButtonSize / 2 }]}
                  activeOpacity={0.8}
                  onPress={() => route && navigate(route.name, route.key, index)}
                >
                  <View style={[styles.centerIconWrapper, { borderRadius: sizes.centerButtonSize / 2 }]}>
                    <TeacherIcon color="#fff" size={sizes.centerIconSize} />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.centerLabel, { color: isFocused ? '#FFFFFF' : '#94a3b8' }]} numberOfLines={2}>
                  {'Teacher\nAssignment'}
                </Text>
              </View>
            );
          }

          const IconComponent = tab.icon!;

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => route && navigate(route.name, route.key, index)}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route?.key })}
            >
              <IconComponent
                size={sizes.iconSize}
                color={isFocused ? '#FFFFFF' : '#94a3b8'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
              <Text style={[styles.tabLabel, { color: isFocused ? '#FFFFFF' : '#94a3b8' }]} numberOfLines={1}>
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
    textAlign: 'center',
  },
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  centerButton: {
    backgroundColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        ...Platform.select({

          android: { elevation: 8 },

          ios: {},

        }),
      },
    }),
  },
  centerIconWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    textAlign: 'center',
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default HMTabBar;