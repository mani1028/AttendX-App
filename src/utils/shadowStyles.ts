import { Platform, ViewStyle } from 'react-native';

/**
 * Creates platform-appropriate shadow styles.
 * iOS uses shadowColor/shadowOffset/shadowOpacity/shadowRadius
 * Android uses elevation
 * This prevents iOS NSInvalidArgumentException crashes
 */
export const getShadowStyle = (
  elevation: number,
  shadowColor: string = '#000',
  shadowOffset: { width: number; height: number } = { width: 0, height: 2 },
  shadowOpacity: number = 0.1,
  shadowRadius: number = 4
): ViewStyle => {
  return Platform.select({
    ios: {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    },
    android: {
      elevation,
    },
    default: {
      elevation,
    },
  }) as ViewStyle;
};

/**
 * High elevation shadow (elevation: 6+)
 */
export const shadowLarge: ViewStyle = getShadowStyle(
  6,
  '#000',
  { width: 0, height: 8 },
  0.15,
  12
);

/**
 * Medium elevation shadow (elevation: 3-5)
 */
export const shadowMedium: ViewStyle = getShadowStyle(
  4,
  '#000',
  { width: 0, height: 4 },
  0.1,
  8
);

/**
 * Small elevation shadow (elevation: 1-2)
 */
export const shadowSmall: ViewStyle = getShadowStyle(
  2,
  '#000',
  { width: 0, height: 2 },
  0.05,
  4
);
