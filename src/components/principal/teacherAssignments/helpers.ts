import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';

export async function getSchoolCode() {
  return (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
    (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
}

export async function getBranchId() {
  return (await storage.getString(StorageKeys.BRANCH_ID)) ||
    (await storage.getString(StorageKeys.BRANCH_ID)) || '';
}

export function teacherLabel(t: any) {
  if (!t) {return '';}
  const name = t.staff_full_name || t.teacher_full_name || t.name;
  const id = t.employee_id || t.teacher_id || t.id;
  return `${id} - ${name}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
