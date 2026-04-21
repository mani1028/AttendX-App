import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AppRole } from '../constants/roles';
import { setAuthToken } from '../services/api';

type AuthSession = {
  role: AppRole;
  name: string;
  token?: string;
};

type AuthContextType = {
  isBootstrapping: boolean;
  session: AuthSession | null;
  signIn: (role: AppRole, name: string, token?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SESSION_KEY = '@attendx/session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as AuthSession;
          setSession(saved);
          setAuthToken(saved.token);
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    void loadSession();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      isBootstrapping,
      session,
      signIn: async (role, name, token) => {
        const nextSession = { role, name, token };
        setSession(nextSession);
        setAuthToken(token);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      },
      signOut: async () => {
        setSession(null);
        setAuthToken(null);
        await AsyncStorage.removeItem(SESSION_KEY);
      },
    }),
    [isBootstrapping, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}