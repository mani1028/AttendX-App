import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSessionData, performLogout } from './authSession';
import { setAuthToken } from '../services/api';
import eventEmitter from './eventEmitter';

export interface SavedAccount {
  id: string; // Unique ID (e.g., role:schoolCode:userId)
  schoolCode: string;
  role: string;
  token: string;
  name: string;
  studentId?: string;
  employeeId?: string;
  userId?: string;
  branchId?: string;
  isClassTeacher?: boolean;
  photoUrl?: string;
  schoolName?: string;
  branchName?: string;
  bloodGroup?: string;
}

const ACCOUNTS_KEY = 'saved_accounts';

export const getSavedAccounts = async (): Promise<SavedAccount[]> => {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error getting saved accounts:', e);
    return [];
  }
};

export const saveAccount = async (account: SavedAccount) => {
  try {
    const accounts = await getSavedAccounts();
    const index = accounts.findIndex(a => a.id === account.id);
    if (index > -1) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving account:', e);
  }
};

export const removeAccount = async (accountId: string) => {
  try {
    const accounts = await getSavedAccounts();
    const filtered = accounts.filter(a => a.id !== accountId);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error removing account:', e);
  }
};

export const switchAccount = async (account: SavedAccount) => {
  try {
    // 1. Prepare data for setSessionData
    const sessionData = {
      role: account.role,
      token: account.token,
      school_code: account.schoolCode,
      branch_id: account.branchId,
      user: {
        id: account.userId,
        student_id: account.studentId,
        employee_id: account.employeeId,
        name: account.name,
        is_class_teacher: account.isClassTeacher,
        blood_group: account.bloodGroup,
      },
      school_name: account.schoolName,
      branch_name: account.branchName,
    };

    // 2. Set current session
    await setSessionData(sessionData);
    setAuthToken(account.token);

    // 3. Emit auth-change to refresh contexts
    eventEmitter.emit('auth-change');
    return true;
  } catch (e) {
    console.error('Error switching account:', e);
    return false;
  }
};

export const addCurrentSessionToSaved = async () => {
  try {
    const keys = [
      'token',
      'role',
      'userRole',
      'school_code',
      'user_name',
      'student_id',
      'employee_id',
      'user_id',
      'branch_id',
      'is_class_teacher',
      'school_name',
      'branch_name',
      'blood_group',
    ];
    const pairs = await AsyncStorage.multiGet(keys);
    const val = Object.fromEntries(pairs.map(([k, v]) => [k, v || '']));

    const token = val.token;
    if (!token) {return;}

    const role = val.role || val.userRole;
    const schoolCode = val.school_code;
    const name = val.user_name;
    const studentId = val.student_id;
    const employeeId = val.employee_id;
    const userId = val.user_id;
    const branchId = val.branch_id;
    const isClassTeacher = val.is_class_teacher === '1';
    const schoolName = val.school_name;
    const branchName = val.branch_name;
    const bloodGroup = val.blood_group;

    if (!role || !schoolCode) {return;}

    const accountId = `${role}:${schoolCode}:${userId || studentId || employeeId}`;

    await saveAccount({
      id: accountId,
      role,
      schoolCode,
      token,
      name: name || 'User',
      studentId: studentId || undefined,
      employeeId: employeeId || undefined,
      userId: userId || undefined,
      branchId: branchId || undefined,
      isClassTeacher,
      schoolName: schoolName || undefined,
      branchName: branchName || undefined,
      bloodGroup: bloodGroup || undefined,
    });
  } catch (e) {
    console.error('Error adding current session to saved:', e);
  }
};
