import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollTabBar } from '../../../hooks/useScrollTabBar';
import CustomPickerModal from '../../common/CustomPickerModal';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { Theme } from '../../../theme/tokens';
import * as principalService from '../../../services/principalService';
import API from '../../../services/api';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import HoursPayrollRow from './HoursPayrollRow';
import { PayrollField, RupeeInput } from './PayrollFormFields';
import { PayrollHoursSummaryBar } from './PayrollSummaryCards';
import { payrollStyles as styles } from './payrollStyles';
import { MONTHS, type HourlyEmployee, type PickerModalState } from './types';

type Props = {
  schoolCode: string;
  companyName: string;
  pageChrome?: React.ReactNode;
};

export default function HoursBasedPayrollTab({ schoolCode, companyName: _companyName, pageChrome }: Props) {
  const insets = useSafeAreaInsets();
  const handleScroll = useScrollTabBar();
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const [employees, setEmployees] = useState<HourlyEmployee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [globalRate, setGlobalRate] = useState(0);
  const [pickerModal, setPickerModal] = useState<PickerModalState>(null);

  useEffect(() => {
    if (!schoolCode) { setEmployees([]); return; }
    setLoadingEmps(true);
    (async () => {
      try {
        const branchId = await storage.getString(StorageKeys.BRANCH_ID) || '';
        const empData = await principalService.getPrincipalTeachers({
          'school-code': schoolCode,
          ...(branchId ? { 'branch-id': branchId } : {}),
        });
        const mappedEmps = empData
          .filter(e => (e.employment_type || '').toLowerCase().includes('part'))
          .map(t => ({
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
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmps(false);
      }
    })();
  }, [schoolCode, month, year]);

  const applyGlobalRate = () => {
    setEmployees(prev => prev.map(e => ({
      ...e,
      hourlyRate: globalRate,
      gross: e.attFetched ? e.totalHours * globalRate : null,
      net: e.attFetched ? e.totalHours * globalRate : null,
    })));
  };

  const fetchAttForEmp = async (empId: string) => {
    setEmployees(prev => prev.map(e => e.teacher_id === empId ? { ...e, loadingAtt: true } : e));
    const mi = MONTHS.indexOf(month);
    const startDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, mi + 1, 0);
    const endDateStr = `${year}-${String(mi + 1).padStart(2, '0')}-${endDate.getDate()}`;
    try {
      const response = await API.get(
        `accountant/payroll/attendance?school_code=${encodeURIComponent(schoolCode)}&start_date=${startDateStr}&end_date=${endDateStr}`,
      );
      const data = response.data;
      const att = Array.isArray(data) ? data.find(a => a.teacher_id === empId) : null;
      const totalHours = att ? (att.present_days || 0) * 8 : 0;
      setEmployees(prev => prev.map(e => {
        if (e.teacher_id !== empId) { return e; }
        const gross = totalHours * e.hourlyRate;
        return { ...e, totalHours, attFetched: true, loadingAtt: false, gross, net: gross };
      }));
    } catch {
      setEmployees(prev => prev.map(e => e.teacher_id === empId ? { ...e, loadingAtt: false } : e));
    }
  };

  const handleRateChange = (teacherId: string, rate: number) => {
    setEmployees(prev => prev.map(e2 =>
      e2.teacher_id === teacherId
        ? { ...e2, hourlyRate: rate, gross: e2.attFetched ? e2.totalHours * rate : null, net: e2.attFetched ? e2.totalHours * rate : null }
        : e2,
    ));
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
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            ⏰ Hours-Based Payroll — Only Part-Time staff appear here. Attendance is estimated at 8 hours/present day for the selected period.
          </Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardSection}>
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
              <PayrollField label="Rate per Hour (₹)" width="100%">
                <View style={styles.applyRateRow}>
                  <View style={{ flex: 1 }}><RupeeInput value={globalRate} onChange={setGlobalRate} /></View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.applyButton, !globalRate && styles.applyButtonDisabled]}
                    onPress={applyGlobalRate}
                    disabled={!globalRate}
                  >
                    <Text style={styles.applyButtonText}>Apply to All</Text>
                  </TouchableOpacity>
                </View>
              </PayrollField>
            </View>
          </View>
        </View>
        <PayrollHoursSummaryBar
          generatedCount={generatedCount}
          totalHoursAll={totalHoursAll}
          totalNet={totalNet}
        />
        {employees.length > 0 ? (
          <View style={styles.hoursListContainer}>
            <View style={styles.hoursHeader}>
              <Text style={styles.hoursHeaderTitle}>Part-Time Staff — {month} {year}</Text>
              <Text style={styles.hoursHeaderCount}>{employees.length} staff member(s)</Text>
            </View>
            {employees.map((emp, index) => (
              <HoursPayrollRow
                key={emp.teacher_id || emp.employee_id || `emp-${index}`}
                emp={emp}
                onRateChange={handleRateChange}
                onFetchHours={fetchAttForEmp}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateLarge}>
            <Text style={styles.emptyStateLargeText}>No Part-Time staff found</Text>
            <Text style={styles.emptyStateSubtext}>Staff with "Part-Time" employment type appear here</Text>
          </View>
        )}
        {pickerModal ? <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} /> : null}
      </View>
    </ScrollView>
  );
}
