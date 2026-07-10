export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  employee_id: string;
  teacher_id: string;
  student_id: string;
  school_name: string;
  school_code: string;
  branch_id: string;
  branch_name: string;
  role: string;
  designation: string;
  department_subject: string;
  date_of_joining: string;
  qualification: string;
  experience_years: string;
  address: string;
  blood_group: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  mother_tongue: string;
  religion: string;
  aadhaar_number: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  father_guardian_name: string;
  father_guardian_mobile: string;
  mother_guardian_name: string;
  mother_guardian_mobile: string;
  parent_guardian_email?: string;
  roll_number?: string;
  roll_no?: string;
  class_grade?: string;
  section?: string;
  username?: string;
  can_register_school?: boolean;
  can_view_payments?: boolean;
  can_edit_features?: boolean;
}

export interface AppSettings {
  notifications: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
  autoSave: boolean;
  language: string;
}

export interface EditField {
  key: string;
  label: string;
  value: string;
}

export type PasswordChangeStep = 'otp-request' | 'otp-verify' | 'new-password';

export const EMPTY_USER_PROFILE: UserProfile = {
  name: '',
  email: '',
  phone: '',
  employee_id: '',
  teacher_id: '',
  student_id: '',
  school_name: '',
  school_code: '',
  branch_id: '',
  branch_name: '',
  role: '',
  designation: '',
  department_subject: '',
  date_of_joining: '',
  qualification: '',
  experience_years: '',
  address: '',
  blood_group: '',
  date_of_birth: '',
  gender: '',
  nationality: '',
  mother_tongue: '',
  religion: '',
  aadhaar_number: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  father_guardian_name: '',
  father_guardian_mobile: '',
  mother_guardian_name: '',
  mother_guardian_mobile: '',
  parent_guardian_email: '',
  username: '',
  can_register_school: false,
  can_view_payments: false,
  can_edit_features: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  notifications: true,
  emailAlerts: true,
  pushNotifications: true,
  autoSave: true,
  language: 'English',
};
