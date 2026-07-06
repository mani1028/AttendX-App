import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarScrollPadding } from '../utils/tabBarLayout';

export function useTabBarScrollPadding(extra = 0): number {
  const insets = useSafeAreaInsets();
  return getTabBarScrollPadding(insets, extra);
}
