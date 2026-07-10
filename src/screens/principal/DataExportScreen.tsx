import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart3, PenSquare, ClipboardList } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { dataExportStyles as styles } from '../../components/principal/dataExport/dataExportStyles';
import AttendanceExportTab from '../../components/principal/dataExport/AttendanceExportTab';
import MarksExportTab from '../../components/principal/dataExport/MarksExportTab';
import CombinedExportTab from '../../components/principal/dataExport/CombinedExportTab';
import { getDateRangeForAttendance, getDateRangeForCombined, downloadAndShareFile, resolveExportError } from '../../components/principal/dataExport/helpers';
import type { ClassSectionPair, Exam } from '../../components/principal/dataExport/types';


export default function PrincipalDataExportPage() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();

  useEffect(() => {
    const loadContext = async () => {
      const code = await AsyncStorage.getItem('school_code') ||
        await AsyncStorage.getItem('schoolCode') ||
        await AsyncStorage.getItem('school_id') ||
        await AsyncStorage.getItem('schoolId') ||
        '';

      const branch = await AsyncStorage.getItem('branch_id') ||
        await AsyncStorage.getItem('branchId') ||
        await AsyncStorage.getItem('branch_code') ||
        await AsyncStorage.getItem('branchCode') ||
        '';

      setSchoolCode(code);
      setBranchId(branch);
    };
    loadContext();
  }, []);

  const headers = useMemo(() => ({
    'X-School-Code': schoolCode,
    'x-school-code': schoolCode,
    'X-Branch-Id': branchId,
    'x-branch-id': branchId,
  }), [schoolCode, branchId]);

  const today = new Date().toISOString().slice(0, 10);

  // Tab state
  const [activeTab, setActiveTab] = useState<'attendance' | 'marks' | 'combined'>('attendance');

  // Common state
  const [classGrade, setClassGrade] = useState('');
  const [section, setSection] = useState('');
  const [classSectionPairs, setClassSectionPairs] = useState<ClassSectionPair[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Attendance tab state
  const [attendancePeriod, setAttendancePeriod] = useState<'weekly' | 'monthly' | '3months' | '6months' | 'year' | 'custom'>('weekly');
  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');
  const [attendanceAnchorDate, setAttendanceAnchorDate] = useState(today);
  const [showAttendanceDatePicker, setShowAttendanceDatePicker] = useState(false);

  // Marks tab state (also used for Combined tab)
  const [selectedExam, setSelectedExam] = useState('');
  const [examsList, setExamsList] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Combined tab state
  const [combinedPeriod, setCombinedPeriod] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [combinedStartDate, setCombinedStartDate] = useState('');
  const [combinedEndDate, setCombinedEndDate] = useState('');
  const [combinedAnchorDate, setCombinedAnchorDate] = useState(today);
  const [showCombinedDatePicker, setShowCombinedDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | 'anchor'>('anchor');

  // Load classes
  useEffect(() => {
    let mounted = true;

    const loadClasses = async () => {
      if (!schoolCode || !branchId) {return;}
      setLoadingClasses(true);
      try {
        const response = await API.get('/principal/classes', { headers });
        if (!mounted) {return;}
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        setClassSectionPairs(items);
      } catch {
        if (mounted) {
          setError('Unable to load class and section options. You can still export without class filters.');
        }
      } finally {
        if (mounted) {
          setLoadingClasses(false);
        }
      }
    };

    loadClasses();
    return () => {
      mounted = false;
    };
  }, [branchId, schoolCode]);

  // Load exams for marks tab
  useEffect(() => {
    if (activeTab !== 'marks' && activeTab !== 'combined') {return;}

    let mounted = true;

    const loadExams = async () => {
      if (!schoolCode || !branchId) {return;}
      setLoadingExams(true);
      try {
        const response = await API.get('/principal/exams/list', { headers });
        if (!mounted) {return;}
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        setExamsList(items);
      } catch {
        if (mounted) {
          setError('Unable to load exams list.');
        }
      } finally {
        if (mounted) {
          setLoadingExams(false);
        }
      }
    };

    loadExams();
    return () => {
      mounted = false;
    };
  }, [activeTab, branchId, schoolCode]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of classSectionPairs) {
      const cls = String(item?.class_grade || '').trim();
      if (cls) {set.add(cls);}
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classSectionPairs]);

  const sectionOptions = useMemo(() => {
    if (!classGrade) {
      const set = new Set<string>();
      for (const item of classSectionPairs) {
        const sec = String(item?.section || '').trim();
        if (sec) {set.add(sec);}
      }
      return Array.from(set).sort();
    }

    const set = new Set<string>();
    for (const item of classSectionPairs) {
      const cls = String(item?.class_grade || '').trim();
      if (cls.toLowerCase() !== classGrade.toLowerCase()) {continue;}
      const sec = String(item?.section || '').trim();
      if (sec) {set.add(sec);}
    }
    return Array.from(set).sort();
  }, [classGrade, classSectionPairs]);

  useEffect(() => {
    if (!section) {return;}
    const exists = sectionOptions.some((s) => s.toLowerCase() === section.toLowerCase());
    if (!exists) {
      setSection('');
    }
  }, [section, sectionOptions]);

  const resetFilters = () => {
    setClassGrade('');
    setSection('');
    setMessage('');
    setError('');

    if (activeTab === 'attendance') {
      setAttendancePeriod('weekly');
      setAttendanceAnchorDate(today);
      setAttendanceStartDate('');
      setAttendanceEndDate('');
    } else if (activeTab === 'marks') {
      setSelectedExam('');
    } else if (activeTab === 'combined') {
      setCombinedPeriod('weekly');
      setCombinedAnchorDate(today);
      setCombinedStartDate('');
      setCombinedEndDate('');
      setSelectedExam('');
    }
  };




  const onExportAttendance = async () => {
    setMessage('');
    setError('');

    if (!schoolCode || !branchId) {
      setError('Missing school or branch context. Please login again.');
      return;
    }

    const { start_date, end_date } = getDateRangeForAttendance(attendancePeriod, attendanceAnchorDate, attendanceStartDate, attendanceEndDate);

    if (!start_date || !end_date) {
      setError('Please select valid date range.');
      return;
    }

    const params: any = {
      start_date,
      end_date,
      file_format: 'xlsx',
    };

    if (classGrade) {params.class_grade = classGrade;}
    if (section) {params.section = section;}

    setExporting(true);
    try {
      const response = await API.get('/principal/export/attendance-only', {
        headers,
        params,
        responseType: 'arraybuffer',
      });

      const filename = `attendance_export_${start_date}_to_${end_date}.xlsx`;
      await downloadAndShareFile(response.data, filename);

      setMessage('Attendance export created successfully. File ready to share.');
    } catch (err: any) {
      setError(resolveExportError(err));
    } finally {
      setExporting(false);
    }
  };

  const onExportMarks = async () => {
    setMessage('');
    setError('');

    if (!schoolCode || !branchId) {
      setError('Missing school or branch context. Please login again.');
      return;
    }

    if (!selectedExam) {
      setError('Please select an exam.');
      return;
    }

    const params: any = {
      exam_id: selectedExam,
      file_format: 'xlsx',
    };

    if (classGrade) {params.class_grade = classGrade;}
    if (section) {params.section = section;}

    setExporting(true);
    try {
      const response = await API.get('/principal/export/marks-only', {
        headers,
        params,
        responseType: 'arraybuffer',
      });

      const selectedExamObj = examsList.find(e => e.exam_id.toString() === selectedExam);
      const filename = `marks_export_${selectedExamObj?.exam_name || 'marks'}_${classGrade || 'all'}_${section || 'all'}.xlsx`;
      await downloadAndShareFile(response.data, filename);

      setMessage('Marks export created successfully. File ready to share.');
    } catch (err: any) {
      setError(resolveExportError(err));
    } finally {
      setExporting(false);
    }
  };

  const onExportCombined = async () => {
    setMessage('');
    setError('');

    if (!schoolCode || !branchId) {
      setError('Missing school or branch context. Please login again.');
      return;
    }

    if (!selectedExam) {
      setError('Please select an exam.');
      return;
    }

    const { start_date, end_date } = getDateRangeForCombined(combinedPeriod, combinedAnchorDate, combinedStartDate, combinedEndDate);

    if (combinedPeriod === 'custom' && (!start_date || !end_date)) {
      setError('Choose both start and end dates for custom range.');
      return;
    }

    const params: any = {
      exam_id: selectedExam,
      start_date,
      end_date,
      period: combinedPeriod,
      file_format: 'xlsx',
    };

    if (classGrade) {params.class_grade = classGrade;}
    if (section) {params.section = section;}

    setExporting(true);
    try {
      const response = await API.get('/principal/export/combined-with-attendance', {
        headers,
        params,
        responseType: 'arraybuffer',
      });

      const selectedExamObj = examsList.find(e => e.exam_id.toString() === selectedExam);
      const filename = `combined_export_${selectedExamObj?.exam_name || 'marks'}_${start_date}_to_${end_date}.xlsx`;
      await downloadAndShareFile(response.data, filename);

      setMessage('Combined export created successfully. File ready to share.');
    } catch (err: any) {
      setError(resolveExportError(err));
    } finally {
      setExporting(false);
    }
  };

  const renderDatePicker = (mode: 'start' | 'end' | 'anchor', currentDate: string, onChange: (date: string) => void) => (
    <TouchableOpacity accessibilityRole="button"
      style={styles.dateInput}
      onPress={() => {
        setDatePickerMode(mode);
        setShowAttendanceDatePicker(true);
      }}
    >
      <AppText style={styles.dateInputText}>{currentDate || 'Select Date'}</AppText>
    </TouchableOpacity>
  );

  const exportTabProps = {
    attendancePeriod, setAttendancePeriod,
    attendanceStartDate, setAttendanceStartDate,
    attendanceEndDate, setAttendanceEndDate,
    attendanceAnchorDate, setAttendanceAnchorDate,
    combinedPeriod, setCombinedPeriod,
    combinedStartDate, setCombinedStartDate,
    combinedEndDate, setCombinedEndDate,
    combinedAnchorDate, setCombinedAnchorDate,
    classGrade, setClassGrade,
    section, setSection,
    classOptions, sectionOptions,
    selectedExam, setSelectedExam,
    examsList, exporting,
    onExportAttendance, onExportMarks, onExportCombined,
    resetFilters, renderDatePicker,
    setDatePickerMode, setShowAttendanceDatePicker, setShowCombinedDatePicker,
  };

  return (
    <View style={styles.container}>

      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Data Export"
        subtitle="Export attendance, marks, or combined data"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
      />

        <View style={styles.panel}>
            <View style={styles.header}>
              <AppText style={styles.title} weight="bold">Advanced Filters</AppText>
              <AppText style={styles.subtitle}>
                Apply filters to customize your export data
              </AppText>
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
                onPress={() => { setActiveTab('attendance'); resetFilters(); }}
              >
                <View style={styles.tabContent}>
                  <BarChart3 size={16} color={activeTab === 'attendance' ? C.primary : C.textMuted} />
                  <AppText weight="semibold" style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>Attendance</AppText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.tab, activeTab === 'marks' && styles.activeTab]}
                onPress={() => { setActiveTab('marks'); resetFilters(); }}
              >
                <View style={styles.tabContent}>
                  <PenSquare size={16} color={activeTab === 'marks' ? C.primary : C.textMuted} />
                  <AppText weight="semibold" style={[styles.tabText, activeTab === 'marks' && styles.activeTabText]}>Marks</AppText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.tab, activeTab === 'combined' && styles.activeTab]}
                onPress={() => { setActiveTab('combined'); resetFilters(); }}
              >
                <View style={styles.tabContent}>
                  <ClipboardList size={16} color={activeTab === 'combined' ? C.primary : C.textMuted} />
                  <AppText weight="semibold" style={[styles.tabText, activeTab === 'combined' && styles.activeTabText]}>Combined</AppText>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {activeTab === 'attendance' && <AttendanceExportTab {...exportTabProps} />}
              {activeTab === 'marks' && <MarksExportTab {...exportTabProps} />}
              {activeTab === 'combined' && <CombinedExportTab {...exportTabProps} />}

              {message ? <View style={styles.messageContainer}><AppText style={styles.messageText}>{message}</AppText></View> : null}
              {error ? <View style={styles.errorContainer}><AppText style={styles.errorText}>{error}</AppText></View> : null}
            </View>

          </View>
      </ScrollView>

      {/* Date Pickers */}
      {(showAttendanceDatePicker || showCombinedDatePicker) && (
        <DateTimePicker
          value={
            datePickerMode === 'start'
              ? (attendanceStartDate ? new Date(attendanceStartDate) : new Date())
              : datePickerMode === 'end'
              ? (attendanceEndDate ? new Date(attendanceEndDate) : new Date())
              : (attendanceAnchorDate ? new Date(attendanceAnchorDate) : new Date())
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowAttendanceDatePicker(false);
              setShowCombinedDatePicker(false);
            }

            if (event.type === 'dismissed') {
              setShowAttendanceDatePicker(false);
              setShowCombinedDatePicker(false);
              return;
            }

            if (selectedDate) {
              const dateStr = selectedDate.toISOString().slice(0, 10);
              if (showAttendanceDatePicker) {
                if (datePickerMode === 'start') {setAttendanceStartDate(dateStr);}
                else if (datePickerMode === 'end') {setAttendanceEndDate(dateStr);}
                else {setAttendanceAnchorDate(dateStr);}
              } else if (showCombinedDatePicker) {
                if (datePickerMode === 'start') {setCombinedStartDate(dateStr);}
                else if (datePickerMode === 'end') {setCombinedEndDate(dateStr);}
                else {setCombinedAnchorDate(dateStr);}
              }
            }

            if (Platform.OS === 'ios') {
              // On iOS we keep it open until user finishes
            } else {
              setShowAttendanceDatePicker(false);
              setShowCombinedDatePicker(false);
            }
          }}
        />
      )}

      {exporting && (
        <View style={styles.loadingOverlay}>
          <Loader size="lg" label="Preparing export…" />
        </View>
      )}
    </View>
  );
}
