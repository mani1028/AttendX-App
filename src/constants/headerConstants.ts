import { Theme } from '../theme/tokens';

// Standardized header values — unified hero curve/size across ALL pages
export const HEADER_CONSTANTS = {
  PADDING_TOP_WITH_INSETS: (insets: { top: number }) => insets.top + 12,
  PADDING_BOTTOM: 28,
  PADDING_HORIZONTAL: 20,

  // Hero shell (Notifications-style curved header)
  HERO_PADDING_BOTTOM: 28,
  HERO_TOP_BAR_GAP: 20,
  HERO_TITLE_SIZE: 22,
  HERO_SUBTITLE_SIZE: 13,

  // Inner-page hero header (Marks Entry pattern)
  INNER_PAGE_PADDING_BOTTOM: 88,
  CONTENT_OVERLAP: -56,
  INNER_PAGE_TITLE_SIZE: 22,
  TITLE_ICON_RING_SIZE: 52,

  // Dashboard hero header
  DASHBOARD_PADDING_BOTTOM: 28,
  DASHBOARD_HORIZONTAL: 20,
  DASHBOARD_MIN_BODY_HEIGHT: 56,
  GRADIENT_START: Theme.colors.primary,
  GRADIENT_END: Theme.colors.primaryLight,

  // Curved bottom corners
  BORDER_RADIUS: 30,

  // Icon/button sizes
  ICON_BUTTON_SIZE: 40,
  ICON_BUTTON_BORDER_RADIUS: 20,
  ICON_BUTTON_BG: 'rgba(255,255,255,0.15)',
  BUTTON_BACKGROUND_OPACITY: 0.15,

  // Typography (legacy inner-page compat)
  TITLE_FONT_SIZE: 22,
  TITLE_FONT_WEIGHT: '800' as const,
  SUBTITLE_FONT_SIZE: 13,
  SUBTITLE_OPACITY: 0.72,

  // Colors
  BACKGROUND_COLOR: Theme.colors.primary,
  TEXT_COLOR: Theme.colors.card,
} as const;
