import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import type { ClassSection } from './types';

export const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

export const safeTrim = (v: unknown): string => String(v ?? '').trim();

export const normalizeSection = (value: string): string =>
  String(value ?? '').toUpperCase();

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

export const normalizeClasses = (classes: ClassSection[]) =>
  classes
    .map(c => ({
      class_name: safeTrim(c.class_name),
      sections: (c.sections || [])
        .map(s => safeTrim(normalizeSection(s)))
        .filter(Boolean),
    }))
    .filter(c => c.class_name && c.sections.length > 0);

export const getClassSectionErrors = (
  normalizedClasses: ReturnType<typeof normalizeClasses>,
): string[] => {
  const errs: string[] = [];
  const names = normalizedClasses.map(c => c.class_name.toLowerCase());
  if (names.some((n, i) => names.indexOf(n) !== i)) {
    errs.push('Duplicate class names found.');
  }
  normalizedClasses.forEach(c => {
    const secs = c.sections.map(s => s.toLowerCase());
    if (secs.some((n, i) => secs.indexOf(n) !== i)) {
      errs.push(`Duplicate sections in class "${c.class_name}".`);
    }
  });
  return errs;
};

export const buildInviteLink = (schoolCode: string, branchId: string): string => {
  const sc = safeTrim(schoolCode);
  const bid = safeTrim(branchId);
  return sc && bid
    ? `attendx://principal-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}`
    : '';
};
