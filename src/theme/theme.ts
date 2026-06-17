export const Theme = {
  colors: {
    // Primary brand - Navy Blue
    primary: '#1e3a8a',
    primaryDark: '#172554',
    primaryLight: '#3b82f6',

    // Secondary / accents
    secondary: '#38bdf8',
    accent: '#1e3a8a',

    // Backgrounds
    background: '#f5f7fa',
    backgroundAlt: '#eef2f8',
    card: '#ffffff',
    cardAlt: '#f7f9fc',

    // Text
    text: '#0d1b2a',
    textSec: '#4a5568',
    textMuted: '#8898aa',

    // Border
    border: '#e4e9f2',
    borderLight: 'rgba(148,163,184,0.18)',

    // Status
    success: '#059669',
    successBg: 'rgba(5,150,105,0.1)',
    warning: '#d97706',
    warningBg: 'rgba(217,119,6,0.1)',
    error: '#dc2626',
    errorBg: 'rgba(220,38,38,0.1)',
    info: '#0ea5e9',
    infoBg: 'rgba(14,165,233,0.1)',

    // Semantic
    blue: '#3b82f6',
    blueLight: '#dbeafe',
    violet: '#7c3aed',
    violetLight: '#ede9fe',
    green: '#059669',
    greenLight: '#d1fae5',
    amber: '#d97706',
    amberLight: '#fef3c7',
    red: '#dc2626',
    redLight: '#fee2e2',
    sky: '#38bdf8',
    skyLight: '#e0f2fe',

    // Gradient colors
    gradientStart: '#1e3a8a',
    gradientEnd: '#3b82f6',
    gradientBlue: '#38bdf8',

    // Input
    inputBg: '#f8fafc',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 36,
    full: 999,
  },

  shadow: {
    sm: {
      shadowColor: '#1e3a8a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#1e3a8a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#1e3a8a',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 8,
    },
  },

  typography: {
    h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.8 },
    h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
    h3: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
    h4: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
    bodyMd: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
    caption: { fontSize: 12, fontWeight: '500' as const },
    label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  },
} as const;
