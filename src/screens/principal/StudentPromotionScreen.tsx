import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
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
import { studentPromotionStyles as styles } from '../../components/principal/studentPromotion/studentPromotionStyles';


import {
  STEPS,
  TABS,
  PromoPicker,
  getPromoHeaders,
  type PromoTab,
  type PromoStudent,
} from '../../components/principal/studentPromotion';
import { createPromotionRenderers } from '../../components/principal/studentPromotion/promotionRenderers';
import AddYearModal from '../../components/principal/studentPromotion/AddYearModal';

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

  const panels = createPromotionRenderers({
    step, setStep, sourceClass, setSourceClass, sourceSection, setSourceSection,
    sourceYearId, setSourceYearId, targetYearId, setTargetYearId, batchName, setBatchName,
    uniqueClasses, sectionsForClass, academicYears, students, eligibility, loading,
    loadEligibility, resetPromoteFlow, setActiveTab, batchStatus,
    academicYearLabel, setAcademicYearLabel, historyBatches, loadingHistory, selectedBatchDetails, loadingBatchDetails,
    fetchBatchDetails, setSelectedBatchDetails, promoSettings, loadingSettings, savingSettings, getRule, updatePromoSettingField,
    savePromoSetting, newClassGrade, setNewClassGrade, activateYear, closeYear,
    setShowYearModal, transitionEvents, runLeaveTransition, runFixAcademicYears,
    updateStudentAction, submitBatch, rollbackBatch,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Student Promotion"
        subtitle="Promote students to the next academic year"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
      />

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
                    <Icon size={14} color={active ? Theme.colors.card : Theme.colors.textSec} />
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
              {panels.renderStepBar()}
              {step === STEPS.SELECT && panels.renderSelectStep()}
              {step === STEPS.PREVIEW && panels.renderPreviewStep()}
              {step === STEPS.CONFIRM && panels.renderConfirmStep()}
              {step === STEPS.DONE && panels.renderDoneStep()}
            </>
          ) : activeTab === 'history' ? (
            panels.renderHistoryTab()
          ) : activeTab === 'years' ? (
            panels.renderYearsTab()
          ) : activeTab === 'settings' ? (
            panels.renderSettingsTab()
          ) : (
            panels.renderToolsTab()
          )}
        </View>
      </ScrollView>

      <AddYearModal
        visible={showYearModal}
        creatingYear={creatingYear}
        newYearData={newYearData}
        onChange={patch => setNewYearData(p => ({ ...p, ...patch }))}
        onClose={() => setShowYearModal(false)}
        onCreate={createYear}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ScreenSkeleton variant="list" />
        </View>
      )}
    </View>
  );
}
