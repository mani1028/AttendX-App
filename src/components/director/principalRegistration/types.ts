export interface ClassSection {
  class_name: string;
  sections: string[];
}

export interface FormData {
  branch_id: string;
  branch_name: string;
  principal_employee_id: string;
  principal_name: string;
  principal_email: string;
  password: string;
  status: string;
}

export type ToastType = 'success' | 'error';

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export const REGISTRATION_STEPS = [
  { label: 'Branch Info', icon: '🏢' },
  { label: 'Principal Details', icon: '👨‍🏫' },
  { label: 'Classes', icon: '📚' },
] as const;
