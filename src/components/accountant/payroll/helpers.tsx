import { Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import API from '../../../services/api';
import { MONTHS } from './types';
import type {
  Attendance,
  CorporateConfig,
  Employee,
  FixedConfig,
  LeaveBreakdown,
  LeavePolicy,
  PayrollResult,
} from './types';

export function formatDateSafe(date: Date | string, _locale: string = 'en-IN'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) { return '—'; }
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  } catch {
    return '—';
  }
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) {
    return '0.00';
  }
  const fixed = n.toFixed(2);
  const [wholePart, fractionPart] = fixed.split('.');
  const lastThree = wholePart.slice(-3);
  const otherDigits = wholePart.slice(0, -3);
  const groupedWhole = otherDigits
    ? `${otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree;
  return `${groupedWhole}.${fractionPart}`;
}

export function formatDesignation(value?: string): string {
  if (!value?.trim()) {
    return 'Staff';
  }
  return value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function isPeriodInFuture(month: string, year: number): boolean {
  const now = new Date();
  const mi = MONTHS.indexOf(month);
  const periodStart = new Date(year, mi, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return periodStart > todayStart;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function mapAttendanceFromBackend(
  att: Record<string, unknown>,
  teacherId: string,
  fallbackWorkingDays: number,
): Attendance {
  const lopDays = Number(att.lop_days ?? att.absent_days ?? 0);
  const applicableWorkingDays = Number(att.applicable_working_days) > 0
    ? Number(att.applicable_working_days)
    : fallbackWorkingDays;
  return {
    teacher_id: teacherId,
    present_days: Number(att.present_days || 0),
    absent_days: lopDays,
    lop_days: lopDays,
    late_days: Number(att.late_days || 0),
    paid_leave_days: Number(att.paid_leave_days || 0),
    total_days: Number(att.total_days) || applicableWorkingDays,
    applicable_working_days: applicableWorkingDays,
    attendance_percentage: Number(att.attendance_percentage || 0),
  };
}

export function emptyAttendance(teacherId: string, wDays: number): Attendance {
  return {
    teacher_id: teacherId,
    present_days: 0,
    absent_days: wDays,
    lop_days: wDays,
    late_days: 0,
    paid_leave_days: 0,
    total_days: wDays,
    applicable_working_days: wDays,
    attendance_percentage: 0,
  };
}

export async function fetchLeaveBreakdown(
  schoolCode: string,
  employeeId: string,
  monthIndex: number,
  year: number,
): Promise<LeaveBreakdown> {
  try {
    const response = await API.post('manage/principal/teacher-leave-balance', {
      school_code: schoolCode,
      employee_id: employeeId,
      month: monthIndex + 1,
      year,
    });
    const balance = response.data?.balance;
    if (!balance) {
      return { CASUAL: 0, SICK: 0, PAID: 0, COMP_OFF: 0 };
    }
    return {
      CASUAL: Number(balance.casual_used || 0),
      SICK: Number(balance.sick_used || 0),
      PAID: Number(balance.paid_used || 0),
      COMP_OFF: Number(balance.comp_off_used || 0),
    };
  } catch {
    return { CASUAL: 0, SICK: 0, PAID: 0, COMP_OFF: 0 };
  }
}

export function resolveAttendancePct(att: Attendance, workingDays: number): number {
  if (att.attendance_percentage > 0) {
    return att.attendance_percentage;
  }
  const effectiveDays = (att.present_days || 0) + (att.late_days || 0) + (att.paid_leave_days || 0);
  return workingDays > 0 ? Math.round(effectiveDays / workingDays * 10000) / 100 : 0;
}

export function calcFixed(emp: Employee, att: Attendance, cfg: FixedConfig, _leavePolicy: LeavePolicy): PayrollResult {
  const basic = Number(emp.salary_amount) || 0;
  const workingDays = att.applicable_working_days > 0
    ? att.applicable_working_days
    : (cfg.working_days > 0 ? cfg.working_days : 26);
  const perDay = workingDays > 0 ? basic / workingDays : 0;
  const lop_days = att.lop_days !== undefined ? Number(att.lop_days) : Number(att.absent_days || 0);
  const paid_leave_used = att.paid_leave_days || 0;
  const lop_deduction = Math.round(perDay * lop_days * 100) / 100;
  const attendance_pct = resolveAttendancePct(att, workingDays);
  const net = Math.max(0, basic - lop_deduction);

  return {
    employee: emp,
    present_days: att.present_days,
    absent_days: lop_days,
    late_days: att.late_days || 0,
    paid_leave_used,
    lop_days,
    applicable_working_days: workingDays,
    attendance_percentage: attendance_pct,
    basic,
    hra: 0,
    da: 0,
    ta: 0,
    other_allowance: 0,
    extra_allowances_total: 0,
    gross: basic,
    lop_deduction,
    pf: 0,
    esi: 0,
    professional_tax: 0,
    other_deduction: 0,
    extra_deductions_total: 0,
    total_deductions: lop_deduction,
    net,
    mode: 'fixed',
    cfg: cfg as any,
    leave_breakdown: att.leave_breakdown || { CASUAL: 0, SICK: 0, PAID: 0, COMP_OFF: 0 },
  };
}

export function calcCorporate(emp: Employee, att: Attendance, cfg: CorporateConfig, _leavePolicy: LeavePolicy): PayrollResult {
  const ctc = Number(emp.salary_amount) || 0;
  const basic = ctc * cfg.basic_pct / 100;
  const hra = ctc * cfg.hra_pct / 100;
  const da = ctc * cfg.da_pct / 100;
  const ta = ctc * cfg.ta_pct / 100;
  const other_allowance = ctc * cfg.other_allowance_pct / 100;
  const extra_allowances_total = (cfg.extra_allowances || [])
    .reduce((s: number, a) => s + ctc * a.pct / 100, 0);
  const gross = basic + hra + da + ta + other_allowance + extra_allowances_total;

  const workingDays = att.applicable_working_days > 0
    ? att.applicable_working_days
    : (cfg.working_days > 0 ? cfg.working_days : 26);
  const perDayGross = workingDays > 0 ? gross / workingDays : 0;
  const lop_days = att.lop_days !== undefined ? Number(att.lop_days) : Number(att.absent_days || 0);
  const paid_leave_used = att.paid_leave_days || 0;
  const lop_deduction = Math.round(perDayGross * lop_days * 100) / 100;
  const attendance_pct = resolveAttendancePct(att, workingDays);
  const pf = basic * cfg.pf_pct / 100;
  const esi = basic * cfg.esi_pct / 100;
  const other_deduction = basic * cfg.other_deduction_pct / 100;
  const extra_deductions_total = (cfg.extra_deductions || [])
    .reduce((s: number, d) => s + basic * d.pct / 100, 0);
  const total_deductions = lop_deduction + pf + esi + cfg.professional_tax
    + other_deduction + extra_deductions_total;
  const net = Math.max(0, gross - total_deductions);

  return {
    employee: emp,
    present_days: att.present_days,
    absent_days: lop_days,
    late_days: att.late_days || 0,
    paid_leave_used,
    lop_days,
    applicable_working_days: workingDays,
    attendance_percentage: attendance_pct,
    basic,
    hra,
    da,
    ta,
    other_allowance,
    extra_allowances_total,
    gross,
    lop_deduction,
    pf,
    esi,
    professional_tax: cfg.professional_tax,
    other_deduction,
    extra_deductions_total,
    total_deductions,
    net,
    mode: 'corporate',
    cfg,
    leave_breakdown: att.leave_breakdown || { CASUAL: 0, SICK: 0, PAID: 0, COMP_OFF: 0 },
  };
}

export async function generatePayslipPDF(
  result: PayrollResult,
  month: string,
  year: string,
  schoolCode: string,
  saveFile: boolean = true,
  companyName: string = '',
): Promise<string> {
  const response = await API.post('accountant/payroll/generate-payslip-pdf', {
    school_code: schoolCode,
    payroll_data: {
      employee: result.employee,
      month, year, company_name: companyName,
      mode: result.mode,
      basic: result.basic, hra: result.hra, da: result.da,
      ta: result.ta, other_allowance: result.other_allowance,
      gross: result.gross, lop_days: result.lop_days,
      lop_deduction: result.lop_deduction,
      present_days: result.present_days,
      paid_leave_used: result.paid_leave_used,
      applicable_working_days: result.applicable_working_days,
      pf: result.pf, esi: result.esi,
      professional_tax: result.professional_tax,
      other_deduction: result.other_deduction,
      total_deductions: result.total_deductions,
      net: result.net, cfg: result.cfg,
    },
  });
  const data = response.data;
  if (!data.success) { throw new Error(data.message || 'PDF generation failed'); }

  if (saveFile) {
    const fname = `Payslip_${(result.employee.teacher_full_name || 'Employee').replace(/\s+/g, '_')}_${month}_${year}.pdf`;
    const pdfBase64 = data.pdf_base64;
    const pdfPath = `${RNFS.DocumentDirectoryPath}/${fname}`;
    await RNFS.writeFile(pdfPath, pdfBase64, 'base64');
    const shareOptions = {
      title: 'Share Payslip',
      url: Platform.OS === 'android'
        ? `data:application/pdf;base64,${pdfBase64}`
        : `file://${pdfPath}`,
      type: 'application/pdf',
    };
    await Share.open(shareOptions);
  }
  return data.pdf_base64;
}

export async function downloadPayslipOrAlert(
  result: PayrollResult,
  month: string,
  year: string,
  schoolCode: string,
  companyName: string,
): Promise<void> {
  try {
    await generatePayslipPDF(result, month, year, schoolCode, true, companyName);
  } catch {
    Alert.alert('Error', 'PDF download failed.');
  }
}
