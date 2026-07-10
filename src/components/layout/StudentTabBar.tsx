import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as LucideIcons from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import { motion } from '../../theme/motion';
import { useAuth } from '../../context/AuthContext';
import { studentMainTabs, studentOverflowTabs } from './tabBarConfigs';

const OVERFLOW_ROUTE_NAMES = new Set(studentOverflowTabs.map(tab => tab.name));

const ARC_RADIUS = 76;
const ARC_SPREAD_DEG = 88;

function getArcPosition(index: number, total: number) {
  const angleDeg =
    total <= 1 ? 0 : -ARC_SPREAD_DEG / 2 + (ARC_SPREAD_DEG / (total - 1)) * index;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: ARC_RADIUS * Math.sin(rad),
    y: -ARC_RADIUS * Math.cos(rad) - 6,
  };
}

function getStaggerAnim(menuAnim: Animated.Value, index: number) {
  const delay = index * 0.1;
  return menuAnim.interpolate({
    inputRange: [0, delay, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
}

const StudentTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const { isTabBarVisible } = useAuth();
  const accentColor = Theme.colors.accentStudent;

  const [menuOpen, setMenuOpen] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  const currentRouteName = state.routes[state.index]?.name ?? 'Home';
  const isOverflowActive = OVERFLOW_ROUTE_NAMES.has(currentRouteName);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isTabBarVisible ? 0 : 140,
      useNativeDriver: true,
      ...motion.springs.bouncy,
    }).start();
  }, [isTabBarVisible, translateY]);

  const animateMenu = (open: boolean, onDone?: () => void) => {
    Animated.spring(menuAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 220,
      mass: 0.85,
    }).start(({ finished }) => {
      if (finished && onDone) {
        onDone();
      }
    });
  };

  const openMenu = () => {
    setMenuOpen(true);
    animateMenu(true);
  };

  const closeMenu = (onDone?: () => void) => {
    if (!menuOpen) {
      onDone?.();
      return;
    }
    animateMenu(false, () => {
      setMenuOpen(false);
      onDone?.();
    });
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const navigateToRoute = (routeName: string) => {
    const routeIndex = state.routes.findIndex(route => route.name === routeName);
    if (routeIndex < 0) {
      return;
    }

    closeMenu(() => {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes[routeIndex].key,
        canPreventDefault: true,
      });
      if (state.index !== routeIndex && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    });
  };

  const renderMainTab = (tabConfig: (typeof studentMainTabs)[number]) => {
    const routeIndex = state.routes.findIndex(route => route.name === tabConfig.name);
    if (routeIndex < 0) {
      return null;
    }

    const isFocused = state.index === routeIndex;
    const IconComponent = LucideIcons[tabConfig.icon] as React.FC<any>;

    return (
      <TouchableOpacity
        key={tabConfig.name}
        style={styles.tabItem}
        onPress={() => {
          closeMenu();
          navigateToRoute(tabConfig.name);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={tabConfig.label}
        activeOpacity={0.75}
      >
        <View style={styles.iconSlot}>
          {IconComponent && (
            <IconComponent
              size={isFocused ? 24 : 22}
              color={isFocused ? accentColor : Theme.colors.textMuted}
              strokeWidth={isFocused ? 2.5 : 1.75}
            />
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            isFocused && styles.tabLabelActive,
            { color: isFocused ? accentColor : Theme.colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {tabConfig.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const leftTabs = studentMainTabs.slice(0, 2);
  const rightTabs = studentMainTabs.slice(2);

  const plusRotation = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const centerGlow = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: bottomPad,
          transform: [{ translateY }],
        },
      ]}
    >
      {menuOpen && (
        <Pressable style={styles.backdropTouch} onPress={() => closeMenu()}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.32],
                }),
              },
            ]}
          />
        </Pressable>
      )}

      <Animated.View
        pointerEvents={menuOpen ? 'box-none' : 'none'}
        style={[
          styles.arcContainer,
          {
            bottom: bottomPad + 78,
            opacity: menuAnim.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0, 1, 1],
            }),
          },
        ]}
      >
        {studentOverflowTabs.map((tab, index) => {
          const routeIndex = state.routes.findIndex(route => route.name === tab.name);
          const isFocused = state.index === routeIndex;
          const IconComponent = LucideIcons[tab.icon] as React.FC<any>;
          const position = getArcPosition(index, studentOverflowTabs.length);
          const itemAnim = getStaggerAnim(menuAnim, index);

          const translateX = itemAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, position.x],
          });
          const translateY = itemAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [18, position.y],
          });
          const scale = itemAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          });

          return (
            <Animated.View
              key={tab.name}
              style={[
                styles.arcItemAnchor,
                {
                  opacity: itemAnim,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.arcItemTouch}
                onPress={() => navigateToRoute(tab.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tab.label}
                activeOpacity={0.82}
              >
                <View
                  style={[
                    styles.arcCircle,
                    isFocused && {
                      backgroundColor: `${accentColor}12`,
                      borderColor: `${accentColor}40`,
                    },
                  ]}
                >
                  {IconComponent && (
                    <IconComponent
                      size={21}
                      color={isFocused ? accentColor : Theme.colors.text}
                      strokeWidth={isFocused ? 2.5 : 2}
                    />
                  )}
                </View>
                <View style={styles.arcLabelWrap}>
                  <Text
                    style={[styles.arcLabel, isFocused && { color: accentColor }]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>

      <View style={styles.floatingBar}>
        {leftTabs.map(tab => renderMainTab(tab))}

        <View style={styles.centerGap} />

        {rightTabs.map(tab => renderMainTab(tab))}
      </View>

      <View style={[styles.centerFabWrap, { bottom: bottomPad + 6 }]}>
        <TouchableOpacity
          onPress={toggleMenu}
          onPressIn={() =>
            Animated.spring(pressAnim, {
              toValue: 0.94,
              ...motion.springs.snappy,
              useNativeDriver: true,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(pressAnim, {
              toValue: 1,
              ...motion.springs.bouncy,
              useNativeDriver: true,
            }).start()
          }
          style={styles.centerTouch}
          accessibilityRole="button"
          accessibilityLabel="More"
          accessibilityState={{ expanded: menuOpen }}
          activeOpacity={0.9}
        >
          <View style={styles.centerHalo}>
            <Animated.View
              style={[
                styles.centerButton,
                {
                  backgroundColor: accentColor,
                  transform: [{ scale: Animated.multiply(pressAnim, centerGlow) }],
                },
                (menuOpen || isOverflowActive) && styles.centerButtonActive,
              ]}
            >
              <Animated.View style={{ transform: [{ rotate: plusRotation }] }}>
                <Plus size={24} color={Theme.colors.card} strokeWidth={2.5} />
              </Animated.View>
            </Animated.View>
          </View>
          <Text
            style={[
              styles.centerLabel,
              { color: menuOpen || isOverflowActive ? accentColor : Theme.colors.textMuted },
            ]}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 20,
    overflow: 'visible',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
    bottom: 68,
  },
  backdrop: {
    flex: 1,
    backgroundColor: Theme.colors.text,
  },
  arcContainer: {
    position: 'absolute',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcItemAnchor: {
    position: 'absolute',
    alignItems: 'center',
    width: 72,
  },
  arcItemTouch: {
    alignItems: 'center',
  },
  arcCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  arcLabelWrap: {
    marginTop: 6,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.card,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  arcLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '92%',
    maxWidth: 420,
    minHeight: 64,
    paddingTop: 10,
    paddingHorizontal: 6,
    paddingBottom: Theme.spacing.xs,
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  centerGap: {
    flex: 1,
    minWidth: 72,
    maxWidth: 88,
  },
  centerFabWrap: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 16,
  },
  centerTouch: {
    alignItems: 'center',
  },
  centerHalo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
    minWidth: 0,
  },
  iconSlot: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: Theme.typography.label.fontSize,
    marginTop: 3,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonActive: {
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  centerLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
    marginTop: Theme.spacing.xs,
  },
});

export default StudentTabBar;
