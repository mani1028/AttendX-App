import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

/**
 * Safe navigation back that checks if we can go back first
 * Falls back to specified route if we can't go back
 */
export const safeGoBack = (
  navigation: NavigationProp<RootStackParamList>,
  fallbackRoute?: keyof RootStackParamList
) => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else if (fallbackRoute) {
    navigation.navigate(fallbackRoute as never);
  }
};

/**
 * Navigate with fallback to main tabs if route doesn't exist
 */
export const safeNavigate = (
  navigation: NavigationProp<RootStackParamList>,
  route: keyof RootStackParamList,
  params?: any
) => {
  try {
    if (params) {
      navigation.navigate(route as never, params as never);
    } else {
      navigation.navigate(route as never);
    }
  } catch (error) {
    console.warn(`[Navigation] Failed to navigate to ${String(route)}:`, error);
    // Fallback to MainTabs
    navigation.navigate('MainTabs' as never);
  }
};
