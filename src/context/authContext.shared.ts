import { createContext } from 'react';
import type { Animated } from 'react-native';
import type { SavedAccount } from '../utils/multiAccount';

export interface AuthContextType {
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
  tabBarTranslate?: Animated.Value;

  savedAccounts: SavedAccount[];
  switchToAccount: (account: SavedAccount) => Promise<boolean>;
  logoutAccount: (accountId: string) => Promise<void>;
  addNewAccount: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
