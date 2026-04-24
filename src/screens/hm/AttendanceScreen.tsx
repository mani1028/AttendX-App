import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  muted: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
};

// Types
interface Teacher {
  teacher_id: string;
  teacher_full_name: string;
  employee_id: string;
  email_id: string;
  designation: string;
  department_subject: string;
  teacher_status: string;
  status: string;
}

interface ClassItem {
  class_id: string;
  class_grade: string;
  section: string;
  students_total?: number;
  present?: number;
  label?: string;
}

interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  admission_number: string;
  status: string;
}

interface AttendanceStatement {
  teachers: {
    attendance_pct: number;
    present_equivalent: number;
    half_day_equivalent: number;
  };
  students: {
    attendance_pct: number;
    present_equivalent: number;
    half_day_equivalent: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

interface SectionGroup {
  class_grade: string;
  section: string;
  students_total?: number;
  present?: number;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

const iso = (date: Date): string => date.toISOString().split('T')[0];

const CLASS_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0891b2', '#4f46e5', '#16a34a', '#dc2626', '#9333ea',
];

const classColor = (grade: string): string => {
  const idx = (parseInt(grade, 10) - 1) % CLASS_COLORS.length;
  return CLASS_COLORS[isNaN(idx) ? 0 : idx];
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStyle = () => {
    if (status === 'PRESENT') return styles.badgePresent;
    if (status === 'HALF_DAY' || status === 'LATE') return styles.badgeHalfDay;
    return styles.badgeAbsent;
  };
  const getTextStyle = () => {
    if (status === 'PRESENT') return styles.badgePresentText;
    if (status === 'HALF_DAY' || status === 'LATE') return styles.badgeHalfDayText;
    return styles.badgeAbsentText;
  };
  const getText = () => {
    if (status === 'PRESENT') return 'PRESENT';
    if (status === 'HALF_DAY' || status === 'LATE') return 'HALF DAY';
    return 'ABSENT';
  };
  return (
    <View style={[styles.badge, getStyle()]}>
      <AppText style={[styles.badgeText, getTextStyle()]}>{getText()}</AppText>
    </View>
  );
};

// Teacher Card Component
const TeacherCard: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
  const isPresent = teacher.status === 'PRESENT';
  const isHalfDay = teacher.status === 'HALF_DAY' || teacher.status === 'LATE';
  const isActive = teacher.teacher_status?.toUpperCase() === 'ACTIVE';
  
  return (
    <AppCard style={styles.teacherCard}>
      <View style={styles.teacherHeader}>
        <View style={[styles.teacherAvatar, { backgroundColor: C.primary }]}>
          <AppText style={styles.teacherAvatarText} weight="bold">
            {(teacher.teacher_full_name || '?').charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.teacherInfo}>
          <AppText style={styles.teacherName} weight="bold">{teacher.teacher_full_name || '—'}</AppText>
          <AppText style={styles.teacherEmail}>{teacher.email_id || '—'}</AppText>
        </View>
        <StatusBadge status={teacher.status || 'ABSENT'} />
      </View>
      <View style={styles.teacherDetails}>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>EMP ID:</AppText>
          <AppText style={styles.detailValue}>{teacher.employee_id || '—'}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Designation:</AppText>
          <AppText style={styles.detailValue}>{teacher.designation || '—'}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Department:</AppText>
          <AppText style={styles.detailValue}>{teacher.department_subject || '—'}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText style={styles.detailLabel}>Status:</AppText>
          <View style={[styles.profileBadge, isActive ? styles.profileActive : styles.profileInactive]}>
            <AppText style={[styles.profileBadgeText, isActive ? styles.profileActiveText : styles.profileInactiveText]} weight="bold">
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </AppText>
          </View>
        </View>
      </View>
    </AppCard>
  );
};

// Export Modal Component
const ExportModal: React.FC<{
  visible: boolean;
  type: 'teachers' | 'students';
  classItems?: ClassItem[];
  onClose: () => void;
  showToast: (msg: string, type?: string) => void;
  headers: Record<string, string>;
}> = ({ visible, type, classItems, onClose, showToast, headers }) => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>('');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (type !== 'students' || !classItems) return [];
    const map: Record<string, SectionGroup[]> = {};
    classItems.forEach((c) => {
      const grade = String(c.class_grade);
      if (!map[grade]) map[grade] = [];
      map[grade].push({ class_grade: grade, section: c.section, students_total: c.students_total, present: c.present });
    });
    return Object.entries(map).sort((a, b) => {
      const na = parseInt(a[0], 10);
      const nb = parseInt(b[0], 10);
      return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
    });
  }, [classItems, type]);

  const toggleSection = (grade: string, section: string) => {
    const key = `${grade}:${section}`;
    const newSet = new Set(selectedSections);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedSections(newSet);
  };

  const toggleClass = (grade: string, sections: SectionGroup[]) => {
    const allSelected = sections.every(s => selectedSections.has(`${grade}:${s.section}`));
    const newSet = new Set(selectedSections);
    sections.forEach(s => {
      const key = `${grade}:${s.section}`;
      if (allSelected) newSet.delete(key);
      else newSet.add(key);
    });
    setSelectedSections(newSet);
  };

  const selectAll = () => {
    const newSet = new Set<string>();
    groups.forEach(([grade, sections]) => {
      sections.forEach(s => newSet.add(`${grade}:${s.section}`));
    });
    setSelectedSections(newSet);
  };

  const clearAll = () => {
    setSelectedSections(new Set());
  };

  const selectedCount = selectedSections.size;

  const runExport = async () => {
    if (type === 'students' && selectedCount === 0) {
      showToast('Select at least one class/section', 'error');
      return;
    }
    if (startDate > endDate) {
      showToast('Start date must be ≤ end date', 'error');
      return;
    }

    setExporting(true);
    setProgress('Preparing export...');

    try {
      const from = iso(startDate);
      const to = iso(endDate);
      const fileName = type === 'teachers'
        ? `teachers_attendance_${from}_to_${to}.csv`
        : `students_attendance_${from}_to_${to}.csv`;

      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      let response;
      if (type === 'teachers') {
        response = await API.get('/hm/teachers/export', {
          headers,
          params: { start_date: from, end_date: to, file_format: 'csv' },
        });
      } else {
        const tasks: { class_grade: string; section: string }[] = [];
        groups.forEach(([grade, sections]) => {
          sections.forEach(sec => {
            if (selectedSections.has(`${grade}:${sec.section}`)) {
              tasks.push({ class_grade: grade, section: sec.section });
            }
          });
        });
        response = await API.get('/hm/students/export', {
          headers,
          params: {
            start_date: from,
            end_date: to,
            class_sections: JSON.stringify(tasks),
            file_format: 'csv',
          },
        });
      }

      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      await RNFS.writeFile(filePath, content, 'utf8');

      await Share.open({
        url: `file://${filePath}`,
        type: 'text/csv',
        filename: fileName,
        title: 'Export Attendance',
      });

      showToast(`${type === 'teachers' ? 'Teachers' : 'Students'} export completed`);
      onClose();
    } catch (error: any) {
      console.error('Export Error:', error);
      if (error.message !== 'User did not share') {
        showToast('Export failed', 'error');
      }
    } finally {
      setExporting(false);
      setProgress('');
    }
  };

  const dateRangeLength = (() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">
              Export {type === 'teachers' ? 'Teacher' : 'Student'} Attendance
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <AppText style={styles.modalCloseText}>✕</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <AppText style={styles.modalLabel} weight="semiBold">Date Range</AppText>
            <View style={styles.dateRangeRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <AppText style={styles.dateText}>{iso(startDate)}</AppText>
              </TouchableOpacity>
              <AppText style={styles.dateArrow}>→</AppText>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <AppText style={styles.dateText}>{iso(endDate)}</AppText>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) {
                    setStartDate(date);
                    if (date > endDate) setEndDate(date);
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
            <AppText style={styles.modalHint}>{dateRangeLength} day{dateRangeLength !== 1 ? 's' : ''} selected</AppText>

            {type === 'students' && groups.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <AppText style={styles.modalLabel} weight="semiBold">Classes & Sections</AppText>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
                      <AppText style={styles.selectAllText} weight="semiBold">Select All</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll}>
                      <AppText style={styles.clearAllText} weight="semiBold">Clear All</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {groups.map(([grade, sections]) => {
                  const allSelected = sections.every(s => selectedSections.has(`${grade}:${s.section}`));
                  const someSelected = sections.some(s => selectedSections.has(`${grade}:${s.section}`));
                  const color = classColor(grade);
                  return (
                    <View key={grade} style={styles.classGroup}>
                      <TouchableOpacity
                        style={styles.classHeader}
                        onPress={() => toggleClass(grade, sections)}
                      >
                        <View style={[styles.classDot, { backgroundColor: color }]}>
                          <AppText style={styles.classDotText} weight="bold">{grade}</AppText>
                        </View>
                        <AppText style={styles.classTitle} weight="bold">Class {grade}</AppText>
                        <View style={[styles.checkbox, allSelected && styles.checkboxChecked, someSelected && !allSelected && styles.checkboxIndeterminate]} />
                      </TouchableOpacity>

                      {sections.map(sec => {
                        const key = `${grade}:${sec.section}`;
                        const isSelected = selectedSections.has(key);
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[styles.sectionRow, isSelected && styles.sectionRowSelected]}
                            onPress={() => toggleSection(grade, sec.section)}
                          >
                            <View style={[styles.checkboxSmall, isSelected && styles.checkboxSmallChecked]} />
                            <AppText style={styles.sectionText}>Section {sec.section}</AppText>
                            <AppText style={styles.sectionCount}>{sec.students_total || 0} students</AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                <AppText style={styles.selectedCount} weight="semiBold">
                  {selectedCount === 0 ? 'No sections selected' : `${selectedCount} section${selectedCount !== 1 ? 's' : ''} selected`}
                </AppText>
              </>
            )}

            {exporting && (
              <View style={styles.progressWrap}>
                <ActivityIndicator size="small" color={C.primary} />
                <AppText style={styles.progressText} weight="semiBold">{progress || 'Preparing export...'}</AppText>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton
              title={exporting ? 'Exporting...' : 'Export'}
              onPress={runExport}
              disabled={exporting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Students View Component
const StudentsView: React.FC<{
  classItems: ClassItem[];
  headers: Record<string, string>;
  date: Date;
  preselectedSection: { class_grade: string; section: string } | null;
  onPreselectedApplied: () => void;
}> = ({ classItems, headers, date, preselectedSection, onPreselectedApplied }) => {
  const groups = useMemo(() => {
    const map: Record<string, SectionGroup[]> = {};
    classItems.forEach((c) => {
      const grade = String(c.class_grade);
      if (!map[grade]) map[grade] = [];
      map[grade].push({ class_grade: grade, section: c.section, students_total: c.students_total, present: c.present });
    });
    return Object.entries(map).sort((a, b) => {
      const na = parseInt(a[0], 10);
      const nb = parseInt(b[0], 10);
      return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
    });
  }, [classItems]);

  const [selectedSection, setSelectedSection] = useState<SectionGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadStudents = useCallback(async (sec: SectionGroup) => {
    if (!sec) return;
    setLoading(true);
    try {
      const res = await API.get('/hm/students', {
        headers,
        params: {
          class_grade: sec.class_grade,
          section: sec.section,
          on_date: iso(date),
        },
      });
      setStudents(res.data?.items || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [headers, date]);

  useEffect(() => {
    if (preselectedSection && groups.length) {
      const targetGrade = String(preselectedSection.class_grade).trim();
      const targetSection = String(preselectedSection.section).trim();
      const groupMatch = groups.find(([grade]) => grade === targetGrade);
      if (groupMatch) {
        const [grade, secs] = groupMatch;
        const secMatch = secs.find(sec => sec.section === targetSection);
        if (secMatch) setSelectedSection(secMatch);
      }
      onPreselectedApplied();
    }
  }, [preselectedSection, groups]);

  useEffect(() => {
    if (groups.length && !selectedSection) {
      const [grade, secs] = groups[0];
      if (secs.length) setSelectedSection(secs[0]);
    }
  }, [groups]);

  useEffect(() => {
    if (selectedSection) loadStudents(selectedSection);
  }, [selectedSection, loadStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter(s => {
      const nameMatch = !searchQuery || (s.student_full_name || '').toLowerCase().includes(q);
      const rollMatch = !searchQuery || String(s.roll_number || '').includes(q);
      const admissionMatch = !searchQuery || String(s.admission_number || '').includes(q);
      const statusMatch = !statusFilter || s.status === statusFilter;
      return (nameMatch || rollMatch || admissionMatch) && statusMatch;
    });
  }, [students, searchQuery, statusFilter]);

  const presentCount = students.filter(s => s.status === 'PRESENT').length;
  const halfDayCount = students.filter(s => s.status === 'HALF_DAY' || s.status === 'LATE').length;
  const absentCount = students.filter(s => s.status === 'ABSENT').length;
  const attendancePct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  if (!selectedSection) {
    return (
      <View style={styles.emptyPanel}>
        <AppText style={styles.emptyIcon}>📚</AppText>
        <AppText style={styles.emptyTitle} weight="bold">Select a class section</AppText>
        <AppText style={styles.emptyText}>Choose from the left panel</AppText>
      </View>
    );
  }

  return (
    <View style={styles.splitLayout}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <AppText style={styles.sidebarTitle} weight="bold">Classes & Sections</AppText>
        <ScrollView>
          {groups.map(([grade, sections]) => {
            const color = classColor(grade);
            const total = sections.reduce((sum, s) => sum + (s.students_total || 0), 0);
            return (
              <View key={grade} style={styles.classGroup}>
                <View style={[styles.classHeader, { backgroundColor: color + '15' }]}>
                  <View style={[styles.classDot, { backgroundColor: color }]}>
                    <AppText style={styles.classDotText} weight="bold">{grade}</AppText>
                  </View>
                  <View>
                    <AppText style={styles.classTitle} weight="bold">Class {grade}</AppText>
                    <AppText style={styles.classSubtitle}>
                      {total} students · {sections.length} section{sections.length !== 1 ? 's' : ''}
                    </AppText>
                  </View>
                </View>
                {sections.map(sec => {
                  const isSelected = selectedSection?.class_grade === sec.class_grade && selectedSection?.section === sec.section;
                  const presentPct = sec.students_total ? Math.round(((sec.present || 0) / sec.students_total) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={`${sec.class_grade}-${sec.section}`}
                      style={[styles.sectionItem, isSelected && styles.sectionItemSelected]}
                      onPress={() => setSelectedSection(sec)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]} />
                      <View style={styles.sectionInfo}>
                        <AppText style={[styles.sectionName, isSelected && styles.sectionNameSelected]} weight={isSelected ? "bold" : "normal"}>
                          Section {sec.section}
                        </AppText>
                        <AppText style={styles.sectionSubtitle}>{sec.students_total || 0} students</AppText>
                      </View>
                      <View style={[styles.sectionPct, presentPct > 75 ? styles.sectionPctHigh : styles.sectionPctLow]}>
                        <AppText style={styles.sectionPctText} weight="bold">{presentPct}%</AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Panel */}
      <View style={styles.mainPanel}>
        <View style={styles.panelHeader}>
          <View>
            <AppText style={styles.panelTitle} weight="bold">
              Class {selectedSection.class_grade} — Section {selectedSection.section}
            </AppText>
            <AppText style={styles.panelSubtitle}>{iso(date)}</AppText>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statChip, styles.statTotal]}>
              <AppText style={styles.statValue} weight="bold">{students.length}</AppText>
              <AppText style={styles.statLabel}>Total</AppText>
            </View>
            <View style={[styles.statChip, styles.statPresent]}>
              <AppText style={styles.statValue} weight="bold">{presentCount}</AppText>
              <AppText style={styles.statLabel}>Present</AppText>
            </View>
            <View style={[styles.statChip, styles.statHalf]}>
              <AppText style={styles.statValue} weight="bold">{halfDayCount}</AppText>
              <AppText style={styles.statLabel}>Half Day</AppText>
            </View>
            <View style={[styles.statChip, styles.statAbsent]}>
              <AppText style={styles.statValue} weight="bold">{absentCount}</AppText>
              <AppText style={styles.statLabel}>Absent</AppText>
            </View>
            <View style={[styles.statChip, attendancePct > 75 ? styles.statSuccess : styles.statDanger]}>
              <AppText style={styles.statValue} weight="bold">{attendancePct}%</AppText>
              <AppText style={styles.statLabel}>Rate</AppText>
            </View>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchFilterBar}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, roll no, admission no..."
              placeholderTextColor={C.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <AppText style={styles.clearBtnText}>✕</AppText>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              {['', 'PRESENT', 'HALF_DAY', 'ABSENT'].map(status => (
                <TouchableOpacity
                  key={status || 'all'}
                  style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                  onPress={() => setStatusFilter(status)}
                >
                  <AppText style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]} weight="semiBold">
                    {status || 'All'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Student List */}
        {loading ? (
          <Loader />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyPanel}>
            <AppText style={styles.emptyIcon}>👥</AppText>
            <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your search</AppText>
          </View>
        ) : (
          <ScrollView horizontal>
            <View>
              <View style={styles.tableHeader}>
                <AppText style={[styles.tableHeaderText, styles.colNumber]} weight="bold">#</AppText>
                <AppText style={[styles.tableHeaderText, styles.colName]} weight="bold">Student</AppText>
                <AppText style={[styles.tableHeaderText, styles.colRoll]} weight="bold">Roll No</AppText>
                <AppText style={[styles.tableHeaderText, styles.colAdmission]} weight="bold">Admission No</AppText>
                <AppText style={[styles.tableHeaderText, styles.colStatus]} weight="bold">Status</AppText>
              </View>
              {filteredStudents.map((student, idx) => {
                return (
                  <View key={student.student_id} style={styles.tableRow}>
                    <AppText style={[styles.tableCell, styles.colNumber, styles.cellNumber]}>{idx + 1}</AppText>
                    <View style={[styles.tableCell, styles.colName, styles.cellName]}>
                      <View style={[styles.studentAvatar, { backgroundColor: classColor(selectedSection.class_grade) }]}>
                        <AppText style={styles.studentAvatarText} weight="bold">
                          {(student.student_full_name || '?').charAt(0).toUpperCase()}
                        </AppText>
                      </View>
                      <AppText style={styles.studentNameText} weight="semiBold">{student.student_full_name || '—'}</AppText>
                    </View>
                    <AppText style={[styles.tableCell, styles.colRoll, styles.cellMono]}>{student.roll_number || '—'}</AppText>
                    <AppText style={[styles.tableCell, styles.colAdmission, styles.cellMono]}>{student.admission_number || '—'}</AppText>
                    <View style={[styles.tableCell, styles.colStatus]}>
                      <StatusBadge status={student.status || 'ABSENT'} />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Attendance Bar */}
        <View style={styles.attendanceBar}>
          <AppText style={styles.attendanceLabel} weight="bold">Attendance</AppText>
          <View style={styles.attendanceTrack}>
            <View style={[styles.attendanceFill, { width: `${attendancePct}%` }]} />
          </View>
          <AppText style={[styles.attendancePct, attendancePct > 75 ? styles.attendancePctHigh : styles.attendancePctLow]} weight="bold">
            {attendancePct}%
          </AppText>
        </View>
      </View>
    </View>
  );
};

export default function HMAttendanceScreen() {
  const route = useRoute<any>();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [view, setView] = useState<'teachers' | 'students'>('teachers');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  
  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [preselectedSection, setPreselectedSection] = useState<{ class_grade: string; section: string } | null>(null);

  const [stmtScope, setStmtScope] = useState<'weekly' | 'monthly'>('weekly');
  const [statement, setStatement] = useState<AttendanceStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);

  const [showExport, setShowExport] = useState<boolean>(false);
  const [showTeacherExport, setShowTeacherExport] = useState<boolean>(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: string }>({ visible: false, message: '', type: 'success' });

  const ITEMS_PER_PAGE = 12;

  const showToast = useCallback((msg: string, type: string = 'success') => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      setSchoolCode(code);
      setBranchId(bid);
    };
    load();
  }, []);

  const loadTeachers = useCallback(async () => {
    if (!schoolCode || !branchId) return;
    setLoadingTeachers(true);
    try {
      const res = await API.get('/hm/teachers/attendance', {
        headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId },
        params: { on_date: iso(date) },
      });
      setTeachers(res.data?.items || []);
    } catch (error) {
      showToast('Failed to load teachers', 'error');
    } finally {
      setLoadingTeachers(false);
    }
  }, [schoolCode, branchId, date]);

  const loadClasses = useCallback(async () => {
    if (!schoolCode || !branchId) return;
    setLoadingClasses(true);
    try {
      const res = await API.get('/hm/classes', {
        headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId },
        params: { on_date: iso(date) },
      });
      setClassItems(res.data?.items || []);
    } catch (error) {
      showToast('Failed to load classes', 'error');
    } finally {
      setLoadingClasses(false);
    }
  }, [schoolCode, branchId, date]);

  const loadStatement = useCallback(async () => {
    if (!schoolCode || !branchId) return;
    setLoadingStatement(true);
    try {
      const res = await API.get('/hm/attendance/statements', {
        headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId },
        params: { scope: stmtScope, on_date: iso(date) },
      });
      setStatement(res.data);
    } catch (error) {
      console.error('Failed to load statement:', error);
    } finally {
      setLoadingStatement(false);
    }
  }, [schoolCode, branchId, date, stmtScope]);

  useEffect(() => {
    if (schoolCode && branchId) {
      loadTeachers();
      loadClasses();
      loadStatement();
    }
  }, [schoolCode, branchId, loadTeachers, loadClasses, loadStatement]);

  useEffect(() => {
    if (route.params?.class_grade && route.params?.section) {
      setView('students');
      setPreselectedSection({
        class_grade: route.params.class_grade,
        section: route.params.section
      });
    } else if (route.params?.view) {
      setView(route.params.view);
    }
  }, [route.params]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const nameMatch = search === '' || (teacher.teacher_full_name || '').toLowerCase().includes(search.toLowerCase());
      const idMatch = search === '' || String(teacher.employee_id || '').toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === '' || teacher.status === statusFilter;
      return (nameMatch || idMatch) && statusMatch;
    });
  }, [teachers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE));
  const paginatedTeachers = filteredTeachers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePreselectedApplied = useCallback(() => {
    setPreselectedSection(null);
  }, []);

  const headers = useMemo(() => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  }), [schoolCode, branchId]);

  const onRefresh = useCallback(async () => {
    if (view === 'teachers') {
      await loadTeachers();
    } else {
      await loadClasses();
    }
    await loadStatement();
  }, [view, loadTeachers, loadClasses, loadStatement]);

  return (
    <View style={styles.container}>
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <AppText style={styles.toastText} weight="bold">{toast.message}</AppText>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <View style={styles.header}>
          <AppText style={styles.title} weight="bold">📊 Attendance Management</AppText>
          <AppText style={styles.subtitle}>
            {view === 'teachers' ? `${filteredTeachers.length} teachers` : `${classItems.length} classes`}
          </AppText>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'teachers' && styles.toggleBtnActive]}
              onPress={() => setView('teachers')}
            >
              <AppText style={[styles.toggleText, view === 'teachers' && styles.toggleTextActive]} weight="semiBold">👨‍🏫 Teachers</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'students' && styles.toggleBtnActive]}
              onPress={() => setView('students')}
            >
              <AppText style={[styles.toggleText, view === 'students' && styles.toggleTextActive]} weight="semiBold">👨‍🎓 Students</AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <AppText style={styles.dateText}>📅 {iso(date)}</AppText>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <View style={styles.scopeSelector}>
            <TouchableOpacity
              style={[styles.scopeBtn, stmtScope === 'weekly' && styles.scopeBtnActive]}
              onPress={() => setStmtScope('weekly')}
            >
              <AppText style={[styles.scopeText, stmtScope === 'weekly' && styles.scopeTextActive]} weight="semiBold">Weekly</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeBtn, stmtScope === 'monthly' && styles.scopeBtnActive]}
              onPress={() => setStmtScope('monthly')}
            >
              <AppText style={[styles.scopeText, stmtScope === 'monthly' && styles.scopeTextActive]} weight="semiBold">Monthly</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionActions}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => setShowTeacherExport(true)}>
              <AppText style={styles.exportBtnText} weight="semiBold">📤 Export Teachers</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExport(true)}>
              <AppText style={styles.exportBtnText} weight="semiBold">📤 Export Students</AppText>
            </TouchableOpacity>
            <AppButton title="🔄 Refresh" onPress={onRefresh} type="secondary" />
          </View>
        </View>

        <AppCard style={styles.statementCard}>
          <View style={styles.statementHeader}>
            <AppText style={styles.statementTitle} weight="bold">
              {stmtScope === 'monthly' ? 'Monthly' : 'Weekly'} Attendance Statement
            </AppText>
            {loadingStatement ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <AppText style={styles.statementRange}>
                {statement?.period?.start_date} to {statement?.period?.end_date}
              </AppText>
            )}
          </View>
          <View style={styles.statementGrid}>
            <View style={styles.statementItem}>
              <AppText style={styles.statementItemLabel} weight="semiBold">Teachers</AppText>
              <AppText style={styles.statementItemValue} weight="bold">{statement?.teachers?.attendance_pct ?? 0}%</AppText>
              <AppText style={styles.statementItemSub}>
                Present eq: {statement?.teachers?.present_equivalent ?? 0} | Half: {statement?.teachers?.half_day_equivalent ?? 0}
              </AppText>
            </View>
            <View style={styles.statementItem}>
              <AppText style={styles.statementItemLabel} weight="semiBold">Students</AppText>
              <AppText style={styles.statementItemValue} weight="bold">{statement?.students?.attendance_pct ?? 0}%</AppText>
              <AppText style={styles.statementItemSub}>
                Present eq: {statement?.students?.present_equivalent ?? 0} | Half: {statement?.students?.half_day_equivalent ?? 0}
              </AppText>
            </View>
          </View>
        </AppCard>

        {view === 'teachers' && (
          <>
            <View style={styles.filterBar}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or employee ID..."
                  placeholderTextColor={C.muted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                    <AppText style={styles.clearBtnText}>✕</AppText>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  {['', 'PRESENT', 'HALF_DAY', 'ABSENT'].map(status => (
                    <TouchableOpacity
                      key={status || 'all'}
                      style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <AppText style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]} weight="semiBold">
                        {status || 'All'}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {loadingTeachers ? (
              <Loader />
            ) : paginatedTeachers.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <AppText style={styles.emptyIcon}>👨‍🏫</AppText>
                <AppText style={styles.emptyTitle} weight="bold">No teachers found</AppText>
                <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
              </AppCard>
            ) : (
              <>
                {paginatedTeachers.map(teacher => (
                  <TeacherCard key={teacher.teacher_id} teacher={teacher} />
                ))}
                {totalPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <AppText style={styles.pageBtnText}>◀</AppText>
                    </TouchableOpacity>
                    <AppText style={styles.pageInfo}>Page {page} of {totalPages}</AppText>
                    <TouchableOpacity
                      style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <AppText style={styles.pageBtnText}>▶</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {view === 'students' && (
          loadingClasses ? (
            <Loader />
          ) : classItems.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <AppText style={styles.emptyIcon}>👨‍🎓</AppText>
              <AppText style={styles.emptyTitle} weight="bold">No classes available</AppText>
              <AppText style={styles.emptyText}>No class data found for this date</AppText>
            </AppCard>
          ) : (
            <StudentsView
              classItems={classItems}
              headers={headers}
              date={date}
              preselectedSection={preselectedSection}
              onPreselectedApplied={handlePreselectedApplied}
            />
          )
        )}

        <View style={styles.footer}>
          <AppText style={styles.footerText}>🏫 School: {schoolCode || '—'}</AppText>
          <AppText style={styles.footerText}>🏢 Branch: {branchId || '—'}</AppText>
          <AppText style={styles.footerText}>📅 Data as of {iso(date)}</AppText>
        </View>
      </ScrollView>

      <ExportModal
        visible={showExport}
        type="students"
        classItems={classItems}
        onClose={() => setShowExport(false)}
        showToast={showToast}
        headers={headers}
      />
      <ExportModal
        visible={showTeacherExport}
        type="teachers"
        onClose={() => setShowTeacherExport(false)}
        showToast={showToast}
        headers={headers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  toast: {
    position: 'absolute',
    top: 60,
    right: 16,
    left: 16,
    padding: 12,
    borderRadius: 10,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: C.success,
  },
  toastError: {
    backgroundColor: C.error,
  },
  toastText: {
    color: '#fff',
    textAlign: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: C.text,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  toggleBtnActive: {
    backgroundColor: C.primary,
  },
  toggleText: {
    fontSize: 13,
    color: C.muted,
  },
  toggleTextActive: {
    color: '#fff',
  },
  dateBtn: {
    backgroundColor: C.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateText: {
    fontSize: 13,
    color: C.text,
  },
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  scopeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  scopeBtnActive: {
    backgroundColor: C.primary,
  },
  scopeText: {
    fontSize: 13,
    color: C.muted,
  },
  scopeTextActive: {
    color: '#fff',
  },
  statementCard: {
    padding: 16,
    marginBottom: 16,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statementTitle: {
    fontSize: 14,
    color: C.text,
  },
  statementRange: {
    fontSize: 11,
    color: C.muted,
  },
  statementGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statementItem: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 10,
  },
  statementItemLabel: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 4,
  },
  statementItemValue: {
    fontSize: 24,
    color: C.text,
  },
  statementItemSub: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  filterBar: {
    marginBottom: 16,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    backgroundColor: C.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  exportBtnText: {
    fontSize: 13,
    color: C.primary,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: C.text,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    fontSize: 14,
    color: C.muted,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: C.muted,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  teacherCard: {
    padding: 16,
    marginBottom: 12,
  },
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teacherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teacherAvatarText: {
    fontSize: 18,
    color: '#fff',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 15,
    color: C.text,
  },
  teacherEmail: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  teacherDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 100,
    fontSize: 12,
    color: C.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: C.text,
  },
  profileBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  profileActive: {
    backgroundColor: C.successSoft,
  },
  profileInactive: {
    backgroundColor: C.errorSoft,
  },
  profileBadgeText: {
    fontSize: 10,
  },
  profileActiveText: {
    color: C.success,
  },
  profileInactiveText: {
    color: C.error,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgePresent: {
    backgroundColor: C.successSoft,
  },
  badgeHalfDay: {
    backgroundColor: C.warningSoft,
  },
  badgeAbsent: {
    backgroundColor: C.errorSoft,
  },
  badgeText: {
    fontSize: 11,
  },
  badgePresentText: {
    color: C.success,
  },
  badgeHalfDayText: {
    color: C.warning,
  },
  badgeAbsentText: {
    color: C.error,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    color: C.text,
  },
  pageInfo: {
    fontSize: 13,
    color: C.muted,
  },
  splitLayout: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    minHeight: 500,
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: C.bg,
  },
  sidebarTitle: {
    padding: 12,
    fontSize: 11,
    textTransform: 'uppercase',
    color: C.muted,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  classGroup: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  classDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classDotText: {
    fontSize: 12,
    color: '#fff',
  },
  classTitle: {
    fontSize: 13,
    color: C.text,
  },
  classSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 1,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sectionItemSelected: {
    backgroundColor: C.primary + '20',
    borderLeftColor: C.primary,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.muted,
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 13,
    color: C.text,
  },
  sectionNameSelected: {
    color: C.primary,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 1,
  },
  sectionPct: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionPctHigh: {
    backgroundColor: C.successSoft,
  },
  sectionPctLow: {
    backgroundColor: C.errorSoft,
  },
  sectionPctText: {
    fontSize: 11,
    color: C.text,
  },
  mainPanel: {
    flex: 1,
  },
  panelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  panelTitle: {
    fontSize: 15,
    color: C.text,
  },
  panelSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statTotal: {
    backgroundColor: C.bg,
  },
  statPresent: {
    backgroundColor: C.successSoft,
  },
  statHalf: {
    backgroundColor: C.warningSoft,
  },
  statAbsent: {
    backgroundColor: C.errorSoft,
  },
  statSuccess: {
    backgroundColor: C.successSoft,
  },
  statDanger: {
    backgroundColor: C.errorSoft,
  },
  statValue: {
    fontSize: 16,
    color: C.text,
  },
  statLabel: {
    fontSize: 9,
    color: C.muted,
    marginTop: 2,
  },
  searchFilterBar: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  emptyPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderText: {
    fontSize: 11,
    color: C.muted,
    textTransform: 'uppercase',
  },
  colNumber: { width: 50 },
  colName: { width: 200 },
  colRoll: { width: 100 },
  colAdmission: { width: 120 },
  colStatus: { width: 110 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableCell: {
    // Shared with View rows; avoid text-only props here.
  },
  cellNumber: {
    textAlign: 'center',
    color: C.muted,
  },
  cellName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cellMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: C.muted,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 12,
    color: '#fff',
  },
  studentNameText: {
    color: C.text,
  },
  attendanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  attendanceLabel: {
    fontSize: 11,
    color: C.muted,
  },
  attendanceTrack: {
    flex: 1,
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  attendanceFill: {
    height: '100%',
    backgroundColor: C.success,
    borderRadius: 3,
  },
  attendancePct: {
    fontSize: 13,
  },
  attendancePctHigh: {
    color: C.success,
  },
  attendancePctLow: {
    color: C.error,
  },
  footer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 11,
    color: C.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    color: C.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: C.muted,
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: C.text,
    marginBottom: 12,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dateArrow: {
    fontSize: 14,
    color: C.muted,
  },
  modalHint: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.primary,
  },
  selectAllText: {
    fontSize: 11,
    color: C.primary,
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.error,
  },
  clearAllText: {
    fontSize: 11,
    color: C.error,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.border,
    marginLeft: 'auto',
  },
  checkboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checkboxIndeterminate: {
    backgroundColor: C.muted,
    borderColor: C.muted,
  },
  checkboxSmall: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.border,
    marginRight: 10,
  },
  checkboxSmallChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 20,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionRowSelected: {
    backgroundColor: C.primary + '20',
  },
  sectionText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
  },
  sectionCount: {
    fontSize: 11,
    color: C.muted,
  },
  selectedCount: {
    marginTop: 12,
    fontSize: 12,
    color: C.primary,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.primary + '20',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  progressText: {
    fontSize: 13,
    color: C.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});
