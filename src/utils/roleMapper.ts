import { AppRole } from '../constants/roles';

const ROLE_ALIAS_MAP: Record<string, AppRole> = {
  student: 'student',
  students: 'student',
  teacher: 'teacher',
  teachers: 'teacher',
  hm: 'hm',
  headmaster: 'hm',
  head_master: 'hm',
  'head master': 'hm',
  principal: 'principal',
  accountant: 'accountant',
  accounts: 'accountant',
  admin: 'admin',
  administrator: 'admin',
  visitor: 'visitor',
};

export function normalizeBackendRole(roleValue: string | undefined | null): AppRole | null {
  if (!roleValue) {
    return null;
  }

  const key = roleValue.trim().toLowerCase();
  return ROLE_ALIAS_MAP[key] ?? null;
}