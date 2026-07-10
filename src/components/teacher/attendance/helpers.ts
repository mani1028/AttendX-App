import AsyncStorage from '@react-native-async-storage/async-storage';

import RNFS from 'react-native-fs';

export const MAX_STUDENT_IMAGES = 5;
export const MAX_UPLOAD_IMAGE_BYTES = 900_000;

export const getTodayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

export const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

export const getEmployeeId = async (): Promise<string> => {
  const keys = ['employee_id', 'employeeId', 'teacher_id', 'teacherId'];
  for (const key of keys) {
    const id = (await AsyncStorage.getItem(key))?.trim();
    if (id) { return id; }
  }
  return '';
};

export const cleanBase64 = (base64: string): string => {
  if (!base64) { return ''; }
  return base64.replace(/^data:image\/\w+;base64,/, '');
};

export async function readImageBase64ForUpload(uri: string): Promise<string> {
  const path = uri.replace('file://', '');
  const stat = await RNFS.stat(path);
  if (stat.size > MAX_UPLOAD_IMAGE_BYTES) {
    const err = new Error('IMAGE_TOO_LARGE') as Error & { code?: string };
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }
  return cleanBase64(await RNFS.readFile(path, 'base64'));
}
