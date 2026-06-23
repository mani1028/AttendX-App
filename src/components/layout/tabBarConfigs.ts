import { TabConfig } from './RoleTabBar';

export const accountantTabs: TabConfig[] = [
  { name: 'Dashboard', label: 'Home', icon: 'Home' },
  { name: 'Fees', label: 'Fees', icon: 'CreditCard' },
  { name: 'Salaries', label: 'Salaries', icon: 'Banknote' },
  { name: 'Payroll', label: 'Payroll', icon: 'Calculator' },
  { name: 'Expenses', label: 'Expenses', icon: 'TrendingDown' },
];

export const adminTabs: TabConfig[] = [
  { name: 'Dashboard', label: 'Home', icon: 'Home' },
  { name: 'Agents', label: 'Agents', icon: 'Users' },
  { name: 'Plans', label: 'Plans', icon: 'Shield' },
  { name: 'Settings', label: 'Settings', icon: 'Settings' },
  { name: 'Profile', label: 'Profile', icon: 'User' },
];

export const directorTabs: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: 'Home' },
  { name: 'Branches', label: 'Branches', icon: 'Building' },
  { name: 'AddBranch', label: 'Add', icon: 'Plus', isCenter: true },
  { name: 'Billing', label: 'Billing', icon: 'CreditCard' },
  { name: 'Profile', label: 'Profile', icon: 'User' },
];

export const principalTabs: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: 'Home' },
  { name: 'Staff', label: 'Staff', icon: 'Users' },
  { name: 'TeacherAssignment', label: 'Assign', icon: 'ClipboardList', isCenter: true },
  { name: 'Students', label: 'Students', icon: 'GraduationCap' },
  { name: 'Reports', label: 'Reports', icon: 'FileBarChart' },
];

export const teacherTabs: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: 'Home' },
  { name: 'Homework', label: 'Homework', icon: 'BookOpen' },
  { name: 'Scan', label: 'Scan', icon: 'Scan', isCenter: true },
  { name: 'Leaves', label: 'Leaves', icon: 'Calendar' },
  { name: 'Marks', label: 'Marks', icon: 'Award' },
];

export const studentTabs: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: 'Home' },
  { name: 'Homework', label: 'Homework', icon: 'BookOpen' },
  { name: 'Leave', label: 'Leave', icon: 'Calendar' },
  { name: 'Marks', label: 'Marks', icon: 'Award' },
  { name: 'Fees', label: 'Fees', icon: 'CreditCard' },
  { name: 'Papers', label: 'Papers', icon: 'FileText' },
];
