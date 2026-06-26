// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredRole, performLogout } from '../utils/authSession';
import { setAuthToken } from '../services/api';
import notificationService from '../services/notificationService';
import eventEmitter from '../utils/eventEmitter';
import { SavedAccount, getSavedAccounts, switchAccount, addCurrentSessionToSaved, removeAccount } from '../utils/multiAccount';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';


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
  tabBarTranslate?: Animated.Value;

  // Multi-account
  savedAccounts: SavedAccount[];
  switchToAccount: (account: SavedAccount) => Promise<boolean>;
  logoutAccount: (accountId: string) => Promise<void>;
  addNewAccount: () => void; // Trigger navigation to login without clearing other accounts
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const tabBarTranslate = useRef(new Animated.Value(0)).current;
  const tabBarVisibleRef = useRef(true);
  // Guard flag: prevents re-entrant app-logout handling (performLogout re-emits the event)
  const isHandlingLogoutRef = useRef(false);

  // centralised setter that also animates the shared translate value
  const setTabBarVisible = useCallback((visible: boolean) => {
    if (tabBarVisibleRef.current === visible) {
      return;
    }
    tabBarVisibleRef.current = visible;
    setIsTabBarVisible(visible);
    Animated.timing(tabBarTranslate, {
      toValue: visible ? 0 : 200,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslate]);

  const refreshAuth = async () => {
    try {
      const role = await getStoredRole();
      const token = await storage.getSecure(StorageKeys.AUTH_TOKEN);
      const name = await AsyncStorage.getItem('user_name');
      const classTeacher = await AsyncStorage.getItem('is_class_teacher');
      const accounts = await getSavedAccounts();
      setSavedAccounts(accounts);

      if (token) {
        setAuthToken(token);
        setUserToken(token);
        setUserRole(role || null);
        setUserName(name || null);
        setIsClassTeacher(classTeacher === 'true' || classTeacher === '1');

        // Ensure current session is in saved accounts
        await addCurrentSessionToSaved();
        const updatedAccounts = await getSavedAccounts();
        setSavedAccounts(updatedAccounts);

        // Sync FCM token with the new session
        notificationService.ensureFcmTokenSynced().catch(err =>
          console.warn('[AuthContext] FCM sync failed after refresh:', err)
        );

        // Sync is_class_teacher from API for teachers (non-blocking)
        if (role === 'teacher') {
          import('../services/teacherService').then(({ getTeacherProfile }) => {
            getTeacherProfile().then((profile) => {
              if (profile?.is_class_teacher !== undefined) {
                const apiVal = String(profile.is_class_teacher);
                AsyncStorage.setItem('is_class_teacher', apiVal).catch(() => {});
                setIsClassTeacher(profile.is_class_teacher === true || apiVal === 'true');
              }
            }).catch(() => {});
          }).catch(() => {});
        }
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
    await storage.setSecure(StorageKeys.AUTH_TOKEN, token);
    setUserToken(token);
    setUserRole(role);
    setUserName(name);
    setIsClassTeacher(isClassTeacher);
    // Persist is_class_teacher to AsyncStorage
    await AsyncStorage.setItem('is_class_teacher', String(isClassTeacher));

    // Multi-account: update saved list
    await addCurrentSessionToSaved();
    const accounts = await getSavedAccounts();
    setSavedAccounts(accounts);

    // Sync FCM token for the newly signed-in user
    notificationService.ensureFcmTokenSynced().catch(err =>
      console.warn('[AuthContext] FCM sync failed after sign-in:', err)
    );
  };

  const logout = async () => {
    try {
      // Find current account ID to remove it from saved accounts if we want full logout
      // Or we can just performLogout which clears current session
      const token = await storage.getSecure(StorageKeys.AUTH_TOKEN);
      const role = await storage.getString(StorageKeys.USER_ROLE) || await storage.getString(StorageKeys.USER_ROLE);
      const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE);
      const userId = await AsyncStorage.getItem('user_id');
      const studentId = await AsyncStorage.getItem('student_id');
      const employeeId = await storage.getString(StorageKeys.EMPLOYEE_ID);

      if (role && schoolCode) {
        const accountId = `${role}:${schoolCode}:${userId || studentId || employeeId}`;
        await removeAccount(accountId);
      }

      await performLogout();
      await storage.removeSecure(StorageKeys.AUTH_TOKEN);
      setUserRole(null);
      setUserToken(null);
      setUserName(null);
      setIsClassTeacher(false);
      await AsyncStorage.removeItem('is_class_teacher');

      const accounts = await getSavedAccounts();
      setSavedAccounts(accounts);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const switchToAccount = async (account: SavedAccount) => {
    try {
      await storage.setSecure(StorageKeys.AUTH_TOKEN, account.token);
      const success = await switchAccount(account);
      // refreshAuth() is triggered automatically via 'auth-change' event listener
      return success;
    } catch (e) {
      console.error('Error switching account:', e);
      return false;
    }
  };

  const logoutAccount = async (accountId: string) => {
    const currentToken = await storage.getSecure(StorageKeys.AUTH_TOKEN);
    const currentRole = await storage.getString(StorageKeys.USER_ROLE) || await storage.getString(StorageKeys.USER_ROLE);
    const currentSchoolCode = await storage.getString(StorageKeys.SCHOOL_CODE);
    const currentUserId = await AsyncStorage.getItem('user_id');
    const currentStudentId = await AsyncStorage.getItem('student_id');
    const currentEmployeeId = await storage.getString(StorageKeys.EMPLOYEE_ID);
    const currentId = `${currentRole}:${currentSchoolCode}:${currentUserId || currentStudentId || currentEmployeeId}`;

    await removeAccount(accountId);

    if (accountId === currentId) {
      await logout();
    } else {
      const accounts = await getSavedAccounts();
      setSavedAccounts(accounts);
    }
  };

  const addNewAccount = async () => {
    // Save current session to saved accounts before clearing
    await addCurrentSessionToSaved();
    const accounts = await getSavedAccounts();
    setSavedAccounts(accounts);
    // Clear current session to show Login screen
    await storage.removeSecure(StorageKeys.AUTH_TOKEN);
    setUserToken(null);
    setUserRole(null);
    setUserName(null);
    eventEmitter.emit('auth-change');
  };

  useEffect(() => {
    refreshAuth().finally(() => setIsLoading(false));

    const handleAuthChange = () => { refreshAuth(); };
    eventEmitter.on('auth-change', handleAuthChange);

    const handleLogout = () => {
      // Prevent re-entrant execution: performLogout() re-emits 'app-logout', which would
      // create an infinite loop of token clearing and event emissions.
      if (isHandlingLogoutRef.current) {return;}
      isHandlingLogoutRef.current = true;

      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          try {
            // Only clear the auth token (stops the 401 request loop).
            // Do NOT call performLogout() here — it re-emits 'app-logout' and
            // would wipe ALL AsyncStorage including a freshly-stored session.
            setAuthToken(null);

            // Mark the account as expired in saved_accounts
            try {
              const role = await storage.getString(StorageKeys.USER_ROLE) || await storage.getString(StorageKeys.USER_ROLE);
              const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE);
              const userId = await AsyncStorage.getItem('user_id') || await AsyncStorage.getItem('student_id') || await storage.getString(StorageKeys.EMPLOYEE_ID);
              const currentId = `${role}:${schoolCode}:${userId}`;

              const savedAccountsRaw = await AsyncStorage.getItem('saved_accounts');
              if (savedAccountsRaw) {
                const accounts = JSON.parse(savedAccountsRaw);
                const updated = accounts.filter((a: any) => a.id !== currentId);
                await AsyncStorage.setItem('saved_accounts', JSON.stringify(updated));
                setSavedAccounts(updated);
              }
            } catch (e) {}

            await AsyncStorage.multiRemove(['token', 'auth_token', 'authToken']);
          } catch (_) {
            // Storage errors should not block the UI state update
          }
          setUserRole(null);
          setUserToken(null);
          setUserName(null);
          setIsClassTeacher(false);
          isHandlingLogoutRef.current = false;
        }, 300);
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
      setTabBarVisible,
      tabBarTranslate,
      savedAccounts,
      switchToAccount,
      logoutAccount,
      addNewAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {throw new Error('useAuth must be used within an AuthProvider');}
  return context;
};

// ─── Export eventEmitter so other files can emit/listen ─────────────────────────
export { eventEmitter as AppEvents };
