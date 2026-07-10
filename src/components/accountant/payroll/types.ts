export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface ExtraItem {
  id: string;
  label: string;
  pct: number;
}

export interface Employee {
  teacher_id: string;
  employee_id: string;
  teacher_full_name: string;
  email_id?: string;
  email?: string;
  designation: string;
  employment_type: string;
  date_of_joining: string;
  salary_amount: number;
}

export interface LeaveBreakdown {
  CASUAL: number;
  SICK: number;
  PAID: number;
  COMP_OFF: number;
}

export interface Attendance {
  teacher_id: string;
  present_days: number;
  absent_days: number;
  lop_days: number;
  late_days: number;
  paid_leave_days: number;
  total_days: number;
  applicable_working_days: number;
  attendance_percentage: number;
  leave_breakdown?: LeaveBreakdown;
}

export interface PayrollResult {
  employee: Employee;
  present_days: number;
  absent_days: number;
  late_days: number;
  paid_leave_used: number;
  lop_days: number;
  applicable_working_days: number;
  attendance_percentage: number;
  basic: number;
  hra: number;
  da: number;
  ta: number;
  other_allowance: number;
  extra_allowances_total: number;
  gross: number;
  lop_deduction: number;
  pf: number;
  esi: number;
  professional_tax: number;
  other_deduction: number;
  extra_deductions_total: number;
  total_deductions: number;
  net: number;
  mode: string;
  cfg: any;
  leave_breakdown?: LeaveBreakdown;
}

export interface FixedConfig {
  working_days: number;
}

export interface CorporateConfig {
  working_days: number;
  basic_pct: number;
  hra_pct: number;
  da_pct: number;
  ta_pct: number;
  other_allowance_pct: number;
  other_allowance_label: string;
  extra_allowances: ExtraItem[];
  pf_pct: number;
  esi_pct: number;
  professional_tax: number;
  other_deduction_pct: number;
  other_deduction_label: string;
  extra_deductions: ExtraItem[];
}

export interface LeavePolicy {
  casual_leave: number;
  sick_leave: number;
  paid_leave: number;
  comp_off: number;
}

export interface HourlyEmployee extends Employee {
  totalHours: number;
  attFetched: boolean;
  loadingAtt: boolean;
  hourlyRate: number;
  gross: number | null;
  net: number | null;
}

export const DEFAULT_FIXED: FixedConfig = { working_days: 26 };
export const DEFAULT_CORP: CorporateConfig = {
  working_days: 26, basic_pct: 40,
  hra_pct: 0, da_pct: 0, ta_pct: 0,
  other_allowance_pct: 0, other_allowance_label: 'Other Allowance',
  extra_allowances: [],
  pf_pct: 12, esi_pct: 0.75, professional_tax: 0,
  other_deduction_pct: 0, other_deduction_label: 'Other Deduction',
  extra_deductions: [],
};

export type PickerModalState = {
  visible: boolean;
  title: string;
  options: { label: string; value: any }[];
  selectedValue: any;
  onValueChange: (value: any) => void;
} | null;
