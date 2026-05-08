import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from './storage';

type NotificationStorageKind = 'read' | 'deleted';

const STORAGE_PREFIX = 'notifications';

const normalizePart = (value: string | null | undefined): string => {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
};

const resolveNotificationScope = async (): Promise<string> => {
  const [schoolCode, role, userId, studentId, employeeId, teacherId, hmEmployeeId, userName] = await Promise.all([
    AsyncStorage.getItem('school_code'),
    AsyncStorage.getItem('user_role'),
    AsyncStorage.getItem('user_id'),
    AsyncStorage.getItem('student_id'),
    AsyncStorage.getItem('employee_id'),
    AsyncStorage.getItem('teacher_id'),
    AsyncStorage.getItem('hm_employee_id'),
    AsyncStorage.getItem('user_name'),
  ]);

  const identity = userId || studentId || employeeId || teacherId || hmEmployeeId || userName || role || 'global';
  return [schoolCode, role, identity].map(normalizePart).filter(Boolean).join(':') || 'global';
};

const getNotificationStorageKey = async (kind: NotificationStorageKind): Promise<string> => {
  const scope = await resolveNotificationScope();
  return `${STORAGE_PREFIX}:${kind}:${scope}`;
};

export const loadScopedNotificationIds = async (kind: NotificationStorageKind): Promise<string[]> => {
  const storageKey = await getNotificationStorageKey(kind);
  const rawValue = await AsyncStorage.getItem(storageKey);

  return safeJsonParse<string[]>(rawValue, [], () => {
    AsyncStorage.setItem(storageKey, JSON.stringify([])).catch(() => {});
  });
};

export const saveScopedNotificationIds = async (kind: NotificationStorageKind, ids: string[]): Promise<void> => {
  const storageKey = await getNotificationStorageKey(kind);
  const uniqueIds = Array.from(new Set(ids.map(id => String(id))));
  await AsyncStorage.setItem(storageKey, JSON.stringify(uniqueIds));
};

export const addScopedNotificationId = async (kind: NotificationStorageKind, id: string): Promise<string[]> => {
  const ids = await loadScopedNotificationIds(kind);
  if (!ids.includes(id)) {
    ids.push(id);
    await saveScopedNotificationIds(kind, ids);
  }
  return ids;
};
