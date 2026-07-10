import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { Theme } from '../../../theme/tokens';

export const LEAVES_INITIAL_COUNT = 5;
export const { width: screenWidth } = Dimensions.get('window');

export const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

export const formatDate = (dateString: string): string => {
  if (!dateString) { return '-'; }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

export const getSubjectColor = (subject: string, index: number): string => {
  const palette = [
    Theme.colors.blue, Theme.colors.success, Theme.colors.warning, Theme.colors.error,
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = ((hash << 5) - hash) + subject.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
};
