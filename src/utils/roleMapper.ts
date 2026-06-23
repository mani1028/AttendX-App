import { AppRole } from '../constants/roles';

const ROLE_ALIAS_MAP: Record<string, AppRole> = {
  student: 'student',
  students: 'student',
  teacher: 'teacher',
  teachers: 'teacher',
  class_teacher: 'teacher',
  'class teacher': 'teacher',
  classteacher: 'teacher',
  'class-teacher': 'teacher',
  principal: 'principal',
  hm: 'principal',
  headmaster: 'principal',
  head_master: 'principal',
  'head master': 'principal',
  director: 'director',
  accountant: 'accountant',
  accounts: 'accountant',
  admin: 'admin',
  administrator: 'admin',
  agent: 'agent',
  marketing: 'agent',
  'marketing agent': 'agent',
  marketing_agent: 'agent',
  visitor: 'visitor',
};

export function normalizeBackendRole(roleValue: string | undefined | null): AppRole | null {
  if (!roleValue) {
    return null;
  }

  const key = roleValue.trim().toLowerCase();
  return ROLE_ALIAS_MAP[key] ?? null;
}
