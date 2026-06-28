import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../theme/tokens';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

/** Inactive segmented-tab label/icon — darker than textMuted for gradient overlap */
export const SEGMENTED_INACTIVE_COLOR = Theme.colors.textSec;

export const segmentedControlIconColor = (active: boolean) =>
  active ? Theme.colors.primary : SEGMENTED_INACTIVE_COLOR;

/** Horizontal padding when the page header lives inside the main ScrollView. */
export const SCROLL_PAGE_GUTTER = 14;

/** Shared layout tokens for inner pages (Marks Entry pattern). */
export const innerPageLayoutStyles = StyleSheet.create({
  /** Pulls content up into header curve — header stays behind (no z-index). */
  headerWrapper: {
    marginBottom: HEADER_CONSTANTS.CONTENT_OVERLAP,
  },
  /** Wrap scroll content / first section so it paints above the header. */
  contentFront: {
    zIndex: 1,
    position: 'relative',
    ...Platform.select({ android: { elevation: 4 } }),
  },
  /** ScrollView / FlatList sibling of StandardPageHeader — paints above header. */
  scrollViewFront: {
    flex: 1,
    zIndex: 1,
    position: 'relative',
    ...Platform.select({ android: { elevation: 4 } }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  /** ScrollView content when StandardPageHeader is the first child (header scrolls with body). */
  scrollPageContent: {
    paddingHorizontal: SCROLL_PAGE_GUTTER,
    paddingBottom: 100,
  },
  /** Pull header edge-to-edge inside padded scroll content. */
  scrollHeaderBleed: {
    marginHorizontal: -SCROLL_PAGE_GUTTER,
    marginBottom: 12,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  pageBody: {
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
  },
  firstCard: {
    zIndex: 1,
    position: 'relative',
    marginHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.xxxl,
    marginBottom: Theme.spacing.lg,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
    }),
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
