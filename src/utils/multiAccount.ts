import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSessionData } from './authSession';
import { setAuthToken } from '../services/api';
import eventEmitter from './eventEmitter';
import { storage } from '../storage/storage';
import { StorageKeys } from '../storage/StorageKeys';

export interface SavedAccount {
  id: string; // role:schoolCode:userKey
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

export const normalizeRole = (role: string) => String(role || '').trim().toLowerCase();

export const normalizeSchoolCode = (code: string) => String(code || '').trim().toUpperCase();

/** Stable id for storage — role + school + best available user key. */
export const buildAccountId = (parts: {
  role: string;
  schoolCode: string;
  userId?: string;
  studentId?: string;
  employeeId?: string;
  name?: string;
}): string => {
  const role = normalizeRole(parts.role);
  const schoolCode = normalizeSchoolCode(parts.schoolCode);
  const userKey = String(parts.userId || parts.studentId || parts.employeeId || parts.name || '').trim();
  return `${role}:${schoolCode}:${userKey}`;
};

/** Merge key — same person even if user id was missing on an older save. */
const dedupeKey = (account: SavedAccount) =>
  `${normalizeRole(account.role)}:${normalizeSchoolCode(account.schoolCode)}:${String(account.name || '').trim().toLowerCase()}`;

const accountScore = (account: SavedAccount) =>
  (account.userId || account.studentId || account.employeeId ? 2 : 0) + (account.token?.trim() ? 1 : 0);

const pickBetterAccount = (left: SavedAccount | undefined, right: SavedAccount): SavedAccount => {
  if (!left) {
    return { ...right, id: buildAccountId(right) };
  }
  const winner = accountScore(right) >= accountScore(left) ? right : left;
  return {
    ...winner,
    id: buildAccountId(winner),
    role: normalizeRole(winner.role),
    schoolCode: normalizeSchoolCode(winner.schoolCode),
  };
};

export const dedupeSavedAccounts = (accounts: SavedAccount[]): SavedAccount[] => {
  const map = new Map<string, SavedAccount>();
  for (const raw of accounts) {
    if (!raw?.token?.trim()) {
      continue;
    }
    const normalized = pickBetterAccount(undefined, raw);
    const key = dedupeKey(normalized);
    map.set(key, pickBetterAccount(map.get(key), normalized));
  }
  return Array.from(map.values());
};

const persistSavedAccounts = async (accounts: SavedAccount[]) => {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const getSavedAccounts = async (): Promise<SavedAccount[]> => {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    const raw: SavedAccount[] = data ? JSON.parse(data) : [];
    const cleaned = dedupeSavedAccounts(raw);
    if (JSON.stringify(cleaned) !== JSON.stringify(raw)) {
      await persistSavedAccounts(cleaned);
    }
    return cleaned;
  } catch (e) {
    console.error('Error getting saved accounts:', e);
    return [];
  }
};

export const saveAccount = async (account: SavedAccount) => {
  try {
    const normalized = pickBetterAccount(undefined, account);
    const accounts = dedupeSavedAccounts(await getSavedAccountsRaw());
    const key = dedupeKey(normalized);
    const index = accounts.findIndex(a => dedupeKey(a) === key || a.id === normalized.id);
    if (index > -1) {
      accounts[index] = pickBetterAccount(accounts[index], normalized);
    } else {
      accounts.push(normalized);
    }
    await persistSavedAccounts(dedupeSavedAccounts(accounts));
  } catch (e) {
    console.error('Error saving account:', e);
  }
};

/** Read without re-persisting — used while normalizing inside save. */
const getSavedAccountsRaw = async (): Promise<SavedAccount[]> => {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const removeAccount = async (accountId: string) => {
  try {
    const accounts = await getSavedAccountsRaw();
    const target = accounts.find(a => a.id === accountId);
    const filtered = accounts.filter(a => {
      if (a.id === accountId) {
        return false;
      }
      if (target && dedupeKey(a) === dedupeKey(target)) {
        return false;
      }
      return true;
    });
    await persistSavedAccounts(dedupeSavedAccounts(filtered));
  } catch (e) {
    console.error('Error removing account:', e);
  }
};

export const removeCurrentSessionAccount = async () => {
  try {
    const role = (await storage.getString(StorageKeys.USER_ROLE)) || (await AsyncStorage.getItem('role')) || '';
    const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || (await AsyncStorage.getItem('school_code')) || '';
    const userId = (await AsyncStorage.getItem('user_id')) || undefined;
    const studentId = (await AsyncStorage.getItem('student_id')) || undefined;
    const employeeId = (await storage.getString(StorageKeys.EMPLOYEE_ID)) || (await AsyncStorage.getItem('employee_id')) || undefined;
    const name = (await AsyncStorage.getItem('user_name')) || undefined;

    if (!role || !schoolCode) {
      return;
    }

    const accountId = buildAccountId({ role, schoolCode, userId, studentId, employeeId, name });
    await removeAccount(accountId);
  } catch (e) {
    console.error('Error removing current session account:', e);
  }
};

export const switchAccount = async (account: SavedAccount) => {
  try {
    if (!account.token?.trim()) {
      return false;
    }

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

    await setSessionData(sessionData);
    setAuthToken(account.token);
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

    const token = val.token || (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || '';
    if (!token) {
      return;
    }

    const role = val.role || val.userRole;
    const schoolCode = val.school_code;
    const name = val.user_name;
    const studentId = val.student_id;
    const employeeId = val.employee_id;
    const userId = val.user_id;
    const branchId = val.branch_id;
    const isClassTeacher = val.is_class_teacher === '1' || val.is_class_teacher === 'true';
    const schoolName = val.school_name;
    const branchName = val.branch_name;
    const bloodGroup = val.blood_group;

    if (!role || !schoolCode) {
      return;
    }

    await saveAccount({
      id: buildAccountId({ role, schoolCode, userId, studentId, employeeId, name }),
      role: normalizeRole(role),
      schoolCode: normalizeSchoolCode(schoolCode),
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
