// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredRole, isAuthenticated } from '../utils/authSession';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventEmitter from '../utils/eventEmitter';

interface AuthContextType {
  userRole: string | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const role = await getStoredRole();
      setUserRole(role);
    } catch (error) {
      console.error('Refresh auth error:', error);
      setUserRole(null);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userRole', 'role', 'token', 'user', 'school_code', 'branch_id'
      ]);
      setUserRole(null);
      EventEmitter.emit('app-logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    refreshAuth();
    
    // Listen for auth changes
    const handleAuthChange = () => {
      refreshAuth();
    };
    
    EventEmitter.on('auth-change', handleAuthChange);
    
    return () => {
      EventEmitter.off('auth-change', handleAuthChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ userRole, isLoading, setIsLoading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};