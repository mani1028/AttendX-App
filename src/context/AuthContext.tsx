// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredRole, performLogout } from '../utils/authSession';
import { setAuthToken } from '../services/api';
import eventEmitter from '../utils/eventEmitter';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  userRole: string | null;
  userToken: string | null;
  userName: string | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  signIn: (role: string, name: string, token: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const role = await getStoredRole();
      const token = await AsyncStorage.getItem('token');
      const name = await AsyncStorage.getItem('user_name');

      if (token) {
        setAuthToken(token);
        setUserToken(token);
        setUserRole(role || null);
        setUserName(name || null);
      } else {
        setUserToken(null);
        setUserRole(null);
        setUserName(null);
      }
    } catch (error) {
      console.error('Refresh auth error:', error);
      setUserRole(null);
      setUserToken(null);
      setUserName(null);
    }
  };

  const signIn = async (role: string, name: string, token: string) => {
    setUserToken(token);
    setUserRole(role);
    setUserName(name);
  };

  const logout = async () => {
    try {
      await performLogout();
      setUserRole(null);
      setUserToken(null);
      setUserName(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    refreshAuth().finally(() => setIsLoading(false));

    const handleAuthChange = () => { refreshAuth(); };
    eventEmitter.on('auth-change', handleAuthChange);
    eventEmitter.on('app-logout', () => {
      setUserRole(null);
      setUserToken(null);
      setUserName(null);
    });

    return () => {
      eventEmitter.off('auth-change', handleAuthChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ userRole, userToken, userName, isLoading, setIsLoading, signIn, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ─── Export eventEmitter so other files can emit/listen ─────────────────────────
export { eventEmitter as AppEvents };