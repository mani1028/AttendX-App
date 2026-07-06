import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  CalendarDays,
  Settings,
  Wrench,
  RefreshCw,
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import API from '../../services/api';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';

const STEPS = { SELECT: 1, PREVIEW: 2, CONFIRM: 3, DONE: 4 } as const;
const STEP_LABELS = ['Select', 'Preview', 'Confirm', 'Done'];
type PromoTab = 'promote' | 'history' | 'years' | 'settings' | 'tools';
const TABS: { id: PromoTab; label: string; icon: typeof GraduationCap }[] = [
  { id: 'promote', label: 'Promote', icon: GraduationCap },
  { id: 'history', label: 'History', icon: History },
  { id: 'years', label: 'Years', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'tools', label: 'Tools', icon: Wrench },
];

type PromoStudent = {
  roll_no: string;
  student_full_name?: string;
  class_grade?: string;
  section?: string;
  final_action?: string;
  to_class_name?: string;
  to_section_name?: string;
  is_already_processed?: boolean;
};

async function getPromoHeaders() {
  const schoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
  const branchId = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
  return {
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  };
}

const PICKER_TEXT = Theme.colors.text;
const PICKER_MUTED = Theme.colors.textMuted;

function PromoPicker({
  selectedValue,
  onValueChange,
  enabled = true,
  children,
}: {
  selectedValue: string;
  onValueChange: (v: string) => void;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.pickerWrap, !enabled && styles.pickerDisabled]}>
      <Picker
        enabled={enabled}
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
        itemStyle={styles.pickerItem}
        dropdownIconColor={PICKER_TEXT}
        mode="dropdown"
      >
        {children}
      </Picker>
    </View>
  );
}

