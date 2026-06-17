import { Platform, ViewStyle } from 'react-native';
import { Theme } from '../theme/theme';

type ShadowPreset = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const shadows = {
  none: {} as ShadowPreset,
  
  xs: Platform.select({
    ios: {
      shadowColor: Theme.colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
  }) as ShadowPreset,
  
  sm: Platform.select({
    ios: {
      shadowColor: Theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
  }) as ShadowPreset,
  
  md: Platform.select({
    ios: {
      shadowColor: Theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
    android: { elevation: 4 },
  }) as ShadowPreset,
  
  lg: Platform.select({
    ios: {
      shadowColor: Theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 22,
    },
    android: { elevation: 8 },
  }) as ShadowPreset,
  
  xl: Platform.select({
    ios: {
      shadowColor: Theme.colors.primary,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 32,
    },
    android: { elevation: 12 },
  }) as ShadowPreset,
  
  // Dark shadow for overlays
  dark: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: { elevation: 10 },
  }) as ShadowPreset,
};

export type ShadowKey = keyof typeof shadows;
