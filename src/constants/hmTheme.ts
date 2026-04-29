import { colors } from './theme';

export const HM_THEME = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  muted: colors.textMuted,
  textMuted: colors.textMuted, // For compatibility with screens using textMuted
  primary: colors.primary,
  primarySoft: colors.secondary + '20', // secondary is often used for soft backgrounds
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
  accent: colors.accent,
  danger: colors.error,
  info: '#0ea5e9',
  infoSoft: 'rgba(14, 165, 233, 0.2)',
  successBg: colors.successSoft,
  successText: colors.success,
  errorBg: colors.errorSoft,
  errorText: colors.error,
  primaryHover: colors.secondary,
  primaryBorder: colors.primary + '30',
  successBorder: colors.success + '30',
  dangerSoft: colors.errorSoft,
  dangerBorder: colors.error + '30',
  white: colors.surface,
  borderLight: colors.border + '60',
  t1: colors.textPrimary,
  t2: colors.textPrimary + 'CC',
  t3: colors.textMuted,
  t4: colors.textMuted + '80',
  text2: colors.textPrimary + 'CC',
  text3: colors.textMuted,
  borderSoft: colors.border + '60',
  sidebar: colors.surface,
  navy: '#001F3F', // The standardized navy color used in HM headers
};

export default HM_THEME;
