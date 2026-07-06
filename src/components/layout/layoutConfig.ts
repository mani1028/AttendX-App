import * as LucideIcons from 'lucide-react-native';

export type LayoutIconName = keyof typeof LucideIcons;

export interface MenuItem {
  title: string;
  route: string;
  icon: LayoutIconName;
  tabScreen?: string;
  tabParams?: Record<string, unknown>;
}

export interface SidebarSection {
  title: string;
  /** Match menu items by title for accurate section grouping */
  itemTitles: string[];
}

export interface RoleLayoutConfig {
  label: string;
  roleDisplay: string;
  menu: MenuItem[];
  pageTitles: Record<string, string>;
  sections: SidebarSection[];
}

const item = (
  title: string,
  route: string,
  icon: LayoutIconName,
  tabScreen?: string,
  tabParams?: Record<string, unknown>,
): MenuItem => ({ title, route, icon, tabScreen, tabParams });

export const LAYOUT_CONFIG: Record<string, RoleLayoutConfig> = {
  admin: {
    label: 'Super Admin',
    roleDisplay: 'Super Administrator',
    menu: [
      item('Schools Overview', 'MainTabs', 'School', 'Dashboard'),
      item('Revenue Analytics', 'AdminRevenue', 'TrendingUp'),
      item('Blog Manager', 'AdminBlogManager', 'BookOpen'),
      item('Website Forms', 'AdminFormLeads', 'Inbox'),
      item('Marketing Agents', 'MainTabs', 'Users', 'Agents'),
      item('Plans', 'MainTabs', 'CreditCard', 'Plans'),
      item('AutoPay Tracker', 'AutoPayTracker', 'RefreshCw'),
      item('Attendance Settings', 'ManualAttendanceManager', 'ClipboardCheck'),
      item('System Settings', 'AdminSettings', 'Settings'),
      item('Delete School', 'DeleteSchool', 'Trash2'),
      item('Payment History', 'PaymentHistory', 'Receipt'),
    ],
    pageTitles: {
      MainTabs: 'Schools Overview',
      AdminRevenue: 'Revenue Analytics',
      AdminBlogManager: 'Blog Manager',
      AdminFormLeads: 'Website Forms',
      AutoPayTracker: 'AutoPay Tracker',
      ManualAttendanceManager: 'Attendance Settings',
      AdminSettings: 'System Settings',
      DeleteSchool: 'Delete School',
      PaymentHistory: 'Payment History',
    },
    sections: [
      { title: 'Overview', itemTitles: ['Schools Overview', 'Revenue Analytics'] },
      { title: 'Management', itemTitles: ['Marketing Agents', 'Plans', 'Blog Manager', 'Website Forms', 'AutoPay Tracker', 'Attendance Settings', 'System Settings', 'Payment History'] },
      { title: 'Danger Zone', itemTitles: ['Delete School'] },
    ],
  },

  agent: {
    label: 'Agent Portal',
    roleDisplay: 'Marketing Agent',
    menu: [
      item('Schools List', 'MainTabs', 'School', 'Dashboard'),
      item('My Revenue', 'AdminRevenue', 'TrendingUp'),
      item('Register School', 'MainTabs', 'PlusCircle', 'Dashboard', { openCreateModal: true }),
      item('Profile', 'Profile', 'User', 'Profile'),
    ],
    pageTitles: {
      MainTabs: 'Schools Management',
      AdminRevenue: 'My Revenue',
      Profile: 'Profile',
    },
    sections: [
      { title: 'Overview', itemTitles: ['Schools List', 'My Revenue'] },
      { title: 'Actions', itemTitles: ['Register School', 'Profile'] },
    ],
  },

  accountant: {
    label: 'Accountant Panel',
    roleDisplay: 'Accountant',
    menu: [
      item('Dashboard', 'MainTabs', 'LayoutDashboard', 'Dashboard'),
      item('Face Verification', 'AccountantFaceVerify', 'Scan'),
      item('Staff Attendance', 'AccountantStaffAttendance', 'Users'),
      item('My Attendance', 'TeacherMyAttendance', 'CalendarCheck'),
      item('Fee Management', 'MainTabs', 'Receipt', 'Fees'),
      item('Payment Entry', 'AccountantPaymentEntry', 'CreditCard'),
      item('Payment History', 'AccountantPaymentHistory', 'Receipt'),
      item('Expenses', 'MainTabs', 'TrendingUp', 'Expenses'),
      item('Reports', 'AccountantReports', 'BarChart3'),
      item('Pending Dues', 'AccountantPendingStudents', 'Clock'),
      item('Payroll', 'MainTabs', 'Banknote', 'Payroll'),
      item('Salaries', 'AccountantSalaries', 'DollarSign'),
      item('Settings', 'AccountantSettings', 'Settings'),
    ],
    pageTitles: {
      MainTabs: 'Financial Dashboard',
      AccountantFaceVerify: 'Face Verification',
      AccountantStaffAttendance: 'Staff Attendance',
      TeacherMyAttendance: 'My Attendance',
      AccountantPaymentEntry: 'Payment Entry',
      AccountantPaymentHistory: 'Payment History',
      AccountantReports: 'Financial Reports',
      AccountantPendingStudents: 'Pending Dues Tracker',
      AccountantSalaries: 'Salary Records',
      AccountantSettings: 'Settings',
    },
    sections: [
      { title: 'Overview', itemTitles: ['Dashboard'] },
      { title: 'Finance', itemTitles: ['Fee Management', 'Payment Entry', 'Payment History', 'Expenses'] },
      { title: 'Analytics', itemTitles: ['Reports', 'Pending Dues'] },
      { title: 'HR', itemTitles: ['Face Verification', 'Staff Attendance', 'My Attendance', 'Payroll', 'Salaries'] },
      { title: 'Setup', itemTitles: ['Settings'] },
    ],
  },

  director: {
    label: 'Director Panel',
    roleDisplay: 'Director',
    menu: [
      item('Dashboard', 'MainTabs', 'LayoutDashboard', 'Home'),
      item('Branches', 'MainTabs', 'GitBranch', 'Branches'),
      item('Add Branch', 'MainTabs', 'PlusCircle', 'AddBranch'),
      item('Subscription', 'DirectorBilling', 'CreditCard', undefined, { variant: 'subscription' }),
      item('Payment History', 'DirectorBilling', 'Receipt', undefined, { variant: 'payments' }),
      item('Renewal Payment', 'RenewalPayment', 'RefreshCw'),
    ],
    pageTitles: {
      MainTabs: 'Dashboard Overview',
      DirectorBilling: 'Billing & Subscription',
      DirectorBranchDetails: 'Branch Details',
      RenewalPayment: 'Renewal Payment',
    },
    sections: [
      { title: 'Overview', itemTitles: ['Dashboard'] },
      { title: 'Management', itemTitles: ['Branches', 'Add Branch'] },
      { title: 'Billing', itemTitles: ['Subscription', 'Payment History', 'Renewal Payment'] },
    ],
  },

  principal: {
    label: 'Principal Panel',
    roleDisplay: 'Principal',
    menu: [
      item('Dashboard', 'MainTabs', 'LayoutDashboard', 'Home'),
      item('Staff', 'MainTabs', 'UserCog', 'Staff'),
      item('Students', 'MainTabs', 'GraduationCap', 'Students'),
      item('Staff Requests', 'PrincipalTeacherRegistrationRequests', 'UserPlus'),
      item('Promotion', 'PrincipalStudentPromotion', 'GraduationCap'),
      item('Attendance', 'PrincipalAttendance', 'ClipboardCheck'),
      item('Calendar', 'PrincipalCalendarManagement', 'CalendarDays'),
      item('Teacher Leaves', 'PrincipalTeacherLeaves', 'AlertCircle'),
      item('Exams', 'PrincipalExams', 'BookOpen'),
      item('Data Export', 'PrincipalDataExport', 'BarChart3'),
      item('Teacher Assignments', 'MainTabs', 'Link', 'TeacherAssignment'),
      item('Face Review', 'PrincipalFaceReview', 'Scan'),
      item('Announcements', 'PrincipalAnnouncements', 'Bell'),
      item('Visitors', 'VisitorDashboard', 'Users'),
      item('Settings', 'PrincipalSettings', 'Settings'),
    ],
    pageTitles: {
      MainTabs: 'Principal Dashboard',
      PrincipalTeacherRegistrationRequests: 'Staff Registration Requests',
      PrincipalStudentPromotion: 'Student Promotion',
      PrincipalAttendance: 'Attendance Records',
      PrincipalCalendarManagement: 'Calendar Management',
      PrincipalTeacherLeaves: 'Teacher Leave Requests',
      PrincipalExams: 'Exam Management',
      PrincipalDataExport: 'Data Export',
      PrincipalFaceReview: 'Face Photo Review',
      PrincipalAnnouncements: 'Announcements Manager',
      VisitorDashboard: 'Visitor Management',
      PrincipalSettings: 'Principal Settings',
    },
    sections: [
      { title: 'Core', itemTitles: ['Dashboard'] },
      { title: 'People', itemTitles: ['Staff', 'Students', 'Staff Requests', 'Teacher Assignments', 'Face Review'] },
      { title: 'Operations', itemTitles: ['Promotion', 'Attendance', 'Calendar', 'Exams', 'Data Export'] },
      { title: 'Communication', itemTitles: ['Teacher Leaves', 'Announcements', 'Visitors'] },
      { title: 'Settings', itemTitles: ['Settings'] },
    ],
  },

  teacher: {
    label: 'Teacher Panel',
    roleDisplay: 'Teacher',
    menu: [
      item('Attendance Logs', 'MainTabs', 'ClipboardList', 'Home'),
      item('Student Enrollment', 'TeacherStudentRegistration', 'UserPlus'),
      item('Manage Profiles', 'ManageData', 'UserCog'),
      item('Attendance Verification', 'MarkAttendance', 'UserCheck'),
      item('View Attendance', 'TeacherViewAttendance', 'Eye'),
      item('Attendance Gallery', 'AttendanceGallery', 'Image'),
      item('VitalScan AI', 'TeacherVitalScan', 'HeartPulse'),
      item('Homework', 'MainTabs', 'BookOpen', 'Homework'),
      item('Leave Approval', 'TeacherLeaveApproval', 'CalendarCheck'),
      item('Leave Request', 'TeacherLeaveRequest', 'AlertCircle'),
      item('Marks Entry', 'MainTabs', 'GraduationCap', 'Marks'),
      item('Question Papers', 'TeacherQuestionPapers', 'FileQuestion'),
      item('Face Review', 'TeacherFaceReview', 'Scan'),
      item('My Attendance', 'TeacherMyAttendance', 'CalendarCheck'),
      item('Student Requests', 'StudentRegistrationRequests', 'UserPlus'),
    ],
    pageTitles: {
      MainTabs: 'Attendance Logs',
      TeacherStudentRegistration: 'Student Enrollment',
      ManageData: 'Manage Profiles',
      MarkAttendance: 'Attendance Verification',
      TeacherViewAttendance: 'View Attendance',
      AttendanceGallery: 'Attendance Gallery',
      TeacherVitalScan: 'VitalScan AI',
      TeacherLeaveApproval: 'Leave Approval',
      TeacherLeaveRequest: 'Leave Request',
      TeacherQuestionPapers: 'Question Papers',
      TeacherFaceReview: 'Face Photo Review',
      TeacherMyAttendance: 'My Attendance',
      StudentRegistrationRequests: 'Student Registration Requests',
    },
    sections: [
      { title: '', itemTitles: ['Attendance Logs'] },
      { title: 'Students', itemTitles: ['Student Enrollment', 'Manage Profiles', 'Attendance Verification', 'Face Review', 'Student Requests'] },
      { title: 'Teaching', itemTitles: ['Homework', 'Marks Entry', 'Question Papers'] },
      { title: 'Support', itemTitles: ['Attendance Gallery', 'View Attendance', 'VitalScan AI', 'Leave Approval', 'Leave Request', 'My Attendance'] },
    ],
  },

  student: {
    label: 'Student Panel',
    roleDisplay: 'Student',
    menu: [
      item('Dashboard', 'MainTabs', 'LayoutDashboard', 'Home'),
      item('Attendance', 'StudentAttendance', 'CalendarCheck'),
      item('Homework', 'MainTabs', 'BookOpen', 'Homework'),
      item('Leave', 'MainTabs', 'AlertCircle', 'Leave'),
      item('Marks', 'MainTabs', 'GraduationCap', 'Marks'),
      item('Fees', 'MainTabs', 'DollarSign', 'Fees'),
      item('Question Papers', 'MainTabs', 'FileQuestion', 'Papers'),
    ],
    pageTitles: {
      MainTabs: 'Student Dashboard',
      StudentAttendance: 'Attendance Records',
    },
    sections: [
      { title: 'Academics', itemTitles: ['Attendance', 'Homework', 'Question Papers'] },
      { title: 'Support', itemTitles: ['Leave', 'Marks', 'Fees'] },
    ],
  },
};

