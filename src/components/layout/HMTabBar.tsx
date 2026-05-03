import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
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

const TeacherIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <Path d="M6 12v5c3 3 9 3 12 0v-5" />
  </Svg>
);

const HMTabBar = ({ state, descriptors, navigation, isScrollingDown = false }: HMTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { isTabBarVisible, tabBarTranslate } = useAuth();
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
        {
          paddingBottom: insets.bottom,
          transform: [{ translateY: tabBarTranslate || new Animated.Value(0) }],
          opacity: animatedOpacity,
        },
      ]}
    >
      {/* Floating center button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          const centerIndex = tabs.findIndex(t => t.isCenterPlaceholder);
          const route = state.routes[centerIndex];
          if (route) navigate(route.name, route.key, centerIndex);
        }}
      >
        <View style={[
          styles.fabInner,
          state.index === tabs.findIndex(t => t.isCenterPlaceholder) && styles.fabInnerActive,
        ]}>
          <TeacherIcon color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Tab row */}
      <View style={styles.row}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          const route = state.routes[index];

          if (tab.isCenterPlaceholder) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.centerSlot}
                activeOpacity={0.7}
                onPress={() => route && navigate(route.name, route.key, index)}
              >
                <View style={{ height: 44 }} />
                <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={2}>
                  {'Teacher\nAssignment'}
                </Text>
              </TouchableOpacity>
            );
          }

          const IconComponent = tab.icon!;

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              activeOpacity={0.6}
              onPress={() => route && navigate(route.name, route.key, index)}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route?.key })}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                {isFocused && <View style={styles.activeDot} />}
                <IconComponent
                  size={22}
                  color={isFocused ? '#ff0033' : '#8a96a6'}
                  strokeWidth={2}
                />
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
    backgroundColor: '#071834',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,0,51,0.12)',
  },
  activeDot: {
    position: 'absolute',
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0033',
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    color: '#8a96a6',
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ff0033',
  },
  fab: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -27,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0b2750',
    borderWidth: 2,
    borderColor: '#071834',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 14 },
    }),
  },
  fabInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B4CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInnerActive: {
    backgroundColor: '#2563eb',
  },
});

export default HMTabBar;