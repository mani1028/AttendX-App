import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredAccount = {
  schoolId: string;
  username: string;
  role: string;
  avatar?: string;
  token?: string;
  lastLogin?: string;
};

const KEY = 'ATTENDX_SAVED_ACCOUNTS_V1';

export const getAccounts = async (): Promise<StoredAccount[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {return [];}
    return JSON.parse(raw) as StoredAccount[];
  } catch (err) {
    console.warn('Failed reading accounts', err);
    return [];
  }
};

export const saveAccount = async (account: StoredAccount) => {
  try {
    const list = await getAccounts();
    // dedupe by schoolId+username
    const filtered = list.filter(a => !(a.schoolId === account.schoolId && a.username === account.username));
    filtered.unshift({ ...account, lastLogin: new Date().toISOString() });
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('Failed saving account', err);
    throw err;
  }
};

export const deleteAccount = async (account: StoredAccount) => {
  try {
    const list = await getAccounts();
    const filtered = list.filter(a => !(a.schoolId === account.schoolId && a.username === account.username));
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('Failed deleting account', err);
    throw err;
  }
};

export const clearAccounts = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (err) {
    console.warn('Failed clearing accounts', err);
  }
};

export const updateAccount = async (account: StoredAccount) => {
  try {
    const list = await getAccounts();
    const idx = list.findIndex(a => a.schoolId === account.schoolId && a.username === account.username);
    if (idx >= 0) {list[idx] = { ...list[idx], ...account, lastLogin: new Date().toISOString() };}
    else {list.unshift({ ...account, lastLogin: new Date().toISOString() });}
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
    return list;
  } catch (err) {
    console.warn('Failed updating account', err);
    throw err;
  }
};

export default {
  getAccounts,
  saveAccount,
  deleteAccount,
  clearAccounts,
  updateAccount,
};
