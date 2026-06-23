import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

const resolveRouteNavigator = (
  navigation: NavigationProp<any>,
  route: keyof RootStackParamList
): NavigationProp<any> => {
  let currentNavigation: any = navigation;

  while (currentNavigation) {
    const routeNames = currentNavigation.getState?.()?.routeNames;
    if (Array.isArray(routeNames) && routeNames.includes(route)) {
      return currentNavigation;
    }

    const parent = currentNavigation.getParent?.();
    if (!parent) {
      break;
    }

    currentNavigation = parent;
  }

  return navigation;
};

/**
 * Safe navigation back that checks if we can go back first
 * Falls back to specified route if we can't go back
 */
export const safeGoBack = (
  navigation: NavigationProp<any>,
  fallbackRoute?: keyof RootStackParamList
) => {

  if (navigation.canGoBack && navigation.canGoBack()) {
    navigation.goBack();
  } else if (fallbackRoute) {
    try {
      navigation.navigate(fallbackRoute as any);
    } catch (e) {
      // ignore
    }
  }
};

/**
 * Navigate with fallback to main tabs if route doesn't exist
 */
export const safeNavigate = (
  navigation: NavigationProp<any>,
  route: keyof RootStackParamList,
  params?: any
) => {
  try {
    const targetNavigation: any = resolveRouteNavigator(navigation, route);

    if (params !== undefined) {
      targetNavigation.navigate(route, params);
      return;
    }

    targetNavigation.navigate(route);
  } catch (error) {
    console.warn(`[Navigation] Failed to navigate to ${String(route)}:`, error);
    try {
      navigation.navigate('MainTabs' as any);
    } catch (e) {
      // ignore
    }
  }
};
