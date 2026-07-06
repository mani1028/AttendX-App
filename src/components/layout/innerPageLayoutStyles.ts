import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { TAB_BAR_BODY_HEIGHT, TAB_BAR_EXTRA_GAP } from '../../utils/tabBarLayout';

/** Static tab-bar clearance — pair with `insets.bottom` via `useTabBarScrollPadding`. */
export const TAB_BAR_SCROLL_BASE = TAB_BAR_BODY_HEIGHT + TAB_BAR_EXTRA_GAP;

/** Inactive segmented-tab label/icon — darker than textMuted for gradient overlap */
export const SEGMENTED_INACTIVE_COLOR = Theme.colors.textSec;

export const segmentedControlIconColor = (active: boolean) =>
  active ? Theme.colors.primary : SEGMENTED_INACTIVE_COLOR;

/** Single horizontal inset for inner pages — matches hero header padding. */
export const PAGE_GUTTER = HEADER_CONSTANTS.PADDING_HORIZONTAL;

/** @deprecated Use PAGE_GUTTER */
export const SCROLL_PAGE_GUTTER = PAGE_GUTTER;

/** Shared layout tokens for inner pages (Marks Entry pattern). */
export const innerPageLayoutStyles = StyleSheet.create({
  /** Pulls content up into header curve — header stays behind (no z-index). */
  headerWrapper: {
    marginBottom: HEADER_CONSTANTS.CONTENT_OVERLAP,
  },
  /** Layout wrapper only — no background or elevation (avoids double-card chrome). */
  contentFront: {
    zIndex: 1,
    position: 'relative',
  },
  /** ScrollView sibling of StandardPageHeader — transparent, no sheet chrome. */
  scrollViewFront: {
    flex: 1,
    zIndex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: TAB_BAR_SCROLL_BASE,
    paddingHorizontal: PAGE_GUTTER,
  },
  /** ScrollView content when StandardPageHeader is the first child (header scrolls with body). */
  scrollPageContent: {
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: TAB_BAR_SCROLL_BASE,
  },
  /** Pull header edge-to-edge inside padded scroll content. */
  scrollHeaderBleed: {
    marginHorizontal: -PAGE_GUTTER,
    marginBottom: 12,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  /** Wrapper only — horizontal gutter is on the scroll container. */
  pageBody: {},
  firstCard: {
    zIndex: 1,
    position: 'relative',
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  /** Pill segmented switch — solid track so inactive tabs stay visible on hero gradient */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: Theme.spacing.xs,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentedTabActive: {
    backgroundColor: Theme.colors.card,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  segmentedTabText: {
    fontSize: 13,
    color: SEGMENTED_INACTIVE_COLOR,
  },
  segmentedTabTextActive: {
    color: Theme.colors.primary,
  },
});