export function normalizeLayoutRole(role: string): string {
  if (!role) { return 'teacher'; }
  const v = String(role).trim().toLowerCase();
  if (['class_teacher', 'class teacher', 'classteacher', 'class-teacher'].includes(v)) { return 'teacher'; }
  if (v === 'headmaster' || v === 'head_master') { return 'principal'; }
  if (v === 'administrator') { return 'admin'; }
  if (v === 'marketing' || v === 'marketing agent' || v === 'marketing_agent') { return 'agent'; }
  return v;
}

export function getSidebarSections(role: string, items: MenuItem[]): Array<{ title: string; items: MenuItem[] }> {
  const normalized = normalizeLayoutRole(role);
  const config = LAYOUT_CONFIG[normalized];
  if (!config?.sections?.length) {
    return [{ title: 'Menu', items }];
  }

  const byTitle = new Map(items.map(i => [i.title, i]));

  return config.sections
    .map(section => ({
      title: section.title,
      items: section.itemTitles
        .map(title => byTitle.get(title))
        .filter((i): i is MenuItem => Boolean(i)),
    }))
    .filter(section => section.items.length > 0);
}

export function filterTeacherMenuItems(items: MenuItem[], isClassTeacher: boolean): MenuItem[] {
  const classTeacherOnly = new Set([
    'Student Enrollment',
    'Manage Profiles',
    'Attendance Verification',
    'Leave Approval',
    'Face Review',
    'Student Requests',
  ]);

  if (isClassTeacher) {
    return items.filter(i => i.title !== 'Leave Request');
  }

  return items.filter(i => !classTeacherOnly.has(i.title));
}

/** Filter principal menu when promotion is disabled for the school */
export function filterPrincipalMenuItems(items: MenuItem[], enablePromotion: boolean): MenuItem[] {
  if (enablePromotion) { return items; }
  return items.filter(i => i.title !== 'Promotion');
}
