import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LucideIcons from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import { motion } from '../../theme/motion';
import { useAuth } from '../../context/AuthContext';

export interface TabConfig {
  name: string;
  label: string;
  icon: keyof typeof LucideIcons;
  routeIndex?: number;
  isCenter?: boolean;
}

export interface RoleTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  tabs: TabConfig[];
  accentColor: string;
  centerButtonAction?: () => void;
}

const RoleTabBar: React.FC<RoleTabBarProps> = ({
  state,
  descriptors,
  navigation,
  tabs,
  accentColor,
  centerButtonAction,
}) => {
  const insets = useSafeAreaInsets();
  const pressAnim = useRef(new Animated.Value(1)).current;
  const { isTabBarVisible } = useAuth();
  const translateY = useRef(new Animated.Value(0)).current;
  const tabCount = state.routes.length;
  const compactLabels = tabCount > 5;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isTabBarVisible ? 0 : 120,
      useNativeDriver: true,
      ...motion.springs.bouncy,
    }).start();
  }, [isTabBarVisible, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6),
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const tabConfig = tabs.find(t => t.name === route.name) || tabs[index];
          if (!tabConfig) { return null; }

          const isFocused = state.index === index;
          const IconComponent = LucideIcons[tabConfig.icon] as React.FC<any>;

          const onPress = () => {
            if (tabConfig.isCenter && centerButtonAction) {
              centerButtonAction();
              return;
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (tabConfig.isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                onPressIn={() =>
                  Animated.spring(pressAnim, { toValue: 0.94, ...motion.springs.snappy, useNativeDriver: true }).start()
                }
                onPressOut={() =>
                  Animated.spring(pressAnim, { toValue: 1, ...motion.springs.bouncy, useNativeDriver: true }).start()
                }
                style={styles.centerSlot}
                accessibilityRole="button"
                accessibilityLabel={tabConfig.label}
                activeOpacity={0.9}
              >
                <Animated.View
                  style={[
                    styles.centerButton,
                    { backgroundColor: accentColor, transform: [{ scale: pressAnim }] },
                  ]}
                >
                  {IconComponent && <IconComponent size={26} color={Theme.colors.card} />}
                </Animated.View>
                <Text style={[styles.centerLabel, { color: isFocused ? accentColor : Theme.colors.textMuted }]}>
                  {tabConfig.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tabConfig.label}
              activeOpacity={0.7}
            >
              <View style={styles.iconSlot}>
                {IconComponent && (
                  <IconComponent
                    size={isFocused ? (compactLabels ? 22 : 24) : (compactLabels ? 21 : 22)}
                    color={isFocused ? accentColor : Theme.colors.textMuted}
                    strokeWidth={isFocused ? 2.5 : 1.75}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  compactLabels && styles.tabLabelCompact,
                  isFocused && styles.tabLabelActive,
                  { color: isFocused ? accentColor : Theme.colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {tabConfig.label}
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.card,
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 56,
    paddingTop: 6,
    paddingHorizontal: Theme.spacing.xs,
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
  tabLabelCompact: {
    fontSize: Theme.typography.label.fontSize,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -18,
    paddingBottom: 2,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  centerLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default RoleTabBar;
