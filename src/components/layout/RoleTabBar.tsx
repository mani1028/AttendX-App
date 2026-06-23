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

  // Animation for hiding/showing the tab bar
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isTabBarVisible ? 0 : 150,
      useNativeDriver: true,
      ...motion.springs.bouncy,
    }).start();
  }, [isTabBarVisible, translateY]);

  return (
    <Animated.View style={[styles.tabBar, { bottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const tabConfig = tabs.find(t => t.name === route.name) || tabs[index];
        if (!tabConfig) {return null;}

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
              onPressIn={() => Animated.spring(pressAnim, { toValue: 0.92, ...motion.springs.snappy, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(pressAnim, { toValue: 1, ...motion.springs.bouncy, useNativeDriver: true }).start()}
              style={[styles.centerButtonWrap, { top: -20 }]}
              accessibilityRole="button"
              accessibilityLabel={tabConfig.label}
              activeOpacity={1}
            >
              <Animated.View style={[styles.centerButton, { backgroundColor: accentColor, transform: [{ scale: pressAnim }] }]}>
                {IconComponent && <IconComponent size={28} color={Theme.colors.card} />}
              </Animated.View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityLabel={tabConfig.label}
          >
            {IconComponent && (
              <IconComponent
                size={24}
                color={isFocused ? accentColor : Theme.colors.textMuted}
              />
            )}
            <Text style={[styles.tabLabel, { color: isFocused ? accentColor : Theme.colors.textMuted }]}>
              {tabConfig.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 30,
    flexDirection: 'row',
    backgroundColor: Theme.colors.card,
    paddingVertical: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...Theme.typography.caption,
    fontSize: 10,
    marginTop: Theme.spacing.xs,
    fontWeight: '600',
  },
  centerButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Theme.colors.card,
    elevation: 10,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});

export default RoleTabBar;
