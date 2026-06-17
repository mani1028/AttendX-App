/**
 * AttendX Design Tokens
 * Matches the web portal's visual language exactly.
 * Edit this file to retheme the entire app at once.
 */

export const BRAND = {
  // Primary (purple) - main CTA color, headers, active tabs
  primary: '#6648dc',
  primaryDark: '#5b3cc4',
  primaryLight: '#7c3aed',

  // Secondary (sky blue) - accents, highlights
  secondary: '#38bdf8',

  // Gradient tuple (for LinearGradient where used)
  gradient: ['#6648dc', '#7c3aed'] as [string, string],
  gradientBlue: ['#0ea5e9', '#38bdf8'] as [string, string],
};

export const SURFACE = {
  background: '#f5f7fa',
  backgroundAlt: '#eef2f8',
  card: '#ffffff',
  cardAlt: '#f7f9fc',
  border: '#e4e9f2',
  borderLight: 'rgba(148,163,184,0.18)',

  // Dark sidebar (matches web portal sidebar)
  sidebar: '#050d1a',
  sidebarAlt: '#071834',
  sidebarBorder: 'rgba(102,72,220,0.15)',
};

export const TEXT = {
  primary: '#0d1b2a',
  secondary: '#4a5568',
  muted: '#8898aa',
  inverse: '#ffffff',
  // Dark sidebar text
  sidebarPrimary: '#f1f5f9',
  sidebarSecondary: '#94a3b8',
  sidebarDim: '#475569',
};

export const STATUS = {
  success: '#059669',
  successBg: 'rgba(5,150,105,0.1)',
  warning: '#d97706',
  warningBg: 'rgba(217,119,6,0.1)',
  error: '#dc2626',
  errorBg: 'rgba(220,38,38,0.1)',
  info: '#0ea5e9',
  infoBg: 'rgba(14,165,233,0.1)',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  card: 20,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  page: 16,
};
