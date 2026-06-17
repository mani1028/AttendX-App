export const APP_ROLES = [
  'student',
  'teacher',
  'principal',
  'director',
  'accountant',
  'admin',
  'visitor',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  principal: 'Principal',
  director: 'Director',
  accountant: 'Accountant',
  admin: 'Admin',
  visitor: 'Visitor',
};