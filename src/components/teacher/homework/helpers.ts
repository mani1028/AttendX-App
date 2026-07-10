import AsyncStorage from '@react-native-async-storage/async-storage';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

export const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

export const getTeacherId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('teacher_id');
  return id || (await AsyncStorage.getItem('teacherId')) ||
    (await AsyncStorage.getItem('employee_id')) ||
    (await AsyncStorage.getItem('employeeId')) || '';
};

export const formatDisplayDate = (dateInput: unknown): string => {
  const raw = String(dateInput ?? '').trim();
  if (!raw) { return '-'; }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) { return '-'; }
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_SHORT[date.getMonth()] || '-';
  return `${day} ${month}`;
};

export const normalizeText = (value: unknown): string => String(value ?? '').trim();

export const equalsIgnoreCase = (a: unknown, b: unknown): boolean =>
  normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
