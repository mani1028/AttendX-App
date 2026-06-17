import { Theme } from '../theme/theme';

export const Principal_THEME = {
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

  // Brand (Navy Blue)
  primary: Theme.colors.primary,
  primaryDark: Theme.colors.primaryDark,
  primarySoft: Theme.colors.primary + '1A',
  primaryHover: Theme.colors.primaryDark,
  primaryBorder: Theme.colors.primary + '30',
  accent: Theme.colors.primary,

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

  // Header — use Navy Blue
  navy: Theme.colors.primary,

  white: '#ffffff',
};

export default Principal_THEME;
