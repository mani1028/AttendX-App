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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XCircle, CheckCircle2, ChevronDown } from 'lucide-react-native';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { ENV } from '../../config/api.config';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

// ==================== HELPER FUNCTIONS ====================

/**
 * Safe date formatting without relying on Intl API
 * Works around React Native Intl limitations
 */
const formatDateSafe = (date: Date | string, locale: string = 'en-IN'): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    
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
  'July', 'August', 'September', 'October', 'November', 'December'
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

interface Attendance {
  teacher_id: string;
  present_days: number;
  absent_days: number;
  late_days: number;
  paid_leave_days: number;
  total_days: number;
  attendance_percentage: number;
}

interface PayrollResult {
  employee: Employee;
  present_days: number;
  absent_days: number;
  late_days: number;
  paid_leave_used: number;
  lop_days: number;
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

// ==================== CALCULATORS ====================

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

const useTabBarScrollVisibility = () => {
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  return useCallback((event: any) => {
    const currentScrollY = event?.nativeEvent?.contentOffset?.y ?? 0;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }

    lastScrollY.current = currentScrollY;
  }, [setTabBarVisible]);
};

// ==================== CALCULATORS ====================

function calcFixed(emp: Employee, att: Attendance, cfg: FixedConfig, leavePolicy: LeavePolicy): PayrollResult {
  const basic = Number(emp.salary_amount) || 0;
  const perDay = cfg.working_days > 0 ? basic / cfg.working_days : 0;
  const lop_days = att.absent_days || 0;
  const paid_leave_used = att.paid_leave_days || 0;
  const lop_deduction = perDay * lop_days;
  const net = Math.max(0, basic - lop_deduction);
  
  return {
    employee: emp,
    present_days: att.present_days,
    absent_days: lop_days,
    late_days: att.late_days || 0,
    paid_leave_used,
    lop_days,
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
    cfg: cfg as any
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
  
  const lop_days = att.absent_days || 0;
  const paid_leave_used = att.paid_leave_days || 0;
  const perDayGross = cfg.working_days > 0 ? gross / cfg.working_days : 0;
  const lop_deduction = perDayGross * lop_days;
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
    cfg
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
      pf: result.pf, esi: result.esi,
      professional_tax: result.professional_tax,
      other_deduction: result.other_deduction,
      total_deductions: result.total_deductions,
      net: result.net, cfg: result.cfg,
    },
  });
  const data = response.data;
  if (!data.success) throw new Error(data.message || 'PDF generation failed');

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

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <View style={styles.fieldContainer}>
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
    <TouchableOpacity style={[styles.toggleOption, mode === 'fixed' && styles.toggleOptionActive]} onPress={() => onChange('fixed')}>
      <Text style={[styles.toggleOptionTitle, mode === 'fixed' && styles.toggleOptionTitleActive]}>Fixed Payroll</Text>
      <Text style={[styles.toggleOptionDesc, mode === 'fixed' && styles.toggleOptionDescActive]}>Basic pay only. LOP for absences.</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.toggleOption, mode === 'corporate' && styles.toggleOptionActive]} onPress={() => onChange('corporate')}>
      <Text style={[styles.toggleOptionTitle, mode === 'corporate' && styles.toggleOptionTitleActive]}>Corporate Payroll</Text>
      <Text style={[styles.toggleOptionDesc, mode === 'corporate' && styles.toggleOptionDescActive]}>Full structure: HRA, DA, TA, PF, ESI.</Text>
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
    <ScrollView style={styles.configForm}>
      <Field label="Basic % of CTC"><PctInput value={cfg.basic_pct} onChange={(v) => onChange({ ...cfg, basic_pct: v })} /></Field>
      <View style={styles.divider} />
      <View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Allowances — % of CTC</Text><TouchableOpacity style={styles.addButton} onPress={() => onChange({ ...cfg, extra_allowances: [...extras, { id: uid(), label: 'Extra Allowance', pct: 0 }] })}><Text style={styles.addButtonText}>+ Add Allowance</Text></TouchableOpacity></View>
        <View style={styles.allowancesGrid}>
          <Field label="HRA %"><PctInput value={cfg.hra_pct} onChange={(v) => onChange({ ...cfg, hra_pct: v })} /></Field>
          <Field label="DA %"><PctInput value={cfg.da_pct} onChange={(v) => onChange({ ...cfg, da_pct: v })} /></Field>
          <Field label="TA %"><PctInput value={cfg.ta_pct} onChange={(v) => onChange({ ...cfg, ta_pct: v })} /></Field>
          <Field label="Other %"><PctInput value={cfg.other_allowance_pct} onChange={(v) => onChange({ ...cfg, other_allowance_pct: v })} /></Field>
        </View>
        {extras.map((ea) => (<View key={ea.id} style={styles.extraItemContainer}><TextInput style={styles.extraItemInput} value={ea.label} onChangeText={(text) => onChange({ ...cfg, extra_allowances: extras.map(a => a.id === ea.id ? { ...a, label: text } : a) })} placeholder="Allowance label" /><PctInput value={ea.pct} onChange={(v) => onChange({ ...cfg, extra_allowances: extras.map(a => a.id === ea.id ? { ...a, pct: v } : a) })} /><TouchableOpacity style={styles.removeButton} onPress={() => onChange({ ...cfg, extra_allowances: extras.filter(a => a.id !== ea.id) })}><Text style={styles.removeButtonText}>−</Text></TouchableOpacity></View>))}
      </View>
      <View style={styles.divider} />
      <View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Deductions</Text><TouchableOpacity style={[styles.addButton, styles.addButtonRed]} onPress={() => onChange({ ...cfg, extra_deductions: [...extraDeds, { id: uid(), label: 'Extra Deduction', pct: 0 }] })}><Text style={[styles.addButtonText, styles.addButtonTextRed]}>+ Add Deduction</Text></TouchableOpacity></View>
        <View style={styles.deductionsGrid}>
          <Field label="PF % of Basic"><PctInput value={cfg.pf_pct} onChange={(v) => onChange({ ...cfg, pf_pct: v })} /></Field>
          <Field label="ESI % of Basic"><PctInput value={cfg.esi_pct} onChange={(v) => onChange({ ...cfg, esi_pct: v })} /></Field>
          <Field label="Professional Tax ₹"><RupeeInput value={cfg.professional_tax} onChange={(v) => onChange({ ...cfg, professional_tax: v })} /></Field>
          <Field label="Other Ded %"><PctInput value={cfg.other_deduction_pct} onChange={(v) => onChange({ ...cfg, other_deduction_pct: v })} /></Field>
        </View>
        {extraDeds.map((ed) => (<View key={ed.id} style={[styles.extraItemContainer, styles.extraItemContainerRed]}><TextInput style={styles.extraItemInput} value={ed.label} onChangeText={(text) => onChange({ ...cfg, extra_deductions: extraDeds.map(d => d.id === ed.id ? { ...d, label: text } : d) })} placeholder="Deduction label" /><PctInput value={ed.pct} onChange={(v) => onChange({ ...cfg, extra_deductions: extraDeds.map(d => d.id === ed.id ? { ...d, pct: v } : d) })} /><TouchableOpacity style={styles.removeButton} onPress={() => onChange({ ...cfg, extra_deductions: extraDeds.filter(d => d.id !== ed.id) })}><Text style={styles.removeButtonText}>−</Text></TouchableOpacity></View>))}
      </View>
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Live Preview — ₹{fmt(sampleCTC)} CTC</Text>
        <View style={styles.previewRow}>
          <View style={styles.previewColumn}>
            <Text style={styles.previewSubtitle}>Earnings</Text>
            <View style={styles.previewLine}><Text style={styles.previewLabel}>Basic ({cfg.basic_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleBasic)}</Text></View>
            {cfg.hra_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>HRA ({cfg.hra_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.hra_pct / 100)}</Text></View>}
            {cfg.da_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>DA ({cfg.da_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.da_pct / 100)}</Text></View>}
            {cfg.ta_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>TA ({cfg.ta_pct}%)</Text><Text style={styles.previewValue}>₹{fmt(sampleCTC * cfg.ta_pct / 100)}</Text></View>}
            <View style={[styles.previewLine, styles.previewTotalLine]}><Text style={styles.previewTotalLabel}>Gross</Text><Text style={styles.previewTotalValue}>₹{fmt(sampleGross)}</Text></View>
          </View>
          <View style={styles.previewColumn}>
            <Text style={styles.previewSubtitle}>Deductions</Text>
            {cfg.pf_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>PF ({cfg.pf_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(samplePF)}</Text></View>}
            {cfg.esi_pct > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>ESI ({cfg.esi_pct}%)</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(sampleESI)}</Text></View>}
            {cfg.professional_tax > 0 && <View style={styles.previewLine}><Text style={styles.previewLabel}>Prof. Tax</Text><Text style={[styles.previewValue, styles.previewValueRed]}>₹{fmt(cfg.professional_tax)}</Text></View>}
            <View style={[styles.previewLine, styles.previewTotalLine]}><Text style={styles.previewTotalLabel}>Net Pay</Text><Text style={styles.previewTotalValue}>₹{fmt(sampleNet)}</Text></View>
          </View>
        </View>
      </View>
    </ScrollView>
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
<div class="att-grid"><div class="att-cell"><div class="att-num">${result.cfg.working_days}</div><div class="att-label">WORKING DAYS</div></div><div class="att-cell"><div class="att-num">${result.present_days}</div><div class="att-label">DAYS PRESENT</div></div><div class="att-cell"><div class="att-num">${result.late_days || 0}</div><div class="att-label">LATE DAYS</div></div><div class="att-cell"><div class="att-num">${result.paid_leave_used}</div><div class="att-label">PAID LEAVE USED</div></div><div class="att-cell"><div class="att-num">${result.lop_days}</div><div class="att-label">LOP DAYS</div></div></div>
<div class="earn-ded-grid"><div><div class="col-header">EARNINGS</div><div class="row"><span>Basic Salary</span><span>${formatMoney(result.basic)}</span></div>${mode === 'corporate' && result.hra > 0 ? `<div class="row"><span>HRA (${(result.cfg as CorporateConfig).hra_pct}%)</span><span>${formatMoney(result.hra)}</span></div>` : ''}${mode === 'corporate' && result.da > 0 ? `<div class="row"><span>DA (${(result.cfg as CorporateConfig).da_pct}%)</span><span>${formatMoney(result.da)}</span></div>` : ''}${mode === 'corporate' && result.ta > 0 ? `<div class="row"><span>TA (${(result.cfg as CorporateConfig).ta_pct}%)</span><span>${formatMoney(result.ta)}</span></div>` : ''}<div class="total-row"><span>Gross Earnings</span><span>${formatMoney(result.gross)}</span></div></div>
<div><div class="col-header">DEDUCTIONS</div>${result.lop_deduction > 0 ? `<div class="row"><span>Loss of Pay (${result.lop_days}d)</span><span>–${formatMoney(result.lop_deduction)}</span></div>` : ''}${result.pf > 0 ? `<div class="row"><span>Provident Fund (${(result.cfg as CorporateConfig).pf_pct}%)</span><span>–${formatMoney(result.pf)}</span></div>` : ''}${result.esi > 0 ? `<div class="row"><span>ESI (${(result.cfg as CorporateConfig).esi_pct}%)</span><span>–${formatMoney(result.esi)}</span></div>` : ''}${result.professional_tax > 0 ? `<div class="row"><span>Professional Tax</span><span>–${formatMoney(result.professional_tax)}</span></div>` : ''}<div class="total-row"><span>Total Deductions</span><span>–${formatMoney(result.total_deductions)}</span></div></div></div>
<div class="net-band"><div><div class="net-label">NET PAY (TAKE HOME)</div><div class="net-amt">${formatMoney(result.net)}</div></div><div class="net-side"><div>Gross Earnings ${formatMoney(result.gross)}</div><div style="margin-top:3px">Total Deductions –${formatMoney(result.total_deductions)}</div></div></div>
<div class="footer"><div><div>This is a system-generated payslip and does not require a physical signature.</div><div style="margin-top:3px">${companyName} · ${month} ${year}</div></div><div class="sig-box"><div style="height:24px"></div><div style="border-top:1px solid #aaa;padding-top:5px;font-size:8px">Authorised Signatory</div></div></div>
</body></html>`;

  return (
    <Modal visible={true} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View><Text style={styles.modalTitle}>{empName}</Text><Text style={styles.modalSubtitle}>{month} {year} · {mode === 'fixed' ? 'Fixed' : 'Corporate'} Payroll</Text></View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleExport} disabled={exporting}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonText}>Download PDF</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={onClose}><Text style={styles.modalButtonTextClose}>Close</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.webviewContainer}><WebView originWhitelist={['*']} source={{ html: htmlContent }} style={styles.webview} /></View>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== BULK PAYROLL TAB (COMPLETE) ====================

const BulkPayrollTab: React.FC<{ schoolCode: string; companyName: string }> = ({ schoolCode, companyName }) => {
  const handleScroll = useTabBarScrollVisibility();
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
      const [empResponse, leaveResponse] = await Promise.all([
        API.get(`accountant/payroll/employees?school_code=${encodeURIComponent(schoolCode)}`),
        API.get(`director/settings/leave-policy?school_code=${encodeURIComponent(schoolCode)}`).catch(() => null)
      ]);
      const empData = empResponse.data;
      setEmployees(Array.isArray(empData) ? empData : []);
      if (leaveResponse) {
        const leavePolicyData = leaveResponse.data;
        if (leavePolicyData) setLeavePolicy({ casual_leave: Number(leavePolicyData.casual_leave || 1), sick_leave: Number(leavePolicyData.sick_leave || 1), paid_leave: Number(leavePolicyData.paid_leave || 1), comp_off: Number(leavePolicyData.comp_off || 0) });
      }
    } catch (err) { setEmployees([]); } finally { setLoadingEmps(false); }
  };

  useEffect(() => { loadEmployeesAndLeavePolicy(); }, [schoolCode]);

  function resetCalc() { setAttMap({}); setAttFetched(false); setGeneratedMap({}); }

  const fetchAttendance = async () => {
    if (!schoolCode || employees.length === 0) return;
    if (isPeriodInFuture(month, year)) { Alert.alert('Error', `Cannot fetch attendance for future period (${month} ${year}).`); return; }
    setLoadingAtt(true); setAttFetched(false); setGeneratedMap({});
    const mi = MONTHS.indexOf(month);
    const startDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, mi + 1, 0);
    const endDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${endDate.getDate()}`;
    try {
      const response = await API.get(`accountant/payroll/attendance?school_code=${encodeURIComponent(schoolCode)}&start_date=${startDateStr}&end_date=${endDateStr}`);
      const data = response.data;
      const map: Record<string, Attendance> = {};
      if (Array.isArray(data)) {
        data.forEach((att: Attendance) => { map[att.teacher_id] = att; });
        employees.forEach(emp => { if (!map[emp.teacher_id]) map[emp.teacher_id] = { teacher_id: emp.teacher_id, present_days: 0, absent_days: wDays, late_days: 0, paid_leave_days: 0, total_days: wDays, attendance_percentage: 0 }; });
      }
      setAttMap(map); setAttFetched(true);
    } catch (err) { Alert.alert('Error', 'Failed to fetch attendance data'); } finally { setLoadingAtt(false); }
  };

  const generateForEmployee = (emp: Employee) => {
    const att = attMap[emp.teacher_id] || { teacher_id: emp.teacher_id, present_days: 0, absent_days: wDays, late_days: 0, paid_leave_days: 0, total_days: wDays, attendance_percentage: 0 };
    const result = mode === 'fixed' ? calcFixed(emp, att, fixedCfg, leavePolicy) : calcCorporate(emp, att, corpCfg, leavePolicy);
    setGeneratedMap(prev => ({ ...prev, [emp.teacher_id]: result }));
  };

  const generateAll = () => { employees.forEach(emp => generateForEmployee(emp)); };

  const handleSaveAll = async () => {
    const genCount = Object.keys(generatedMap).length;
    if (genCount === 0) { Alert.alert('Info', 'No payroll records to save.'); return; }
    setSavingAll(true);
    try {
      const records = Object.values(generatedMap).map(result => ({ teacher_id: result.employee.teacher_id, employee_id: result.employee.employee_id, teacher_name: result.employee.teacher_full_name, email: result.employee.email_id, designation: result.employee.designation, employment_type: result.employee.employment_type, doj: result.employee.date_of_joining, salary: result.basic, present_days: result.present_days, absent_days: result.absent_days, lop_days: result.lop_days, lop_deduction: result.lop_deduction, gross_salary: result.gross, pf: result.pf || 0, esi: result.esi || 0, professional_tax: result.professional_tax || 0, other_deduction: result.other_deduction || 0, net_salary: result.net, mode: result.mode, working_days: wDays }));
      const response = await API.post(`accountant/payroll/save-all`, { school_code: schoolCode, pay_month: month, pay_year: year, working_days: wDays, records: records });
      const data = response.data;
      if (data.success) Alert.alert('Success', `✅ ${data.saved_count} payroll records saved!`);
    } catch (err) { Alert.alert('Error', 'Error saving payroll records.'); } finally { setSavingAll(false); }
  };

  const handleSendEmails = async () => {
    const genCount = Object.keys(generatedMap).length;
    if (genCount === 0) { Alert.alert('Info', 'No payroll records to send.'); return; }
    Alert.alert('Confirm', `Send payroll emails to ${genCount} employees?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Send', onPress: async () => {
      setSendingEmails(true);
      try {
        const records = Object.values(generatedMap).map(result => ({ teacher_id: result.employee.teacher_id, teacher_name: result.employee.teacher_full_name, email: result.employee.email_id || result.employee.email, present_days: result.present_days, absent_days: result.absent_days, lop_days: result.lop_days, lop_deduction: result.lop_deduction, gross_salary: result.gross, net_salary: result.net, total_deductions: result.total_deductions, mode: result.mode }));
        const response = await API.post(`accountant/payroll/send-email-bulk`, { school_code: schoolCode, pay_month: month, pay_year: year, company_name: companyName, records: records });
        const data = response.data;
        if (data.success) Alert.alert('Success', `📧 Emails are being sent!`);
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

  return (
    <FlatList
      style={styles.tabContainer}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          <View style={styles.card}>
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeaderText}>Pay Period & Settings</Text>
              <View style={styles.configGrid}>
                <Field label="Month">
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setPickerModal({
                      visible: true,
                      title: 'Select Month',
                      options: MONTHS.map(m => ({ label: m, value: m })),
                      selectedValue: month,
                      onValueChange: (v) => { setMonth(v); resetCalc(); }
                    })}
                  >
                    <Text style={styles.pickerTriggerText}>{month}</Text>
                    <ChevronDown size={18} color="#64748B" />
                  </TouchableOpacity>
                </Field>
                <Field label="Year">
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setPickerModal({
                      visible: true,
                      title: 'Select Year',
                      options: years.map(y => ({ label: String(y), value: y })),
                      selectedValue: year,
                      onValueChange: (v) => { setYear(v); resetCalc(); }
                    })}
                  >
                    <Text style={styles.pickerTriggerText}>{year}</Text>
                    <ChevronDown size={18} color="#64748B" />
                  </TouchableOpacity>
                </Field>
                <Field label="Working Days" hint="Days in pay period"><TextInput style={styles.input} value={String(wDays)} onChangeText={(text) => { const v = Number(text) || 26; if (mode === 'fixed') setFixedCfg(p => ({ ...p, working_days: v })); else setCorpCfg(p => ({ ...p, working_days: v })); resetCalc(); }} keyboardType="numeric" /></Field>
              </View>
              {isPeriodFuture && <View style={styles.warningBox}><Text style={styles.warningText}>⚠️ {month} {year} is a future period — payroll cannot be generated yet.</Text></View>}
              {loadingEmps ? <View style={styles.loadingRow}><ActivityIndicator size="small" color="#4f46e5" /><Text style={styles.loadingText}>Loading staff…</Text></View> : employees.length > 0 ? <View style={styles.staffBadge}><Text style={styles.staffBadgeText}>👥 {employees.length} active staff members</Text></View> : null}
              <View style={styles.modeSection}><Text style={styles.sectionHeaderText}>Payroll Type</Text><PayrollTypeToggle mode={mode} onChange={m => { setMode(m); resetCalc(); }} /></View>
            </View>
            <View style={styles.cardSection}>
              {mode === 'fixed' ? <View style={styles.fixedInfoBox}><Text style={styles.fixedInfoText}>📋 Formula: Net = Basic Salary − (Absent Days × Per-day Rate)</Text><Text style={styles.fixedInfoSubtext}>No allowances, no PF/ESI deductions.</Text></View> : <CorporateConfigForm cfg={corpCfg} onChange={c => { setCorpCfg(c); resetCalc(); }} />}
            </View>
            {employees.length > 0 && (<View style={styles.cardSection}><View style={styles.fetchRow}><TouchableOpacity style={[styles.fetchButton, (loadingAtt || isPeriodFuture) && styles.fetchButtonDisabled]} onPress={fetchAttendance} disabled={loadingAtt || isPeriodFuture}>{loadingAtt ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text style={styles.fetchButtonText}>Fetch {month} {year} Attendance</Text>}</TouchableOpacity>{attFetched && (<><TouchableOpacity style={styles.viewAttButton} onPress={() => setShowAttTable(!showAttTable)}><Text style={styles.viewAttButtonText}>{showAttTable ? 'Hide' : 'View'} Attendance Summary</Text></TouchableOpacity><View style={styles.attLoadedBadge}><Text style={styles.attLoadedText}>✓ Attendance loaded for {Object.keys(attMap).length} staff</Text></View></>)}</View></View>)}
          </View>
          {attFetched && employees.length > 0 && genCount === 0 && !isPeriodFuture && (<View style={styles.generatePrompt}><View><Text style={styles.generatePromptTitle}>Ready to Generate Payroll</Text><Text style={styles.generatePromptDesc}>{month} {year} · {employees.length} staff members with attendance loaded</Text></View><TouchableOpacity style={styles.generateButton} onPress={generateAll}><Text style={styles.generateButtonText}>Generate All Payroll</Text></TouchableOpacity></View>)}
          {attFetched && employees.length > 0 && (<View style={styles.resultsContainer}>
            {genCount > 0 && (<View style={styles.summaryBar}><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Generated</Text><Text style={styles.summaryValue}>{genCount}/{employees.length}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Gross</Text><Text style={styles.summaryValue}>₹{fmt(totalGross)}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Deductions</Text><Text style={[styles.summaryValue, styles.summaryValueRed]}>₹{fmt(totalDed)}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Net</Text><Text style={[styles.summaryValue, styles.summaryValueGreen]}>₹{fmt(totalNet)}</Text></View></View>)}
            <View style={styles.actionBar}><TextInput style={styles.searchInput} placeholder="Search staff…" value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#9ca3af" /><View style={styles.actionButtonsRow}>{genCount < employees.length && genCount > 0 && (<TouchableOpacity style={styles.generateAllButton} onPress={generateAll}><Text style={styles.generateAllButtonText}>Generate All ({employees.length})</Text></TouchableOpacity>)}{genCount > 0 && (<><TouchableOpacity style={styles.saveAllButton} onPress={handleSaveAll} disabled={savingAll}>{savingAll ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveAllButtonText}>Save All ({genCount})</Text>}</TouchableOpacity><TouchableOpacity style={styles.emailAllButton} onPress={handleSendEmails} disabled={sendingEmails}>{sendingEmails ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.emailAllButtonText}>Send Mail ({genCount})</Text>}</TouchableOpacity></>)}</View></View>
          </View>)}
        </>
      }
      data={filteredEmps}
      keyExtractor={(item) => item.teacher_id}
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
              <View>
                <Text style={styles.employeeNameText}>{emp.teacher_full_name}</Text>
                <Text style={styles.employeeIdText}>{emp.employee_id} · {emp.designation}</Text>
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
                    <Text style={styles.statLabel}>Absent</Text>
                    <Text style={[styles.statValue, styles.statValueRed]}>{att.absent_days ?? '—'}</Text>
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
                <TouchableOpacity style={styles.generateEmpButton} onPress={() => generateForEmployee(emp)} disabled={isPeriodFuture || !attFetched}>
                  <Text style={styles.generateEmpButtonText}>Generate</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.actionButtonsGroup}>
                  <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => result && setOpenPayslip(result)}>
                    <Text style={styles.actionBtnText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.pdfBtn]} onPress={() => result && handleDownloadPDF(result, emp.teacher_id)} disabled={downloadingId === emp.teacher_id}>
                    {downloadingId === emp.teacher_id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>PDF</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.recalcBtn]} onPress={() => generateForEmployee(emp)}>
                    <Text style={styles.recalcBtnText}>⟳</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ); 
      }}
      ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyStateText}>No staff members found</Text></View>}
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

const IndividualPayrollTab: React.FC<{ schoolCode: string; companyName: string }> = ({ schoolCode, companyName }) => {
  const handleScroll = useTabBarScrollVisibility();
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
        const [empResponse, leaveResponse] = await Promise.all([
          API.get(`accountant/payroll/employees?school_code=${encodeURIComponent(schoolCode)}`),
          API.get(`director/settings/leave-policy?school_code=${encodeURIComponent(schoolCode)}`).catch(() => null)
        ]);
        const empData = empResponse.data;
        setEmployees(Array.isArray(empData) ? empData : []);
        if (leaveResponse) { const leavePolicyData = leaveResponse.data; if (leavePolicyData) setLeavePolicy({ casual_leave: Number(leavePolicyData.casual_leave || 1), sick_leave: Number(leavePolicyData.sick_leave || 1), paid_leave: Number(leavePolicyData.paid_leave || 1), comp_off: Number(leavePolicyData.comp_off || 0) }); }
      } catch (err) { setEmployees([]); } finally { setLoadingEmps(false); }
    })();
  }, [schoolCode]);

  const selectedEmp = employees.find(e => e.teacher_id === selectedId);
  const wDays = empConfig.mode === 'fixed' ? empConfig.fixedCfg.working_days : empConfig.corpCfg.working_days;

  const fetchAttForEmp = async () => {
    if (!selectedEmp) return;
    setEmpConfig(c => ({ ...c, loadingAtt: true, attFetched: false, result: null }));
    const mi = MONTHS.indexOf(month);
    const startDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, mi + 1, 0);
    const endDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${endDate.getDate()}`;
    try {
      const response = await API.get(`accountant/payroll/attendance?school_code=${encodeURIComponent(schoolCode)}&teacher_id=${encodeURIComponent(selectedId!)}&start_date=${startDateStr}&end_date=${endDateStr}`);
      const data = response.data;
      if (Array.isArray(data)) { const att = data.find(a => a.teacher_id === selectedId); setEmpConfig(c => ({ ...c, att: att || { teacher_id: selectedId, present_days: 0, absent_days: wDays, late_days: 0, paid_leave_days: 0, total_days: wDays, attendance_percentage: 0 }, attFetched: true, loadingAtt: false })); } 
      else { setEmpConfig(c => ({ ...c, att: { teacher_id: selectedId!, present_days: 0, absent_days: wDays, late_days: 0, paid_leave_days: 0, total_days: wDays, attendance_percentage: 0 }, attFetched: true, loadingAtt: false })); }
    } catch (err) { setEmpConfig(c => ({ ...c, attFetched: true, loadingAtt: false })); Alert.alert('Error', 'Failed to fetch attendance data'); }
  };

  const handleSendSingleEmail = async () => {
    if (!empConfig.result) { Alert.alert('Info', 'Please generate payroll first.'); return; }
    setSendingEmail(true);
    try {
      const record = { teacher_id: selectedEmp!.teacher_id, teacher_name: selectedEmp!.teacher_full_name, email: selectedEmp!.email_id, present_days: empConfig.att?.present_days || 0, absent_days: empConfig.att?.absent_days || 0, lop_days: empConfig.result.lop_days, lop_deduction: empConfig.result.lop_deduction, gross_salary: empConfig.result.gross, net_salary: empConfig.result.net, total_deductions: empConfig.result.total_deductions, mode: empConfig.mode };
      const response = await API.post(`accountant/payroll/send-email-single`, { school_code: schoolCode, pay_month: month, pay_year: year, company_name: companyName, record: record });
      const data = response.data;
      if (data.success) Alert.alert('Success', `✅ Payslip sent to ${selectedEmp!.teacher_full_name}!`);
      else Alert.alert('Error', 'Failed to send email.');
    } catch (err) { Alert.alert('Error', 'Error sending email.'); } finally { setSendingEmail(false); }
  };

  const generate = () => {
    if (!selectedEmp || !empConfig.att) return;
    const result = empConfig.mode === 'fixed' ? calcFixed(selectedEmp, empConfig.att, empConfig.fixedCfg, leavePolicy) : calcCorporate(selectedEmp, empConfig.att, empConfig.corpCfg, leavePolicy);
    setEmpConfig(c => ({ ...c, result }));
  };

  return (
    <ScrollView style={styles.tabContainer} onScroll={handleScroll} scrollEventThrottle={16}>
      <View style={styles.card}><View style={styles.cardSection}><Text style={styles.sectionHeaderText}>Select Staff Member & Period</Text>
      <View style={styles.configGrid}>
        <Field label="Month">
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerModal({
              visible: true,
              title: 'Select Month',
              options: MONTHS.map(m => ({ label: m, value: m })),
              selectedValue: month,
              onValueChange: setMonth
            })}
          >
            <Text style={styles.pickerTriggerText}>{month}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>
        </Field>
        <Field label="Year">
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerModal({
              visible: true,
              title: 'Select Year',
              options: years.map(y => ({ label: String(y), value: y })),
              selectedValue: year,
              onValueChange: (v) => setYear(Number(v))
            })}
          >
            <Text style={styles.pickerTriggerText}>{year}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>
        </Field>
        <Field label="Staff Member" hint="Select to configure">
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerModal({
              visible: true,
              title: 'Select Staff Member',
              options: employees.map(e => ({ label: `${e.teacher_full_name} (${e.employee_id})`, value: e.teacher_id })),
              selectedValue: selectedId,
              onValueChange: (v) => { setSelectedId(v); setEmpConfig({ mode: 'fixed', fixedCfg: DEFAULT_FIXED, corpCfg: DEFAULT_CORP, result: null, attFetched: false, att: null, loadingAtt: false }); }
            })}
          >
            <Text style={styles.pickerTriggerText} numberOfLines={1}>
              {selectedEmp ? `${selectedEmp.teacher_full_name}` : '— Select staff —'}
            </Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>
        </Field>
        <Field label="Working Days"><TextInput style={styles.input} value={String(wDays)} onChangeText={(text) => { const v = Number(text) || 26; if (empConfig.mode === 'fixed') setEmpConfig(c => ({ ...c, fixedCfg: { ...c.fixedCfg, working_days: v } })); else setEmpConfig(c => ({ ...c, corpCfg: { ...c.corpCfg, working_days: v } })); }} keyboardType="numeric" /></Field>
      </View></View></View>
      {selectedEmp && (<View style={styles.card}><View style={styles.cardSection}><View style={styles.employeeHeader}><View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{selectedEmp.teacher_full_name?.charAt(0) || 'T'}</Text></View><View><Text style={styles.employeeNameLarge}>{selectedEmp.teacher_full_name}</Text><Text style={styles.employeeDetailsText}>{selectedEmp.employee_id} · {selectedEmp.designation} · Salary: ₹{fmt(selectedEmp.salary_amount || 0)}/month</Text></View></View><View style={styles.modeSection}><Text style={styles.sectionHeaderText}>Payroll Type</Text><PayrollTypeToggle mode={empConfig.mode} onChange={m => setEmpConfig(c => ({ ...c, mode: m, result: null, attFetched: false }))} /></View>{empConfig.mode === 'corporate' && <CorporateConfigForm cfg={empConfig.corpCfg} onChange={c => setEmpConfig(prev => ({ ...prev, corpCfg: c, result: null }))} />}{empConfig.mode === 'fixed' && (<View style={styles.fixedInfoBox}><Text style={styles.fixedInfoText}>📋 Net = Basic − (LOP days × Per-day rate). No allowances or PF.</Text></View>)}<View style={styles.fetchRow}>{isPeriodInFuture(month, year) ? (<View style={styles.warningBox}><Text style={styles.warningText}>⚠️ Cannot generate payroll for future period</Text></View>) : (<><TouchableOpacity style={styles.fetchButton} onPress={fetchAttForEmp} disabled={empConfig.loadingAtt}>{empConfig.loadingAtt ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text style={styles.fetchButtonText}>Fetch {month} {year} Attendance</Text>}</TouchableOpacity>{empConfig.attFetched && (<><View style={styles.attLoadedBadge}><Text style={styles.attLoadedText}>✓ Present: {empConfig.att?.present_days ?? 0} · Absent: {empConfig.att?.absent_days ?? 0}</Text></View><TouchableOpacity style={styles.generateButton} onPress={generate}><Text style={styles.generateButtonText}>{empConfig.result ? 'Recalculate' : 'Generate Payroll'}</Text></TouchableOpacity></>)}</>)}</View>{empConfig.result && (<><View style={styles.resultSummary}><View style={styles.resultItem}><Text style={styles.resultLabel}>Gross</Text><Text style={styles.resultValue}>₹{fmt(empConfig.result.gross)}</Text></View><View style={styles.resultItem}><Text style={styles.resultLabel}>Deductions</Text><Text style={[styles.resultValue, styles.resultValueRed]}>–₹{fmt(empConfig.result.total_deductions)}</Text></View><View style={styles.resultItem}><Text style={styles.resultLabel}>Net Pay</Text><Text style={[styles.resultValue, styles.resultValueGreen]}>₹{fmt(empConfig.result.net)}</Text></View></View><View style={styles.actionButtonsGroup}><TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => setOpenPayslip(empConfig.result!)}><Text style={styles.actionBtnText}>View Payslip</Text></TouchableOpacity><TouchableOpacity style={[styles.actionBtn, styles.pdfBtn]} onPress={async () => { setDownloadingId(selectedId); try { await generatePayslipPDF(empConfig.result!, month, String(year), schoolCode, true, companyName); } catch { Alert.alert('Error', 'PDF download failed.'); } finally { setDownloadingId(null); } }} disabled={downloadingId === selectedId}>{downloadingId === selectedId ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Download PDF</Text>}</TouchableOpacity><TouchableOpacity style={[styles.actionBtn, styles.emailBtn]} onPress={handleSendSingleEmail} disabled={sendingEmail}>{sendingEmail ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Send Mail</Text>}</TouchableOpacity></View></>)}</View></View>)}
      {!selectedId && employees.length > 0 && (<View style={styles.emptyStateLarge}><Text style={styles.emptyStateLargeText}>Select a staff member to generate their payslip</Text></View>)}
      {loadingEmps && (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4f46e5" /><Text style={styles.loadingText}>Loading staff…</Text></View>)}
      {openPayslip && <PayslipModal result={openPayslip} month={month} year={String(year)} companyName={companyName} schoolCode={schoolCode} onClose={() => setOpenPayslip(null)} />}
      {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}
    </ScrollView>
  );
};

