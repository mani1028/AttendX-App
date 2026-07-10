import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper functions
export const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

export const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

export const getStudentPhotoUri = (value?: string): string | null => {
  const photo = String(value || '').trim();
  if (!photo) {return null;}

  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  const compact = photo.replace(/\s+/g, '');
  if (compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact)) {
    return `data:image/jpeg;base64,${compact.replace(/-/g, '+').replace(/_/g, '/')}`;
  }

  return photo;
};

export const getEmployeeId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('employee_id');
  return id || (await AsyncStorage.getItem('employeeId')) || '';
};

export const fmt = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const initials = (name: string): string => {
  if (!name) {return '?';}
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};
