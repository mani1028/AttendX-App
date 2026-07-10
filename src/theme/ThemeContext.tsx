import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, StatusBar, Platform } from 'react-native';
import { buildTheme, type AppTheme, type ColorMode } from './buildTheme';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ColorMode;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme('light'),
  mode: 'light',
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode: ColorMode = systemScheme === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, isDark: mode === 'dark' }}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {children}
    </ThemeContext.Provider>
  );
}

/** Runtime theme — respects system light/dark. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Status bar for hero/navy headers over light system mode. */
export function ThemedStatusBar({ light = false }: { light?: boolean }) {
  const { isDark } = useTheme();
  const barStyle = light || isDark ? 'light-content' : 'dark-content';
  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor="transparent"
      translucent
    />
  );
}

export function useThemedStyles<T extends Record<string, unknown>>(
  factory: (theme: AppTheme) => T,
): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
