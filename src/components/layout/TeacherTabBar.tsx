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
  Scan,
  CircleAlert,
  GraduationCap,
  LayoutGrid,
  BookOpen,
  UserCheck,
  ClipboardList
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const TeacherTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { tabBarTranslate, isTabBarVisible } = useAuth();

  const animatedOpacity = tabBarTranslate
    ? tabBarTranslate.interpolate({
        inputRange: [0, 120],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
      })
    : 1;

  const tabs = [
    { name: 'Home', label: 'Home', icon: Home },
    { name: 'Homework', label: 'Home Work', icon: BookOpen },
    { name: 'Scan', label: 'Verification', icon: Scan, isCenter: true },
    { name: 'Leaves', label: 'Leave', icon: ClipboardList },
    { name: 'Marks', label: 'Marks', icon: GraduationCap },
  ];

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

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index].key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(state.routes[index].name);
            }
          };

          if (tab.isCenter) {
            return (
              <View key={tab.name} style={styles.centerTabContainer}>
                <TouchableOpacity
                  onPress={onPress}
                  style={styles.centerButton}
                  activeOpacity={0.8}
                >
                  <View style={styles.centerIconWrapper}>
                    <IconComponent size={28} color="#fff" strokeWidth={2} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.centerLabel}>{tab.label}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <IconComponent
                size={24}
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
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default TeacherTabBar;
