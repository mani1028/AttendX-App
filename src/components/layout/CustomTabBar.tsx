import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Plus,
  CreditCard,
  FileText,
} from 'lucide-react-native';

const TAB_BAR_HEIGHT = 70;
const FAB_SIZE = 60;

const CustomTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isTabBarVisible } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isTabBarVisible ? 0 : 120,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isTabBarVisible, slideAnim]);

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const renderTab = (index: number, label: string) => {
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes[index].key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(state.routes[index].name);
      }
      if (isExpanded) {
        toggleMenu();
      }
    };

    const icons: Record<string, any> = {
      Home: Home,
      'Home Work': BookOpen,
      Leave: CalendarCheck,
      Marks: GraduationCap,
    };
    const IconComponent = icons[label] ?? Home;

    return (
      <TouchableOpacity
        key={index}
        onPress={onPress}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <IconComponent
          size={24}
          color={isFocused ? '#3498db' : '#8e8e93'}
          strokeWidth={isFocused ? 2.5 : 2}
        />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSubMenu = (
    index: number,
    IconComponent: any,
    translateX: number,
    translateY: number,
    targetRouteName?: string,
  ) => {
    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const moveX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, translateX],
    });

    const moveY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, translateY],
    });

    const onPress = () => {
      if (targetRouteName) {
        const parentNavigation = navigation.getParent?.();
        if (parentNavigation?.navigate) {
          parentNavigation.navigate(targetRouteName);
        } else {
          navigation.navigate(targetRouteName);
        }
      } else {
        navigation.navigate(state.routes[index].name);
      }
      toggleMenu();
    };

    return (
      <Animated.View
        key={`submenu-${index}`}
        style={[
          styles.subMenuItem,
          {
            transform: [
              { scale },
              { translateX: moveX },
              { translateY: moveY },
            ],
            opacity: animation,
          },
        ]}
      >
        <TouchableOpacity onPress={onPress} style={styles.subMenuButton}>
          <IconComponent size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.subMenuContainer}>
        {renderSubMenu(4, CreditCard, -70, -40)}
        {renderSubMenu(5, FileText, 70, -40)}
      </View>

      <View style={styles.backgroundContainer}>
        <View style={styles.curvedBar}>
          {renderTab(0, 'Home')}
          {renderTab(1, 'Home Work')}
          <View style={styles.tabItem} />
          {renderTab(2, 'Leave')}
          {renderTab(3, 'Marks')}
        </View>
      </View>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleMenu}
          style={styles.fab}
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
            <Plus size={32} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
        <Text style={styles.moreLabel}>More</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    ...Platform.select({

      android: { elevation: 10 },

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
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    color: '#8e8e93',
  },
  tabLabelActive: {
    color: '#3498db',
  },
  fabContainer: {
    position: 'absolute',
    top: -30,
    alignItems: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...Platform.select({

      android: { elevation: 5 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  moreLabel: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  subMenuContainer: {
    position: 'absolute',
    top: -20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subMenuItem: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({

      android: { elevation: 5 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  subMenuButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomTabBar;
