import { Theme } from '../theme/theme';

export const Director_THEME = {
  // Core backgrounds
  bg: Theme.colors.background,
  bgAlt: Theme.colors.backgroundAlt,
  card: Theme.colors.card,
  sidebar: Theme.colors.card,

  // Text
  text: Theme.colors.text,
  textMuted: Theme.colors.textMuted,
  t1: Theme.colors.text,
  t2: Theme.colors.textSec,
  t3: Theme.colors.textMuted,
  t4: Theme.colors.textMuted + '80',
  text2: Theme.colors.textSec,
  text3: Theme.colors.textMuted,
  muted: Theme.colors.textMuted,

  // Borders
  border: Theme.colors.border,
  borderLight: Theme.colors.borderLight,
  borderSoft: Theme.colors.border + '80',

  // Brand (Violet/Purple for Director)
  primary: '#6648dc',
  primaryDark: '#5539b0',
  primarySoft: '#6648dc1A',
  primaryHover: '#5539b0',
  primaryBorder: '#6648dc30',
  accent: '#6648dc',

  // Status
  success: Theme.colors.success,
  successSoft: Theme.colors.successBg,
  successBg: Theme.colors.successBg,
  successText: Theme.colors.success,
  successBorder: Theme.colors.success + '30',

  error: Theme.colors.error,
  errorSoft: Theme.colors.errorBg,
  errorBg: Theme.colors.errorBg,
  errorText: Theme.colors.error,
  danger: Theme.colors.error,
  dangerSoft: Theme.colors.errorBg,
  dangerBorder: Theme.colors.error + '30',

  warning: Theme.colors.warning,
  warningSoft: Theme.colors.warningBg,

  info: Theme.colors.info,
  infoSoft: Theme.colors.infoBg,

  // Header
  navy: '#6648dc', // Using director primary for consistency

  white: '#ffffff',
};

export default Director_THEME;
