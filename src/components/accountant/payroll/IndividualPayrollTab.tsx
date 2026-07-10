import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ChevronDown, AlertTriangle, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollTabBar } from '../../../hooks/useScrollTabBar';
import CustomPickerModal from '../../common/CustomPickerModal';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { Theme } from '../../../theme/tokens';
import * as principalService from '../../../services/principalService';
import API from '../../../services/api';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import CorporateConfigForm from './CorporateConfigForm';
import { PayrollField, PayrollTypeToggle } from './PayrollFormFields';
import PayslipModal from './PayslipModal';
import { PayrollIndividualSummary } from './PayrollSummaryCards';
import {
  calcCorporate,
  calcFixed,
  emptyAttendance,
  fetchLeaveBreakdown,
  fmt,
  generatePayslipPDF,
  isPeriodInFuture,
  mapAttendanceFromBackend,
} from './helpers';
import { payrollStyles as styles } from './payrollStyles';
import {
  DEFAULT_CORP,
  DEFAULT_FIXED,
  MONTHS,
  type Attendance,
  type Employee,
  type LeavePolicy,
  type PayrollResult,
  type PickerModalState,
} from './types';

type Props = {
  schoolCode: string;
  companyName: string;
  pageChrome?: React.ReactNode;
};

export default function IndividualPayrollTab({ schoolCode, companyName, pageChrome }: Props) {
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
  const [empConfig, setEmpConfig] = useState({
    mode: 'fixed',
    fixedCfg: DEFAULT_FIXED,
    corpCfg: DEFAULT_CORP,
    result: null as PayrollResult | null,
    attFetched: false,
    att: null as Attendance | null,
    loadingAtt: false,
  });
  const [openPayslip, setOpenPayslip] = useState<PayrollResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pickerModal, setPickerModal] = useState<PickerModalState>(null);

  useEffect(() => {
    if (!schoolCode) { setEmployees([]); return; }
    setLoadingEmps(true);
    (async () => {
      try {
        const branchId = await storage.getString(StorageKeys.BRANCH_ID) || '';
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
        if (leaveResponse?.data) {
          const d = leaveResponse.data;
          setLeavePolicy({
            casual_leave: Number(d.casual_leave || 1),
            sick_leave: Number(d.sick_leave || 1),
            paid_leave: Number(d.paid_leave || 1),
            comp_off: Number(d.comp_off || 0),
          });
        }
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmps(false);
      }
    })();
  }, [schoolCode]);

  const selectedEmp = employees.find(e => e.teacher_id === selectedId);
  const wDays = empConfig.mode === 'fixed' ? empConfig.fixedCfg.working_days : empConfig.corpCfg.working_days;

  const fetchAttForEmp = async () => {
    if (!selectedEmp) { return; }
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
    } catch {
      setEmpConfig(c => ({ ...c, attFetched: true, loadingAtt: false }));
      Alert.alert('Error', 'Failed to fetch attendance data');
    }
  };

  const handleSendSingleEmail = async () => {
    if (!empConfig.result) { Alert.alert('Info', 'Please generate payroll first.'); return; }
    setSendingEmail(true);
    try {
      const record = {
        teacher_id: selectedEmp!.teacher_id,
        teacher_name: selectedEmp!.teacher_full_name,
        email: selectedEmp!.email_id,
        present_days: empConfig.att?.present_days || 0,
        absent_days: empConfig.att?.absent_days || 0,
        lop_days: empConfig.result.lop_days,
        lop_deduction: empConfig.result.lop_deduction,
        gross_salary: empConfig.result.gross,
        net_salary: empConfig.result.net,
        total_deductions: empConfig.result.total_deductions,
        mode: empConfig.mode,
      };
      const response = await API.post('accountant/payroll/send-email-single', {
        school_code: schoolCode,
        pay_month: month,
        pay_year: year,
        company_name: companyName,
        record,
      });
      if (response.data.success) {
        Alert.alert('Success', `✅ Payslip sent to ${selectedEmp!.teacher_full_name}!`);
      } else {
        Alert.alert('Error', 'Failed to send email.');
      }
    } catch {
      Alert.alert('Error', 'Error sending email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const generate = () => {
    if (!selectedEmp || !empConfig.att) { return; }
    const result = empConfig.mode === 'fixed'
      ? calcFixed(selectedEmp, empConfig.att, empConfig.fixedCfg, leavePolicy)
      : calcCorporate(selectedEmp, empConfig.att, empConfig.corpCfg, leavePolicy);
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
              <PayrollField label="Month" width="48%">
                <TouchableOpacity
                  accessibilityRole="button"
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
              </PayrollField>
              <PayrollField label="Year" width="48%">
                <TouchableOpacity
                  accessibilityRole="button"
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
              </PayrollField>
              <PayrollField label="Staff Member" hint="Select to configure" width="100%">
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.pickerTrigger}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Staff Member',
                    options: employees.map(e => ({ label: `${e.teacher_full_name} (${e.employee_id})`, value: e.teacher_id })),
                    selectedValue: selectedId,
                    onValueChange: (v) => {
                      setSelectedId(v);
                      setEmpConfig({
                        mode: 'fixed',
                        fixedCfg: DEFAULT_FIXED,
                        corpCfg: DEFAULT_CORP,
                        result: null,
                        attFetched: false,
                        att: null,
                        loadingAtt: false,
                      });
                    },
                  })}
                >
                  <Text style={styles.pickerTriggerText} numberOfLines={1}>
                    {selectedEmp ? selectedEmp.teacher_full_name : '— Select staff —'}
                  </Text>
                  <ChevronDown size={18} color={Theme.colors.textSec} />
                </TouchableOpacity>
              </PayrollField>
              <PayrollField label="Working Days" width="100%">
                <TextInput
                  style={styles.input}
                  value={String(wDays)}
                  onChangeText={(text) => {
                    const v = Number(text) || 26;
                    if (empConfig.mode === 'fixed') {
                      setEmpConfig(c => ({ ...c, fixedCfg: { ...c.fixedCfg, working_days: v } }));
                    } else {
                      setEmpConfig(c => ({ ...c, corpCfg: { ...c.corpCfg, working_days: v } }));
                    }
                  }}
                  keyboardType="numeric"
                />
              </PayrollField>
            </View>
          </View>
        </View>
        {selectedEmp ? (
          <View style={styles.card}>
            <View style={styles.cardSection}>
              <View style={styles.employeeHeader}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{selectedEmp.teacher_full_name?.charAt(0) || 'T'}</Text>
                </View>
                <View>
                  <Text style={styles.employeeNameLarge}>{selectedEmp.teacher_full_name}</Text>
                  <Text style={styles.employeeDetailsText}>
                    {selectedEmp.employee_id} · {selectedEmp.designation} · Salary: ₹{fmt(selectedEmp.salary_amount || 0)}/month
                  </Text>
                </View>
              </View>
              <View style={styles.modeSection}>
                <Text style={styles.sectionHeaderText}>Payroll Type</Text>
                <PayrollTypeToggle
                  mode={empConfig.mode}
                  onChange={m => setEmpConfig(c => ({ ...c, mode: m, result: null, attFetched: false }))}
                />
              </View>
              {empConfig.mode === 'corporate' ? (
                <CorporateConfigForm
                  cfg={empConfig.corpCfg}
                  onChange={c => setEmpConfig(prev => ({ ...prev, corpCfg: c, result: null }))}
                />
              ) : null}
              {empConfig.mode === 'fixed' ? (
                <View style={styles.fixedInfoBox}>
                  <Info size={16} color={Theme.colors.blue} />
                  <Text style={[styles.fixedInfoText, { flex: 1 }]}>Net = Basic − (LOP days × Per-day rate). No allowances or PF.</Text>
                </View>
              ) : null}
              <View style={styles.fetchRow}>
                {isPeriodInFuture(month, year) ? (
                  <View style={styles.warningBox}>
                    <AlertTriangle size={16} color="#f97316" />
                    <Text style={[styles.warningText, { flex: 1 }]}>Cannot generate payroll for future period</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity accessibilityRole="button" style={styles.fetchButton} onPress={fetchAttForEmp} disabled={empConfig.loadingAtt}>
                      {empConfig.loadingAtt ? (
                        <ActivityIndicator size="small" color="#4f46e5" />
                      ) : (
                        <Text style={styles.fetchButtonText}>Fetch {month} {year} Attendance</Text>
                      )}
                    </TouchableOpacity>
                    {empConfig.attFetched ? (
                      <>
                        <View style={styles.attLoadedBadge}>
                          <Text style={styles.attLoadedText}>
                            ✓ Present: {empConfig.att?.present_days ?? 0} · LOP: {empConfig.att?.lop_days ?? empConfig.att?.absent_days ?? 0} · Work days: {empConfig.att?.applicable_working_days ?? wDays}
                          </Text>
                        </View>
                        <TouchableOpacity accessibilityRole="button" style={styles.generateButton} onPress={generate}>
                          <Text style={styles.generateButtonText}>{empConfig.result ? 'Recalculate' : 'Generate Payroll'}</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </>
                )}
              </View>
              {empConfig.result ? (
                <>
                  <PayrollIndividualSummary
                    gross={empConfig.result.gross}
                    totalDeductions={empConfig.result.total_deductions}
                    net={empConfig.result.net}
                  />
                  <View style={styles.actionButtonsGroup}>
                    <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.viewBtn]} onPress={() => setOpenPayslip(empConfig.result!)}>
                      <Text style={styles.actionBtn}>View Payslip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.actionBtn, styles.pdfBtn]}
                      onPress={async () => {
                        setDownloadingId(selectedId);
                        try {
                          await generatePayslipPDF(empConfig.result!, month, String(year), schoolCode, true, companyName);
                        } catch {
                          Alert.alert('Error', 'PDF download failed.');
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                      disabled={downloadingId === selectedId}
                    >
                      {downloadingId === selectedId ? (
                        <ActivityIndicator size="small" color={Theme.colors.card} />
                      ) : (
                        <Text style={styles.actionBtn}>Download PDF</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={[styles.actionBtn, styles.emailBtn]} onPress={handleSendSingleEmail} disabled={sendingEmail}>
                      {sendingEmail ? (
                        <ActivityIndicator size="small" color={Theme.colors.card} />
                      ) : (
                        <Text style={styles.actionBtn}>Send Mail</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        ) : null}
        {!selectedId && employees.length > 0 ? (
          <View style={styles.emptyStateLarge}>
            <Text style={styles.emptyStateLargeText}>Select a staff member to generate their payslip</Text>
          </View>
        ) : null}
        {loadingEmps ? (
          <View style={styles.loadingContainer}>
            <ScreenSkeleton variant="list" />
            <Text style={styles.loadingText}>Loading staff…</Text>
          </View>
        ) : null}
        {openPayslip ? (
          <PayslipModal
            result={openPayslip}
            month={month}
            year={String(year)}
            companyName={companyName}
            schoolCode={schoolCode}
            onClose={() => setOpenPayslip(null)}
          />
        ) : null}
        {pickerModal ? <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} /> : null}
      </View>
    </ScrollView>
  );
}