export default function StudentPromotionScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<PromoTab>('promote');
  const [step, setStep] = useState<number>(STEPS.SELECT);

  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [promoSettings, setPromoSettings] = useState<any[]>([]);
  const [transitionEvents, setTransitionEvents] = useState<any[]>([]);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<{ batch_id: number; students: any[] } | null>(null);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState<number | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearData, setNewYearData] = useState({ label: '', start: '', end: '' });
  const [creatingYear, setCreatingYear] = useState(false);
  const [newClassGrade, setNewClassGrade] = useState('');
  const [sourceClass, setSourceClass] = useState('');
  const [sourceSection, setSourceSection] = useState('');
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [academicYearLabel, setAcademicYearLabel] = useState('');
  const [batchName, setBatchName] = useState('');

  const [eligibility, setEligibility] = useState<any>(null);
  const [students, setStudents] = useState<PromoStudent[]>([]);
  const [historyBatches, setHistoryBatches] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uniqueClasses = useMemo(
    () => [...new Set(classes.map(c => c.class_grade).filter(Boolean))].sort(),
    [classes],
  );
  const sectionsForClass = useMemo(
    () => classes.filter(c => c.class_grade === sourceClass).map(c => c.section).filter(Boolean),
    [classes, sourceClass],
  );

  const loadSetup = useCallback(async () => {
    try {
      const headers = await getPromoHeaders();
      const [classRes, yrRes] = await Promise.all([
        API.get('/principal/classes', { headers, suppressFallback404Log: true } as any),
        API.get('/principal/promotion/academic-years', { headers, suppressFallback404Log: true } as any),
      ]);
      setClasses(classRes.data?.items || []);
      setAcademicYears(yrRes.data?.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load promotion setup data.');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const headers = await getPromoHeaders();
      const res = await API.get('/principal/promotion/batches', { headers, suppressFallback404Log: true } as any);
      setHistoryBatches(res.data?.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load promotion history.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadPromoSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const headers = await getPromoHeaders();
      const res = await API.get('/principal/promotion/settings', { headers, suppressFallback404Log: true } as any);
      setPromoSettings(res.data?.settings || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load promotion settings.');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadTransitionHistory = useCallback(async () => {
    try {
      const headers = await getPromoHeaders();
      const res = await API.get('/principal/events/recent', {
        headers,
        params: { entity_type: 'staff', limit: 5 },
        suppressFallback404Log: true,
      } as any);
      const events = (res.data?.items || []).filter((ev: any) => ev.event_type === 'LEAVE_TRANSITION_TRIGGERED');
      setTransitionEvents(events);
    } catch {
      setTransitionEvents([]);
    }
  }, []);

  useEffect(() => {
    loadSetup();
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); }
    };
  }, [loadSetup]);

  useEffect(() => {
    if (activeTab === 'history') { loadHistory(); }
    if (activeTab === 'settings') { loadPromoSettings(); }
    if (activeTab === 'years') { loadSetup(); loadTransitionHistory(); }
  }, [activeTab, loadHistory, loadPromoSettings, loadTransitionHistory, loadSetup]);

  const autoMapTargets = (list: PromoStudent[]) => {
    return list.map(s => {
      if (s.is_already_processed || s.final_action !== 'PROMOTED') { return s; }
      const idx = uniqueClasses.indexOf(s.class_grade || '');
      const nextClass = idx >= 0 && idx < uniqueClasses.length - 1 ? uniqueClasses[idx + 1] : s.class_grade;
      return {
        ...s,
        to_class_name: s.to_class_name || nextClass,
        to_section_name: s.to_section_name || s.section,
      };
    });
  };

  const loadEligibility = async () => {
    if (!sourceClass || !sourceYearId || !targetYearId) {
      setError('Select source class and both academic years.');
      return;
    }
    if (sourceClass !== 'ALL' && !sourceSection) {
      setError('Select a source section.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const headers = await getPromoHeaders();
      const params: Record<string, string> = { academic_year: academicYearLabel };
      if (sourceClass !== 'ALL') {
        params.class_grade = sourceClass;
        params.section = sourceSection;
      }
      const targetYear = academicYears.find(y => String(y.year_id) === String(targetYearId));
      const res = await API.get('/principal/promotion/eligibility', { headers, params, suppressFallback404Log: true } as any);
      const items = autoMapTargets(res.data?.items || []);
      setEligibility(res.data);
      setStudents(items);
      setBatchName(
        `Promotion ${sourceClass === 'ALL' ? 'Whole School' : `${sourceClass}-${sourceSection}`} → ${targetYear?.year_label || ''}`,
      );
      setStep(STEPS.PREVIEW);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load eligibility.');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentAction = (rollNo: string, action: string) => {
    setStudents(prev => prev.map(s => (s.roll_no === rollNo ? { ...s, final_action: action } : s)));
  };

  const submitBatch = async () => {
    const targetYear = academicYears.find(y => String(y.year_id) === String(targetYearId));
    const resolvedYearLabel = targetYear?.year_label || '';
    if (!resolvedYearLabel) {
      setError('Could not resolve target academic year.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const headers = await getPromoHeaders();
      const payload = {
        batch_name: batchName,
        source_year_id: Number(sourceYearId),
        target_year_id: Number(targetYearId),
        source_class: sourceClass,
        source_section: sourceSection || 'ALL',
        academic_year: resolvedYearLabel,
        students: students.map(s => ({
          roll_no: s.roll_no,
          student_full_name: s.student_full_name,
          final_action: s.final_action || 'PROMOTED',
          to_class_name: s.to_class_name || null,
          to_section_name: s.to_section_name || null,
          remarks: '',
          waived: false,
        })),
      };
      const res = await API.post('/principal/promotion/batch', payload, { headers });
      const batchId = res.data?.batch_id;
      setStep(STEPS.DONE);
      if (batchId) {
        pollRef.current = setInterval(async () => {
          try {
            const statusRes = await API.get(`/principal/promotion/batch/${batchId}`, { headers });
            setBatchStatus(statusRes.data);
            const status = String(statusRes.data?.status || '').toUpperCase();
            if (status === 'COMPLETED' || status === 'FAILED') {
              if (pollRef.current) { clearInterval(pollRef.current); }
            }
          } catch {
            // keep polling
          }
        }, 2500);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Promotion batch failed.');
    } finally {
      setLoading(false);
    }
  };

  const resetPromoteFlow = () => {
    setStep(STEPS.SELECT);
    setEligibility(null);
    setStudents([]);
    setBatchStatus(null);
    setError('');
  };

  const fetchBatchDetails = async (batchId: number) => {
    setLoadingBatchDetails(batchId);
    try {
      const headers = await getPromoHeaders();
      const res = await API.get(`/principal/promotion/batch/${batchId}/students`, {
        headers,
        params: { page: 1, page_size: 50 },
        suppressFallback404Log: true,
      } as any);
      setSelectedBatchDetails({ batch_id: batchId, students: res.data?.items || [] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to load batch details.');
    } finally {
      setLoadingBatchDetails(null);
    }
  };

  const rollbackBatch = (batchId: number) => {
    Alert.alert(
      'Rollback batch',
      'Revert this promotion batch? Students will return to their previous classes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rollback',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getPromoHeaders();
              await API.post(`/principal/promotion/batch/${batchId}/rollback`, {}, { headers });
              setSelectedBatchDetails(null);
              loadHistory();
              Alert.alert('Success', 'Batch rolled back successfully.');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Rollback failed.');
            }
          },
        },
      ],
    );
  };

  const savePromoSetting = async (setting: any) => {
    setSavingSettings(true);
    try {
      const headers = await getPromoHeaders();
      await API.post('/principal/promotion/settings', setting, { headers });
      await loadPromoSettings();
      Alert.alert('Saved', 'Promotion rule updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save setting.');
    } finally {
      setSavingSettings(false);
    }
  };

  const updatePromoSettingField = (classGrade: string, field: string, value: string | boolean | number) => {
    setPromoSettings(prev => {
      const existing = prev.find(r => r.class_grade === classGrade);
      if (existing) {
        return prev.map(r => (r.class_grade === classGrade ? { ...r, [field]: value } : r));
      }
      return [...prev, {
        class_grade: classGrade,
        min_attendance_pct: 75,
        min_marks_pct: 40,
        allow_with_dues: false,
        [field]: value,
      }];
    });
  };

  const getRule = (classGrade: string) =>
    promoSettings.find(r => r.class_grade === classGrade) || {
      class_grade: classGrade,
      min_attendance_pct: 75,
      min_marks_pct: 40,
      allow_with_dues: false,
    };

  const activateYear = (year: any) => {
    Alert.alert('Activate year', `Activate ${year.year_label}? Current active year will be closed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate',
        onPress: async () => {
          try {
            const headers = await getPromoHeaders();
            await API.post(`/principal/promotion/academic-year/${year.year_id}/activate`, {}, { headers });
            await loadSetup();
            Alert.alert('Success', `${year.year_label} is now active.`);
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Failed to activate year.');
          }
        },
      },
    ]);
  };

  const closeYear = (year: any) => {
    Alert.alert('Close year', `Close ${year.year_label}? Attendance and marks become read-only.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            const headers = await getPromoHeaders();
            await API.post(`/principal/promotion/academic-year/${year.year_id}/close`, {}, { headers });
            await loadSetup();
            Alert.alert('Success', `${year.year_label} closed.`);
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Failed to close year.');
          }
        },
      },
    ]);
  };

  const createYear = async () => {
    if (!newYearData.label.trim() || !newYearData.start || !newYearData.end) {
      Alert.alert('Error', 'Fill year label, start date, and end date.');
      return;
    }
    setCreatingYear(true);
    try {
      const headers = await getPromoHeaders();
      await API.post('/principal/promotion/academic-years', {
        year_label: newYearData.label.trim(),
        start_date: newYearData.start,
        end_date: newYearData.end,
        status: 'UPCOMING',
      }, { headers });
      setShowYearModal(false);
      setNewYearData({ label: '', start: '', end: '' });
      await loadSetup();
      Alert.alert('Success', 'Academic year created.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create year.');
    } finally {
      setCreatingYear(false);
    }
  };

  const runLeaveTransition = () => {
    Alert.alert('Reset leave balances', 'Carry forward unused leave balances to the new year?', [
      { text: 'Full reset', onPress: () => postLeaveTransition(false) },
      { text: 'Carry forward', onPress: () => postLeaveTransition(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const postLeaveTransition = async (carryForward: boolean) => {
    try {
      const headers = await getPromoHeaders();
      await API.post(`/principal/promotion/leave-transition?carry_forward=${carryForward}`, {}, { headers });
      loadTransitionHistory();
      Alert.alert('Started', 'Leave transition is running in the background.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Leave transition failed.');
    }
  };

  const runFixAcademicYears = () => {
    Alert.alert(
      'Fix academic years',
      'Update all active student records to the current active academic year?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run fix',
          onPress: async () => {
            try {
              const headers = await getPromoHeaders();
              const res = await API.post('/principal/promotion/maintenance/fix-academic-years', {}, { headers });
              Alert.alert('Done', res.data?.message || 'Academic year labels fixed.');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.detail || 'Fix tool failed.');
            }
          },
        },
      ],
    );
  };

  const renderStepBar = () => (
    <View style={styles.stepBarWrap}>
      <View style={styles.stepBarTrack} />
      <View style={styles.stepBar}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                <AppText style={[styles.stepDotText, (active || done) && styles.stepDotTextActive]}>{n}</AppText>
              </View>
              <AppText style={[styles.stepLabel, (active || done) && styles.stepLabelActive]} numberOfLines={1}>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderSelectStep = () => (
    <AppCard style={styles.card}>
      <AppText style={styles.cardTitle} weight="bold">Step 1 · Define scope</AppText>
      <AppText style={styles.cardHint}>Choose class, section, and academic years to promote students.</AppText>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Source class</AppText>
        <PromoPicker selectedValue={sourceClass} onValueChange={(v) => { setSourceClass(v); setSourceSection(''); }}>
          <Picker.Item label="Select class…" value="" color={PICKER_MUTED} />
          <Picker.Item label="ALL CLASSES (whole school)" value="ALL" color={PICKER_TEXT} />
          {uniqueClasses.map(c => <Picker.Item key={c} label={c} value={c} color={PICKER_TEXT} />)}
        </PromoPicker>
      </View>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Source section</AppText>
        {sourceClass === 'ALL' ? (
          <View style={styles.staticField}>
            <AppText style={styles.staticFieldText} weight="semibold">All sections (whole school)</AppText>
          </View>
        ) : (
          <PromoPicker
            selectedValue={sourceSection}
            onValueChange={setSourceSection}
            enabled={!!sourceClass}
          >
            <Picker.Item label="Select section…" value="" color={PICKER_MUTED} />
            {sectionsForClass.map(s => <Picker.Item key={s} label={s} value={s} color={PICKER_TEXT} />)}
          </PromoPicker>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Current academic year</AppText>
        <PromoPicker
          selectedValue={sourceYearId}
          onValueChange={(v) => {
            setSourceYearId(v);
            const yr = academicYears.find(y => String(y.year_id) === String(v));
            setAcademicYearLabel(yr?.year_label || '');
          }}
        >
          <Picker.Item label="Select year…" value="" color={PICKER_MUTED} />
          {academicYears.map(y => (
            <Picker.Item key={y.year_id} label={`${y.year_label} (${y.status})`} value={String(y.year_id)} color={PICKER_TEXT} />
          ))}
        </PromoPicker>
      </View>

      <View style={styles.fieldGroup}>
        <AppText style={styles.fieldLabel}>Target academic year</AppText>
        <PromoPicker selectedValue={targetYearId} onValueChange={setTargetYearId}>
          <Picker.Item label="Select target year…" value="" color={PICKER_MUTED} />
          {academicYears.map(y => (
            <Picker.Item key={y.year_id} label={y.year_label} value={String(y.year_id)} color={PICKER_TEXT} />
          ))}
        </PromoPicker>
      </View>

      <AppButton title="Preview eligibility" onPress={loadEligibility} disabled={loading} />
    </AppCard>
  );

  const renderPreviewStep = () => (
    <>
      {eligibility?.summary ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AppText style={styles.statValue} weight="bold">{eligibility.summary.total}</AppText>
            <AppText style={styles.statLabel}>Total</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statValue, { color: Theme.colors.success }]} weight="bold">{eligibility.summary.eligible}</AppText>
            <AppText style={styles.statLabel}>Eligible</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={[styles.statValue, { color: '#d97706' }]} weight="bold">{eligibility.summary.at_risk}</AppText>
            <AppText style={styles.statLabel}>At risk</AppText>
          </View>
        </View>
      ) : null}

      <AppCard style={styles.card}>
        <View style={styles.previewHeader}>
          <AppText style={styles.cardTitle} weight="bold">Step 2 · Review students</AppText>
          <TouchableOpacity onPress={() => setStep(STEPS.SELECT)}>
            <AppText style={styles.linkText}>Edit scope</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.studentList} nestedScrollEnabled>
          {students.map(s => (
            <View key={s.roll_no} style={styles.studentRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.studentName} weight="semibold">{s.student_full_name || s.roll_no}</AppText>
                <AppText style={styles.studentMeta}>
                  {s.class_grade}-{s.section} → {s.to_class_name || '—'}-{s.to_section_name || '—'}
                </AppText>
              </View>
              <View style={styles.actionChips}>
                {(['PROMOTED', 'DETAINED', 'GRADUATED'] as const).map(action => (
                  <TouchableOpacity
                    key={action}
                    style={[styles.chip, s.final_action === action && styles.chipActive]}
                    onPress={() => updateStudentAction(s.roll_no, action)}
                  >
                    <AppText style={[styles.chipText, s.final_action === action && styles.chipTextActive]}>
                      {action.slice(0, 3)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <AppButton title="Continue to confirm" onPress={() => setStep(STEPS.CONFIRM)} />
      </AppCard>
    </>
  );

  const renderConfirmStep = () => (
    <AppCard style={styles.card}>
      <AppText style={styles.cardTitle} weight="bold">Step 3 · Confirm promotion</AppText>
      <AppText style={styles.cardHint}>{batchName}</AppText>
      <AppText style={styles.fieldLabel}>Batch name</AppText>
      <TextInput style={styles.input} value={batchName} onChangeText={setBatchName} />

      <View style={styles.confirmStats}>
        <Users size={18} color={Theme.colors.primary} />
        <AppText style={styles.confirmStatsText}>
          {students.filter(s => s.final_action === 'PROMOTED').length} students will be promoted
        </AppText>
      </View>

      <View style={styles.confirmActions}>
        <AppButton title="Back" type="secondary" onPress={() => setStep(STEPS.PREVIEW)} />
        <View style={{ width: 10 }} />
        <AppButton title={loading ? 'Submitting…' : 'Run promotion'} onPress={submitBatch} disabled={loading} />
      </View>
    </AppCard>
  );

  const renderDoneStep = () => (
    <AppCard style={styles.card}>
      <View style={styles.doneIcon}>
        <CheckCircle2 size={36} color={Theme.colors.success} />
      </View>
      <AppText style={styles.doneTitle} weight="bold">Promotion started</AppText>
      <AppText style={styles.cardHint}>
        {batchStatus?.status
          ? `Status: ${batchStatus.status} · ${batchStatus.success_count ?? 0}/${batchStatus.total_students ?? 0} processed`
          : 'Your batch is processing. Check History for final results.'}
      </AppText>
      <AppButton title="View history" onPress={() => { resetPromoteFlow(); setActiveTab('history'); }} />
      <View style={{ height: 10 }} />
      <AppButton title="Promote again" type="secondary" onPress={resetPromoteFlow} />
    </AppCard>
  );

  const renderYearsTab = () => (
    <>
      <AppCard style={styles.card}>
        <AppText style={styles.cardTitle} weight="bold">Academic Years</AppText>
        <AppText style={styles.cardHint}>Activate upcoming years or close the current year before promoting.</AppText>
        {academicYears.length === 0 ? (
          <AppText style={styles.cardHint}>No academic years found.</AppText>
        ) : academicYears.map(y => (
          <View key={y.year_id} style={styles.yearRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.studentName} weight="semibold">{y.year_label}</AppText>
              <AppText style={styles.studentMeta}>{y.start_date} → {y.end_date}</AppText>
              <AppText style={[styles.studentMeta, styles.statusText]}>{y.status}</AppText>
            </View>
            {y.status === 'UPCOMING' && (
              <TouchableOpacity style={styles.smallBtn} onPress={() => activateYear(y)}>
                <AppText style={styles.smallBtnTextSuccess} weight="bold">Activate</AppText>
              </TouchableOpacity>
            )}
            {y.status === 'ACTIVE' && (
              <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => closeYear(y)}>
                <AppText style={styles.smallBtnTextDanger} weight="bold">Close</AppText>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <View style={{ height: 12 }} />
        <AppButton title="+ Add upcoming year" type="secondary" onPress={() => setShowYearModal(true)} />
      </AppCard>

      <AppCard style={styles.card}>
        <AppText style={styles.cardTitle} weight="bold">Staff Leave Transition</AppText>
        <AppText style={styles.cardHint}>Reset or carry forward staff leave balances for a new academic year.</AppText>
        <AppButton title="Reset leave balances" onPress={runLeaveTransition} />
        {transitionEvents.map(ev => (
          <View key={ev.id} style={styles.transitionRow}>
            <AppText style={styles.studentMeta} weight="semibold">
              {ev.event_data?.carry_forward ? 'Carry forward' : 'Full reset'}
            </AppText>
            <AppText style={styles.studentMeta}>
              {ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-IN') : '—'}
            </AppText>
          </View>
        ))}
      </AppCard>
    </>
  );

  const renderSettingsTab = () => {
    const allRule = getRule('ALL');
    const classRules = promoSettings.filter(r => r.class_grade !== 'ALL');
    return (
      <>
        <AppCard style={styles.card}>
          <AppText style={styles.cardTitle} weight="bold">Global promotion rules</AppText>
          <AppText style={styles.cardHint}>Default thresholds for all classes unless overridden below.</AppText>
          {loadingSettings ? (
            <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <>
              <AppText style={styles.fieldLabel}>Min attendance %</AppText>
              <TextInput
                style={styles.input}
                value={String(allRule.min_attendance_pct ?? 75)}
                onChangeText={v => updatePromoSettingField('ALL', 'min_attendance_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <AppText style={styles.fieldLabel}>Min marks %</AppText>
              <TextInput
                style={styles.input}
                value={String(allRule.min_marks_pct ?? 40)}
                onChangeText={v => updatePromoSettingField('ALL', 'min_marks_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <View style={styles.switchRow}>
                <AppText style={styles.fieldLabel}>Allow with dues</AppText>
                <Switch
                  value={Boolean(allRule.allow_with_dues)}
                  onValueChange={v => updatePromoSettingField('ALL', 'allow_with_dues', v)}
                />
              </View>
              <AppButton title="Save global rules" onPress={() => savePromoSetting(allRule)} disabled={savingSettings} />
            </>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText style={styles.cardTitle} weight="bold">Class overrides</AppText>
          {classRules.map(rule => (
            <View key={rule.class_grade} style={styles.settingRuleCard}>
              <AppText style={styles.studentName} weight="bold">Class {rule.class_grade}</AppText>
              <AppText style={styles.fieldLabel}>Min attendance %</AppText>
              <TextInput
                style={styles.input}
                value={String(rule.min_attendance_pct ?? 75)}
                onChangeText={v => updatePromoSettingField(rule.class_grade, 'min_attendance_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <AppText style={styles.fieldLabel}>Min marks %</AppText>
              <TextInput
                style={styles.input}
                value={String(rule.min_marks_pct ?? 40)}
                onChangeText={v => updatePromoSettingField(rule.class_grade, 'min_marks_pct', Number(v) || 0)}
                keyboardType="number-pad"
              />
              <View style={styles.switchRow}>
                <AppText style={styles.fieldLabel}>Allow with dues</AppText>
                <Switch
                  value={Boolean(rule.allow_with_dues)}
                  onValueChange={v => updatePromoSettingField(rule.class_grade, 'allow_with_dues', v)}
                />
              </View>
              <AppButton title={`Save class ${rule.class_grade}`} type="secondary" onPress={() => savePromoSetting(getRule(rule.class_grade))} disabled={savingSettings} />
            </View>
          ))}
          <AppText style={styles.fieldLabel}>Add class override</AppText>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={newClassGrade}
              onValueChange={setNewClassGrade}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor={PICKER_TEXT}
              mode="dropdown"
            >
              <Picker.Item label="Select class…" value="" color={PICKER_MUTED} />
              {uniqueClasses.filter(c => c !== 'ALL' && !classRules.some(r => r.class_grade === c)).map(c => (
                <Picker.Item key={c} label={c} value={c} color={PICKER_TEXT} />
              ))}
            </Picker>
          </View>
          {newClassGrade ? (
            <AppButton
              title={`Add rules for class ${newClassGrade}`}
              type="secondary"
              onPress={() => {
                updatePromoSettingField(newClassGrade, 'min_attendance_pct', 75);
                setNewClassGrade('');
              }}
            />
          ) : null}
        </AppCard>
      </>
    );
  };

  const renderToolsTab = () => (
    <AppCard style={styles.card}>
      <AppText style={styles.cardTitle} weight="bold">System maintenance</AppText>
      <AppText style={styles.cardHint}>
        Fix student academic year labels after imports. Face embedding sync is available on the web portal.
      </AppText>
      <AppButton title="Fix student academic year labels" onPress={runFixAcademicYears} />
    </AppCard>
  );

  const renderHistoryTab = () => {
    if (loadingHistory) {
      return <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />;
    }
    if (historyBatches.length === 0) {
      return (
        <AppCard style={styles.card}>
          <Clock size={32} color={Theme.colors.textSec} style={{ alignSelf: 'center', marginBottom: 12 }} />
          <AppText style={styles.emptyTitle} weight="bold">No promotion history yet</AppText>
          <AppText style={styles.cardHint}>Run your first promotion batch to see results here.</AppText>
          <AppButton title="Start promotion" onPress={() => setActiveTab('promote')} />
        </AppCard>
      );
    }
    return (
      <>
        {historyBatches.map(batch => (
          <AppCard key={batch.batch_id} style={styles.historyCard}>
            <AppText style={styles.historyName} weight="bold">{batch.batch_name}</AppText>
            <AppText style={styles.historyMeta}>
              #{batch.batch_id} · {batch.status} · {batch.success_count}/{batch.total_students} processed
              {batch.failure_count ? ` · ${batch.failure_count} errors` : ''}
            </AppText>
            <AppText style={styles.historyDate}>
              {batch.created_at ? new Date(batch.created_at).toLocaleString('en-IN') : '—'}
            </AppText>
            <View style={styles.historyActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => fetchBatchDetails(batch.batch_id)}>
                {loadingBatchDetails === batch.batch_id ? (
                  <ActivityIndicator size="small" color={Theme.colors.primary} />
                ) : (
                  <AppText style={styles.smallBtnText} weight="bold">View details</AppText>
                )}
              </TouchableOpacity>
              {String(batch.status).toUpperCase() === 'COMPLETED' && (
                <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => rollbackBatch(batch.batch_id)}>
                  <AppText style={styles.smallBtnTextDanger} weight="bold">Rollback</AppText>
                </TouchableOpacity>
              )}
            </View>
          </AppCard>
        ))}
        {selectedBatchDetails ? (
          <AppCard style={styles.card}>
            <View style={styles.previewHeader}>
              <AppText style={styles.cardTitle} weight="bold">Batch #{selectedBatchDetails.batch_id}</AppText>
              <TouchableOpacity onPress={() => setSelectedBatchDetails(null)}>
                <AppText style={styles.linkText}>Close</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.studentList} nestedScrollEnabled>
              {selectedBatchDetails.students.map(s => (
                <View key={s.roll_no} style={styles.studentRow}>
                  <AppText style={styles.studentName} weight="semibold">{s.student_full_name || s.roll_no}</AppText>
                  <AppText style={styles.studentMeta}>
                    {s.from_class_name}-{s.from_section_name} → {s.to_class_name || '—'}-{s.to_section_name || '—'}
                  </AppText>
                  <AppText style={styles.studentMeta}>
                    Marks {s.avg_marks_pct ?? '—'}% · Attendance {s.attendance_pct ?? '—'}% · {s.promotion_status}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          </AppCard>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Student Promotion"
        subtitle="Promote students to the next academic year"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={innerPageLayoutStyles.contentFront}>
          <View style={styles.tabBarWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarScroll}
            >
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    accessibilityRole="button"
                    style={[styles.tabPill, active && styles.tabPillActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Icon size={14} color={active ? '#fff' : Theme.colors.textSec} />
                    <AppText
                      style={[styles.tabPillText, active && styles.tabPillTextActive]}
                      weight={active ? 'bold' : 'semibold'}
                    >
                      {tab.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <AlertTriangle size={16} color={Theme.colors.error} />
              <AppText style={styles.errorText}>{error}</AppText>
            </View>
          ) : null}

          {activeTab === 'promote' ? (
            <>
              {renderStepBar()}
              {step === STEPS.SELECT && renderSelectStep()}
              {step === STEPS.PREVIEW && renderPreviewStep()}
              {step === STEPS.CONFIRM && renderConfirmStep()}
              {step === STEPS.DONE && renderDoneStep()}
            </>
          ) : activeTab === 'history' ? (
            renderHistoryTab()
          ) : activeTab === 'years' ? (
            renderYearsTab()
          ) : activeTab === 'settings' ? (
            renderSettingsTab()
          ) : (
            renderToolsTab()
          )}
        </View>
      </ScrollView>

      <Modal visible={showYearModal} transparent animationType="slide" onRequestClose={() => setShowYearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText style={styles.cardTitle} weight="bold">Add academic year</AppText>
            <AppText style={styles.fieldLabel}>Year label</AppText>
            <TextInput style={styles.input} placeholder="2026-27" value={newYearData.label} onChangeText={v => setNewYearData(p => ({ ...p, label: v }))} />
            <AppText style={styles.fieldLabel}>Start date (YYYY-MM-DD)</AppText>
            <TextInput style={styles.input} placeholder="2026-04-01" value={newYearData.start} onChangeText={v => setNewYearData(p => ({ ...p, start: v }))} />
            <AppText style={styles.fieldLabel}>End date (YYYY-MM-DD)</AppText>
            <TextInput style={styles.input} placeholder="2027-03-31" value={newYearData.end} onChangeText={v => setNewYearData(p => ({ ...p, end: v }))} />
            <View style={styles.confirmActions}>
              <AppButton title="Cancel" type="secondary" onPress={() => setShowYearModal(false)} />
              <View style={{ width: 10 }} />
              <AppButton title={creatingYear ? 'Creating…' : 'Create'} onPress={createYear} disabled={creatingYear} />
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Theme.colors.card} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
  },
  tabBarWrap: {
    marginBottom: 16,
    backgroundColor: Theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 5,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: Theme.colors.primary,
  },
  tabPillText: { fontSize: 13, color: Theme.colors.textSec },
  tabPillTextActive: { color: '#fff' },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  smallBtnDanger: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  smallBtnText: { fontSize: 12, color: Theme.colors.primary },
  smallBtnTextSuccess: { fontSize: 12, color: Theme.colors.success },
  smallBtnTextDanger: { fontSize: 12, color: Theme.colors.error },
  historyActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  transitionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  settingRuleCard: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusText: { color: Theme.colors.primary, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  stepBarWrap: {
    marginTop: 4,
    marginBottom: 18,
    position: 'relative',
  },
  stepBarTrack: {
    position: 'absolute',
    top: 14,
    left: '12%',
    right: '12%',
    height: 2,
    backgroundColor: Theme.colors.border,
    zIndex: 0,
  },
  stepBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    zIndex: 1,
  },
  stepItem: { alignItems: 'center', flex: 1, minWidth: 0 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
  },
  stepDotActive: { borderColor: Theme.colors.primary, backgroundColor: Theme.colors.primary },
  stepDotDone: { borderColor: Theme.colors.success, backgroundColor: Theme.colors.success },
  stepDotText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textSec },
  stepDotTextActive: { color: Theme.colors.card },
  stepLabel: { fontSize: 11, color: Theme.colors.textSec, marginTop: 6, fontWeight: '600', textAlign: 'center' },
  stepLabelActive: { color: Theme.colors.primary },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
  },
  cardTitle: { fontSize: 17, color: Theme.colors.text, marginBottom: 6 },
  cardHint: { fontSize: 13, color: Theme.colors.textSec, marginBottom: 16, lineHeight: 18 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Theme.colors.text, marginBottom: 8 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    minHeight: Platform.OS === 'ios' ? 48 : 52,
    justifyContent: 'center',
  },
  picker: {
    color: PICKER_TEXT,
    marginHorizontal: Platform.OS === 'android' ? -4 : 0,
  },
  pickerItem: {
    color: PICKER_TEXT,
    fontSize: 16,
  },
  pickerDisabled: {
    backgroundColor: '#f1f5f9',
  },
  staticField: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  staticFieldText: {
    fontSize: 14,
    color: Theme.colors.textSec,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, color: Theme.colors.text },
  statLabel: { fontSize: 11, color: Theme.colors.textSec, marginTop: 2 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  linkText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 13 },
  studentList: { maxHeight: 320, marginBottom: 14 },
  studentRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: 8,
  },
  studentName: { fontSize: 14, color: Theme.colors.text },
  studentMeta: { fontSize: 12, color: Theme.colors.textSec, marginTop: 2 },
  actionChips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  chipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: Theme.colors.textSec },
  chipTextActive: { color: Theme.colors.card },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.card,
    marginBottom: 14,
  },
  confirmStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  confirmStatsText: { fontSize: 14, color: Theme.colors.text, flex: 1 },
  confirmActions: { flexDirection: 'row' },
  doneIcon: { alignSelf: 'center', marginBottom: 12 },
  doneTitle: { fontSize: 20, textAlign: 'center', marginBottom: 8, color: Theme.colors.text },
  historyCard: { marginBottom: 10, padding: 14 },
  historyName: { fontSize: 15, color: Theme.colors.text },
  historyMeta: { fontSize: 12, color: Theme.colors.textSec, marginTop: 4 },
  historyDate: { fontSize: 11, color: Theme.colors.textSec, marginTop: 4 },
  emptyTitle: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: Theme.colors.error },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
