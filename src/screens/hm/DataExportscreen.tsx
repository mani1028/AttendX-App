import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import API from '../../services/api';

interface ClassSectionPair {
  class_grade?: string;
  section?: string;
}

interface Exam {
  exam_id: number;
  exam_name: string;
  academic_year: string;
}

export default function HMDataExportPage() {
  const schoolCode =
    localStorage.getItem("school_code") ||
    localStorage.getItem("schoolCode") ||
    localStorage.getItem("school_id") ||
    localStorage.getItem("schoolId") ||
    "";

  const branchId =
    localStorage.getItem("branch_id") ||
    localStorage.getItem("branchId") ||
    localStorage.getItem("branch_code") ||
    localStorage.getItem("branchCode") ||
    "";

  const headers = {
    "X-School-Code": schoolCode,
    "x-school-code": schoolCode,
    "X-Branch-Id": branchId,
    "x-branch-id": branchId,
  };

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
        const response = await API.get("/hm/classes", { headers });
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
        const response = await API.get("/hm/exams/list", { headers });
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

  const downloadAndShareFile = async (blob: Blob, filename: string) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        // Save to documents directory
        const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;
        await RNFS.writeFile(filePath, base64Data.split(',')[1], 'base64');
        
        // Share the file
        await Share.open({
          url: `file://${filePath}`,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          title: 'Export Data',
        });
      };
    } catch (error) {
      console.error('Error saving/sharing file:', error);
      throw new Error('Failed to save or share file');
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
      const response = await API.get("/hm/export/attendance-only", {
        headers,
        params,
        responseType: "blob",
      });

      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const textPayload = await response.data.text();
        let detail = "Export failed. Please try again.";
        try {
          const parsed = JSON.parse(textPayload || "{}");
          detail = parsed?.detail || parsed?.message || detail;
        } catch {
          if (textPayload) detail = textPayload;
        }
        throw new Error(detail);
      }

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
      const response = await API.get("/hm/export/marks-only", {
        headers,
        params,
        responseType: "blob",
      });

      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const textPayload = await response.data.text();
        let detail = "Export failed. Please try again.";
        try {
          const parsed = JSON.parse(textPayload || "{}");
          detail = parsed?.detail || parsed?.message || detail;
        } catch {
          if (textPayload) detail = textPayload;
        }
        throw new Error(detail);
      }

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
      const response = await API.get("/hm/export/combined-with-attendance", {
        headers,
        params,
        responseType: "blob",
      });

      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const textPayload = await response.data.text();
        let detail = "Export failed. Please try again.";
        try {
          const parsed = JSON.parse(textPayload || "{}");
          detail = parsed?.detail || parsed?.message || detail;
        } catch {
          if (textPayload) detail = textPayload;
        }
        throw new Error(detail);
      }

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
      <Text>{currentDate || 'Select Date'}</Text>
    </TouchableOpacity>
  );

  const renderAttendanceTab = () => (
    <>
      <View style={styles.grid}>
        <View style={styles.field}>
          <Text style={styles.label}>Period</Text>
          <View style={styles.selectWrapper}>
            {["weekly", "monthly", "3months", "6months", "year", "custom"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodOption, attendancePeriod === period && styles.periodOptionSelected]}
                onPress={() => setAttendancePeriod(period as any)}
              >
                <Text style={[styles.periodOptionText, attendancePeriod === period && styles.periodOptionTextSelected]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {attendancePeriod !== "custom" ? (
          <View style={styles.field}>
            <Text style={styles.label}>End Date (Anchor Date)</Text>
            {renderDatePicker("anchor", attendanceAnchorDate, setAttendanceAnchorDate)}
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Start Date</Text>
              {renderDatePicker("start", attendanceStartDate, setAttendanceStartDate)}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>End Date</Text>
              {renderDatePicker("end", attendanceEndDate, setAttendanceEndDate)}
            </View>
          </>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Class (Optional)</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !classGrade && styles.classOptionSelected]}
              onPress={() => setClassGrade("")}
            >
              <Text style={[styles.classOptionText, !classGrade && styles.classOptionTextSelected]}>All Classes</Text>
            </TouchableOpacity>
            {classOptions.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.classOption, classGrade === cls && styles.classOptionSelected]}
                onPress={() => setClassGrade(cls)}
              >
                <Text style={[styles.classOptionText, classGrade === cls && styles.classOptionTextSelected]}>{cls}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Section (Optional)</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !section && styles.classOptionSelected]}
              onPress={() => setSection("")}
            >
              <Text style={[styles.classOptionText, !section && styles.classOptionTextSelected]}>All Sections</Text>
            </TouchableOpacity>
            {sectionOptions.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.classOption, section === sec && styles.classOptionSelected]}
                onPress={() => setSection(sec)}
              >
                <Text style={[styles.classOptionText, section === sec && styles.classOptionTextSelected]}>{sec}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportAttendance} disabled={exporting}>
          <Text style={styles.exportButtonText}>
            {exporting ? "Preparing Excel..." : "Download Attendance Excel"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <Text style={styles.secondaryButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Export includes attendance data with attendance percentage column for each student.
        Percentage calculated as: (Present Days / Total Days) × 100
      </Text>
    </>
  );

  const renderMarksTab = () => (
    <>
      <View style={styles.marksGrid}>
        <View style={styles.field}>
          <Text style={styles.label}>Select Exam</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !selectedExam && styles.classOptionSelected]}
              onPress={() => setSelectedExam("")}
            >
              <Text style={[styles.classOptionText, !selectedExam && styles.classOptionTextSelected]}>-- Select Exam --</Text>
            </TouchableOpacity>
            {examsList.map((exam) => (
              <TouchableOpacity
                key={exam.exam_id}
                style={[styles.classOption, selectedExam === exam.exam_id.toString() && styles.classOptionSelected]}
                onPress={() => setSelectedExam(exam.exam_id.toString())}
              >
                <Text style={[styles.classOptionText, selectedExam === exam.exam_id.toString() && styles.classOptionTextSelected]}>
                  {exam.exam_name} ({exam.academic_year})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Class (Optional)</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !classGrade && styles.classOptionSelected]}
              onPress={() => setClassGrade("")}
            >
              <Text style={[styles.classOptionText, !classGrade && styles.classOptionTextSelected]}>All Classes</Text>
            </TouchableOpacity>
            {classOptions.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.classOption, classGrade === cls && styles.classOptionSelected]}
                onPress={() => setClassGrade(cls)}
              >
                <Text style={[styles.classOptionText, classGrade === cls && styles.classOptionTextSelected]}>{cls}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Section (Optional)</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !section && styles.classOptionSelected]}
              onPress={() => setSection("")}
            >
              <Text style={[styles.classOptionText, !section && styles.classOptionTextSelected]}>All Sections</Text>
            </TouchableOpacity>
            {sectionOptions.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.classOption, section === sec && styles.classOptionSelected]}
                onPress={() => setSection(sec)}
              >
                <Text style={[styles.classOptionText, section === sec && styles.classOptionTextSelected]}>{sec}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportMarks} disabled={exporting || !selectedExam}>
          <Text style={styles.exportButtonText}>
            {exporting ? "Preparing Excel..." : "Download Marks Excel"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <Text style={styles.secondaryButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Export includes subject-wise marks with overall grade and percentage.
      </Text>
    </>
  );

  const renderCombinedTab = () => (
    <>
      <View style={styles.grid}>
        <View style={styles.field}>
          <Text style={styles.label}>Select Exam</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !selectedExam && styles.classOptionSelected]}
              onPress={() => setSelectedExam("")}
            >
              <Text style={[styles.classOptionText, !selectedExam && styles.classOptionTextSelected]}>-- Select Exam --</Text>
            </TouchableOpacity>
            {examsList.map((exam) => (
              <TouchableOpacity
                key={exam.exam_id}
                style={[styles.classOption, selectedExam === exam.exam_id.toString() && styles.classOptionSelected]}
                onPress={() => setSelectedExam(exam.exam_id.toString())}
              >
                <Text style={[styles.classOptionText, selectedExam === exam.exam_id.toString() && styles.classOptionTextSelected]}>
                  {exam.exam_name} ({exam.academic_year})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Attendance Period</Text>
          <View style={styles.selectWrapper}>
            {["weekly", "monthly", "custom"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodOption, combinedPeriod === period && styles.periodOptionSelected]}
                onPress={() => setCombinedPeriod(period as any)}
              >
                <Text style={[styles.periodOptionText, combinedPeriod === period && styles.periodOptionTextSelected]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {combinedPeriod !== "custom" ? (
          <View style={styles.field}>
            <Text style={styles.label}>End Date (Anchor Date)</Text>
            <TouchableOpacity 
              style={styles.dateInput} 
              onPress={() => {
                setDatePickerMode("anchor");
                setShowCombinedDatePicker(true);
              }}
            >
              <Text>{combinedAnchorDate || 'Select Date'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => {
                  setDatePickerMode("start");
                  setShowCombinedDatePicker(true);
                }}
              >
                <Text>{combinedStartDate || 'Select Date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => {
                  setDatePickerMode("end");
                  setShowCombinedDatePicker(true);
                }}
              >
                <Text>{combinedEndDate || 'Select Date'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Class (Optional)</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !classGrade && styles.classOptionSelected]}
              onPress={() => setClassGrade("")}
            >
              <Text style={[styles.classOptionText, !classGrade && styles.classOptionTextSelected]}>All Classes</Text>
            </TouchableOpacity>
            {classOptions.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[styles.classOption, classGrade === cls && styles.classOptionSelected]}
                onPress={() => setClassGrade(cls)}
              >
                <Text style={[styles.classOptionText, classGrade === cls && styles.classOptionTextSelected]}>{cls}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Section (Optional)</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.classOption, !section && styles.classOptionSelected]}
              onPress={() => setSection("")}
            >
              <Text style={[styles.classOptionText, !section && styles.classOptionTextSelected]}>All Sections</Text>
            </TouchableOpacity>
            {sectionOptions.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.classOption, section === sec && styles.classOptionSelected]}
                onPress={() => setSection(sec)}
              >
                <Text style={[styles.classOptionText, section === sec && styles.classOptionTextSelected]}>{sec}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportCombined} disabled={exporting || !selectedExam}>
          <Text style={styles.exportButtonText}>
            {exporting ? "Preparing Excel..." : "Download Combined Excel"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <Text style={styles.secondaryButtonText}>Reset Filters</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Export includes marks data with subject-wise scores, overall grade, percentage, AND attendance percentage for the selected date range.
      </Text>
    </>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Data Export Center</Text>
          <Text style={styles.subtitle}>
            Export attendance, marks, or combined data with advanced filtering options
          </Text>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "attendance" && styles.activeTab]} 
            onPress={() => { setActiveTab("attendance"); resetFilters(); }}
          >
            <Text style={[styles.tabText, activeTab === "attendance" && styles.activeTabText]}>📊 Attendance Only</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "marks" && styles.activeTab]} 
            onPress={() => { setActiveTab("marks"); resetFilters(); }}
          >
            <Text style={[styles.tabText, activeTab === "marks" && styles.activeTabText]}>📝 Marks Only</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "combined" && styles.activeTab]} 
            onPress={() => { setActiveTab("combined"); resetFilters(); }}
          >
            <Text style={[styles.tabText, activeTab === "combined" && styles.activeTabText]}>📋 Marks & Attendance</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {activeTab === "attendance" && renderAttendanceTab()}
          {activeTab === "marks" && renderMarksTab()}
          {activeTab === "combined" && renderCombinedTab()}

          {message ? <View style={styles.messageContainer}><Text style={styles.messageText}>{message}</Text></View> : null}
          {error ? <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View> : null}
        </View>
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
          onChange={(event, selectedDate) => {
            setShowAttendanceDatePicker(false);
            setShowCombinedDatePicker(false);
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
          }}
        />
      )}

      {exporting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Exporting...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  card: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    padding: 20,
    backgroundColor: 'linear-gradient(120deg, #123b7a 0%, #1b5fbf 55%, #3390ff 100%)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.94,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1e40af',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#1e40af',
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
    fontWeight: '700',
    color: '#334155',
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd6ea',
  },
  periodOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  periodOptionTextSelected: {
    color: '#ffffff',
  },