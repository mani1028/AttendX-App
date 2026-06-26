import { Theme } from '../theme/tokens';



// Standardized header values for consistent sizing across all pages
export const HEADER_CONSTANTS = {
  // Padding values for standard headers
  PADDING_TOP_WITH_INSETS: (insets: any) => insets.top + 12,
  PADDING_BOTTOM: 32, // Standard padding for all headers
  PADDING_HORIZONTAL: 16,

  // Border radius
  BORDER_RADIUS: 24,

  // Icon/button sizes
  ICON_BUTTON_SIZE: 40,
  ICON_BUTTON_BORDER_RADIUS: 20,

  // Typography
  TITLE_FONT_SIZE: 18,
  TITLE_FONT_WEIGHT: '700' as const,
  SUBTITLE_FONT_SIZE: 12,
  SUBTITLE_OPACITY: 0.7,

  // Colors
  BACKGROUND_COLOR: Theme.colors.primary,
  TEXT_COLOR: '#ffffff',
  BUTTON_BACKGROUND_OPACITY: 0.1,
} as const;
