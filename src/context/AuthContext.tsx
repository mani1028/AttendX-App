// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredRole, performLogout } from '../utils/authSession';
import { setAuthToken } from '../services/api';
import eventEmitter from '../utils/eventEmitter';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  userRole: string | null;
  userToken: string | null;
  userName: string | null;
  isClassTeacher: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  signIn: (role: string, name: string, token: string, isClassTeacher?: boolean) => Promise<void>;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabBarVisible, setTabBarVisible] = useState(true);

  const refreshAuth = async () => {
    try {
      const role = await getStoredRole();
      const token = await AsyncStorage.getItem('token');
      const name = await AsyncStorage.getItem('user_name');
      const classTeacher = await AsyncStorage.getItem('is_class_teacher');

      if (token) {
        setAuthToken(token);
        setUserToken(token);
        setUserRole(role || null);
        setUserName(name || null);
        setIsClassTeacher(classTeacher === 'true');
      } else {
        setUserToken(null);
        setUserRole(null);
        setUserName(null);
        setIsClassTeacher(false);
      }
    } catch (error) {
      console.error('Refresh auth error:', error);
      setUserRole(null);
      setUserToken(null);
      setUserName(null);
      setIsClassTeacher(false);
    }
  };

  const signIn = async (role: string, name: string, token: string, isClassTeacher: boolean = false) => {
    setUserToken(token);
    setUserRole(role);
    setUserName(name);
    setIsClassTeacher(isClassTeacher);
    // Persist is_class_teacher to AsyncStorage
    await AsyncStorage.setItem('is_class_teacher', String(isClassTeacher));
  };

  const logout = async () => {
    try {
      await performLogout();
      setUserRole(null);
      setUserToken(null);
      setUserName(null);
      setIsClassTeacher(false);
      await AsyncStorage.removeItem('is_class_teacher');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    refreshAuth().finally(() => setIsLoading(false));

    const handleAuthChange = () => { refreshAuth(); };
    eventEmitter.on('auth-change', handleAuthChange);

    const handleLogout = () => {
      // Use InteractionManager and a delay to ensure any pending events/renders
      // finish before clearing auth state which triggers navigation resets.
      // This prevents "React Native native module communication failure"
      // during rapid navigation transitions (especially on 401 errors).
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          setUserRole(null);
          setUserToken(null);
          setUserName(null);
          setIsClassTeacher(false);
        }, 500);
      });
    };

    eventEmitter.on('app-logout', handleLogout);

    return () => {
      eventEmitter.off('auth-change', handleAuthChange);
      eventEmitter.off('app-logout', handleLogout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      userRole,
      userToken,
      userName,
      isClassTeacher,
      isLoading,
      setIsLoading,
      signIn,
      refreshAuth,
      logout,
      isTabBarVisible,
      setTabBarVisible
    }}>
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