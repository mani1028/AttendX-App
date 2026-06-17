import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Buffer } from 'buffer';
import { View, TouchableOpacity, StatusBar, ScrollView, Alert, StyleSheet, Platform, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, BarChart3, PenSquare, ClipboardList } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { Principal_THEME as C } from '../../constants/principalTheme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';


interface ClassSectionPair {
  class_grade?: string;
  section?: string;
}

interface Exam {
  exam_id: number;
  exam_name: string;
  academic_year: string;
}

export default function PrincipalDataExportPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    const loadContext = async () => {
      const code = await AsyncStorage.getItem("school_code") ||
        await AsyncStorage.getItem("schoolCode") ||
        await AsyncStorage.getItem("school_id") ||
        await AsyncStorage.getItem("schoolId") ||
        "";

      const branch = await AsyncStorage.getItem("branch_id") ||
        await AsyncStorage.getItem("branchId") ||
        await AsyncStorage.getItem("branch_code") ||
        await AsyncStorage.getItem("branchCode") ||
        "";

      setSchoolCode(code);
      setBranchId(branch);
    };
    loadContext();
  }, []);

  const headers = useMemo(() => ({
    "X-School-Code": schoolCode,
    "x-school-code": schoolCode,
    "X-Branch-Id": branchId,
    "x-branch-id": branchId,
  }), [schoolCode, branchId]);

  const today = new Date().toISOString().slice(0, 10);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"attendance" | "marks" | "combined">("attendance");

  // Common state
  const [classGrade, setClassGrade] = useState("");
  const [section, setSection] = useState("");
  const [classSectionPairs, setClassSectionPairs] = useState<ClassSectionPair[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Attendance tab state
  const [attendancePeriod, setAttendancePeriod] = useState<"weekly" | "monthly" | "3months" | "6months" | "year" | "custom">("weekly");
  const [attendanceStartDate, setAttendanceStartDate] = useState("");
  const [attendanceEndDate, setAttendanceEndDate] = useState("");
  const [attendanceAnchorDate, setAttendanceAnchorDate] = useState(today);
  const [showAttendanceDatePicker, setShowAttendanceDatePicker] = useState(false);

  // Marks tab state (also used for Combined tab)
  const [selectedExam, setSelectedExam] = useState("");
  const [examsList, setExamsList] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Combined tab state
  const [combinedPeriod, setCombinedPeriod] = useState<"weekly" | "monthly" | "custom">("weekly");
  const [combinedStartDate, setCombinedStartDate] = useState("");
  const [combinedEndDate, setCombinedEndDate] = useState("");
  const [combinedAnchorDate, setCombinedAnchorDate] = useState(today);
  const [showCombinedDatePicker, setShowCombinedDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end" | "anchor">("anchor");

  // Load classes
  useEffect(() => {
    let mounted = true;

    const loadClasses = async () => {
      if (!schoolCode || !branchId) return;
      setLoadingClasses(true);
      try {
        const response = await API.get("/principal/classes", { headers });
        if (!mounted) return;
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        setClassSectionPairs(items);
      } catch {
        if (mounted) {
          setError("Unable to load class and section options. You can still export without class filters.");
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
    if (activeTab !== "marks" && activeTab !== "combined") return;

    let mounted = true;

    const loadExams = async () => {
      if (!schoolCode || !branchId) return;
      setLoadingExams(true);
      try {
        const response = await API.get("/principal/exams/list", { headers });
        if (!mounted) return;
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        setExamsList(items);
      } catch {
        if (mounted) {
          setError("Unable to load exams list.");
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
      const cls = String(item?.class_grade || "").trim();
      if (cls) set.add(cls);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classSectionPairs]);

  const sectionOptions = useMemo(() => {
    if (!classGrade) {
      const set = new Set<string>();
      for (const item of classSectionPairs) {
        const sec = String(item?.section || "").trim();
        if (sec) set.add(sec);
      }
      return Array.from(set).sort();
    }

    const set = new Set<string>();
    for (const item of classSectionPairs) {
      const cls = String(item?.class_grade || "").trim();
      if (cls.toLowerCase() !== classGrade.toLowerCase()) continue;
      const sec = String(item?.section || "").trim();
      if (sec) set.add(sec);
    }
    return Array.from(set).sort();
  }, [classGrade, classSectionPairs]);

  useEffect(() => {
    if (!section) return;
    const exists = sectionOptions.some((s) => s.toLowerCase() === section.toLowerCase());
    if (!exists) {
      setSection("");
    }
  }, [section, sectionOptions]);

  const resetFilters = () => {
    setClassGrade("");
    setSection("");
    setMessage("");
    setError("");
    
    if (activeTab === "attendance") {
      setAttendancePeriod("weekly");
      setAttendanceAnchorDate(today);
      setAttendanceStartDate("");
      setAttendanceEndDate("");
    } else if (activeTab === "marks") {
      setSelectedExam("");
    } else if (activeTab === "combined") {
      setCombinedPeriod("weekly");
      setCombinedAnchorDate(today);
      setCombinedStartDate("");
      setCombinedEndDate("");
      setSelectedExam("");
    }
  };

  const getDateRangeForAttendance = () => {
    switch (attendancePeriod) {
      case "weekly":
        const weekStart = new Date(attendanceAnchorDate);
        weekStart.setDate(weekStart.getDate() - 6);
        return { start_date: weekStart.toISOString().slice(0, 10), end_date: attendanceAnchorDate };
      case "monthly":
        const monthStart = new Date(attendanceAnchorDate);
        monthStart.setDate(1);
        return { start_date: monthStart.toISOString().slice(0, 10), end_date: attendanceAnchorDate };
      case "3months":
        const threeMonthsStart = new Date(attendanceAnchorDate);
        threeMonthsStart.setMonth(threeMonthsStart.getMonth() - 3);
        return { start_date: threeMonthsStart.toISOString().slice(0, 10), end_date: attendanceAnchorDate };
      case "6months":
        const sixMonthsStart = new Date(attendanceAnchorDate);
        sixMonthsStart.setMonth(sixMonthsStart.getMonth() - 6);
        return { start_date: sixMonthsStart.toISOString().slice(0, 10), end_date: attendanceAnchorDate };
      case "year":
        const yearStart = new Date(attendanceAnchorDate);
        yearStart.setFullYear(yearStart.getFullYear() - 1);
        return { start_date: yearStart.toISOString().slice(0, 10), end_date: attendanceAnchorDate };
      case "custom":
        return { start_date: attendanceStartDate, end_date: attendanceEndDate };
      default:
        return { start_date: attendanceAnchorDate, end_date: attendanceAnchorDate };
    }
  };

  const getDateRangeForCombined = () => {
    switch (combinedPeriod) {
      case "weekly":
        const weekStart = new Date(combinedAnchorDate);
        weekStart.setDate(weekStart.getDate() - 6);
        return { start_date: weekStart.toISOString().slice(0, 10), end_date: combinedAnchorDate };
      case "monthly":
        const monthStart = new Date(combinedAnchorDate);
        monthStart.setDate(1);
        return { start_date: monthStart.toISOString().slice(0, 10), end_date: combinedAnchorDate };
      case "custom":
        return { start_date: combinedStartDate, end_date: combinedEndDate };
      default:
        return { start_date: combinedAnchorDate, end_date: combinedAnchorDate };
    }
  };

  const downloadAndShareFile = async (data: any, filename: string) => {
    try {
      const base64Data = Buffer.from(data).toString('base64');
      const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

      await RNFS.writeFile(filePath, base64Data, 'base64');

      const fileUri = Platform.OS === 'android'
        ? `file://${filePath}`
        : filePath;

      await Share.open({
        url: fileUri,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: filename,
        failOnCancel: false,
      });

      // Clean up file after sharing
      setTimeout(() => RNFS.unlink(filePath).catch(() => {}), 5000);
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Error saving/sharing file:', error);
        Alert.alert('Error', 'Failed to save or share file');
      }
    }
  };

  const onExportAttendance = async () => {
    setMessage("");
    setError("");

    if (!schoolCode || !branchId) {
      setError("Missing school or branch context. Please login again.");
      return;
    }

    const { start_date, end_date } = getDateRangeForAttendance();

    if (!start_date || !end_date) {
      setError("Please select valid date range.");
      return;
    }

    const params: any = {
      start_date,
      end_date,
      file_format: "xlsx",
    };

    if (classGrade) params.class_grade = classGrade;
    if (section) params.section = section;

    setExporting(true);
    try {
      const response = await API.get("/principal/export/attendance-only", {
        headers,
        params,
        responseType: "arraybuffer",
      });

      const filename = `attendance_export_${start_date}_to_${end_date}.xlsx`;
      await downloadAndShareFile(response.data, filename);

      setMessage("Attendance export created successfully. File ready to share.");
    } catch (err: any) {
      let fallback = "Export failed. Please try again.";

      if (err?.response?.status === 401) {
        fallback = "Session expired. Please login again and retry export.";
      } else if (err?.response?.status) {
        fallback = `Export failed (${err.response.status}).`;
      } else if (err?.message) {
        fallback = err.message;
      }

      setError(fallback);
    } finally {
      setExporting(false);
    }
  };

  const onExportMarks = async () => {
    setMessage("");
    setError("");

    if (!schoolCode || !branchId) {
      setError("Missing school or branch context. Please login again.");
      return;
    }

    if (!selectedExam) {
      setError("Please select an exam.");
      return;
    }

    const params: any = {
      exam_id: selectedExam,
      file_format: "xlsx",
    };

    if (classGrade) params.class_grade = classGrade;
    if (section) params.section = section;

    setExporting(true);
    try {
      const response = await API.get("/principal/export/marks-only", {
        headers,
        params,
        responseType: "arraybuffer",
      });

      const selectedExamObj = examsList.find(e => e.exam_id.toString() === selectedExam);
      const filename = `marks_export_${selectedExamObj?.exam_name || "marks"}_${classGrade || "all"}_${section || "all"}.xlsx`;
      await downloadAndShareFile(response.data, filename);

      setMessage("Marks export created successfully. File ready to share.");
    } catch (err: any) {
      let fallback = "Export failed. Please try again.";

      if (err?.response?.status === 401) {
        fallback = "Session expired. Please login again and retry export.";
      } else if (err?.response?.status) {
        fallback = `Export failed (${err.response.status}).`;
      } else if (err?.message) {
        fallback = err.message;
      }

      setError(fallback);
    } finally {
      setExporting(false);
    }
  };

  const onExportCombined = async () => {
    setMessage("");
    setError("");

    if (!schoolCode || !branchId) {
      setError("Missing school or branch context. Please login again.");
      return;
    }

    if (!selectedExam) {
      setError("Please select an exam.");
      return;
    }

    const { start_date, end_date } = getDateRangeForCombined();

    if (combinedPeriod === "custom" && (!start_date || !end_date)) {
      setError("Choose both start and end dates for custom range.");
      return;
    }

    const params: any = {
      exam_id: selectedExam,
      start_date,
      end_date,
      period: combinedPeriod,
      file_format: "xlsx",
    };

    if (classGrade) params.class_grade = classGrade;
    if (section) params.section = section;

    setExporting(true);
    try {
      const response = await API.get("/principal/export/combined-with-attendance", {
        headers,
        params,
        responseType: "arraybuffer",
      });

      const selectedExamObj = examsList.find(e => e.exam_id.toString() === selectedExam);
      const filename = `combined_export_${selectedExamObj?.exam_name || "marks"}_${start_date}_to_${end_date}.xlsx`;
      await downloadAndShareFile(response.data, filename);

      setMessage("Combined export created successfully. File ready to share.");
    } catch (err: any) {
      let fallback = "Export failed. Please try again.";

      if (err?.response?.status === 401) {
        fallback = "Session expired. Please login again and retry export.";
      } else if (err?.response?.status) {
        fallback = `Export failed (${err.response.status}).`;
      } else if (err?.message) {
        fallback = err.message;
      }

      setError(fallback);
    } finally {
      setExporting(false);
    }
  };

  const renderDatePicker = (mode: "start" | "end" | "anchor", currentDate: string, onChange: (date: string) => void) => (
    <TouchableOpacity 
      style={styles.dateInput} 
      onPress={() => {
        setDatePickerMode(mode);
        setShowAttendanceDatePicker(true);
      }}
    >
      <AppText style={styles.dateInputText}>{currentDate || 'Select Date'}</AppText>
    </TouchableOpacity>
  );

  const renderAttendanceTab = () => (
    <>
      <View style={styles.grid}>
        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Period</AppText>
          <View style={styles.selectWrapper}>
            {["weekly", "monthly", "3months", "6months", "year", "custom"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodOption, attendancePeriod === period && styles.periodOptionSelected]}
                onPress={() => setAttendancePeriod(period as any)}
              >
                <AppText style={[styles.periodOptionText, attendancePeriod === period && styles.periodOptionTextSelected]} weight="semibold">
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {attendancePeriod !== "custom" ? (
          <View style={styles.field}>
            <AppText style={styles.label} weight="bold">End Date (Anchor Date)</AppText>
            {renderDatePicker("anchor", attendanceAnchorDate, setAttendanceAnchorDate)}
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">Start Date</AppText>
              {renderDatePicker("start", attendanceStartDate, setAttendanceStartDate)}
            </View>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">End Date</AppText>
              {renderDatePicker("end", attendanceEndDate, setAttendanceEndDate)}
            </View>
          </>
        )}

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Class (Optional)</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !classGrade && styles.classOptionSelected]}
              onPress={() => setClassGrade("")}
            >
              <AppText style={[styles.classOptionText, !classGrade && styles.classOptionTextSelected]} weight="semibold">All Classes</AppText>
            </TouchableOpacity>
            {classOptions.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.classOption, classGrade === cls && styles.classOptionSelected]}
                onPress={() => setClassGrade(cls)}
              >
                <AppText style={[styles.classOptionText, classGrade === cls && styles.classOptionTextSelected]} weight="semibold">{cls}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Section (Optional)</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !section && styles.classOptionSelected]}
              onPress={() => setSection("")}
            >
              <AppText style={[styles.classOptionText, !section && styles.classOptionTextSelected]} weight="semibold">All Sections</AppText>
            </TouchableOpacity>
            {sectionOptions.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.classOption, section === sec && styles.classOptionSelected]}
                onPress={() => setSection(sec)}
              >
                <AppText style={[styles.classOptionText, section === sec && styles.classOptionTextSelected]} weight="semibold">{sec}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportAttendance} disabled={exporting}>
          <AppText style={styles.exportButtonText} weight="bold">
            {exporting ? "Preparing Excel..." : "Download Attendance Excel"}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <AppText style={styles.secondaryButtonText} weight="semibold">Reset Filters</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.hint}>
        Export includes attendance data with attendance percentage column for each student.
        Percentage calculated as: (Present Days / Total Days) × 100
      </AppText>
    </>
  );

  const renderMarksTab = () => (
    <>
      <View style={styles.marksGrid}>
        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Select Exam</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !selectedExam && styles.classOptionSelected]}
              onPress={() => setSelectedExam("")}
            >
              <AppText style={[styles.classOptionText, !selectedExam && styles.classOptionTextSelected]} weight="semibold">-- Select Exam --</AppText>
            </TouchableOpacity>
            {examsList.map((exam) => (
              <TouchableOpacity
                key={exam.exam_id}
                style={[styles.classOption, selectedExam === exam.exam_id.toString() && styles.classOptionSelected]}
                onPress={() => setSelectedExam(exam.exam_id.toString())}
              >
                <AppText style={[styles.classOptionText, selectedExam === exam.exam_id.toString() && styles.classOptionTextSelected]} weight="semibold">
                  {exam.exam_name} ({exam.academic_year})
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Class (Optional)</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !classGrade && styles.classOptionSelected]}
              onPress={() => setClassGrade("")}
            >
              <AppText style={[styles.classOptionText, !classGrade && styles.classOptionTextSelected]} weight="semibold">All Classes</AppText>
            </TouchableOpacity>
            {classOptions.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.classOption, classGrade === cls && styles.classOptionSelected]}
                onPress={() => setClassGrade(cls)}
              >
                <AppText style={[styles.classOptionText, classGrade === cls && styles.classOptionTextSelected]} weight="semibold">{cls}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Section (Optional)</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !section && styles.classOptionSelected]}
              onPress={() => setSection("")}
            >
              <AppText style={[styles.classOptionText, !section && styles.classOptionTextSelected]} weight="semibold">All Sections</AppText>
            </TouchableOpacity>
            {sectionOptions.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.classOption, section === sec && styles.classOptionSelected]}
                onPress={() => setSection(sec)}
              >
                <AppText style={[styles.classOptionText, section === sec && styles.classOptionTextSelected]} weight="semibold">{sec}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportMarks} disabled={exporting || !selectedExam}>
          <AppText style={styles.exportButtonText} weight="bold">
            {exporting ? "Preparing Excel..." : "Download Marks Excel"}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <AppText style={styles.secondaryButtonText} weight="semibold">Reset Filters</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.hint}>
        Export includes subject-wise marks with overall grade and percentage.
      </AppText>
    </>
  );

  const renderCombinedTab = () => (
    <>
      <View style={styles.grid}>
        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Select Exam</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !selectedExam && styles.classOptionSelected]}
              onPress={() => setSelectedExam("")}
            >
              <AppText style={[styles.classOptionText, !selectedExam && styles.classOptionTextSelected]} weight="semibold">-- Select Exam --</AppText>
            </TouchableOpacity>
            {examsList.map((exam) => (
              <TouchableOpacity
                key={exam.exam_id}
                style={[styles.classOption, selectedExam === exam.exam_id.toString() && styles.classOptionSelected]}
                onPress={() => setSelectedExam(exam.exam_id.toString())}
              >
                <AppText style={[styles.classOptionText, selectedExam === exam.exam_id.toString() && styles.classOptionTextSelected]} weight="semibold">
                  {exam.exam_name} ({exam.academic_year})
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Attendance Period</AppText>
          <View style={styles.selectWrapper}>
            {["weekly", "monthly", "custom"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodOption, combinedPeriod === period && styles.periodOptionSelected]}
                onPress={() => setCombinedPeriod(period as any)}
              >
                <AppText style={[styles.periodOptionText, combinedPeriod === period && styles.periodOptionTextSelected]} weight="semibold">
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {combinedPeriod !== "custom" ? (
          <View style={styles.field}>
            <AppText style={styles.label} weight="bold">End Date (Anchor Date)</AppText>
            <TouchableOpacity 
              style={styles.dateInput} 
              onPress={() => {
                setDatePickerMode("anchor");
                setShowCombinedDatePicker(true);
              }}
            >
              <AppText style={styles.dateInputText}>{combinedAnchorDate || 'Select Date'}</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">Start Date</AppText>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => {
                  setDatePickerMode("start");
                  setShowCombinedDatePicker(true);
                }}
              >
                <AppText style={styles.dateInputText}>{combinedStartDate || 'Select Date'}</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">End Date</AppText>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => {
                  setDatePickerMode("end");
                  setShowCombinedDatePicker(true);
                }}
              >
                <AppText style={styles.dateInputText}>{combinedEndDate || 'Select Date'}</AppText>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Class (Optional)</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !classGrade && styles.classOptionSelected]}
              onPress={() => setClassGrade("")}
            >
              <AppText style={[styles.classOptionText, !classGrade && styles.classOptionTextSelected]} weight="semibold">All Classes</AppText>
            </TouchableOpacity>
            {classOptions.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.classOption, classGrade === cls && styles.classOptionSelected]}
                onPress={() => setClassGrade(cls)}
              >
                <AppText style={[styles.classOptionText, classGrade === cls && styles.classOptionTextSelected]} weight="semibold">{cls}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Section (Optional)</AppText>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !section && styles.classOptionSelected]}
              onPress={() => setSection("")}
            >
              <AppText style={[styles.classOptionText, !section && styles.classOptionTextSelected]} weight="semibold">All Sections</AppText>
            </TouchableOpacity>
            {sectionOptions.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.classOption, section === sec && styles.classOptionSelected]}
                onPress={() => setSection(sec)}
              >
                <AppText style={[styles.classOptionText, section === sec && styles.classOptionTextSelected]} weight="semibold">{sec}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportCombined} disabled={exporting || !selectedExam}>
          <AppText style={styles.exportButtonText} weight="bold">
            {exporting ? "Preparing Excel..." : "Download Combined Excel"}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <AppText style={styles.secondaryButtonText} weight="semibold">Reset Filters</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.hint}>
        Export includes marks data with subject-wise scores, overall grade, percentage, AND attendance percentage for the selected date range.
      </AppText>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText weight="bold" style={styles.headerTitle}>Data Export</AppText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>Data Export Center</AppText>
          <AppText style={styles.headerSubtext}>Export attendance, marks, or combined data</AppText>
        </View>
      </View>

      <View style={styles.contentOverlap}>
        <ScrollView
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <AppText style={styles.title} weight="bold">Advanced Filters</AppText>
              <AppText style={styles.subtitle}>
                Apply filters to customize your export data
              </AppText>
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "attendance" && styles.activeTab]}
                onPress={() => { setActiveTab("attendance"); resetFilters(); }}
              >
                <View style={styles.tabContent}>
                  <BarChart3 size={16} color={activeTab === "attendance" ? C.primary : C.textMuted} />
                  <AppText weight="semibold" style={[styles.tabText, activeTab === "attendance" && styles.activeTabText]}>Attendance</AppText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "marks" && styles.activeTab]}
                onPress={() => { setActiveTab("marks"); resetFilters(); }}
              >
                <View style={styles.tabContent}>
                  <PenSquare size={16} color={activeTab === "marks" ? C.primary : C.textMuted} />
                  <AppText weight="semibold" style={[styles.tabText, activeTab === "marks" && styles.activeTabText]}>Marks</AppText>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "combined" && styles.activeTab]}
                onPress={() => { setActiveTab("combined"); resetFilters(); }}
              >
                <View style={styles.tabContent}>
                  <ClipboardList size={16} color={activeTab === "combined" ? C.primary : C.textMuted} />
                  <AppText weight="semibold" style={[styles.tabText, activeTab === "combined" && styles.activeTabText]}>Combined</AppText>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {activeTab === "attendance" && renderAttendanceTab()}
              {activeTab === "marks" && renderMarksTab()}
              {activeTab === "combined" && renderCombinedTab()}

              {message ? <View style={styles.messageContainer}><AppText style={styles.messageText}>{message}</AppText></View> : null}
              {error ? <View style={styles.errorContainer}><AppText style={styles.errorText}>{error}</AppText></View> : null}
            </View>

          </View>
        </ScrollView>
      </View>

      {/* Date Pickers */}
      {(showAttendanceDatePicker || showCombinedDatePicker) && (
        <DateTimePicker
          value={
            datePickerMode === "start" 
              ? (attendanceStartDate ? new Date(attendanceStartDate) : new Date())
              : datePickerMode === "end"
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
                if (datePickerMode === "start") setAttendanceStartDate(dateStr);
                else if (datePickerMode === "end") setAttendanceEndDate(dateStr);
                else setAttendanceAnchorDate(dateStr);
              } else if (showCombinedDatePicker) {
                if (datePickerMode === "start") setCombinedStartDate(dateStr);
                else if (datePickerMode === "end") setCombinedEndDate(dateStr);
                else setCombinedAnchorDate(dateStr);
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
          <ActivityIndicator size="large" color={C.primary} />
          <AppText style={styles.loadingText}>Exporting...</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  contentOverlap: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    marginTop: -HEADER_CONSTANTS.BORDER_RADIUS,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    backgroundColor: C.card,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 40,
  },
  header: {
    padding: 20,
    backgroundColor: C.primarySoft,
  },
  title: {
    fontSize: 20,
    color: C.primary,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    color: C.textMuted,
  },
  activeTabText: {
    color: C.primary,
  },
  body: {
    padding: 20,
  },
  grid: {
    gap: 16,
  },
  marksGrid: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: C.text,
  },
  selectWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  periodOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  periodOptionText: {
    fontSize: 14,
    color: C.text,
  },
  periodOptionTextSelected: {
    color: '#ffffff',
  },
  classOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  classOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  classOptionText: {
    fontSize: 14,
    color: C.text,
  },
  classOptionTextSelected: {
    color: '#ffffff',
  },
  dateInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateInputText: {
    fontSize: 14,
    color: C.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  exportButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: 14,
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: C.text,
  },
  hint: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 16,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  messageContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success,
  },
  messageText: {
    color: C.success,
    fontSize: 13,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.errorSoft,
    borderWidth: 1,
    borderColor: C.error,
  },
  errorText: {
    color: C.error,
    fontSize: 13,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ffffff',
  },
});
