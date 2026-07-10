import { Theme } from '../../../theme/tokens';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

export const PAGE_PAD = 16;

const CLASS_COLORS = [
  Theme.colors.violet, Theme.colors.violet, '#db2777', Theme.colors.success,
  Theme.colors.warning, '#0891b2', '#4f46e5', '#16a34a', Theme.colors.error, '#9333ea',
];

export const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

export const getBranchId = async (): Promise<string> => {
  const id = await storage.getString(StorageKeys.BRANCH_ID);
  return id || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
};

export const iso = (date: Date): string => date.toISOString().split('T')[0];

export const formatPersonName = (name?: string): string => {
  if (!name?.trim()) { return '—'; }
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const attendanceLabel = (status: string): string => {
  if (status === 'PRESENT') { return 'Present'; }
  if (status === 'HALF_DAY' || status === 'LATE') { return 'Half day'; }
  return 'Absent';
};

export const classColor = (grade: string): string => {
  const idx = (parseInt(grade, 10) - 1) % CLASS_COLORS.length;
  return CLASS_COLORS[isNaN(idx) ? 0 : idx];
};

export const groupClassItems = <T extends { class_grade: string; section: string }>(
  items: T[],
): [string, T[]][] => {
  const map: Record<string, T[]> = {};
  items.forEach((c) => {
    const grade = String(c.class_grade);
    if (!map[grade]) { map[grade] = []; }
    map[grade].push(c);
  });
  return Object.entries(map).sort((a, b) => {
    const na = parseInt(a[0], 10);
    const nb = parseInt(b[0], 10);
    return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
  });
};
