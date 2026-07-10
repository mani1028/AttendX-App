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
         (await AsyncStorage.getItem('user_id')) ||
         (await AsyncStorage.getItem('userId')) ||
         (await storage.getString(StorageKeys.EMPLOYEE_ID)) ||
         (await storage.getString(StorageKeys.EMPLOYEE_ID)) || '';
};

export const validateDecimalWithHalfStep = (value: string) => {
  return /^(0|[1-9]\d*)(\.[5]?)?$/.test(value);
};
