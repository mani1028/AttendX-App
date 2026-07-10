import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../../services/api';

export const getHeaders = async (): Promise<Record<string, string>> => {
  const sc = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
  const bid = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
  const tok = (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || '';
  return {
    'X-School-Code': sc,
    'X-Branch-Id': bid,
    Authorization: `Bearer ${tok}`,
  };
};

export const getTeacherEmployeeId = async (): Promise<string | null> => {
  try {
    const raw = (await AsyncStorage.getItem('user')) || '{}';
    const u = JSON.parse(raw);
    return (
      u.employee_id ||
      (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
      null
    );
  } catch {
    return (await storage.getString(StorageKeys.EMPLOYEE_ID)) || null;
  }
};

export function daysSince(iso: string | null): number | null {
  if (!iso) { return null; }
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
