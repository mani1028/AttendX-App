// src/context/AuthContext.tsx

import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredRole, performLogout } from '../utils/authSession';
import { setAuthToken } from '../services/api';
import notificationService from '../services/notificationService';
import eventEmitter from '../utils/eventEmitter';
import { SavedAccount, getSavedAccounts, switchAccount, addCurrentSessionToSaved, removeAccount, buildAccountId, removeCurrentSessionAccount } from '../utils/multiAccount';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';
import { AuthContext, type AuthContextType } from './authContext.shared';

export type { AuthContextType };

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
      const role = await storage.getString(StorageKeys.USER_ROLE) || await AsyncStorage.getItem('role');
      const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await AsyncStorage.getItem('school_code');
      const userId = await AsyncStorage.getItem('user_id');
      const studentId = await AsyncStorage.getItem('student_id');
      const employeeId = await storage.getString(StorageKeys.EMPLOYEE_ID) || await AsyncStorage.getItem('employee_id');
      const name = await AsyncStorage.getItem('user_name');

      if (role && schoolCode) {
        const accountId = buildAccountId({
          role,
          schoolCode,
          userId: userId || undefined,
          studentId: studentId || undefined,
          employeeId: employeeId || undefined,
          name: name || undefined,
        });
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
      if (!account.token?.trim()) {
        await removeAccount(account.id);
        const accounts = await getSavedAccounts();
        setSavedAccounts(accounts);
        return false;
      }

      await storage.setSecure(StorageKeys.AUTH_TOKEN, account.token);
      const success = await switchAccount(account);
      if (!success) {
        await removeAccount(account.id);
        const accounts = await getSavedAccounts();
        setSavedAccounts(accounts);
      }
      return success;
    } catch (e) {
      console.error('Error switching account:', e);
      await removeAccount(account.id);
      const accounts = await getSavedAccounts();
      setSavedAccounts(accounts);
      return false;
    }
  };

  const logoutAccount = async (accountId: string) => {
    const currentRole = await storage.getString(StorageKeys.USER_ROLE) || await AsyncStorage.getItem('role');
    const currentSchoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || await AsyncStorage.getItem('school_code');
    const currentUserId = await AsyncStorage.getItem('user_id');
    const currentStudentId = await AsyncStorage.getItem('student_id');
    const currentEmployeeId = await storage.getString(StorageKeys.EMPLOYEE_ID);
    const currentName = await AsyncStorage.getItem('user_name');
    const currentId = buildAccountId({
      role: currentRole || '',
      schoolCode: currentSchoolCode || '',
      userId: currentUserId || undefined,
      studentId: currentStudentId || undefined,
      employeeId: currentEmployeeId || undefined,
      name: currentName || undefined,
    });

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

            await removeCurrentSessionAccount();
            const accounts = await getSavedAccounts();
            setSavedAccounts(accounts);

            await AsyncStorage.multiRemove(['token', 'auth_token', 'authToken']);
            await storage.removeSecure(StorageKeys.AUTH_TOKEN);
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
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };

// ─── Export eventEmitter so other files can emit/listen ─────────────────────────
export { eventEmitter as AppEvents };
