import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

/** Icon row + labels in RoleTabBar (excludes safe-area inset). */
export const TAB_BAR_BODY_HEIGHT = 64;

/** Breathing room between scroll content and the tab bar. */
export const TAB_BAR_EXTRA_GAP = 12;

/** Bottom scroll inset for screens shown above the role tab bar. */
export function getTabBarScrollPadding(insets: EdgeInsets, extra = 0): number {
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 0);
  return TAB_BAR_BODY_HEIGHT + TAB_BAR_EXTRA_GAP + bottomInset + extra;
}