// ==================== HOURS-BASED PAYROLL TAB ====================

const HoursBasedPayrollTab: React.FC<{ schoolCode: string; companyName: string }> = ({ schoolCode, companyName }) => {
  const handleScroll = useTabBarScrollVisibility();
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
        const response = await API.get(`accountant/payroll/employees?school_code=${encodeURIComponent(schoolCode)}`);
        const data = response.data;
        if (Array.isArray(data)) {
          setEmployees(data.filter(e => (e.employment_type || '').toLowerCase().includes('part')).map(e => ({ ...e, totalHours: 0, attFetched: false, loadingAtt: false, hourlyRate: globalRate, gross: null, net: null })));
        }
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
      setEmployees(prev => prev.map(e => { if (e.teacher_id !== empId) return e; const gross = totalHours * e.hourlyRate; return { ...e, totalHours, attFetched: true, loadingAtt: false, gross, net: gross }; }));
    } catch { setEmployees(prev => prev.map(e => e.teacher_id === empId ? { ...e, loadingAtt: false } : e)); }
  };

  const generatedCount = employees.filter(e => e.gross !== null).length;
  const totalNet = employees.reduce((s, e) => s + (e.net ?? 0), 0);
  const totalHoursAll = employees.reduce((s, e) => s + e.totalHours, 0);

  return (
    <ScrollView style={styles.tabContainer} onScroll={handleScroll} scrollEventThrottle={16}>
      <View style={styles.infoBanner}><Text style={styles.infoBannerText}>⏰ Hours-Based Payroll — Only Part-Time staff appear here. Attendance is estimated at 8 hours/present day for the selected period.</Text></View>
      <View style={styles.card}><View style={styles.cardSection}><View style={styles.hoursConfigRow}>
        <Field label="Month">
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerModal({
              visible: true,
              title: 'Select Month',
              options: MONTHS.map(m => ({ label: m, value: m })),
              selectedValue: month,
              onValueChange: setMonth
            })}
          >
            <Text style={styles.pickerTriggerText}>{month}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>
        </Field>
        <Field label="Year">
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setPickerModal({
              visible: true,
              title: 'Select Year',
              options: years.map(y => ({ label: String(y), value: y })),
              selectedValue: year,
              onValueChange: (v) => setYear(Number(v))
            })}
          >
            <Text style={styles.pickerTriggerText}>{year}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>
        </Field>
        <Field label="Rate per Hour (₹)"><RupeeInput value={globalRate} onChange={setGlobalRate} /></Field><TouchableOpacity style={styles.applyButton} onPress={applyGlobalRate} disabled={!globalRate}><Text style={styles.applyButtonText}>Apply to All</Text></TouchableOpacity></View></View></View>
      {generatedCount > 0 && (<View style={styles.summaryBarHours}><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Part-Time Staff</Text><Text style={styles.summaryValueLarge}>{generatedCount}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Est. Total Hours</Text><Text style={styles.summaryValueLarge}>{totalHoursAll.toFixed(1)}h</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Net Payable</Text><Text style={[styles.summaryValueLarge, styles.summaryValueGreen]}>₹{fmt(totalNet)}</Text></View></View>)}
      {employees.length > 0 ? (<View style={styles.card}><View style={styles.hoursHeader}><Text style={styles.hoursHeaderTitle}>Part-Time Staff — {month} {year}</Text><Text style={styles.hoursHeaderCount}>{employees.length} staff member(s)</Text></View>{employees.map(emp => (<View key={emp.teacher_id} style={[styles.hoursRow, emp.gross !== null && styles.hoursRowGenerated]}><View style={styles.hoursAvatar}><Text style={styles.hoursAvatarText}>{emp.teacher_full_name.charAt(0)}</Text></View><View style={styles.hoursInfo}><Text style={styles.hoursName}>{emp.teacher_full_name}</Text><Text style={styles.hoursId}>{emp.employee_id} · Part-Time</Text></View><View style={styles.hoursRateContainer}><RupeeInput value={emp.hourlyRate} onChange={(rate) => setEmployees(prev => prev.map(e2 => e2.teacher_id === emp.teacher_id ? { ...e2, hourlyRate: rate, gross: e2.attFetched ? e2.totalHours * rate : null, net: e2.attFetched ? e2.totalHours * rate : null } : e2))} /></View>{emp.attFetched ? <Text style={styles.hoursTotal}>{emp.totalHours.toFixed(1)}h</Text> : <TouchableOpacity style={styles.fetchHoursButton} onPress={() => fetchAttForEmp(emp.teacher_id)} disabled={emp.loadingAtt}>{emp.loadingAtt ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text style={styles.fetchHoursButtonText}>Fetch</Text>}</TouchableOpacity>}{emp.gross !== null && (<View style={styles.hoursGross}><Text style={styles.hoursGrossAmount}>₹{fmt(emp.gross)}</Text><Text style={styles.hoursGrossDetail}>{emp.totalHours.toFixed(1)}h × ₹{fmt(emp.hourlyRate)}</Text></View>)}</View>))}</View>) : (<View style={styles.emptyStateLarge}><Text style={styles.emptyStateLargeText}>No Part-Time staff found</Text><Text style={styles.emptyStateSubtext}>Staff with "Part-Time" employment type appear here</Text></View>)}
      {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}
    </ScrollView>
  );
};

