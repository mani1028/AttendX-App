import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

export const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

export const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) ||
         (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
         (await storage.getString(StorageKeys.EMPLOYEE_ID)) || '';
};

export const getBranchId = async (): Promise<string> => {
  const id = await storage.getString(StorageKeys.BRANCH_ID);
  return id || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
};

export const formatDate = (dateString: string): string => {
  if (!dateString) { return '-'; }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
