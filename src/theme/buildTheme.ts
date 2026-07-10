import { tokens } from './tokens';

export type ColorMode = 'light' | 'dark';

export type ThemeColors = typeof tokens.colors.light;

export interface AppTheme {
  colors: ThemeColors;
  spacing: typeof tokens.spacing;
  radius: typeof tokens.radius;
  shadow: typeof tokens.shadow;
  typography: typeof tokens.typography;
  mode: ColorMode;
  // Bridge flat properties (backwards compat)
  bg: string;
  bgAlt: string;
  card: string;
  sidebar: string;
  text: string;
  textMuted: string;
  textSec: string;
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  text2: string;
  text3: string;
  muted: string;
  border: string;
  borderLight: string;
  borderSoft: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryHover: string;
  primaryBorder: string;
  accent: string;
  success: string;
  successSoft: string;
  successBg: string;
  successText: string;
  successBorder: string;
  error: string;
  errorSoft: string;
  errorBg: string;
  errorText: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  navy: string;
  white: string;
}

export function buildTheme(mode: ColorMode = 'light'): AppTheme {
  const c = tokens.colors[mode];
  return {
    colors: c,
    spacing: tokens.spacing,
    radius: tokens.radius,
    shadow: tokens.shadow,
    typography: tokens.typography,
    mode,
    bg: c.background,
    bgAlt: c.backgroundAlt,
    card: c.card,
    sidebar: c.card,
    text: c.text,
    textMuted: c.textMuted,
    textSec: c.textSec,
    t1: c.text,
    t2: c.textSec,
    t3: c.textMuted,
    t4: c.textMuted + '80',
    text2: c.textSec,
    text3: c.textMuted,
    muted: c.textMuted,
    border: c.border,
    borderLight: c.borderLight,
    borderSoft: c.border + '80',
    primary: c.primary,
    primaryDark: c.primaryDark,
    primarySoft: c.primary + '1A',
    primaryHover: c.primaryDark,
    primaryBorder: c.primary + '30',
    accent: c.primary,
    success: c.success,
    successSoft: c.successBg,
    successBg: c.successBg,
    successText: c.success,
    successBorder: c.success + '30',
    error: c.error,
    errorSoft: c.errorBg,
    errorBg: c.errorBg,
    errorText: c.error,
    danger: c.error,
    dangerSoft: c.errorBg,
    dangerBorder: c.error + '30',
    warning: c.warning,
    warningSoft: c.warningBg,
    info: c.info,
    infoSoft: c.infoBg,
    navy: c.primary,
    white: '#ffffff',
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