// ==================== MAIN SCREEN ====================

export default function PayrollScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const handleScroll = useTabBarScrollVisibility();
  const [activeTab, setActiveTab] = useState('bulk');
  const [schoolCode, setSchoolCode] = useState('');
  const [companyName, setCompanyName] = useState('School');

  useEffect(() => {
    (async () => {
      const code = await AsyncStorage.getItem('school_code') || await AsyncStorage.getItem('schoolCode') || '';
      setSchoolCode(code);
      const name = await AsyncStorage.getItem('company_name') || await AsyncStorage.getItem('school_name') || 'School';
      setCompanyName(name);
    })();
  }, []);

  const tabs = [
    { key: 'bulk', label: 'Bulk Payroll', desc: 'All staff · same payroll type' },
    { key: 'individual', label: 'Individual', desc: 'One staff member at a time' },
    { key: 'hours', label: 'Hours Based', desc: 'Part-Time · paid per hour' },
  ];

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>
        <View><Text style={styles.headerTitle}>💰 Payroll Management</Text><Text style={styles.headerSubtitle}>Manage monthly salary for {companyName}</Text></View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.tabsContainer}>{tabs.map(tab => (<TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}><Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text><Text style={[styles.tabDesc, activeTab === tab.key && styles.tabDescActive]}>{tab.desc}</Text></TouchableOpacity>))}</View>
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 120, 140) }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {activeTab === 'bulk' && <BulkPayrollTab schoolCode={schoolCode} companyName={companyName} />}
        {activeTab === 'individual' && <IndividualPayrollTab schoolCode={schoolCode} companyName={companyName} />}
        {activeTab === 'hours' && <HoursBasedPayrollTab schoolCode={schoolCode} companyName={companyName} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  backButtonText: { fontSize: 20, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  tabsContainer: { backgroundColor: '#fff', flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 8 },
  tabActive: { borderBottomColor: '#4f46e5' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabLabelActive: { color: '#4f46e5' },
  tabDesc: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  tabDescActive: { color: '#818cf8' },
  contentContainer: { flex: 1, padding: 16 },
  tabContainer: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16, overflow: 'hidden' },
  cardSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sectionHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  configGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  fieldContainer: { flex: 1, minWidth: 100 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHint: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  pickerContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff' },
  pickerContainerSmall: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', minWidth: 120 },
  picker: { height: 48 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, height: 44, color: '#111827', backgroundColor: '#fff' },
  pctInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10 },
  pctInput: { flex: 1, height: 44, color: '#111827' },
  pctInputSymbol: { color: '#6b7280', fontWeight: '700' },
  rupeeInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10 },
  rupeeInputSymbol: { color: '#6b7280', marginRight: 4, fontWeight: '700' },
  rupeeInput: { flex: 1, height: 44, color: '#111827' },
  toggleContainer: { flexDirection: 'row', gap: 12 },
  toggleOption: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, backgroundColor: '#f9fafb' },
  toggleOptionActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  toggleOptionTitle: { fontWeight: '700', color: '#374151', fontSize: 13 },
  toggleOptionTitleActive: { color: '#3730a3' },
  toggleOptionDesc: { marginTop: 4, color: '#6b7280', fontSize: 11 },
  toggleOptionDescActive: { color: '#4338ca' },
  configForm: { maxHeight: 720 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  addButton: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addButtonRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  addButtonText: { color: '#4338ca', fontWeight: '700', fontSize: 12 },
  addButtonTextRed: { color: '#b91c1c' },
  allowancesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  deductionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  extraItemContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 8 },
  extraItemContainerRed: { backgroundColor: '#fef2f2' },
  extraItemInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, height: 42, backgroundColor: '#fff' },
  removeButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444' },
  removeButtonText: { color: '#fff', fontWeight: '700', fontSize: 18, lineHeight: 18 },
  previewContainer: { marginTop: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#fafafa' },
  previewTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10, color: '#111827' },
  previewRow: { flexDirection: 'row', gap: 16 },
  previewColumn: { flex: 1 },
  previewSubtitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, color: '#374151' },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  previewLabel: { color: '#6b7280', fontSize: 12 },
  previewValue: { color: '#111827', fontWeight: '600', fontSize: 12 },
  previewValueRed: { color: '#b91c1c' },
  previewValueGreen: { color: '#166534' },
  previewTotalLine: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4, paddingTop: 8 },
  previewTotalLabel: { color: '#111827', fontWeight: '700' },
  previewTotalValue: { color: '#111827', fontWeight: '800' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalButton: { borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, height: 36, justifyContent: 'center', backgroundColor: '#fff' },
  modalButtonPrimary: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  modalButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalButtonTextClose: { color: '#374151', fontWeight: '600', fontSize: 12 },
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  warningBox: { marginTop: 10, backgroundColor: '#fff7ed', borderColor: '#fdba74', borderWidth: 1, borderRadius: 10, padding: 10 },
  warningText: { color: '#9a3412', fontSize: 12 },
  loadingRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#6b7280', fontSize: 12 },
  loadingContainer: { padding: 22, alignItems: 'center', justifyContent: 'center', gap: 8 },
  staffBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#ecfeff', borderColor: '#a5f3fc', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  staffBadgeText: { color: '#155e75', fontSize: 12, fontWeight: '600' },
  modeSection: { marginTop: 10 },
  fixedInfoBox: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 10, padding: 10 },
  fixedInfoText: { color: '#5b3cc4', fontSize: 12, fontWeight: '600' },
  fixedInfoSubtext: { color: '#6648dc', fontSize: 11, marginTop: 4 },
  fetchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  fetchButton: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: 'center' },
  fetchButtonDisabled: { opacity: 0.5 },
  fetchButtonText: { color: '#3730a3', fontWeight: '700', fontSize: 12 },
  viewAttButton: { backgroundColor: '#e0f2fe', borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: 'center' },
  viewAttButtonText: { color: '#0369a1', fontWeight: '700', fontSize: 12 },
  attLoadedBadge: { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  attLoadedText: { color: '#166534', fontSize: 11, fontWeight: '600' },
  generatePrompt: { marginBottom: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  generatePromptTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  generatePromptDesc: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  generateButton: { backgroundColor: '#4f46e5', borderRadius: 10, paddingHorizontal: 14, height: 40, justifyContent: 'center' },
  generateButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  resultsContainer: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 20 },
  summaryBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  summaryBarHours: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryItem: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', minWidth: 120 },
  summaryLabel: { color: '#6b7280', fontSize: 11 },
  summaryValue: { color: '#111827', fontSize: 14, fontWeight: '700', marginTop: 4 },
  summaryValueLarge: { color: '#111827', fontSize: 18, fontWeight: '800', marginTop: 4 },
  summaryValueRed: { color: '#b91c1c' },
  summaryValueGreen: { color: '#166534' },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: 220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, height: 40, paddingHorizontal: 12, backgroundColor: '#fff' },
  actionButtonsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  generateAllButton: { backgroundColor: '#e0e7ff', borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: 'center' },
  generateAllButtonText: { color: '#3730a3', fontWeight: '700', fontSize: 12 },
  saveAllButton: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: 'center' },
  saveAllButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emailAllButton: { backgroundColor: '#0284c7', borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: 'center' },
  emailAllButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  employeeCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', padding: 12, marginBottom: 10 },
  employeeCardGenerated: { borderColor: '#a5b4fc', backgroundColor: '#f8faff' },
  employeeInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  employeeNameText: { fontWeight: '700', color: '#111827', fontSize: 13 },
  employeeIdText: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  employeeStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  statItem: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 86 },
  statLabel: { color: '#6b7280', fontSize: 10 },
  statValue: { color: '#111827', fontSize: 12, fontWeight: '700', marginTop: 2 },
  statValueBold: { fontWeight: '800' },
  statValueRed: { color: '#b91c1c' },
  statValueGreen: { color: '#166534' },
  employeeActionsRow: { marginTop: 10, alignItems: 'flex-end' },
  generateEmpButton: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  generateEmpButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actionButtonsGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, height: 34, justifyContent: 'center' },
  viewBtn: { backgroundColor: '#e0f2fe' },
  pdfBtn: { backgroundColor: '#4f46e5' },
  recalcBtn: { backgroundColor: '#f3f4f6' },
  emailBtn: { backgroundColor: '#0284c7' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  recalcBtnText: { color: '#111827', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyStateText: { color: '#6b7280' },
  emptyStateLarge: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12 },
  emptyStateLargeText: { color: '#111827', fontWeight: '600' },
  emptyStateSubtext: { color: '#6b7280', marginTop: 4, fontSize: 12 },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  employeeNameLarge: { fontWeight: '700', color: '#111827', fontSize: 15 },
  employeeDetailsText: { color: '#6b7280', marginTop: 2, fontSize: 12 },
  resultSummary: { flexDirection: 'row', gap: 8, marginTop: 12 },
  resultItem: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb' },
  resultLabel: { color: '#6b7280', fontSize: 11 },
  resultValue: { color: '#111827', fontWeight: '700', marginTop: 4 },
  resultValueRed: { color: '#b91c1c' },
  resultValueGreen: { color: '#166534' },
  infoBanner: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 10, marginBottom: 12 },
  infoBannerText: { color: '#5b3cc4', fontSize: 12 },
  hoursConfigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' },
  applyButton: { backgroundColor: '#4f46e5', borderRadius: 10, paddingHorizontal: 14, height: 40, justifyContent: 'center' },
  applyButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  hoursHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  hoursHeaderTitle: { fontWeight: '700', color: '#111827' },
  hoursHeaderCount: { color: '#6b7280', fontSize: 12 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  hoursRowGenerated: { backgroundColor: '#f8fafc' },
  hoursAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  hoursAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  hoursInfo: { flex: 1 },
  hoursName: { color: '#111827', fontWeight: '600' },
  hoursId: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  hoursRateContainer: { width: 170 },
  hoursTotal: { color: '#111827', fontWeight: '700', minWidth: 64, textAlign: 'right' },
  fetchHoursButton: { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, height: 32, justifyContent: 'center' },
  fetchHoursButtonText: { color: '#3730a3', fontWeight: '700', fontSize: 11 },
  hoursGross: { alignItems: 'flex-end', minWidth: 115 },
  hoursGrossAmount: { color: '#166534', fontWeight: '700' },
  hoursGrossDetail: { color: '#6b7280', fontSize: 10, marginTop: 1 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#fff',
  },
  pickerTriggerText: {
    fontSize: 14,
    color: '#111827',
  },
});