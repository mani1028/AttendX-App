import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { Theme } from '../../theme/tokens';
// PayrollScreen.tsx - COMPLETE FULL CODE with all 3 tabs
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XCircle, CheckCircle2, ChevronDown, AlertTriangle, Users, Info, Clock, User, Trash2 } from 'lucide-react-native';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { ENV } from '../../config/api.config';
import { useAuth } from '../../context/AuthContext';
import * as principalService from '../../services/principalService';
import API from '../../services/api';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';


// ==================== HELPER FUNCTIONS ====================

/**
 * Safe date formatting without relying on Intl API
 * Works around React Native Intl limitations
 */
const formatDateSafe = (date: Date | string, locale: string = 'en-IN'): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {return '—';}

    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    // Return DD/MM/YYYY format as fallback
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  } catch {
    return '—';
  }
};

// ==================== TYPES / CONSTANTS ====================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ExtraItem {
  id: string;
  label: string;
  pct: number;
}

interface Employee {
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

interface LeaveBreakdown {
  CASUAL: number;
  SICK: number;
  PAID: number;
  COMP_OFF: number;
}

interface Attendance {
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

interface PayrollResult {
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

interface FixedConfig {
  working_days: number;
}

interface CorporateConfig {
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

interface LeavePolicy {
  casual_leave: number;
  sick_leave: number;
  paid_leave: number;
  comp_off: number;
}

interface HourlyEmployee extends Employee {
  totalHours: number;
  attFetched: boolean;
  loadingAtt: boolean;
  hourlyRate: number;
  gross: number | null;
  net: number | null;
}

const DEFAULT_FIXED: FixedConfig = { working_days: 26 };
const DEFAULT_CORP: CorporateConfig = {
  working_days: 26, basic_pct: 40,
  hra_pct: 0, da_pct: 0, ta_pct: 0,
  other_allowance_pct: 0, other_allowance_label: 'Other Allowance',
  extra_allowances: [],
  pf_pct: 12, esi_pct: 0.75, professional_tax: 0,
  other_deduction_pct: 0, other_deduction_label: 'Other Deduction',
  extra_deductions: [],
};

// ==================== HELPERS ====================

function fmt(n: number): string {
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

function formatDesignation(value?: string): string {
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

function isPeriodInFuture(month: string, year: number): boolean {
  const now = new Date();
  const mi = MONTHS.indexOf(month);
  const periodStart = new Date(year, mi, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return periodStart > todayStart;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function mapAttendanceFromBackend(
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

function emptyAttendance(teacherId: string, wDays: number): Attendance {
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

async function fetchLeaveBreakdown(
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

function resolveAttendancePct(att: Attendance, workingDays: number): number {
  if (att.attendance_percentage > 0) {
    return att.attendance_percentage;
  }
  const effectiveDays = (att.present_days || 0) + (att.late_days || 0) + (att.paid_leave_days || 0);
  return workingDays > 0 ? Math.round(effectiveDays / workingDays * 10000) / 100 : 0;
}

// ==================== CALCULATORS ====================

function calcFixed(emp: Employee, att: Attendance, cfg: FixedConfig, leavePolicy: LeavePolicy): PayrollResult {
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

function calcCorporate(emp: Employee, att: Attendance, cfg: CorporateConfig, leavePolicy: LeavePolicy): PayrollResult {
  const ctc = Number(emp.salary_amount) || 0;
  const basic = ctc * cfg.basic_pct / 100;
  const hra = ctc * cfg.hra_pct / 100;
  const da = ctc * cfg.da_pct / 100;
  const ta = ctc * cfg.ta_pct / 100;
  const other_allowance = ctc * cfg.other_allowance_pct / 100;
  const extra_allowances_total = (cfg.extra_allowances || [])
    .reduce((s: number, a: ExtraItem) => s + ctc * a.pct / 100, 0);
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
    .reduce((s: number, d: ExtraItem) => s + basic * d.pct / 100, 0);
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

// ==================== PDF GENERATION ====================

async function generatePayslipPDF(
  result: PayrollResult,
  month: string,
  year: string,
  schoolCode: string,
  saveFile: boolean = true,
  companyName: string = ''
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
  if (!data.success) {throw new Error(data.message || 'PDF generation failed');}

  if (saveFile) {
    const fname = `Payslip_${(result.employee.teacher_full_name || 'Employee').replace(/\s+/g, '_')}_${month}_${year}.pdf`;
    const pdfBase64 = data.pdf_base64;
    const pdfPath = `${RNFS.DocumentDirectoryPath}/${fname}`;

    // Write to local file for persistence
    await RNFS.writeFile(pdfPath, pdfBase64, 'base64');

    // Share using base64 on Android to avoid FileUriExposedException/permission issues
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

// ==================== CUSTOM PICKER MODAL ====================

// ==================== SHARED UI COMPONENTS ====================

const Field: React.FC<{ label: string; hint?: string; width?: '48%' | '100%'; children: React.ReactNode }> = ({ label, hint, width = '100%', children }) => (
  <View style={[styles.fieldContainer, { width }]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {hint && <Text style={styles.fieldHint}>{hint}</Text>}
  </View>
);

const PctInput: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => (
  <View style={styles.pctInputContainer}>
    <TextInput style={styles.pctInput} value={value === 0 ? '' : String(value)} onChangeText={(text) => onChange(Number(text) || 0)} keyboardType="numeric" placeholder="0" placeholderTextColor="#9ca3af" />
    <Text style={styles.pctInputSymbol}>%</Text>
  </View>
);

const RupeeInput: React.FC<{ value: number; onChange: (value: number) => void }> = ({ value, onChange }) => (
  <View style={styles.rupeeInputContainer}>
    <Text style={styles.rupeeInputSymbol}>₹</Text>
    <TextInput style={styles.rupeeInput} value={value === 0 ? '' : String(value)} onChangeText={(text) => onChange(Number(text) || 0)} keyboardType="numeric" placeholder="0" placeholderTextColor="#9ca3af" />
  </View>
);

const PayrollTypeToggle: React.FC<{ mode: string; onChange: (mode: string) => void }> = ({ mode, onChange }) => (
  <View style={styles.toggleContainer}>
    <TouchableOpacity accessibilityRole="button" style={[styles.toggleOption, mode === 'fixed' && styles.toggleOptionActive]} onPress={() => onChange('fixed')}>
      <View style={[styles.radioOuter, mode === 'fixed' && { borderColor: Theme.colors.primary }]}>
        {mode === 'fixed' && <View style={styles.radioInner} />}
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={[styles.toggleOptionTitle, mode === 'fixed' && styles.toggleOptionTitleActive]}>Fixed Payroll</Text>
        <Text style={[styles.toggleOptionDesc, mode === 'fixed' && styles.toggleOptionDescActive]}>Basic pay only. LOP for absences.</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" style={[styles.toggleOption, mode === 'corporate' && styles.toggleOptionActive]} onPress={() => onChange('corporate')}>
      <View style={[styles.radioOuter, mode === 'corporate' && { borderColor: Theme.colors.primary }]}>
        {mode === 'corporate' && <View style={styles.radioInner} />}
      </View>
      <View style={styles.toggleTextContainer}>
        <Text style={[styles.toggleOptionTitle, mode === 'corporate' && styles.toggleOptionTitleActive]}>Corporate Payroll</Text>
        <Text style={[styles.toggleOptionDesc, mode === 'corporate' && styles.toggleOptionDescActive]}>Full structure: HRA, DA, TA, PF, ESI.</Text>
      </View>
    </TouchableOpacity>
  </View>
);

// ==================== CORPORATE CONFIG FORM ====================

const CorporateConfigForm: React.FC<{ cfg: CorporateConfig; onChange: (cfg: CorporateConfig) => void }> = ({ cfg, onChange }) => {
  const extras = cfg.extra_allowances || [];
  const extraDeds = cfg.extra_deductions || [];
  const sampleCTC = 10000;
  const sampleBasic = sampleCTC * cfg.basic_pct / 100;
  const sampleGross = sampleBasic + sampleCTC * cfg.hra_pct / 100 + sampleCTC * cfg.da_pct / 100 + sampleCTC * cfg.ta_pct / 100 + sampleCTC * cfg.other_allowance_pct / 100 + extras.reduce((s, a) => s + sampleCTC * a.pct / 100, 0);
  const samplePF = sampleBasic * cfg.pf_pct / 100;
  const sampleESI = sampleBasic * cfg.esi_pct / 100;
  const sampleNet = Math.max(0, sampleGross - (samplePF + sampleESI + cfg.professional_tax + sampleBasic * cfg.other_deduction_pct / 100 + extraDeds.reduce((s, d) => s + sampleBasic * d.pct / 100, 0)));

  return (
    <View style={styles.configForm}>
      <Field label="Basic % of CTC" width="100%"><PctInput value={cfg.basic_pct} onChange={(v) => onChange({ ...cfg, basic_pct: v })} /></Field>
      <View style={styles.divider} />
      <View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Allowances — % of CTC</Text><TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={() => onChange({ ...cfg, extra_allowances: [...extras, { id: uid(), label: 'Extra Allowance', pct: 0 }] })}><Text style={styles.addButtonTextRed}>+ Add Allowance</Text></TouchableOpacity></View>
        <View style={styles.allowancesGrid}>
          <Field label="HRA %" width="48%"><PctInput value={cfg.hra_pct} onChange={(v) => onChange({ ...cfg, hra_pct: v })} /></Field>
          <Field label="DA %" width="48%"><PctInput value={cfg.da_pct} onChange={(v) => onChange({ ...cfg, da_pct: v })} /></Field>
          <Field label="TA %" width="48%"><PctInput value={cfg.ta_pct} onChange={(v) => onChange({ ...cfg, ta_pct: v })} /></Field>
          <Field label="Other %" width="48%"><PctInput value={cfg.other_allowance_pct} onChange={(v) => onChange({ ...cfg, other_allowance_pct: v })} /></Field>
        </View>
        {extras.map((ea) => (
          <View key={ea.id} style={styles.extraItemContainer}>
            <TextInput style={styles.extraItemInput} value={ea.label} onChangeText={(text) => onChange({ ...cfg, extra_allowances: extras.map(a => a.id === ea.id ? { ...a, label: text } : a) })} placeholder="Allowance label" />
            <PctInput value={ea.pct} onChange={(v) => onChange({ ...cfg, extra_allowances: extras.map(a => a.id === ea.id ? { ...a, pct: v } : a) })} />
            <TouchableOpacity accessibilityRole="button" style={styles.removeButton} onPress={() => onChange({ ...cfg, extra_allowances: extras.filter(a => a.id !== ea.id) })}>
              <Trash2 size={16} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Deductions</Text><TouchableOpacity accessibilityRole="button" style={[styles.addButton, styles.addButtonRed]} onPress={() => onChange({ ...cfg, extra_deductions: [...extraDeds, { id: uid(), label: 'Extra Deduction', pct: 0 }] })}><Text style={[styles.addButtonTextRed, styles.addButtonTextRed]}>+ Add Deduction</Text></TouchableOpacity></View>
        <View style={styles.deductionsGrid}>
          <Field label="PF % of Basic" width="48%"><PctInput value={cfg.pf_pct} onChange={(v) => onChange({ ...cfg, pf_pct: v })} /></Field>
          <Field label="ESI % of Basic" width="48%"><PctInput value={cfg.esi_pct} onChange={(v) => onChange({ ...cfg, esi_pct: v })} /></Field>
          <Field label="Prof. Tax ₹" width="48%"><RupeeInput value={cfg.professional_tax} onChange={(v) => onChange({ ...cfg, professional_tax: v })} /></Field>
          <Field label="Other Ded %" width="48%"><PctInput value={cfg.other_deduction_pct} onChange={(v) => onChange({ ...cfg, other_deduction_pct: v })} /></Field>
        </View>
        {extraDeds.map((ed) => (
          <View key={ed.id} style={[styles.extraItemContainer, styles.extraItemContainerRed]}>
            <TextInput style={styles.extraItemInput} value={ed.label} onChangeText={(text) => onChange({ ...cfg, extra_deductions: extraDeds.map(d => d.id === ed.id ? { ...d, label: text } : d) })} placeholder="Deduction label" />
            <PctInput value={ed.pct} onChange={(v) => onChange({ ...cfg, extra_deductions: extraDeds.map(d => d.id === ed.id ? { ...d, pct: v } : d) })} />
            <TouchableOpacity accessibilityRole="button" style={styles.removeButton} onPress={() => onChange({ ...cfg, extra_deductions: extraDeds.filter(d => d.id !== ed.id) })}>
              <Trash2 size={16} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewHeaderTitle}>Live Preview — ₹{fmt(sampleCTC)} CTC</Text>
        </View>
        <View style={styles.previewContent}>
          <View style={styles.previewRow}>
            <View style={styles.previewColumn}>
              <Text style={styles.previewSubtitle}>Earnings</Text>
              <View style={styles.previewLine}><Text style={styles.previewLabel}>Basic ({cfg.basic_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleBasic)}</Text></View>
              {cfg.hra_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>HRA ({cfg.hra_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.hra_pct / 100)}</Text></View>}
              {cfg.da_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>DA ({cfg.da_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.da_pct / 100)}</Text></View>}
              {cfg.ta_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>TA ({cfg.ta_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.ta_pct / 100)}</Text></View>}
              {cfg.other_allowance_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>{cfg.other_allowance_label || 'Other'} ({cfg.other_allowance_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.other_allowance_pct / 100)}</Text></View>}
              {extras.map((ea) => ea.pct > 0 && (
                <View key={ea.id} style={styles.previewLine}>
                  <Text style={styles.previewLabel} numberOfLines={1}>{ea.label || 'Extra'} ({ea.pct}%)</Text>
                  <Text style={styles.previewValue}>₹{fmt(sampleCTC * ea.pct / 100)}</Text>
                </View>
              ))}
              <View style={[styles.previewLine, styles.previewTotalLine]}><Text style={styles.previewTotalLabel}>Gross</Text><Text style={styles.previewTotalValue}>₹{fmt(sampleGross)}</Text></View>
            </View>
            <View style={styles.previewColDivider} />
            <View style={styles.previewColumn}>
              <Text style={styles.previewSubtitle}>Deductions</Text>
              {cfg.pf_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>PF ({cfg.pf_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(samplePF)}</Text></View>}
              {cfg.esi_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>ESI ({cfg.esi_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleESI)}</Text></View>}
              {cfg.professional_tax > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>Prof. Tax</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(cfg.professional_tax)}</Text></View>}
              {cfg.other_deduction_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>{cfg.other_deduction_label || 'Other Ded'} ({cfg.other_deduction_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleBasic * cfg.other_deduction_pct / 100)}</Text></View>}
              {extraDeds.map((ed) => ed.pct > 0 && (
                <View key={ed.id} style={styles.previewLine}>
                  <Text style={styles.previewLabel} numberOfLines={1}>{ed.label || 'Extra Ded'} ({ed.pct}%)</Text>
                  <Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleBasic * ed.pct / 100)}</Text>
                </View>
              ))}
              <View style={[styles.previewLine, styles.previewTotalLine]}><Text style={styles.previewTotalLabel}>Net Pay</Text><Text style={[styles.previewTotalValue, styles.previewTotalValueGreen]}>₹{fmt(sampleNet)}</Text></View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// ==================== PAYSLIP MODAL ====================

const PayslipModal: React.FC<{ result: PayrollResult; month: string; year: string; companyName: string; schoolCode: string; onClose: () => void }> = ({ result, month, year, companyName, schoolCode, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const emp = result.employee;
  const empName = emp.teacher_full_name || 'Employee';
  const mode = result.mode;
  const formatMoney = (amount: number) => `₹${fmt(amount)}`;

  const handleExport = async () => {
    setExporting(true);
    try { await generatePayslipPDF(result, month, String(year), schoolCode, true, companyName); }
    catch { Alert.alert('Error', 'PDF export failed.'); }
    finally { setExporting(false); }
  };

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Payslip – ${empName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui, -apple-system, sans-serif;background:#fff;color:#111;font-size:12px;padding:20px}.header{padding:20px 16px;border-bottom:2px solid #111;display:flex;justify-content:space-between}.franchise-name{font-size:18px;font-weight:800}.slip-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-top:3px}.period-box{text-align:right}.period-month{font-size:14px;font-weight:700}.period-gen{font-size:8px;color:#777;margin-top:3px}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);border-left:1px solid #d1d5db;border-top:1px solid #d1d5db}.info-cell{padding:8px 12px;border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db}.info-label{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:2px}.info-value{font-size:12px;font-weight:600}.att-grid{display:grid;grid-template-columns:repeat(5,1fr);border-left:1px solid #d1d5db;border-bottom:1px solid #d1d5db}.att-cell{padding:10px 6px;text-align:center;border-right:1px solid #d1d5db}.att-num{font-size:18px;font-weight:800}.att-label{font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-top:3px}.earn-ded-grid{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #d1d5db}.col-header{padding:6px 12px;font-size:8px;font-weight:800;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #d1d5db;border-top:1px solid #d1d5db;background:#f9fafb}.row{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #ececec}.total-row{display:flex;justify-content:space-between;padding:6px 12px;font-weight:700;border-top:2px solid #111;border-bottom:1px solid #d1d5db}.net-band{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border:2px solid #111;margin:12px}.net-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:4px}.net-amt{font-size:24px;font-weight:800}.net-side{text-align:right;font-size:9px}.footer{display:flex;justify-content:space-between;align-items:flex-end;padding:14px 20px;border-top:1px solid #d1d5db;font-size:9px;color:#666}.sig-box{border:1px dashed #aaa;padding:12px 20px;text-align:center;min-width:100px}</style></head><body>
<div class="header"><div><div class="franchise-name">${companyName || 'Organization'}</div><div class="slip-label">SALARY SLIP · ${mode === 'fixed' ? 'FIXED PAYROLL' : 'CORPORATE PAYROLL'}</div></div><div class="period-box"><div class="period-month">${month} ${year}</div><div class="period-gen">Generated: ${formatDateSafe(new Date())}</div></div></div>
<div class="info-grid"><div class="info-cell"><div class="info-label">EMPLOYEE NAME</div><div class="info-value">${emp.teacher_full_name || 'N/A'}</div></div><div class="info-cell"><div class="info-label">EMPLOYEE ID</div><div class="info-value">${emp.employee_id || 'N/A'}</div></div><div class="info-cell"><div class="info-label">DESIGNATION</div><div class="info-value">${emp.designation || '—'}</div></div><div class="info-cell"><div class="info-label">DATE OF JOINING</div><div class="info-value">${emp.date_of_joining ? formatDateSafe(emp.date_of_joining) : '—'}</div></div><div class="info-cell"><div class="info-label">EMPLOYMENT TYPE</div><div class="info-value">${emp.employment_type || '—'}</div></div><div class="info-cell"><div class="info-label">PAY PERIOD</div><div class="info-value">${month} ${year}</div></div></div>
<div class="att-grid"><div class="att-cell"><div class="att-num">${result.applicable_working_days || result.cfg.working_days}</div><div class="att-label">WORKING DAYS</div></div><div class="att-cell"><div class="att-num">${result.present_days}</div><div class="att-label">DAYS PRESENT</div></div><div class="att-cell"><div class="att-num">${result.late_days || 0}</div><div class="att-label">LATE DAYS</div></div><div class="att-cell"><div class="att-num">${result.paid_leave_used}</div><div class="att-label">PAID LEAVE USED</div></div><div class="att-cell"><div class="att-num">${result.lop_days}</div><div class="att-label">LOP DAYS</div></div></div>
<div class="earn-ded-grid"><div><div class="col-header">EARNINGS</div><div class="row"><span>Basic Salary</span><span>${formatMoney(result.basic)}</span></div>${mode === 'corporate' && result.hra > 0 ? `<div class="row"><span>HRA (${(result.cfg as CorporateConfig).hra_pct}%)</span><span>${formatMoney(result.hra)}</span></div>` : ''}${mode === 'corporate' && result.da > 0 ? `<div class="row"><span>DA (${(result.cfg as CorporateConfig).da_pct}%)</span><span>${formatMoney(result.da)}</span></div>` : ''}${mode === 'corporate' && result.ta > 0 ? `<div class="row"><span>TA (${(result.cfg as CorporateConfig).ta_pct}%)</span><span>${formatMoney(result.ta)}</span></div>` : ''}<div class="total-row"><span>Gross Earnings</span><span>${formatMoney(result.gross)}</span></div></div>
<div><div class="col-header">DEDUCTIONS</div>${result.lop_deduction > 0 ? `<div class="row"><span>Loss of Pay (${result.lop_days}d)</span><span>–${formatMoney(result.lop_deduction)}</span></div>` : ''}${result.pf > 0 ? `<div class="row"><span>Provident Fund (${(result.cfg as CorporateConfig).pf_pct}%)</span><span>–${formatMoney(result.pf)}</span></div>` : ''}${result.esi > 0 ? `<div class="row"><span>ESI (${(result.cfg as CorporateConfig).esi_pct}%)</span><span>–${formatMoney(result.esi)}</span></div>` : ''}${result.professional_tax > 0 ? `<div class="row"><span>Professional Tax</span><span>–${formatMoney(result.professional_tax)}</span></div>` : ''}<div class="total-row"><span>Total Deductions</span><span>–${formatMoney(result.total_deductions)}</span></div></div></div>
<div class="net-band"><div><div class="net-label">NET PAY (TAKE HOME)</div><div class="net-amt">${formatMoney(result.net)}</div></div><div class="net-side"><div>Gross Earnings ${formatMoney(result.gross)}</div><div style="margin-top:3px">Total Deductions –${formatMoney(result.total_deductions)}</div></div></div>
<div class="footer"><div><div>This is a system-generated payslip and does not require a physical signature.</div><div style="margin-top:3px">${companyName} · ${month} ${year}</div></div><div class="sig-box"><div style="height:24px"></div><div style="border-top:1px solid #aaa;padding-top:5px;font-size:8px">Authorised Signatory</div></div></div>
</body></html>`;

  return (
    <Modal visible={true} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.payslipHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{empName}</Text>
            <Text style={styles.modalSubtitle}>{month} {year} · {mode === 'fixed' ? 'Fixed' : 'Corporate'} Payroll</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonTextClose}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.webviewContainer}>
          <WebView originWhitelist={['*']} source={{ html: htmlContent }} style={styles.webview} />
        </View>
        <View style={styles.payslipFooter}>
          <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.modalButtonPrimary, styles.payslipDownloadBtn]} onPress={handleExport} disabled={exporting}>
            {exporting ? <ActivityIndicator size="small" color={Theme.colors.card} /> : <Text style={styles.modalButtonText}>Download PDF</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== BULK PAYROLL TAB (COMPLETE) ====================

const BulkPayrollTab: React.FC<{ schoolCode: string; companyName: string; pageChrome?: React.ReactNode }> = ({ schoolCode, companyName, pageChrome }) => {
  const insets = useSafeAreaInsets();
  const handleScroll = useScrollTabBar();
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attFetched, setAttFetched] = useState(false);
  const [attMap, setAttMap] = useState<Record<string, Attendance>>({});
  const [mode, setMode] = useState('fixed');
  const [fixedCfg, setFixedCfg] = useState<FixedConfig>(DEFAULT_FIXED);
  const [corpCfg, setCorpCfg] = useState<CorporateConfig>(DEFAULT_CORP);
  const [generatedMap, setGeneratedMap] = useState<Record<string, PayrollResult>>({});
  const [openPayslip, setOpenPayslip] = useState<PayrollResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showAttTable, setShowAttTable] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>({ casual_leave: 1, sick_leave: 1, paid_leave: 1, comp_off: 0 });

  const wDays = mode === 'fixed' ? fixedCfg.working_days : corpCfg.working_days;

  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; options: { label: string; value: any }[]; selectedValue: any; onValueChange: (value: any) => void } | null>(null);

  const loadEmployeesAndLeavePolicy = async () => {
    if (!schoolCode) { setEmployees([]); return; }
    setLoadingEmps(true);
    try {
      const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID) || '';

      const [empData, leaveResponse] = await Promise.all([
        principalService.getPrincipalTeachers({
          'school-code': schoolCode,
          ...(branchId ? { 'branch-id': branchId } : {}),
        }),
        API.get(`director/settings/leave-policy?school_code=${encodeURIComponent(schoolCode)}`, { suppressFallback404Log: true } as any).catch(() => null),
      ]);

      const mappedEmps = empData.map(t => ({
        ...t,
        id: t.teacher_id || t.id,
        teacher_full_name: t.teacher_full_name || t.name || t.full_name,
        teacher_id: t.teacher_id || t.id,
        employee_id: t.employee_id || t.id,
      }));
      setEmployees(mappedEmps);

      if (leaveResponse) {
        const leavePolicyData = leaveResponse.data;
        if (leavePolicyData) {setLeavePolicy({ casual_leave: Number(leavePolicyData.casual_leave || 1), sick_leave: Number(leavePolicyData.sick_leave || 1), paid_leave: Number(leavePolicyData.paid_leave || 1), comp_off: Number(leavePolicyData.comp_off || 0) });}
      }
    } catch (err) { setEmployees([]); } finally { setLoadingEmps(false); }
  };

  useEffect(() => { loadEmployeesAndLeavePolicy(); }, [schoolCode]);

  function resetCalc() { setAttMap({}); setAttFetched(false); setGeneratedMap({}); }

  const fetchAttendance = async () => {
    if (!schoolCode || employees.length === 0) {return;}
    if (isPeriodInFuture(month, year)) { Alert.alert('Error', `Cannot fetch attendance for future period (${month} ${year}).`); return; }
    setLoadingAtt(true); setAttFetched(false); setGeneratedMap({});
    const mi = MONTHS.indexOf(month);
    const startDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, mi + 1, 0);
    const endDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    try {
      const response = await API.get(
        `accountant/payroll/attendance?school_code=${encodeURIComponent(schoolCode)}&start_date=${startDateStr}&end_date=${endDateStr}&working_days=${wDays}`,
      );
      const data = response.data;
      const map: Record<string, Attendance> = {};
      if (Array.isArray(data)) {
        data.forEach((att: Record<string, unknown>) => {
          const emp = employees.find(e =>
            e.teacher_id === att.teacher_id ||
            e.employee_id === att.employee_id ||
            e.teacher_id === att.employee_id,
          );
          if (emp) {
            map[emp.teacher_id] = mapAttendanceFromBackend(att, emp.teacher_id, wDays);
          }
        });
        employees.forEach(emp => {
          if (!map[emp.teacher_id]) {
            map[emp.teacher_id] = emptyAttendance(emp.teacher_id, wDays);
          }
        });
      } else {
        employees.forEach(emp => {
          map[emp.teacher_id] = emptyAttendance(emp.teacher_id, wDays);
        });
      }

      const breakdownResults = await Promise.all(
        employees.map(async emp => ({
          teacher_id: emp.teacher_id,
          breakdown: await fetchLeaveBreakdown(schoolCode, emp.employee_id, mi, year),
        })),
      );
      breakdownResults.forEach(({ teacher_id, breakdown }) => {
        if (map[teacher_id]) {
          map[teacher_id].leave_breakdown = breakdown;
        }
      });

      setAttMap(map); setAttFetched(true);
    } catch (err) { Alert.alert('Error', 'Failed to fetch attendance data'); } finally { setLoadingAtt(false); }
  };

  const generateForEmployee = (emp: Employee) => {
    const att = attMap[emp.teacher_id] || emptyAttendance(emp.teacher_id, wDays);
    const result = mode === 'fixed' ? calcFixed(emp, att, fixedCfg, leavePolicy) : calcCorporate(emp, att, corpCfg, leavePolicy);
    setGeneratedMap(prev => ({ ...prev, [emp.teacher_id]: result }));
  };

  const generateAll = () => { employees.forEach(emp => generateForEmployee(emp)); };

  const handleSaveAll = async () => {
    const genCount = Object.keys(generatedMap).length;
    if (genCount === 0) { Alert.alert('Info', 'No payroll records to save.'); return; }
    setSavingAll(true);
    try {
      const records = Object.values(generatedMap).map(result => ({ teacher_id: result.employee.teacher_id, employee_id: result.employee.employee_id, teacher_name: result.employee.teacher_full_name, email: result.employee.email_id, designation: result.employee.designation, employment_type: result.employee.employment_type, doj: result.employee.date_of_joining, salary: result.basic, present_days: result.present_days, absent_days: result.absent_days, lop_days: result.lop_days, lop_deduction: result.lop_deduction, gross_salary: result.gross, pf: result.pf || 0, esi: result.esi || 0, professional_tax: result.professional_tax || 0, other_deduction: result.other_deduction || 0, net_salary: result.net, mode: result.mode, working_days: result.applicable_working_days || wDays }));
      const response = await API.post('accountant/payroll/save-all', { school_code: schoolCode, pay_month: month, pay_year: year, working_days: wDays, records: records });
      const data = response.data;
      if (data.success) {Alert.alert('Success', `✅ ${data.saved_count} payroll records saved!`);}
    } catch (err) { Alert.alert('Error', 'Error saving payroll records.'); } finally { setSavingAll(false); }
  };

  const handleSendEmails = async () => {
    const genCount = Object.keys(generatedMap).length;
    if (genCount === 0) { Alert.alert('Info', 'No payroll records to send.'); return; }
    Alert.alert('Confirm', `Send payroll emails to ${genCount} employees?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Send', onPress: async () => {
      setSendingEmails(true);
      try {
        const records = Object.values(generatedMap).map(result => ({ teacher_id: result.employee.teacher_id, teacher_name: result.employee.teacher_full_name, email: result.employee.email_id || result.employee.email, present_days: result.present_days, absent_days: result.absent_days, lop_days: result.lop_days, lop_deduction: result.lop_deduction, gross_salary: result.gross, net_salary: result.net, total_deductions: result.total_deductions, mode: result.mode }));
        const response = await API.post('accountant/payroll/send-email-bulk', { school_code: schoolCode, pay_month: month, pay_year: year, company_name: companyName, records: records });
        const data = response.data;
        if (data.success) {Alert.alert('Success', '📧 Emails are being sent!');}
      } catch (err) { Alert.alert('Error', 'Error sending emails.'); } finally { setSendingEmails(false); }
    } }]);
  };

  const handleDownloadPDF = async (result: PayrollResult, empId: string) => {
    setDownloadingId(empId);
    try { await generatePayslipPDF(result, month, String(year), schoolCode, true, companyName); }
    catch { Alert.alert('Error', 'PDF download failed.'); }
    finally { setDownloadingId(null); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadEmployeesAndLeavePolicy(); resetCalc(); setRefreshing(false); };
  const filteredEmps = employees.filter(e => !searchQuery || (e.teacher_full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (e.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const genCount = Object.keys(generatedMap).length;
  const totalGross = Object.values(generatedMap).reduce((s, r) => s + r.gross, 0);
  const totalDed = Object.values(generatedMap).reduce((s, r) => s + r.total_deductions, 0);
  const totalNet = Object.values(generatedMap).reduce((s, r) => s + r.net, 0);
  const isPeriodFuture = isPeriodInFuture(month, year);
  const showEmployeeList = attFetched && !loadingAtt;

  const renderListEmpty = () => {
    if (loadingAtt) {
      return (
        <View style={styles.awaitingCard}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.awaitingTitle}>Fetching attendance…</Text>
          <Text style={styles.awaitingDesc}>Loading {month} {year} attendance for all staff.</Text>
        </View>
      );
    }
    if (!attFetched) {
      return (
        <View style={styles.awaitingCard}>
          <Users size={36} color={Theme.colors.textSec} />
          <Text style={styles.awaitingTitle}>Staff list hidden</Text>
          <Text style={styles.awaitingDesc}>
            Fetch {month} {year} attendance above to view staff and generate payroll.
          </Text>
        </View>
      );
    }
    if (searchQuery.trim()) {
      return (
        <View style={styles.awaitingCard}>
          <Text style={styles.awaitingTitle}>No matching staff</Text>
          <Text style={styles.awaitingDesc}>Try a different name or employee ID.</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No staff members found</Text>
      </View>
    );
  };

  return (
    <FlatList
      style={styles.tabContainer}
      contentContainerStyle={[
        innerPageLayoutStyles.scrollPageContent,
        { paddingBottom: Math.max(insets.bottom + 120, 140) },
      ]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          {pageChrome}
          <View style={innerPageLayoutStyles.scrollBody}>
          <View style={styles.card}>
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeaderText}>Pay Period & Settings</Text>
              <View style={styles.configGrid}>
                <Field label="Month" width="48%">
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.pickerTrigger}
                    onPress={() => setPickerModal({
                      visible: true,
                      title: 'Select Month',
                      options: MONTHS.map(m => ({ label: m, value: m })),
                      selectedValue: month,
                      onValueChange: (v) => { setMonth(v); resetCalc(); },
                    })}
                  >
                    <Text style={styles.pickerTriggerText}>{month}</Text>
                    <ChevronDown size={18} color={Theme.colors.textSec} />
                  </TouchableOpacity>
                </Field>
                <Field label="Year" width="48%">
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.pickerTrigger}
                    onPress={() => setPickerModal({
                      visible: true,
                      title: 'Select Year',
                      options: years.map(y => ({ label: String(y), value: y })),
                      selectedValue: year,
                      onValueChange: (v) => { setYear(v); resetCalc(); },
                    })}
                  >
                    <Text style={styles.pickerTriggerText}>{year}</Text>
                    <ChevronDown size={18} color={Theme.colors.textSec} />
                  </TouchableOpacity>
                </Field>
                <Field label="Working Days" hint="Days in pay period" width="100%">
                  <TextInput
                    style={styles.input}
                    value={String(wDays)}
                    onChangeText={(text) => {
                      const v = Number(text) || 26;
                      if (mode === 'fixed') {setFixedCfg(p => ({ ...p, working_days: v }));}
                      else {setCorpCfg(p => ({ ...p, working_days: v }));}
                      resetCalc();
                    }}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              {isPeriodFuture && (
                <View style={styles.warningBox}>
                  <AlertTriangle size={16} color="#f97316" />
                  <Text style={[styles.warningText, { flex: 1 }]}>
                    {month} {year} is a future period — payroll cannot be generated yet.
                  </Text>
                </View>
              )}
              {loadingEmps ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <Text style={styles.loadingText}>Loading staff…</Text>
                </View>
              ) : employees.length > 0 ? (
                <View style={styles.staffBadge}>
                  <Users size={14} color="#0891b2" style={{ marginRight: 6 }} />
                  <Text style={styles.staffBadgeText}>{employees.length} active staff members</Text>
                </View>
              ) : null}
              <View style={styles.modeSection}><Text style={styles.sectionHeaderText}>Payroll Type</Text><PayrollTypeToggle mode={mode} onChange={m => { setMode(m); resetCalc(); }} /></View>
            </View>
            <View style={styles.cardSection}>
              {mode === 'fixed' ? (
                <View style={styles.fixedInfoBox}>
                  <Info size={16} color={Theme.colors.blue} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fixedInfoText}>Formula: Net = Basic Salary − (LOP Days × Per-day Rate)</Text>
                    <Text style={styles.fixedInfoSubtext}>Per-day rate uses applicable working days (pro-rated for mid-month joiners).</Text>
                  </View>
                </View>
              ) : (
                <CorporateConfigForm cfg={corpCfg} onChange={c => { setCorpCfg(c); resetCalc(); }} />
              )}
            </View>
            {employees.length > 0 && (<View style={styles.cardSection}><View style={styles.fetchRow}><TouchableOpacity accessibilityRole="button" style={[styles.fetchButton, (loadingAtt || isPeriodFuture) && styles.fetchButtonDisabled]} onPress={fetchAttendance} disabled={loadingAtt || isPeriodFuture}>{loadingAtt ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text style={styles.fetchButtonText}>Fetch {month} {year} Attendance</Text>}</TouchableOpacity>{attFetched && (<><TouchableOpacity accessibilityRole="button" style={styles.viewAttButton} onPress={() => setShowAttTable(!showAttTable)}><Text style={styles.viewAttButtonText}>{showAttTable ? 'Hide' : 'View'} Attendance Summary</Text></TouchableOpacity><View style={styles.attLoadedBadge}><Text style={styles.attLoadedText}>✓ Attendance loaded for {Object.keys(attMap).length} staff</Text></View></>)}</View></View>)}
            {showAttTable && attFetched && employees.length > 0 && (
              <View style={styles.attSummaryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.attSummaryHeaderRow}>
                      <Text style={[styles.attSummaryHeaderCell, styles.attSummaryNameCol]}>Staff</Text>
                      <Text style={styles.attSummaryHeaderCell}>Present</Text>
                      <Text style={[styles.attSummaryHeaderCell, styles.attSummaryLopCol]}>LOP</Text>
                      <Text style={styles.attSummaryHeaderCell}>Casual</Text>
                      <Text style={styles.attSummaryHeaderCell}>Sick</Text>
                      <Text style={styles.attSummaryHeaderCell}>Paid</Text>
                      <Text style={styles.attSummaryHeaderCell}>Comp</Text>
                      <Text style={styles.attSummaryHeaderCell}>Att %</Text>
                    </View>
                    {employees.filter(e => attMap[e.teacher_id]).slice(0, 10).map(emp => {
                      const att = attMap[emp.teacher_id];
                      const breakdown = att.leave_breakdown || { CASUAL: 0, SICK: 0, PAID: 0, COMP_OFF: 0 };
                      const pct = resolveAttendancePct(att, att.applicable_working_days || wDays);
                      const pctColor = pct >= 80 ? styles.attPctGreen : pct >= 70 ? styles.attPctYellow : styles.attPctRed;
                      return (
                        <View key={emp.teacher_id} style={styles.attSummaryRow}>
                          <View style={styles.attSummaryNameCol}>
                            <Text style={styles.attSummaryName} numberOfLines={1}>{emp.teacher_full_name}</Text>
                            <Text style={styles.attSummaryId}>{emp.employee_id}</Text>
                          </View>
                          <Text style={[styles.attSummaryCell, styles.attSummaryPresent]}>{att.present_days || 0}</Text>
                          <Text style={[styles.attSummaryCell, styles.attSummaryLopCol, styles.attSummaryLop]}>{att.lop_days || 0}</Text>
                          <Text style={styles.attSummaryCell}>{breakdown.CASUAL || 0}</Text>
                          <Text style={styles.attSummaryCell}>{breakdown.SICK || 0}</Text>
                          <Text style={styles.attSummaryCell}>{breakdown.PAID || 0}</Text>
                          <Text style={styles.attSummaryCell}>{breakdown.COMP_OFF || 0}</Text>
                          <Text style={[styles.attSummaryCell, styles.attSummaryPct, pctColor]}>{pct.toFixed(1)}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                {employees.length > 10 && (
                  <Text style={styles.attSummaryFootnote}>Showing first 10 of {employees.length} staff</Text>
                )}
              </View>
            )}
          </View>
          {attFetched && employees.length > 0 && genCount === 0 && !isPeriodFuture && (
            <View style={styles.generatePrompt}>
              <View style={styles.generatePromptCopy}>
                <Text style={styles.generatePromptTitle}>Ready to Generate Payroll</Text>
                <Text style={styles.generatePromptDesc}>
                  {month} {year} · {employees.length} staff with attendance loaded
                </Text>
              </View>
              <TouchableOpacity accessibilityRole="button" style={styles.generateButton} onPress={generateAll}>
                <Text style={styles.generateButtonText}>Generate All</Text>
              </TouchableOpacity>
            </View>
          )}
          {attFetched && employees.length > 0 && (
            <View style={styles.resultsContainer}>
            {genCount > 0 && (
              <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Generated</Text>
                  <Text style={styles.summaryValue}>{genCount}/{employees.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Gross</Text>
                  <Text style={styles.summaryValue}>₹{fmt(totalGross)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Deductions</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueRed]}>₹{fmt(totalDed)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Net</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueGreen]}>₹{fmt(totalNet)}</Text>
                </View>
              </View>
            )}
            <View style={styles.actionBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search staff…"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
              <View style={styles.actionButtonsRow}>
                {genCount < employees.length && genCount > 0 && (
                  <TouchableOpacity accessibilityRole="button" style={styles.generateAllButton} onPress={generateAll}>
                    <Text style={styles.generateAllButtonText}>Generate All ({employees.length})</Text>
                  </TouchableOpacity>
                )}
                {genCount > 0 && (
                  <>
                    <TouchableOpacity accessibilityRole="button" style={styles.saveAllButton} onPress={handleSaveAll} disabled={savingAll}>
                      {savingAll ? (
                        <ActivityIndicator size="small" color={Theme.colors.card} />
                      ) : (
                        <Text style={styles.saveAllButtonText}>Save All ({genCount})</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.emailAllButton} onPress={handleSendEmails} disabled={sendingEmails}>
                      {sendingEmails ? (
                        <ActivityIndicator size="small" color={Theme.colors.card} />
                      ) : (
                        <Text style={styles.emailAllButtonText}>Send Mail ({genCount})</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>)}
          </View>
        </>
      }
      data={showEmployeeList ? filteredEmps : []}
      keyExtractor={(item, index) => item.teacher_id || item.employee_id || (item as any).id || (item as any)._id || `employee-${index}`}
      renderItem={({ item: emp }) => {
        const att = attMap[emp.teacher_id];
        const result = generatedMap[emp.teacher_id];
        const isGen = !!result;
        return (
          <View style={[styles.employeeCard, isGen && styles.employeeCardGenerated]}>
            <View style={styles.employeeInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(emp.teacher_full_name || 'T').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.employeeTextBlock}>
                <Text style={styles.employeeNameText} numberOfLines={1}>{emp.teacher_full_name}</Text>
                <Text style={styles.employeeIdText} numberOfLines={1}>
                  {emp.employee_id} · {formatDesignation(emp.designation)}
                </Text>
              </View>
            </View>
            <View style={styles.employeeStatsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Salary</Text>
                <Text style={styles.statValue}>₹{fmt(emp.salary_amount || 0)}</Text>
              </View>
              {att && (
                <>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Present</Text>
                    <Text style={[styles.statValue, styles.statValueGreen]}>{att.present_days ?? '—'}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>LOP</Text>
                    <Text style={[styles.statValue, styles.statValueRed]}>{att.lop_days ?? att.absent_days ?? '—'}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Work Days</Text>
                    <Text style={styles.statValue}>{att.applicable_working_days ?? '—'}</Text>
                  </View>
                </>
              )}
              {isGen && result && (
                <>
                  {mode === 'corporate' && <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Gross</Text>
                    <Text style={styles.statValue}>₹{fmt(result.gross)}</Text>
                  </View>}
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Net Pay</Text>
                    <Text style={[styles.statValue, styles.statValueBold]}>₹{fmt(result.net)}</Text>
                  </View>
                </>
              )}
            </View>
            <View style={styles.employeeActionsRow}>
              {!isGen ? (
                <TouchableOpacity accessibilityRole="button" style={styles.generateEmpButton} onPress={() => generateForEmployee(emp)} disabled={isPeriodFuture || !attFetched}>
                  <Text style={styles.generateEmpButtonText}>Generate</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.actionButtonsGroup}>
                  <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.viewBtn]} onPress={() => result && setOpenPayslip(result)}>
                    <Text style={styles.actionBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.pdfBtn]} onPress={() => result && handleDownloadPDF(result, emp.teacher_id)} disabled={downloadingId === emp.teacher_id}>
                    {downloadingId === emp.teacher_id ? (
                      <ActivityIndicator size="small" color={Theme.colors.card} />
                    ) : (
                      <Text style={[styles.actionBtnText, styles.actionBtnTextLight]}>PDF</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.recalcBtn]} onPress={() => generateForEmployee(emp)}>
                    <Text style={styles.recalcBtnText}>⟳</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={renderListEmpty}
      ListFooterComponent={
        <>
          {openPayslip && <PayslipModal result={openPayslip} month={month} year={String(year)} companyName={companyName} schoolCode={schoolCode} onClose={() => setOpenPayslip(null)} />}
          {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}
        </>
      }
    />
  );
};

// ==================== INDIVIDUAL PAYROLL TAB ====================

const IndividualPayrollTab: React.FC<{ schoolCode: string; companyName: string; pageChrome?: React.ReactNode }> = ({ schoolCode, companyName, pageChrome }) => {
  const insets = useSafeAreaInsets();
  const handleScroll = useScrollTabBar();
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>({ casual_leave: 1, sick_leave: 1, paid_leave: 1, comp_off: 0 });
  const [empConfig, setEmpConfig] = useState({ mode: 'fixed', fixedCfg: DEFAULT_FIXED, corpCfg: DEFAULT_CORP, result: null as PayrollResult | null, attFetched: false, att: null as Attendance | null, loadingAtt: false });
  const [openPayslip, setOpenPayslip] = useState<PayrollResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; options: { label: string; value: any }[]; selectedValue: any; onValueChange: (value: any) => void } | null>(null);

  useEffect(() => {
    if (!schoolCode) { setEmployees([]); return; }
    setLoadingEmps(true);
    (async () => {
      try {
        const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID) || '';
        const [empData, leaveResponse] = await Promise.all([
          principalService.getPrincipalTeachers({
            'school-code': schoolCode,
            ...(branchId ? { 'branch-id': branchId } : {}),
          }),
          API.get(`director/settings/leave-policy?school_code=${encodeURIComponent(schoolCode)}`, { suppressFallback404Log: true } as any).catch(() => null),
        ]);
        const mappedEmps = empData.map(t => ({
          ...t,
          id: t.teacher_id || t.id,
          teacher_full_name: t.teacher_full_name || t.name || t.full_name,
          teacher_id: t.teacher_id || t.id,
          employee_id: t.employee_id || t.id,
        }));
        setEmployees(mappedEmps);
        if (leaveResponse) { const leavePolicyData = leaveResponse.data; if (leavePolicyData) {setLeavePolicy({ casual_leave: Number(leavePolicyData.casual_leave || 1), sick_leave: Number(leavePolicyData.sick_leave || 1), paid_leave: Number(leavePolicyData.paid_leave || 1), comp_off: Number(leavePolicyData.comp_off || 0) });} }
      } catch (err) { setEmployees([]); } finally { setLoadingEmps(false); }
    })();
  }, [schoolCode]);

  const selectedEmp = employees.find(e => e.teacher_id === selectedId);
  const wDays = empConfig.mode === 'fixed' ? empConfig.fixedCfg.working_days : empConfig.corpCfg.working_days;

  const fetchAttForEmp = async () => {
    if (!selectedEmp) {return;}
    setEmpConfig(c => ({ ...c, loadingAtt: true, attFetched: false, result: null }));
    const mi = MONTHS.indexOf(month);
    const startDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, mi + 1, 0);
    const endDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    try {
      const response = await API.get(
        `accountant/payroll/attendance?school_code=${encodeURIComponent(schoolCode)}&teacher_id=${encodeURIComponent(selectedId!)}&start_date=${startDateStr}&end_date=${endDateStr}&working_days=${wDays}`,
      );
      const data = response.data;
      let att: Attendance;
      if (Array.isArray(data)) {
        const raw = data.find(a =>
          a.teacher_id === selectedId ||
          a.employee_id === selectedEmp.employee_id,
        );
        att = raw
          ? mapAttendanceFromBackend(raw, selectedId!, wDays)
          : emptyAttendance(selectedId!, wDays);
      } else {
        att = emptyAttendance(selectedId!, wDays);
      }
      const breakdown = await fetchLeaveBreakdown(schoolCode, selectedEmp.employee_id, mi, year);
      att.leave_breakdown = breakdown;
      setEmpConfig(c => ({ ...c, att, attFetched: true, loadingAtt: false }));
    } catch (err) {
      setEmpConfig(c => ({ ...c, attFetched: true, loadingAtt: false }));
      Alert.alert('Error', 'Failed to fetch attendance data');
    }
  };

  const handleSendSingleEmail = async () => {
    if (!empConfig.result) { Alert.alert('Info', 'Please generate payroll first.'); return; }
    setSendingEmail(true);
    try {
      const record = { teacher_id: selectedEmp!.teacher_id, teacher_name: selectedEmp!.teacher_full_name, email: selectedEmp!.email_id, present_days: empConfig.att?.present_days || 0, absent_days: empConfig.att?.absent_days || 0, lop_days: empConfig.result.lop_days, lop_deduction: empConfig.result.lop_deduction, gross_salary: empConfig.result.gross, net_salary: empConfig.result.net, total_deductions: empConfig.result.total_deductions, mode: empConfig.mode };
      const response = await API.post('accountant/payroll/send-email-single', { school_code: schoolCode, pay_month: month, pay_year: year, company_name: companyName, record: record });
      const data = response.data;
      if (data.success) {Alert.alert('Success', `✅ Payslip sent to ${selectedEmp!.teacher_full_name}!`);}
      else {Alert.alert('Error', 'Failed to send email.');}
    } catch (err) { Alert.alert('Error', 'Error sending email.'); } finally { setSendingEmail(false); }
  };

  const generate = () => {
    if (!selectedEmp || !empConfig.att) {return;}
    const result = empConfig.mode === 'fixed' ? calcFixed(selectedEmp, empConfig.att, empConfig.fixedCfg, leavePolicy) : calcCorporate(selectedEmp, empConfig.att, empConfig.corpCfg, leavePolicy);
    setEmpConfig(c => ({ ...c, result }));
  };

  return (
    <ScrollView
      style={styles.tabContainer}
      contentContainerStyle={[
        innerPageLayoutStyles.scrollPageContent,
        { paddingBottom: Math.max(insets.bottom + 120, 140) },
      ]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {pageChrome}
      <View style={innerPageLayoutStyles.scrollBody}>
      <View style={styles.card}>
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeaderText}>Select Staff Member & Period</Text>
          <View style={styles.configGrid}>
            <Field label="Month" width="48%">
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerTrigger}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Month',
                  options: MONTHS.map(m => ({ label: m, value: m })),
                  selectedValue: month,
                  onValueChange: setMonth,
                })}
              >
                <Text style={styles.pickerTriggerText}>{month}</Text>
                <ChevronDown size={18} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </Field>
            <Field label="Year" width="48%">
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerTrigger}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Year',
                  options: years.map(y => ({ label: String(y), value: y })),
                  selectedValue: year,
                  onValueChange: (v) => setYear(Number(v)),
                })}
              >
                <Text style={styles.pickerTriggerText}>{year}</Text>
                <ChevronDown size={18} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </Field>
            <Field label="Staff Member" hint="Select to configure" width="100%">
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerTrigger}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Staff Member',
                  options: employees.map(e => ({ label: `${e.teacher_full_name} (${e.employee_id})`, value: e.teacher_id })),
                  selectedValue: selectedId,
                  onValueChange: (v) => { setSelectedId(v); setEmpConfig({ mode: 'fixed', fixedCfg: DEFAULT_FIXED, corpCfg: DEFAULT_CORP, result: null, attFetched: false, att: null, loadingAtt: false }); },
                })}
              >
                <Text style={styles.pickerTriggerText} numberOfLines={1}>
                  {selectedEmp ? `${selectedEmp.teacher_full_name}` : '— Select staff —'}
                </Text>
                <ChevronDown size={18} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </Field>
            <Field label="Working Days" width="100%">
              <TextInput
                style={styles.input}
                value={String(wDays)}
                onChangeText={(text) => {
                  const v = Number(text) || 26;
                  if (empConfig.mode === 'fixed') {setEmpConfig(c => ({ ...c, fixedCfg: { ...c.fixedCfg, working_days: v } }));}
                  else {setEmpConfig(c => ({ ...c, corpCfg: { ...c.corpCfg, working_days: v } }));}
                }}
                keyboardType="numeric"
              />
            </Field>
          </View>
        </View>
      </View>
      {selectedEmp && (
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <View style={styles.employeeHeader}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{selectedEmp.teacher_full_name?.charAt(0) || 'T'}</Text>
              </View>
              <View>
                <Text style={styles.employeeNameLarge}>{selectedEmp.teacher_full_name}</Text>
                <Text style={styles.employeeDetailsText}>{selectedEmp.employee_id} · {selectedEmp.designation} · Salary: ₹{fmt(selectedEmp.salary_amount || 0)}/month</Text>
              </View>
            </View>
            <View style={styles.modeSection}>
              <Text style={styles.sectionHeaderText}>Payroll Type</Text>
              <PayrollTypeToggle mode={empConfig.mode} onChange={m => setEmpConfig(c => ({ ...c, mode: m, result: null, attFetched: false }))} />
            </View>
            {empConfig.mode === 'corporate' && <CorporateConfigForm cfg={empConfig.corpCfg} onChange={c => setEmpConfig(prev => ({ ...prev, corpCfg: c, result: null }))} />}
            {empConfig.mode === 'fixed' && (
              <View style={styles.fixedInfoBox}>
                <Info size={16} color={Theme.colors.blue} />
                <Text style={[styles.fixedInfoText, { flex: 1 }]}>Net = Basic − (LOP days × Per-day rate). No allowances or PF.</Text>
              </View>
            )}
            <View style={styles.fetchRow}>
              {isPeriodInFuture(month, year) ? (
                <View style={styles.warningBox}>
                  <AlertTriangle size={16} color="#f97316" />
                  <Text style={[styles.warningText, { flex: 1 }]}>Cannot generate payroll for future period</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity accessibilityRole="button" style={styles.fetchButton} onPress={fetchAttForEmp} disabled={empConfig.loadingAtt}>
                    {empConfig.loadingAtt ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text style={styles.fetchButtonText}>Fetch {month} {year} Attendance</Text>}
                  </TouchableOpacity>
                  {empConfig.attFetched && (
                    <>
                      <View style={styles.attLoadedBadge}>
                        <Text style={styles.attLoadedText}>✓ Present: {empConfig.att?.present_days ?? 0} · LOP: {empConfig.att?.lop_days ?? empConfig.att?.absent_days ?? 0} · Work days: {empConfig.att?.applicable_working_days ?? wDays}</Text>
                      </View>
                      <TouchableOpacity accessibilityRole="button" style={styles.generateButton} onPress={generate}>
                        <Text style={styles.generateButtonText}>{empConfig.result ? 'Recalculate' : 'Generate Payroll'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
            {empConfig.result && (
              <>
                <View style={styles.resultSummary}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Gross</Text>
                    <Text style={styles.resultValue}>₹{fmt(empConfig.result.gross)}</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Deductions</Text>
                    <Text style={[styles.resultValue, styles.resultValueRed]}>–₹{fmt(empConfig.result.total_deductions)}</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Net Pay</Text>
                    <Text style={[styles.resultValue, styles.resultValueGreen]}>₹{fmt(empConfig.result.net)}</Text>
                  </View>
                </View>
                <View style={styles.actionButtonsGroup}>
                  <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.viewBtn]} onPress={() => setOpenPayslip(empConfig.result!)}>
                    <Text style={styles.actionBtn}>View Payslip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.pdfBtn]} onPress={async () => { setDownloadingId(selectedId); try { await generatePayslipPDF(empConfig.result!, month, String(year), schoolCode, true, companyName); } catch { Alert.alert('Error', 'PDF download failed.'); } finally { setDownloadingId(null); } }} disabled={downloadingId === selectedId}>
                    {downloadingId === selectedId ? <ActivityIndicator size="small" color={Theme.colors.card} /> : <Text style={styles.actionBtn}>Download PDF</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.emailBtn]} onPress={handleSendSingleEmail} disabled={sendingEmail}>
                    {sendingEmail ? <ActivityIndicator size="small" color={Theme.colors.card} /> : <Text style={styles.actionBtn}>Send Mail</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
      {!selectedId && employees.length > 0 && (<View style={styles.emptyStateLarge}><Text style={styles.emptyStateLargeText}>Select a staff member to generate their payslip</Text></View>)}
      {loadingEmps && (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4f46e5" /><Text style={styles.loadingText}>Loading staff…</Text></View>)}
      {openPayslip && <PayslipModal result={openPayslip} month={month} year={String(year)} companyName={companyName} schoolCode={schoolCode} onClose={() => setOpenPayslip(null)} />}
      {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}
      </View>
    </ScrollView>
  );
};

// ==================== HOURS-BASED PAYROLL TAB ====================

const HoursBasedPayrollTab: React.FC<{ schoolCode: string; companyName: string; pageChrome?: React.ReactNode }> = ({ schoolCode, companyName, pageChrome }) => {
  const insets = useSafeAreaInsets();
  const handleScroll = useScrollTabBar();
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const [employees, setEmployees] = useState<HourlyEmployee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [globalRate, setGlobalRate] = useState(0);
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; options: { label: string; value: any }[]; selectedValue: any; onValueChange: (value: any) => void } | null>(null);

  useEffect(() => {
    if (!schoolCode) { setEmployees([]); return; }
    setLoadingEmps(true);
    (async () => {
      try {
        const branchId = await storage.getString(StorageKeys.BRANCH_ID) || await storage.getString(StorageKeys.BRANCH_ID) || '';
        const empData = await principalService.getPrincipalTeachers({
          'school-code': schoolCode,
          ...(branchId ? { 'branch-id': branchId } : {}),
        });

        const mappedEmps = empData.filter(e => (e.employment_type || '').toLowerCase().includes('part')).map(t => ({
          ...t,
          id: t.teacher_id || t.id,
          teacher_full_name: t.teacher_full_name || t.name || t.full_name,
          teacher_id: t.teacher_id || t.id,
          employee_id: t.employee_id || t.id,
          totalHours: 0,
          attFetched: false,
          loadingAtt: false,
          hourlyRate: t.hourly_rate || 0,
          gross: null,
          net: null,
        }));
        setEmployees(mappedEmps);
      } catch (err) { setEmployees([]); } finally { setLoadingEmps(false); }
    })();
  }, [schoolCode, month, year]);

  const applyGlobalRate = () => { setEmployees(prev => prev.map(e => ({ ...e, hourlyRate: globalRate, gross: e.attFetched ? e.totalHours * globalRate : null, net: e.attFetched ? e.totalHours * globalRate : null }))); };

  const fetchAttForEmp = async (empId: string) => {
    setEmployees(prev => prev.map(e => e.teacher_id === empId ? { ...e, loadingAtt: true } : e));
    const mi = MONTHS.indexOf(month);
    const startDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, mi + 1, 0);
    const endDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${endDate.getDate()}`;
    try {
      const response = await API.get(`accountant/payroll/attendance?school_code=${encodeURIComponent(schoolCode)}&start_date=${startDateStr}&end_date=${endDateStr}`);
      const data = response.data;
      const att = Array.isArray(data) ? data.find(a => a.teacher_id === empId) : null;
      const totalHours = att ? (att.present_days || 0) * 8 : 0;
      setEmployees(prev => prev.map(e => { if (e.teacher_id !== empId) {return e;} const gross = totalHours * e.hourlyRate; return { ...e, totalHours, attFetched: true, loadingAtt: false, gross, net: gross }; }));
    } catch { setEmployees(prev => prev.map(e => e.teacher_id === empId ? { ...e, loadingAtt: false } : e)); }
  };

  const generatedCount = employees.filter(e => e.gross !== null).length;
  const totalNet = employees.reduce((s, e) => s + (e.net ?? 0), 0);
  const totalHoursAll = employees.reduce((s, e) => s + e.totalHours, 0);

  return (
    <ScrollView
      style={styles.tabContainer}
      contentContainerStyle={[
        innerPageLayoutStyles.scrollPageContent,
        { paddingBottom: Math.max(insets.bottom + 120, 140) },
      ]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {pageChrome}
      <View style={innerPageLayoutStyles.scrollBody}>
      <View style={styles.infoBanner}><Text style={styles.infoBannerText}>⏰ Hours-Based Payroll — Only Part-Time staff appear here. Attendance is estimated at 8 hours/present day for the selected period.</Text></View>
      <View style={styles.card}>
        <View style={styles.cardSection}>
          <View style={styles.configGrid}>
            <Field label="Month" width="48%">
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerTrigger}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Month',
                  options: MONTHS.map(m => ({ label: m, value: m })),
                  selectedValue: month,
                  onValueChange: setMonth,
                })}
              >
                <Text style={styles.pickerTriggerText}>{month}</Text>
                <ChevronDown size={18} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </Field>
            <Field label="Year" width="48%">
              <TouchableOpacity accessibilityRole="button"
                style={styles.pickerTrigger}
                onPress={() => setPickerModal({
                  visible: true,
                  title: 'Select Year',
                  options: years.map(y => ({ label: String(y), value: y })),
                  selectedValue: year,
                  onValueChange: (v) => setYear(Number(v)),
                })}
              >
                <Text style={styles.pickerTriggerText}>{year}</Text>
                <ChevronDown size={18} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </Field>
            <Field label="Rate per Hour (₹)" width="100%">
              <View style={styles.applyRateRow}>
                <View style={{ flex: 1 }}><RupeeInput value={globalRate} onChange={setGlobalRate} /></View>
                <TouchableOpacity accessibilityRole="button" style={[styles.applyButton, !globalRate && styles.applyButtonDisabled]} onPress={applyGlobalRate} disabled={!globalRate}>
                  <Text style={styles.applyButtonText}>Apply to All</Text>
                </TouchableOpacity>
              </View>
            </Field>
          </View>
        </View>
      </View>
      {generatedCount > 0 && (<View style={styles.summaryBarHours}><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Part-Time Staff</Text><Text style={styles.summaryValueLarge}>{generatedCount}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Est. Total Hours</Text><Text style={styles.summaryValueLarge}>{totalHoursAll.toFixed(1)}h</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Net Payable</Text><Text style={[styles.summaryValueLarge, styles.summaryValueGreen]}>₹{fmt(totalNet)}</Text></View></View>)}
      {employees.length > 0 ? (
        <View style={styles.hoursListContainer}>
          <View style={styles.hoursHeader}>
            <Text style={styles.hoursHeaderTitle}>Part-Time Staff — {month} {year}</Text>
            <Text style={styles.hoursHeaderCount}>{employees.length} staff member(s)</Text>
          </View>
          {employees.map((emp, index) => {
            const itemKey = emp.teacher_id || emp.employee_id || (emp as any).id || (emp as any)._id || `emp-${index}`;
            return (
              <View key={itemKey} style={[styles.hoursRow, emp.gross !== null && styles.hoursRowGenerated]}>
                <View style={styles.hoursHeaderRow}>
                  <View style={styles.hoursAvatar}>
                    <Text style={styles.hoursAvatarText}>{(emp.teacher_full_name || 'T').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.hoursInfo}>
                    <Text style={styles.hoursName}>{emp.teacher_full_name}</Text>
                    <Text style={styles.hoursId}>{emp.employee_id || 'Part-Time'}</Text>
                  </View>
                  {emp.gross !== null && (
                    <View style={styles.hoursGross}>
                      <Text style={styles.hoursGross}>₹{fmt(emp.gross)}</Text>
                      <Text style={styles.hoursGrossDetail}>{emp.totalHours.toFixed(1)}h × ₹{fmt(emp.hourlyRate)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.hoursBodyRow}>
                  <View style={styles.hoursRateCol}>
                    <Text style={styles.hoursRateLabel}>Rate / Hour</Text>
                    <RupeeInput
                      value={emp.hourlyRate}
                      onChange={(rate) => setEmployees(prev => prev.map(e2 => e2.teacher_id === emp.teacher_id ? { ...e2, hourlyRate: rate, gross: e2.attFetched ? e2.totalHours * rate : null, net: e2.attFetched ? e2.totalHours * rate : null } : e2))}
                    />
                  </View>

                  <View style={styles.hoursStatusCol}>
                    <Text style={styles.hoursRateLabel}>Hours Worked</Text>
                    {emp.attFetched ? (
                      <View style={styles.hoursBadge}>
                        <Text style={styles.hoursBadgeText}>{emp.totalHours.toFixed(1)}h</Text>
                      </View>
                    ) : (
                      <TouchableOpacity accessibilityRole="button"
                        style={styles.fetchHoursButton}
                        onPress={() => fetchAttForEmp(emp.teacher_id)}
                        disabled={emp.loadingAtt}
                      >
                        {emp.loadingAtt ? <ActivityIndicator size="small" color={Theme.colors.primary} /> : <Text style={styles.fetchHoursButton}>Fetch Hours</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyStateLarge}>
          <Text style={styles.emptyStateLargeText}>No Part-Time staff found</Text>
          <Text style={styles.emptyStateSubtext}>Staff with "Part-Time" employment type appear here</Text>
        </View>
      )}
      {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}
      </View>
    </ScrollView>
  );
};

// ==================== MAIN SCREEN ====================

export default function PayrollScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('bulk');
  const [schoolCode, setSchoolCode] = useState('');
  const [companyName, setCompanyName] = useState('School');
  const isTabRoot = route.name === 'Payroll';

  useEffect(() => {
    (async () => {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) || await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(code);
      const name = await AsyncStorage.getItem('company_name') || await AsyncStorage.getItem('school_name') || 'School';
      setCompanyName(name);
    })();
  }, []);

  const tabs = [
    { key: 'bulk', label: 'Bulk', desc: 'All staff · same payroll type' },
    { key: 'individual', label: 'Individual', desc: 'One staff member at a time' },
    { key: 'hours', label: 'Hours', desc: 'Part-Time · paid per hour' },
  ];

  const pageChrome = (
    <>
      <StandardPageHeader
        scrollWithContent
        title="Staff Payroll"
        subtitle="Calculate and manage salaries"
        onBackPress={() => navigation.goBack()}
        showBack={!isTabRoot}
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              {tab.key === 'bulk' && <Users size={16} color={isActive ? Theme.colors.primary : Theme.colors.textSec} />}
              {tab.key === 'individual' && <User size={16} color={isActive ? Theme.colors.primary : Theme.colors.textSec} />}
              {tab.key === 'hours' && <Clock size={16} color={isActive ? Theme.colors.primary : Theme.colors.textSec} />}
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.mainContainer}>
      <View style={styles.tabContentArea}>
        {activeTab === 'bulk' && <BulkPayrollTab schoolCode={schoolCode} companyName={companyName} pageChrome={pageChrome} />}
        {activeTab === 'individual' && <IndividualPayrollTab schoolCode={schoolCode} companyName={companyName} pageChrome={pageChrome} />}
        {activeTab === 'hours' && <HoursBasedPayrollTab schoolCode={schoolCode} companyName={companyName} pageChrome={pageChrome} />}
      </View>
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Theme.colors.background },
  tabsScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
    backgroundColor: Theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minWidth: 108,
  },
  tabActive: {
    backgroundColor: Theme.colors.card,
    borderColor: Theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  tabLabelActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  tabDesc: { display: 'none' },
  tabDescActive: { display: 'none' },
  tabContentArea: {
    flex: 1,
    minHeight: 0,
  },
  awaitingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  awaitingTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  awaitingDesc: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    textAlign: 'center',
    lineHeight: 18,
  },
  tabContainer: { flex: 1, backgroundColor: Theme.colors.background },
  card: { backgroundColor: Theme.colors.card, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.borderLight },
  sectionHeaderText: { ...Theme.typography.label, fontWeight: 'bold', color: Theme.colors.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  configGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, marginBottom: Theme.spacing.md },
  fieldContainer: { minWidth: 100 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: Theme.colors.textSec, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHint: { fontSize: 9, color: '#94a3b8', marginTop: Theme.spacing.xs },
  pickerContainer: { borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, backgroundColor: Theme.colors.background },
  pickerContainerSmall: { borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, backgroundColor: Theme.colors.background, minWidth: 120 },
  picker: { height: 48 },
  input: { borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 12, height: 44, color: Theme.colors.text, backgroundColor: Theme.colors.background },
  pctInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, backgroundColor: Theme.colors.background, paddingHorizontal: 10 },
  pctInput: { flex: 1, height: 44, color: Theme.colors.text },
  pctInputSymbol: { color: Theme.colors.textSec, fontWeight: '700' },
  rupeeInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, backgroundColor: Theme.colors.background, paddingHorizontal: 10 },
  rupeeInputSymbol: { color: Theme.colors.textSec, marginRight: Theme.spacing.xs, fontWeight: '700' },
  rupeeInput: { flex: 1, height: 44, color: Theme.colors.text },
  toggleContainer: { flexDirection: 'column', gap: 12, marginTop: Theme.spacing.sm },
  toggleOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Theme.colors.border, borderRadius: 16, padding: Theme.spacing.md, backgroundColor: Theme.colors.background },
  toggleOptionActive: { borderColor: Theme.colors.primary, backgroundColor: '#f8faff' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.colors.primary },
  toggleTextContainer: { flex: 1 },
  toggleOptionTitle: { ...Theme.typography.body, fontWeight: '700', color: '#334155' },
  toggleOptionTitleActive: { color: Theme.colors.primary },
  toggleOptionDesc: { marginTop: 2, color: Theme.colors.textSec, ...Theme.typography.label },
  toggleOptionDescActive: { color: Theme.colors.blue },
  configForm: { gap: 4 },
  divider: { height: 1, backgroundColor: Theme.colors.background, marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { ...Theme.typography.caption, fontWeight: '700', color: Theme.colors.textSec, textTransform: 'uppercase', letterSpacing: 0.5 },
  addButton: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addButtonRed: { backgroundColor: '#fff5f5', borderColor: '#feb2b2' },
  addButtonTextRed: { color: '#c53030' },
  allowancesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: Theme.spacing.sm },
  deductionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: Theme.spacing.sm },
  extraItemContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Theme.spacing.sm, backgroundColor: Theme.colors.background, borderRadius: 12, padding: Theme.spacing.sm, borderWidth: 1, borderColor: Theme.colors.border },
  extraItemContainerRed: { backgroundColor: '#fff5f5', borderColor: '#feb2b2' },
  extraItemInput: { flex: 1, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 10, height: 42, backgroundColor: Theme.colors.background },
  removeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2' },
  removeButtonText: { color: Theme.colors.error, ...Theme.typography.h3, lineHeight: 18 },
  previewContainer: { marginTop: 20, borderRadius: 20, backgroundColor: Theme.colors.background, borderWidth: 1.5, borderColor: Theme.colors.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  previewHeader: { backgroundColor: Theme.colors.primary, paddingVertical: 12, paddingHorizontal: Theme.spacing.md },
  previewHeaderTitle: { color: Theme.colors.card, ...Theme.typography.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewContent: { padding: Theme.spacing.md },
  previewRow: { flexDirection: 'column', gap: 16 },
  previewColumn: { width: '100%' },
  previewSubtitle: { ...Theme.typography.label, fontWeight: '700', marginBottom: Theme.spacing.sm, color: Theme.colors.textSec, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Theme.spacing.xs },
  previewLabel: { color: Theme.colors.textSec, ...Theme.typography.caption },
  previewValue: { color: Theme.colors.text, ...Theme.typography.caption, fontWeight: '600' },
  previewValueRed: { color: '#b91c1c' },
  previewValueGreen: { color: '#166534' },
  previewColDivider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 4 },
  previewTotalLine: { backgroundColor: Theme.colors.background, borderRadius: 8, padding: Theme.spacing.sm, marginTop: Theme.spacing.sm, borderWidth: 1, borderColor: Theme.colors.border },
  previewTotalLabel: { color: Theme.colors.textSec, fontWeight: '700' },
  previewTotalValue: { color: Theme.colors.text, ...Theme.typography.body, fontWeight: '800', marginTop: 2 },
  previewTotalValueGreen: { color: '#16a34a' },
  modalContainer: { flex: 1, backgroundColor: Theme.colors.background },
  payslipHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.card,
  },
  payslipFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
  },
  payslipDownloadBtn: { width: '100%', height: 48, alignItems: 'center', justifyContent: 'center' },
  modalHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  modalSubtitle: { ...Theme.typography.caption, color: Theme.colors.textSec, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalButton: { borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, height: 38, justifyContent: 'center', backgroundColor: Theme.colors.background },
  modalButtonPrimary: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  modalButtonText: { color: Theme.colors.card, ...Theme.typography.caption, fontWeight: '700' },
  modalButtonTextClose: { color: '#334155', ...Theme.typography.caption, fontWeight: '600' },
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  warningBox: { marginTop: 10, backgroundColor: '#fff7ed', borderColor: '#fdba74', borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningText: { color: '#c2410c', ...Theme.typography.caption },
  loadingRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: Theme.colors.textSec, ...Theme.typography.caption },
  loadingContainer: { padding: 22, alignItems: 'center', justifyContent: 'center', gap: 8 },
  staffBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#ecfeff', borderColor: '#a5f3fc', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  staffBadgeText: { color: '#0891b2', ...Theme.typography.caption, fontWeight: '600' },
  modeSection: { marginTop: 10 },
  fixedInfoBox: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixedInfoText: { color: Theme.colors.primary, ...Theme.typography.caption, fontWeight: '600' },
  fixedInfoSubtext: { color: Theme.colors.blue, ...Theme.typography.label, marginTop: Theme.spacing.xs },
  fetchRow: { gap: 10, marginTop: 12 },
  fetchButton: { backgroundColor: Theme.colors.primary, borderRadius: 12, paddingHorizontal: Theme.spacing.md, minHeight: 44, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  fetchButtonDisabled: { opacity: 0.5 },
  fetchButtonText: { color: Theme.colors.card, fontWeight: '700', fontSize: 13 },
  viewAttButton: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: Theme.spacing.md, minHeight: 44, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  viewAttButtonText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  attLoadedBadge: { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  attLoadedText: { color: '#166534', ...Theme.typography.label, fontWeight: '600' },
  attSummaryContainer: { marginTop: 12, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, backgroundColor: '#f8fbff', padding: 10 },
  attSummaryHeaderRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#dbeafe', paddingBottom: 8, marginBottom: 4 },
  attSummaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eff6ff' },
  attSummaryHeaderCell: { width: 52, textAlign: 'center', fontSize: 9, fontWeight: '700', color: '#1e3a8a', textTransform: 'uppercase' },
  attSummaryCell: { width: 52, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Theme.colors.text },
  attSummaryNameCol: { width: 120, paddingRight: 8 },
  attSummaryLopCol: { backgroundColor: '#f3e8ff' },
  attSummaryName: { fontSize: 12, fontWeight: '700', color: Theme.colors.text },
  attSummaryId: { fontSize: 10, color: Theme.colors.textSec, marginTop: 2 },
  attSummaryPresent: { color: '#166534', fontWeight: '700' },
  attSummaryLop: { color: '#7e22ce', fontWeight: '800' },
  attSummaryPct: { fontWeight: '700', fontSize: 11 },
  attPctGreen: { color: '#166534' },
  attPctYellow: { color: '#a16207' },
  attPctRed: { color: '#b91c1c' },
  attSummaryFootnote: { marginTop: 8, textAlign: 'center', fontSize: 11, color: Theme.colors.textSec },
  generatePrompt: {
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    borderRadius: 16,
    padding: Theme.spacing.md,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  generatePromptCopy: {
    flex: 1,
  },
  generatePromptTitle: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text },
  generatePromptDesc: { color: Theme.colors.textSec, ...Theme.typography.caption, marginTop: 2 },
  generateButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  generateButtonText: { color: Theme.colors.card, fontWeight: '700', fontSize: 14 },
  resultsContainer: { backgroundColor: Theme.colors.card, borderRadius: 16, borderWidth: 1, borderColor: Theme.colors.border, padding: Theme.spacing.md, marginBottom: 16 },
  summaryBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Theme.spacing.md },
  summaryBarHours: { flexDirection: 'row', gap: 10, marginBottom: Theme.spacing.md, flexWrap: 'wrap' },
  summaryItem: { backgroundColor: Theme.colors.backgroundAlt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Theme.colors.border, flexBasis: '47%', flexGrow: 1 },
  summaryLabel: { color: Theme.colors.textSec, ...Theme.typography.label, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '700', marginTop: Theme.spacing.xs },
  summaryValueLarge: { color: Theme.colors.text, fontSize: 16, fontWeight: '800', marginTop: Theme.spacing.xs },
  summaryValueRed: { color: '#b91c1c' },
  summaryValueGreen: { color: '#166534' },
  actionBar: { gap: 10, marginBottom: 4 },
  searchInput: { width: '100%', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, minHeight: 44, paddingHorizontal: 14, backgroundColor: Theme.colors.background, color: Theme.colors.text },
  actionButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  generateAllButton: { flexGrow: 1, flexBasis: '47%', backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  generateAllButtonText: { ...Theme.typography.caption, color: Theme.colors.primary, fontWeight: '700', textAlign: 'center' },
  saveAllButton: { flexGrow: 1, flexBasis: '47%', backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  saveAllButtonText: { ...Theme.typography.caption, color: Theme.colors.card, fontWeight: '700', textAlign: 'center' },
  emailAllButton: { flexGrow: 1, flexBasis: '47%', backgroundColor: '#0284c7', borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  emailAllButtonText: { ...Theme.typography.caption, color: Theme.colors.card, fontWeight: '700', textAlign: 'center' },
  employeeCard: { borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 16, backgroundColor: Theme.colors.card, padding: Theme.spacing.md, marginBottom: Theme.spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  employeeCardGenerated: { borderColor: Theme.colors.primary, backgroundColor: '#f8faff', borderWidth: 1.5 },
  employeeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  employeeTextBlock: { flex: 1, minWidth: 0 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Theme.typography.body, color: Theme.colors.card, fontWeight: '700' },
  employeeNameText: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text, flexShrink: 1 },
  employeeIdText: { color: Theme.colors.textSec, ...Theme.typography.label, marginTop: 2, flexShrink: 1 },
  employeeStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statItem: { backgroundColor: Theme.colors.backgroundAlt, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: Theme.spacing.sm, flexBasis: '47%', flexGrow: 1 },
  statLabel: { color: Theme.colors.textSec, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { ...Theme.typography.caption, color: Theme.colors.text, fontWeight: '700', marginTop: 2 },
  statValueBold: { fontWeight: '800' },
  statValueRed: { color: '#b91c1c' },
  statValueGreen: { color: '#166534' },
  employeeActionsRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  generateEmpButton: { backgroundColor: Theme.colors.primary, borderRadius: 12, paddingHorizontal: Theme.spacing.lg, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  generateEmpButtonText: { ...Theme.typography.caption, color: Theme.colors.card, fontWeight: '700' },
  actionButtonsGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  actionBtn: { borderRadius: 12, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', alignItems: 'center', minWidth: 64 },
  actionBtnText: { ...Theme.typography.caption, color: Theme.colors.primary, fontWeight: '700' },
  actionBtnTextLight: { color: Theme.colors.card },
  viewBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  pdfBtn: { backgroundColor: Theme.colors.primary },
  recalcBtn: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: '#cbd5e1' },
  emailBtn: { backgroundColor: '#0284c7' },
  recalcBtnText: { ...Theme.typography.body, color: '#334155', fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyStateText: { color: Theme.colors.textSec },
  emptyStateLarge: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 16 },
  emptyStateLargeText: { color: Theme.colors.text, fontWeight: '600' },
  emptyStateSubtext: { color: Theme.colors.textSec, marginTop: Theme.spacing.xs, ...Theme.typography.caption },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarLarge: { width: 48, height: 48, borderRadius: 24, backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: Theme.colors.card, ...Theme.typography.h3 },
  employeeNameLarge: { fontWeight: '700', color: Theme.colors.text, fontSize: 16 },
  employeeDetailsText: { color: Theme.colors.textSec, marginTop: 2, ...Theme.typography.caption },
  resultSummary: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  resultItem: { flex: 1, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, padding: 12, backgroundColor: Theme.colors.background, minWidth: 90 },
  resultLabel: { color: Theme.colors.textSec, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultValue: { color: Theme.colors.text, fontWeight: '700', marginTop: Theme.spacing.xs },
  resultValueRed: { color: '#b91c1c' },
  resultValueGreen: { color: '#166534' },
  infoBanner: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, marginBottom: Theme.spacing.md },
  infoBannerText: { color: Theme.colors.primary, ...Theme.typography.caption, lineHeight: 16 },
  hoursConfigRow: { display: 'none' },
  applyRateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyButton: { backgroundColor: Theme.colors.primary, borderRadius: 10, paddingHorizontal: Theme.spacing.md, height: 44, justifyContent: 'center' },
  applyButtonDisabled: { opacity: 0.5 },
  applyButtonText: { ...Theme.typography.caption, color: Theme.colors.card, fontWeight: '700' },
  hoursListContainer: { gap: 12, marginBottom: 20 },
  hoursHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Theme.spacing.sm, paddingHorizontal: Theme.spacing.xs },
  hoursHeaderTitle: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text },
  hoursHeaderCount: { color: Theme.colors.textSec, ...Theme.typography.caption },
  hoursRow: {
    backgroundColor: Theme.colors.background,
    borderRadius: 20,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  hoursRowGenerated: { backgroundColor: '#f8faff', borderColor: '#bfdbfe' },
  hoursAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  hoursAvatarText: { ...Theme.typography.body, color: Theme.colors.card, fontWeight: '700' },
  hoursInfo: { flex: 1, marginLeft: Theme.spacing.sm },
  hoursName: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },
  hoursId: { color: Theme.colors.textSec, ...Theme.typography.label, marginTop: 2 },
  hoursRateContainer: { display: 'none' },
  hoursTotal: { display: 'none' },
  fetchHoursButton: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, height: 36, justifyContent: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  hoursGross: { alignItems: 'flex-end' },
  hoursGrossDetail: { color: Theme.colors.textSec, fontSize: 9, marginTop: 2 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: Theme.colors.background,
  },
  pickerTriggerText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  hoursHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
    paddingBottom: 12,
    marginBottom: 12,
  },
  hoursBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  hoursRateCol: {
    flex: 1.2,
  },
  hoursStatusCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hoursRateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSec,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hoursBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  hoursBadgeText: {
    color: Theme.colors.primary,
    ...Theme.typography.caption,
    fontWeight: '700',
  },
});
