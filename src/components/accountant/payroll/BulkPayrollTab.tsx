import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { ChevronDown, AlertTriangle, Users, Info } from 'lucide-react-native';
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
import AttendanceSummaryTable from './AttendanceSummaryTable';
import CorporateConfigForm from './CorporateConfigForm';
import PayrollEmployeeRow from './PayrollEmployeeRow';
import PayrollFiltersBar from './PayrollFiltersBar';
import { PayrollField, PayrollTypeToggle } from './PayrollFormFields';
import PayslipModal from './PayslipModal';
import { PayrollBulkSummaryBar } from './PayrollSummaryCards';
import {
  calcCorporate,
  calcFixed,
  downloadPayslipOrAlert,
  emptyAttendance,
  fetchLeaveBreakdown,
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
  type FixedConfig,
  type CorporateConfig,
  type LeavePolicy,
  type PayrollResult,
  type PickerModalState,
} from './types';

type Props = {
  schoolCode: string;
  companyName: string;
  pageChrome?: React.ReactNode;
};

export default function BulkPayrollTab({ schoolCode, companyName, pageChrome }: Props) {
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
  const [pickerModal, setPickerModal] = useState<PickerModalState>(null);

  const wDays = mode === 'fixed' ? fixedCfg.working_days : corpCfg.working_days;

  const loadEmployeesAndLeavePolicy = async () => {
    if (!schoolCode) { setEmployees([]); return; }
    setLoadingEmps(true);
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
      if (leaveResponse) {
        const leavePolicyData = leaveResponse.data;
        if (leavePolicyData) {
          setLeavePolicy({
            casual_leave: Number(leavePolicyData.casual_leave || 1),
            sick_leave: Number(leavePolicyData.sick_leave || 1),
            paid_leave: Number(leavePolicyData.paid_leave || 1),
            comp_off: Number(leavePolicyData.comp_off || 0),
          });
        }
      }
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmps(false);
    }
  };

  useEffect(() => { loadEmployeesAndLeavePolicy(); }, [schoolCode]);

  function resetCalc() {
    setAttMap({});
    setAttFetched(false);
    setGeneratedMap({});
  }

  const fetchAttendance = async () => {
    if (!schoolCode || employees.length === 0) { return; }
    if (isPeriodInFuture(month, year)) {
      Alert.alert('Error', `Cannot fetch attendance for future period (${month} ${year}).`);
      return;
    }
    setLoadingAtt(true);
    setAttFetched(false);
    setGeneratedMap({});
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
      setAttMap(map);
      setAttFetched(true);
    } catch {
      Alert.alert('Error', 'Failed to fetch attendance data');
    } finally {
      setLoadingAtt(false);
    }
  };

  const generateForEmployee = (emp: Employee) => {
    const att = attMap[emp.teacher_id] || emptyAttendance(emp.teacher_id, wDays);
    const result = mode === 'fixed'
      ? calcFixed(emp, att, fixedCfg, leavePolicy)
      : calcCorporate(emp, att, corpCfg, leavePolicy);
    setGeneratedMap(prev => ({ ...prev, [emp.teacher_id]: result }));
  };

  const generateAll = () => { employees.forEach(emp => generateForEmployee(emp)); };

  const handleSaveAll = async () => {
    const genCount = Object.keys(generatedMap).length;
    if (genCount === 0) { Alert.alert('Info', 'No payroll records to save.'); return; }
    setSavingAll(true);
    try {
      const records = Object.values(generatedMap).map(result => ({
        teacher_id: result.employee.teacher_id,
        employee_id: result.employee.employee_id,
        teacher_name: result.employee.teacher_full_name,
        email: result.employee.email_id,
        designation: result.employee.designation,
        employment_type: result.employee.employment_type,
        doj: result.employee.date_of_joining,
        salary: result.basic,
        present_days: result.present_days,
        absent_days: result.absent_days,
        lop_days: result.lop_days,
        lop_deduction: result.lop_deduction,
        gross_salary: result.gross,
        pf: result.pf || 0,
        esi: result.esi || 0,
        professional_tax: result.professional_tax || 0,
        other_deduction: result.other_deduction || 0,
        net_salary: result.net,
        mode: result.mode,
        working_days: result.applicable_working_days || wDays,
      }));
      const response = await API.post('accountant/payroll/save-all', {
        school_code: schoolCode,
        pay_month: month,
        pay_year: year,
        working_days: wDays,
        records,
      });
      if (response.data.success) {
        Alert.alert('Success', `✅ ${response.data.saved_count} payroll records saved!`);
      }
    } catch {
      Alert.alert('Error', 'Error saving payroll records.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleSendEmails = async () => {
    const genCount = Object.keys(generatedMap).length;
    if (genCount === 0) { Alert.alert('Info', 'No payroll records to send.'); return; }
    Alert.alert('Confirm', `Send payroll emails to ${genCount} employees?`, [{
      text: 'Cancel',
      style: 'cancel',
    }, {
      text: 'Send',
      onPress: async () => {
        setSendingEmails(true);
        try {
          const records = Object.values(generatedMap).map(result => ({
            teacher_id: result.employee.teacher_id,
            teacher_name: result.employee.teacher_full_name,
            email: result.employee.email_id || result.employee.email,
            present_days: result.present_days,
            absent_days: result.absent_days,
            lop_days: result.lop_days,
            lop_deduction: result.lop_deduction,
            gross_salary: result.gross,
            net_salary: result.net,
            total_deductions: result.total_deductions,
            mode: result.mode,
          }));
          const response = await API.post('accountant/payroll/send-email-bulk', {
            school_code: schoolCode,
            pay_month: month,
            pay_year: year,
            company_name: companyName,
            records,
          });
          if (response.data.success) {
            Alert.alert('Success', '📧 Emails are being sent!');
          }
        } catch {
          Alert.alert('Error', 'Error sending emails.');
        } finally {
          setSendingEmails(false);
        }
      },
    }]);
  };

  const handleDownloadPDF = async (result: PayrollResult, empId: string) => {
    setDownloadingId(empId);
    await downloadPayslipOrAlert(result, month, String(year), schoolCode, companyName);
    setDownloadingId(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployeesAndLeavePolicy();
    resetCalc();
    setRefreshing(false);
  };

  const filteredEmps = employees.filter(e =>
    !searchQuery ||
    (e.teacher_full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );
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
          <ScreenSkeleton variant="list" />
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
                  <PayrollField label="Month" width="48%">
                    <TouchableOpacity
                      accessibilityRole="button"
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
                        onValueChange: (v) => { setYear(v); resetCalc(); },
                      })}
                    >
                      <Text style={styles.pickerTriggerText}>{year}</Text>
                      <ChevronDown size={18} color={Theme.colors.textSec} />
                    </TouchableOpacity>
                  </PayrollField>
                  <PayrollField label="Working Days" hint="Days in pay period" width="100%">
                    <TextInput
                      style={styles.input}
                      value={String(wDays)}
                      onChangeText={(text) => {
                        const v = Number(text) || 26;
                        if (mode === 'fixed') { setFixedCfg(p => ({ ...p, working_days: v })); }
                        else { setCorpCfg(p => ({ ...p, working_days: v })); }
                        resetCalc();
                      }}
                      keyboardType="numeric"
                    />
                  </PayrollField>
                </View>
                {isPeriodFuture ? (
                  <View style={styles.warningBox}>
                    <AlertTriangle size={16} color="#f97316" />
                    <Text style={[styles.warningText, { flex: 1 }]}>
                      {month} {year} is a future period — payroll cannot be generated yet.
                    </Text>
                  </View>
                ) : null}
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
                <View style={styles.modeSection}>
                  <Text style={styles.sectionHeaderText}>Payroll Type</Text>
                  <PayrollTypeToggle mode={mode} onChange={m => { setMode(m); resetCalc(); }} />
                </View>
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
              {employees.length > 0 ? (
                <View style={styles.cardSection}>
                  <View style={styles.fetchRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.fetchButton, (loadingAtt || isPeriodFuture) && styles.fetchButtonDisabled]}
                      onPress={fetchAttendance}
                      disabled={loadingAtt || isPeriodFuture}
                    >
                      {loadingAtt ? (
                        <ActivityIndicator size="small" color="#4f46e5" />
                      ) : (
                        <Text style={styles.fetchButtonText}>Fetch {month} {year} Attendance</Text>
                      )}
                    </TouchableOpacity>
                    {attFetched ? (
                      <>
                        <TouchableOpacity accessibilityRole="button" style={styles.viewAttButton} onPress={() => setShowAttTable(!showAttTable)}>
                          <Text style={styles.viewAttButtonText}>{showAttTable ? 'Hide' : 'View'} Attendance Summary</Text>
                        </TouchableOpacity>
                        <View style={styles.attLoadedBadge}>
                          <Text style={styles.attLoadedText}>✓ Attendance loaded for {Object.keys(attMap).length} staff</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {showAttTable && attFetched && employees.length > 0 ? (
                <AttendanceSummaryTable employees={employees} attMap={attMap} wDays={wDays} />
              ) : null}
            </View>
            {attFetched && employees.length > 0 && genCount === 0 && !isPeriodFuture ? (
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
            ) : null}
            {attFetched && employees.length > 0 ? (
              <View style={styles.resultsContainer}>
                <PayrollBulkSummaryBar
                  genCount={genCount}
                  totalEmployees={employees.length}
                  totalGross={totalGross}
                  totalDed={totalDed}
                  totalNet={totalNet}
                />
                <PayrollFiltersBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  genCount={genCount}
                  totalEmployees={employees.length}
                  savingAll={savingAll}
                  sendingEmails={sendingEmails}
                  onGenerateAll={generateAll}
                  onSaveAll={handleSaveAll}
                  onSendEmails={handleSendEmails}
                />
              </View>
            ) : null}
          </View>
        </>
      }
      data={showEmployeeList ? filteredEmps : []}
      keyExtractor={(item, index) => item.teacher_id || item.employee_id || (item as any).id || `employee-${index}`}
      renderItem={({ item: emp }) => (
        <PayrollEmployeeRow
          emp={emp}
          att={attMap[emp.teacher_id]}
          result={generatedMap[emp.teacher_id]}
          mode={mode}
          isPeriodFuture={isPeriodFuture}
          attFetched={attFetched}
          downloading={downloadingId === emp.teacher_id}
          onGenerate={() => generateForEmployee(emp)}
          onView={() => { const r = generatedMap[emp.teacher_id]; if (r) { setOpenPayslip(r); } }}
          onDownload={() => { const r = generatedMap[emp.teacher_id]; if (r) { handleDownloadPDF(r, emp.teacher_id); } }}
          onRecalculate={() => generateForEmployee(emp)}
        />
      )}
      ListEmptyComponent={renderListEmpty}
      ListFooterComponent={
        <>
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
        </>
      }
    />
  );
}
