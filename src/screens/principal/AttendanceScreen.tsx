import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  ChevronLeft,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  Download,
  User,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  X,
  BookOpen,
  Users2,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../theme/tokens';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';




// Local theme bridge

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
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await storage.getString(StorageKeys.BRANCH_ID);
  return id || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
};

const iso = (date: Date): string => date.toISOString().split('T')[0];

const formatPersonName = (name?: string): string => {
  if (!name?.trim()) { return '—'; }
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const attendanceLabel = (status: string): string => {
  if (status === 'PRESENT') { return 'Present'; }
  if (status === 'HALF_DAY' || status === 'LATE') { return 'Half day'; }
  return 'Absent';
};

const PAGE_PAD = 16;

const CLASS_COLORS = [
  '#6648dc', '#7c3aed', '#db2777', Theme.colors.success, '#d97706', '#0891b2', '#4f46e5', '#16a34a', Theme.colors.error, '#9333ea',
];

const classColor = (grade: string): string => {
  const idx = (parseInt(grade, 10) - 1) % CLASS_COLORS.length;
  return CLASS_COLORS[isNaN(idx) ? 0 : idx];
};

// Status Badge — compact pill; attendance only (not account status)
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isPresent = status === 'PRESENT';
  const isHalfDay = status === 'HALF_DAY' || status === 'LATE';

  const getStyle = () => {
    if (isPresent) { return styles.badgePresent; }
    if (isHalfDay) { return styles.badgeHalfDay; }
    return styles.badgeAbsent;
  };
  const getTextStyle = () => {
    if (isPresent) { return styles.badgePresentText; }
    if (isHalfDay) { return styles.badgeHalfDayText; }
    return styles.badgeAbsentText;
  };
  const getDotStyle = () => {
    if (isPresent) { return styles.badgeDotPresent; }
    if (isHalfDay) { return styles.badgeDotHalfDay; }
    return styles.badgeDotAbsent;
  };

  return (
    <View style={[styles.badge, getStyle()]}>
      <View style={[styles.badgeDot, getDotStyle()]} />
      <AppText style={[styles.badgeText, getTextStyle()]} weight="semibold">
        {attendanceLabel(status || 'ABSENT')}
      </AppText>
    </View>
  );
};

// Teacher row — single compact line + subtitle
const TeacherCard: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
  const isActive = teacher.teacher_status?.toUpperCase() === 'ACTIVE';
  const meta = [
    teacher.employee_id,
    teacher.designation,
    teacher.department_subject,
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.teacherCard}>
      <View style={[styles.teacherAvatar, !isActive && styles.teacherAvatarMuted]}>
        <AppText style={styles.teacherAvatarText} weight="semibold">
          {(teacher.teacher_full_name || '?').charAt(0).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.teacherInfo}>
        <AppText style={styles.teacherName} weight="semibold" numberOfLines={1}>
          {formatPersonName(teacher.teacher_full_name)}
          {!isActive ? (
            <AppText style={styles.inactiveSuffix}> · Inactive</AppText>
          ) : null}
        </AppText>
        {meta ? (
          <AppText style={styles.teacherMeta} numberOfLines={1}>{meta}</AppText>
        ) : null}
        {teacher.email_id ? (
          <AppText style={styles.teacherEmail} numberOfLines={1}>
            {teacher.email_id.toLowerCase()}
          </AppText>
        ) : null}
      </View>
      <StatusBadge status={teacher.status || 'ABSENT'} />
    </View>
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
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const groups = useMemo(() => {
    if (type !== 'students' || !classItems) {return [];}
    const map: Record<string, SectionGroup[]> = {};
    classItems.forEach((c) => {
      const grade = String(c.class_grade);
      if (!map[grade]) {map[grade] = [];}
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
    if (newSet.has(key)) {newSet.delete(key);}
    else {newSet.add(key);}
    setSelectedSections(newSet);
  };

  const toggleClass = (grade: string, sections: SectionGroup[]) => {
    const allSelected = sections.every(s => selectedSections.has(`${grade}:${s.section}`));
    const newSet = new Set(selectedSections);
    sections.forEach(s => {
      const key = `${grade}:${s.section}`;
      if (allSelected) {newSet.delete(key);}
      else {newSet.add(key);}
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
        response = await API.get('principal/teachers/export', {
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
        response = await API.get('principal/students/export', {
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

      const fileUri = Platform.OS === 'android' ? `content://com.visys.attendx.fileprovider/internal_files/${fileName}` : `file://${filePath}`;

      await Share.open({
        url: fileUri,
        type: 'text/csv',
        filename: fileName,
        title: 'Export Attendance',
      });

      if (!isMounted.current) {return;}
      showToast(`${type === 'teachers' ? 'Teachers' : 'Students'} export completed`);
      onClose();
    } catch (error: any) {
      if (!isMounted.current) {return;}
      if (error?.response?.status === 401) {return;}
      console.error('Export Error:', error);
      if (error.message !== 'User did not share') {
        showToast('Export failed', 'error');
      }
    } finally {
      if (isMounted.current) {
        setExporting(false);
        setProgress('');
      }
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
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={20} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <AppText style={styles.modalLabel} weight="semibold">Date Range</AppText>
            <View style={styles.dateRangeRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Calendar size={14} color={C.primary} style={{ marginRight: 6 }} />
                <AppText style={styles.dateText}>{iso(startDate)}</AppText>
              </TouchableOpacity>
              <ArrowRight size={16} color={C.muted} />
              <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Calendar size={14} color={C.primary} style={{ marginRight: 6 }} />
                <AppText style={styles.dateText}>{iso(endDate)}</AppText>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) {
                    setStartDate(date);
                    if (date > endDate) {setEndDate(date);}
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) {setEndDate(date);}
                }}
              />
            )}
            <AppText style={styles.modalHint}>{dateRangeLength} day{dateRangeLength !== 1 ? 's' : ''} selected</AppText>

            {type === 'students' && groups.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <AppText style={styles.modalLabel} weight="semibold">Classes & Sections</AppText>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity accessibilityRole="button" style={styles.selectAllBtn} onPress={selectAll}>
                      <AppText style={styles.selectAllText} weight="semibold">Select All</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.clearAllBtn} onPress={clearAll}>
                      <AppText style={styles.clearAllText} weight="semibold">Clear All</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {groups.map(([grade, sections]) => {
                  const allSelected = sections.every(s => selectedSections.has(`${grade}:${s.section}`));
                  const someSelected = sections.some(s => selectedSections.has(`${grade}:${s.section}`));
                  const color = classColor(grade);
                  return (
                    <View key={grade} style={styles.classGroup}>
                      <TouchableOpacity accessibilityRole="button"
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
                          <TouchableOpacity accessibilityRole="button"
                            key={key}
                            style={[styles.sectionRow, isSelected && styles.sectionRowSelected]}
                            onPress={() => toggleSection(grade, sec.section)}
                          >
                            <View style={[styles.checkboxSmall, isSelected && styles.checkboxSmallChecked]}>
                              {isSelected && <CheckCircle2 size={12} color={Theme.colors.card} />}
                            </View>
                            <AppText style={styles.sectionText}>Section {sec.section}</AppText>
                            <AppText style={styles.sectionCount}>{sec.students_total || 0} students</AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                <AppText style={styles.selectedCount} weight="semibold">
                  {selectedCount === 0 ? 'No sections selected' : `${selectedCount} section${selectedCount !== 1 ? 's' : ''} selected`}
                </AppText>
              </>
            )}

            {exporting && (
              <View style={styles.progressWrap}>
                <ActivityIndicator size="small" color={C.primary} />
                <AppText style={styles.progressText} weight="semibold">{progress || 'Preparing export...'}</AppText>
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
  selectedSection: SectionGroup | null;
  onSelectedSectionChange: (section: SectionGroup | null) => void;
  headers: Record<string, string>;
  date: Date;
  preselectedSection: { class_grade: string; section: string } | null;
  onPreselectedApplied: () => void;
}> = ({ classItems, selectedSection, onSelectedSectionChange, headers, date, preselectedSection, onPreselectedApplied }) => {
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 768;

  const groups = useMemo(() => {
    const map: Record<string, SectionGroup[]> = {};
    classItems.forEach((c) => {
      const grade = String(c.class_grade);
      if (!map[grade]) {map[grade] = [];}
      map[grade].push({ class_grade: grade, section: c.section, students_total: c.students_total, present: c.present });
    });
    return Object.entries(map).sort((a, b) => {
      const na = parseInt(a[0], 10);
      const nb = parseInt(b[0], 10);
      return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
    });
  }, [classItems]);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadStudents = useCallback(async (sec: SectionGroup) => {
    if (!sec) {return;}
    setLoading(true);
    try {
      const res = await API.get('principal/students', {
        params: {
          class_grade: sec.class_grade,
          section: sec.section,
          on_date: iso(date),
        },
      });
      if (isMounted.current) {
        setStudents(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current) {return;}
      if (error?.response?.status === 401) {return;}
      Alert.alert('Error', 'Failed to load students');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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
        if (secMatch) {onSelectedSectionChange(secMatch);}
      }
      onPreselectedApplied();
    }
  }, [preselectedSection, groups, onSelectedSectionChange, onPreselectedApplied]);

  useEffect(() => {
    if (groups.length && !selectedSection) {
      const [grade, secs] = groups[0];
      if (secs.length) {onSelectedSectionChange(secs[0]);}
    }
  }, [groups, selectedSection, onSelectedSectionChange]);

  useEffect(() => {
    if (selectedSection) {loadStudents(selectedSection);}
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
        <BookOpen size={48} color={C.muted} style={{ marginBottom: 12 }} />
        <AppText style={styles.emptyTitle} weight="bold">Select a class section</AppText>
        <AppText style={styles.emptyText}>Choose from the left panel</AppText>
      </View>
    );
  }

  if (isCompactScreen) {
    return (
      <View style={styles.compactStack}>
        <View style={styles.classStatsBar}>
          <View style={styles.classStatsTop}>
            <View style={styles.classStatsTitle}>
              <AppText style={styles.classStatsName} weight="semibold">
                Class {selectedSection.class_grade} · Section {selectedSection.section}
              </AppText>
              <AppText style={styles.classStatsDate}>{iso(date)}</AppText>
            </View>
            <View style={[styles.ratePill, attendancePct >= 75 ? styles.ratePillGood : styles.ratePillLow]}>
              <AppText style={[styles.ratePillText, { color: attendancePct >= 75 ? C.success : C.error }]} weight="semibold">
                {attendancePct}%
              </AppText>
            </View>
          </View>
          <View style={styles.inlineStatsRow}>
            <AppText style={styles.inlineStat}>{students.length} total</AppText>
            <AppText style={styles.inlineStatDot}>·</AppText>
            <AppText style={[styles.inlineStat, { color: C.success }]}>{presentCount} present</AppText>
            <AppText style={styles.inlineStatDot}>·</AppText>
            <AppText style={[styles.inlineStat, { color: C.warning }]}>{halfDayCount} half</AppText>
            <AppText style={styles.inlineStatDot}>·</AppText>
            <AppText style={[styles.inlineStat, { color: C.error }]}>{absentCount} absent</AppText>
          </View>
        </View>

        <View style={styles.pagePad}>
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBoxWrapper}>
            <Search size={16} color={C.muted} style={{ marginRight: Theme.spacing.sm }} />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search by name, roll no..."
              placeholderTextColor={C.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity accessibilityRole="button" onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <X size={16} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {['', 'PRESENT', 'HALF_DAY', 'ABSENT'].map(status => (
              <TouchableOpacity accessibilityRole="button"
                key={status || 'all'}
                style={[styles.filterChipItem, statusFilter === status && styles.filterChipItemActive]}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.8}
              >
                <AppText style={[styles.filterChipItemText, statusFilter === status && styles.filterChipItemTextActive]} weight="semibold">
                  {status === '' ? 'All' : status === 'HALF_DAY' ? 'Half day' : attendanceLabel(status)}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        </View>

        {loading ? (
          <Loader />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Users2 size={48} color={C.muted} style={{ marginBottom: 12 }} />
            <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your search</AppText>
          </View>
        ) : (
          <View style={styles.mobileStudentList}>
            {filteredStudents.map((student, idx) => (
              <View key={student.student_id || student.roll_number || `mobile-student-${idx}`} style={styles.mobileStudentCard}>
                <View style={[styles.studentAvatar, { backgroundColor: classColor(selectedSection.class_grade) }]}>
                  <AppText style={styles.studentAvatarText} weight="semibold">
                    {(student.student_full_name || '?').charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.mobileStudentInfo}>
                  <AppText style={styles.studentNameText} weight="semibold" numberOfLines={1}>
                    {formatPersonName(student.student_full_name)}
                  </AppText>
                  <AppText style={styles.studentMetaLine} numberOfLines={1}>
                    Roll {student.roll_number || '—'} · {student.admission_number || '—'}
                  </AppText>
                </View>
                <StatusBadge status={student.status || 'ABSENT'} />
              </View>
            ))}
          </View>
        )}
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
                    <TouchableOpacity accessibilityRole="button"
                      key={`${sec.class_grade}-${sec.section}`}
                      style={[styles.sectionItem, isSelected && styles.sectionItemSelected]}
                      onPress={() => onSelectedSectionChange(sec)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]} />
                      <View style={styles.sectionInfo}>
                        <AppText style={[styles.sectionName, isSelected && styles.sectionNameSelected]} weight={isSelected ? 'bold' : 'regular'}>
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
          <View style={styles.searchBoxWrapper}>
            <Search size={18} color={C.muted} style={{ marginRight: Theme.spacing.sm }} />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search by name, roll no..."
              placeholderTextColor={C.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity accessibilityRole="button" onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <X size={14} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {['', 'PRESENT', 'HALF_DAY', 'ABSENT'].map(status => (
              <TouchableOpacity accessibilityRole="button"
                key={status || 'all'}
                style={[styles.filterChipItem, statusFilter === status && styles.filterChipItemActive]}
                onPress={() => setStatusFilter(status)}
              >
                <AppText style={[styles.filterChipItemText, statusFilter === status && styles.filterChipItemTextActive]} weight="semibold">
                  {status || 'All'}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Student List */}
        {loading ? (
          <Loader />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Users2 size={48} color={C.muted} style={{ marginBottom: 12 }} />
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
                  <View key={student.student_id || student.roll_number || `desktop-student-${idx}`} style={styles.tableRow}>
                    <AppText style={[styles.tableCell, styles.colNumber, styles.cellNumber]}>{idx + 1}</AppText>
                    <View style={[styles.tableCell, styles.colName, styles.cellName]}>
                      <View style={[styles.studentAvatar, { backgroundColor: classColor(selectedSection.class_grade) }]}>
                        <AppText style={styles.studentAvatarText} weight="bold">
                          {(student.student_full_name || '?').charAt(0).toUpperCase()}
                        </AppText>
                      </View>
                      <AppText style={styles.studentNameText} weight="semibold">{student.student_full_name || '—'}</AppText>
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

export default function PrincipalAttendanceScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [view, setView] = useState<'teachers' | 'students'>('teachers');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);

  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [preselectedSection, setPreselectedSection] = useState<{ class_grade: string; section: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionGroup | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const [stmtScope, setStmtScope] = useState<'weekly' | 'monthly'>('weekly');
  const [statement, setStatement] = useState<AttendanceStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);

  const [showExport, setShowExport] = useState<boolean>(false);
  const [showTeacherExport, setShowTeacherExport] = useState<boolean>(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: string }>({ visible: false, message: '', type: 'success' });
  const isMounted = useRef(true);

  const ITEMS_PER_PAGE = 12;

  const studentGroups = useMemo(() => {
    const map: Record<string, SectionGroup[]> = {};
    classItems.forEach((c) => {
      const grade = String(c.class_grade);
      if (!map[grade]) {map[grade] = [];}
      map[grade].push({ class_grade: grade, section: c.section, students_total: c.students_total, present: c.present });
    });
    return Object.entries(map).sort((a, b) => {
      const na = parseInt(a[0], 10);
      const nb = parseInt(b[0], 10);
      return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
    });
  }, [classItems]);

  const availableSections = useMemo(() => {
    if (!selectedSection) {return [] as SectionGroup[];}
    return studentGroups.find(([grade]) => grade === selectedSection.class_grade)?.[1] || [];
  }, [studentGroups, selectedSection]);

  useEffect(() => {
    if (studentGroups.length && !selectedSection) {
      setSelectedSection(studentGroups[0][1][0] || null);
    }
  }, [studentGroups, selectedSection]);

  useEffect(() => {
    if (preselectedSection && studentGroups.length) {
      const matchedGroup = studentGroups.find(([grade]) => grade === String(preselectedSection.class_grade).trim());
      const matchedSection = matchedGroup?.[1].find(sec => sec.section === String(preselectedSection.section).trim()) || null;
      if (matchedSection) {
        setSelectedSection(matchedSection);
      }
    }
  }, [preselectedSection, studentGroups]);

  const selectedClassLabel = selectedSection ? String(selectedSection.class_grade) : '—';
  const selectedSectionLabel = selectedSection ? String(selectedSection.section) : '—';

  const showToast = useCallback((msg: string, type: string = 'success') => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      if (isMounted.current) {
        setSchoolCode(code);
        setBranchId(bid);
      }
    };
    load();

    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);
  const handleScroll = useScrollTabBar();


  const loadTeachers = useCallback(async () => {
    if (!schoolCode || !branchId) {return;}
    setLoadingTeachers(true);
    try {
      const res = await API.get('principal/staff/attendance', {
        params: { on_date: iso(date) },
      });
      if (isMounted.current) {
        const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
        setTeachers(items);
      }
    } catch (error: any) {
      if (!isMounted.current) {return;}
      if (error?.response?.status === 401) {return;}
      showToast('Failed to load teachers', 'error');
    } finally {
      if (isMounted.current) {
        setLoadingTeachers(false);
      }
    }
  }, [schoolCode, branchId, date]);

  const loadClasses = useCallback(async () => {
    if (!schoolCode || !branchId) {return;}
    setLoadingClasses(true);
    try {
      const res = await API.get('principal/classes', {
        params: { on_date: iso(date) },
      });
      if (isMounted.current) {
        const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
        setClassItems(items);
      }
    } catch (error: any) {
      if (!isMounted.current) {return;}
      if (error?.response?.status === 401) {return;}
      showToast('Failed to load classes', 'error');
    } finally {
      if (isMounted.current) {
        setLoadingClasses(false);
      }
    }
  }, [schoolCode, branchId, date]);

  const loadStatement = useCallback(async () => {
    if (!schoolCode || !branchId) {return;}
    setLoadingStatement(true);
    try {
      const res = await API.get('principal/attendance/statements', {
        params: { scope: stmtScope, on_date: iso(date) },
      });
      if (isMounted.current) {
        setStatement(res.data);
      }
    } catch (error: any) {
      if (!isMounted.current) {return;}
      if (error?.response?.status === 401) {return;}
      console.error('Failed to load statement:', error);
    } finally {
      if (isMounted.current) {
        setLoadingStatement(false);
      }
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
        section: route.params.section,
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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, view, date]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (view === 'teachers') {
        await loadTeachers();
      } else {
        await loadClasses();
      }
      await loadStatement();
    } finally {
      setRefreshing(false);
    }
  }, [view, loadTeachers, loadClasses, loadStatement]);

  return (
    <View style={styles.container}>


      <StandardPageHeader
        title="Attendance Management"
        subtitle={
          view === 'teachers'
            ? `${filteredTeachers.length} Staff • Monitor daily presence`
            : `${classItems.length} Classes • Monitor daily presence`
        }
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={onRefresh}
            accessibilityLabel="Refresh"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      {toast.visible && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <AppText style={styles.toastText} weight="bold">{toast.message}</AppText>
        </View>
      )}

      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <View style={innerPageLayoutStyles.contentFront}>
        <View style={styles.pagePad}>
        <View style={[innerPageLayoutStyles.segmentedControl, styles.segmentedTabContainer]}>
          <TouchableOpacity accessibilityRole="button"
            style={[innerPageLayoutStyles.segmentedTab, view === 'teachers' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={() => setView('teachers')}
            activeOpacity={0.8}
          >
            <Users size={16} color={segmentedControlIconColor(view === 'teachers')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, view === 'teachers' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
              Teachers
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[innerPageLayoutStyles.segmentedTab, view === 'students' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={() => setView('students')}
            activeOpacity={0.8}
          >
            <Users2 size={16} color={segmentedControlIconColor(view === 'students')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, view === 'students' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
              Students
            </AppText>
          </TouchableOpacity>
        </View>

        {view === 'students' && (
          <View style={styles.studentFilterRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.pickerPill}
              onPress={() => setShowClassDropdown(true)}
              activeOpacity={0.85}
            >
              <View style={styles.pickerPillContent}>
                <View style={styles.pickerTextGroup}>
                  <AppText style={styles.pickerLabel}>Class</AppText>
                  <AppText style={styles.pickerValue} weight="semibold">{selectedClassLabel}</AppText>
                </View>
                <ChevronDown size={16} color={C.muted} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.pickerPill, !selectedSection && styles.pickerPillDisabled]}
              onPress={() => selectedSection && setShowSectionDropdown(true)}
              activeOpacity={0.85}
              disabled={!selectedSection}
            >
              <View style={styles.pickerPillContent}>
                <View style={styles.pickerTextGroup}>
                  <AppText style={styles.pickerLabel}>Section</AppText>
                  <AppText style={styles.pickerValue} weight="semibold">{selectedSectionLabel}</AppText>
                </View>
                <ChevronDown size={16} color={C.muted} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Clean Controls: Date selection, Scope Selection, and context-aware Export */}
        <View style={styles.controlsRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.controlPill} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Calendar size={15} color={C.primary} style={{ marginRight: 6 }} />
            <AppText style={styles.controlPillText} weight="bold">
              {iso(date)}
            </AppText>
          </TouchableOpacity>

          <View style={styles.scopeSwitcher}>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.scopeSwitcherBtn, stmtScope === 'weekly' && styles.scopeSwitcherBtnActive]}
              onPress={() => setStmtScope('weekly')}
              activeOpacity={0.8}
            >
              <AppText style={[styles.scopeSwitcherBtnText, stmtScope === 'weekly' && styles.scopeSwitcherBtnTextActive]} weight="semibold">
                Weekly
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.scopeSwitcherBtn, stmtScope === 'monthly' && styles.scopeSwitcherBtnActive]}
              onPress={() => setStmtScope('monthly')}
              activeOpacity={0.8}
            >
              <AppText style={[styles.scopeSwitcherBtnText, stmtScope === 'monthly' && styles.scopeSwitcherBtnTextActive]} weight="semibold">
                Monthly
              </AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity accessibilityRole="button"
            style={styles.exportPill}
            onPress={() => {
              if (view === 'teachers') {
                setShowTeacherExport(true);
              } else {
                setShowExport(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Download size={15} color={C.white} style={{ marginRight: 6 }} />
            <AppText style={styles.exportPillText} weight="bold">Export</AppText>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {setDate(selectedDate);}
            }}
          />
        )}

        <AppCard elevated={false} variant="flat" style={styles.statementCard}>
          <View style={styles.statementHeader}>
            <View style={styles.statementTitleContainer}>
              <AppText style={styles.statementTitle} weight="semibold">
                {stmtScope === 'monthly' ? 'Monthly' : 'Weekly'} summary
              </AppText>
              {loadingStatement ? (
                <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: Theme.spacing.sm }} />
              ) : (
                <AppText style={styles.statementRange}>
                  {statement?.period?.start_date && statement?.period?.end_date
                    ? `${statement.period.start_date} – ${statement.period.end_date}`
                    : 'Loading…'}
                </AppText>
              )}
            </View>
          </View>
          <View style={styles.statementGrid}>
            <View style={styles.statementItem}>
              <View style={styles.statementItemHeader}>
                <AppText style={styles.statementItemLabel} weight="medium">Teachers</AppText>
                <AppText style={styles.statementItemValue} weight="bold">
                  {statement?.teachers?.attendance_pct ?? 0}%
                </AppText>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${statement?.teachers?.attendance_pct ?? 0}%`, backgroundColor: C.primary }]} />
              </View>
              <AppText style={styles.statementItemSub}>
                Present: {statement?.teachers?.present_equivalent ?? 0} • Half: {statement?.teachers?.half_day_equivalent ?? 0}
              </AppText>
            </View>

            <View style={styles.statementItem}>
              <View style={styles.statementItemHeader}>
                <AppText style={styles.statementItemLabel} weight="medium">Students</AppText>
                <AppText style={styles.statementItemValue} weight="bold">
                  {statement?.students?.attendance_pct ?? 0}%
                </AppText>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${statement?.students?.attendance_pct ?? 0}%`, backgroundColor: Theme.colors.success }]} />
              </View>
              <AppText style={styles.statementItemSub}>
                Present: {statement?.students?.present_equivalent ?? 0} • Half: {statement?.students?.half_day_equivalent ?? 0}
              </AppText>
            </View>
          </View>
        </AppCard>

        {view === 'teachers' && (
          <View style={styles.searchFilterContainer}>
              <View style={styles.searchBoxWrapper}>
                <Search size={16} color={C.muted} style={{ marginRight: Theme.spacing.sm }} />
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Search by name or employee ID..."
                  placeholderTextColor={C.muted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity accessibilityRole="button" onPress={() => setSearch('')} style={styles.searchClearBtn}>
                    <X size={16} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
                {['', 'PRESENT', 'HALF_DAY', 'ABSENT'].map(status => (
                  <TouchableOpacity accessibilityRole="button"
                    key={status || 'all'}
                    style={[styles.filterChipItem, statusFilter === status && styles.filterChipItemActive]}
                    onPress={() => setStatusFilter(status)}
                    activeOpacity={0.8}
                  >
                    <AppText style={[styles.filterChipItemText, statusFilter === status && styles.filterChipItemTextActive]} weight="semibold">
                      {status === '' ? 'All' : status === 'HALF_DAY' ? 'Half day' : attendanceLabel(status)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
          </View>
        )}
        </View>

        {view === 'teachers' && (
          <>
            {loadingTeachers ? (
              <View style={styles.pagePad}><Loader /></View>
            ) : paginatedTeachers.length === 0 ? (
              <View style={styles.pagePad}>
                <View style={styles.emptyStateCard}>
                  <Users size={40} color={C.muted} style={{ marginBottom: 8 }} />
                  <AppText style={styles.emptyTitle} weight="semibold">No teachers found</AppText>
                  <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
                </View>
              </View>
            ) : (
              <>
              <View style={styles.listCard}>
                {paginatedTeachers.map((teacher, idx) => (
                  <TeacherCard key={teacher.employee_id || teacher.teacher_id || `teacher-${idx}`} teacher={teacher} />
                ))}
              </View>
              {totalPages > 1 && (
                <View style={[styles.pagination, styles.pagePad]}>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={20} color={C.text} />
                    </TouchableOpacity>
                    <AppText style={styles.pageInfo} weight="semibold">Page {page} of {totalPages}</AppText>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight size={20} color={C.text} />
                    </TouchableOpacity>
                </View>
              )}
              </>
            )}
          </>
        )}

        {view === 'students' && (
          loadingClasses ? (
            <View style={styles.pagePad}><Loader /></View>
          ) : classItems.length === 0 ? (
            <View style={styles.pagePad}>
              <View style={styles.emptyStateCard}>
                <BookOpen size={40} color={C.muted} style={{ marginBottom: 8 }} />
                <AppText style={styles.emptyTitle} weight="semibold">No classes available</AppText>
                <AppText style={styles.emptyText}>No class data found for this date</AppText>
              </View>
            </View>
          ) : (
            <StudentsView
              classItems={classItems}
              selectedSection={selectedSection}
              onSelectedSectionChange={setSelectedSection}
              headers={headers}
              date={date}
              preselectedSection={preselectedSection}
              onPreselectedApplied={handlePreselectedApplied}
            />
          )
        )}

        <View style={[styles.footer, styles.pagePad]}>
          <AppText style={styles.footerText}>{schoolCode || '—'} · {branchId || '—'}</AppText>
          <AppText style={styles.footerText}>{iso(date)}</AppText>
        </View>
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

      <Modal visible={showClassDropdown} transparent animationType="fade" onRequestClose={() => setShowClassDropdown(false)}>
        <TouchableOpacity accessibilityRole="button" style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowClassDropdown(false)}>
          <View style={styles.pickerSheet}>
            <AppText style={styles.pickerSheetTitle} weight="bold">Select Class</AppText>
            <ScrollView>
              {studentGroups.map(([grade, sections]) => (
                <TouchableOpacity accessibilityRole="button"
                  key={grade}
                  style={styles.pickerRow}
                  onPress={() => {
                    setSelectedSection(sections[0] || null);
                    setShowClassDropdown(false);
                  }}
                >
                  <View>
                    <AppText style={styles.pickerRowTitle} weight="semibold">Class {grade}</AppText>
                    <AppText style={styles.pickerRowSubtitle}>{sections.length} section{sections.length !== 1 ? 's' : ''}</AppText>
                  </View>
                  <ChevronRight size={18} color={C.muted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSectionDropdown} transparent animationType="fade" onRequestClose={() => setShowSectionDropdown(false)}>
        <TouchableOpacity accessibilityRole="button" style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowSectionDropdown(false)}>
          <View style={styles.pickerSheet}>
            <AppText style={styles.pickerSheetTitle} weight="bold">Select Section</AppText>
            <ScrollView>
              {availableSections.map(section => {
                const presentPct = section.students_total ? Math.round(((section.present || 0) / section.students_total) * 100) : 0;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={`${section.class_grade}-${section.section}`}
                    style={styles.pickerRow}
                    onPress={() => {
                      setSelectedSection(section);
                      setShowSectionDropdown(false);
                    }}
                  >
                    <View>
                      <AppText style={styles.pickerRowTitle} weight="semibold">Section {section.section}</AppText>
                      <AppText style={styles.pickerRowSubtitle}>{section.students_total || 0} students</AppText>
                    </View>
                    <View style={[styles.pickerPct, presentPct > 75 ? styles.sectionPctHigh : styles.sectionPctLow]}>
                      <AppText style={styles.sectionPctText} weight="bold">{presentPct}%</AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  pagePad: {
    paddingHorizontal: PAGE_PAD,
  },
  segmentedTabContainer: {
    marginBottom: Theme.spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
    gap: 8,
  },
  controlPill: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  controlPillText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  scopeSwitcher: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  scopeSwitcherBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  scopeSwitcherBtnActive: {
    backgroundColor: C.card,
  },
  scopeSwitcherBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  scopeSwitcherBtnTextActive: {
    color: C.primary,
  },
  exportPill: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  exportPillText: {
    ...Theme.typography.caption,
    color: C.white,
  },
  studentFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Theme.spacing.sm,
  },
  pickerPill: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerPillDisabled: {
    opacity: 0.55,
  },
  pickerPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTextGroup: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 14,
    color: C.text,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: Theme.spacing.md,
  },
  pickerSheet: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: Theme.spacing.md,
    maxHeight: '70%',
  },
  pickerSheetTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerRowTitle: {
    ...Theme.typography.body,
    color: C.text,
  },
  pickerRowSubtitle: {
    ...Theme.typography.label,
    color: C.muted,
    marginTop: 2,
  },
  pickerPct: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 999,
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
    color: Theme.colors.card,
    textAlign: 'center',
  },
  header: {
    marginBottom: Theme.spacing.md,
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
  statementCard: {
    marginBottom: Theme.spacing.sm,
    borderRadius: 12,
  },
  statementHeader: {
    marginBottom: Theme.spacing.md,
  },
  statementTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  statementTitle: {
    ...Theme.typography.body,
    color: C.text,
  },
  statementRange: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },
  statementGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statementItem: {
    flex: 1,
    paddingVertical: 4,
  },
  statementItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  statementItemLabel: {
    ...Theme.typography.caption,
    color: C.text2,
  },
  statementItemValue: {
    fontSize: 18,
    color: C.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Theme.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statementItemSub: {
    fontSize: 10,
    color: C.muted,
  },
  searchFilterContainer: {
    marginBottom: Theme.spacing.sm,
  },
  searchBoxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 10,
  },
  searchInputField: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    paddingVertical: Theme.spacing.sm,
  },
  searchClearBtn: {
    padding: Theme.spacing.xs,
  },
  filterChipsScroll: {
    gap: 8,
  },
  filterChipItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterChipItemActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  filterChipItemTextActive: {
    color: C.white,
  },
  listCard: {
    marginHorizontal: -PAGE_PAD,
    backgroundColor: C.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: Theme.spacing.sm,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    paddingVertical: 12,
    paddingHorizontal: PAGE_PAD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: 12,
  },
  teacherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  teacherAvatarMuted: {
    opacity: 0.45,
  },
  teacherAvatarText: {
    fontSize: 16,
    color: C.white,
  },
  teacherInfo: {
    flex: 1,
    minWidth: 0,
  },
  teacherName: {
    fontSize: 15,
    color: C.text,
    lineHeight: 20,
  },
  inactiveSuffix: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '400',
  },
  teacherMeta: {
    fontSize: 12,
    color: C.text2,
    marginTop: 1,
    lineHeight: 16,
  },
  teacherEmail: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeDotPresent: { backgroundColor: C.success },
  badgeDotHalfDay: { backgroundColor: C.warning },
  badgeDotAbsent: { backgroundColor: C.error },
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
  emptyStateCard: {
    padding: 32,
    backgroundColor: C.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: Theme.spacing.xs,
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
    marginTop: Theme.spacing.md,
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
    ...Theme.typography.body,
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
  compactStack: {
    gap: 8,
  },
  classStatsBar: {
    marginHorizontal: -PAGE_PAD,
    paddingHorizontal: PAGE_PAD,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.card,
    gap: 8,
  },
  classStatsTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  classStatsTitle: { flex: 1, minWidth: 0 },
  classStatsName: { fontSize: 15, color: C.text, lineHeight: 20 },
  classStatsDate: { fontSize: 12, color: C.muted, marginTop: 2 },
  ratePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratePillGood: { backgroundColor: C.successSoft },
  ratePillLow: { backgroundColor: C.errorSoft },
  ratePillText: { fontSize: 13 },
  inlineStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  inlineStat: { fontSize: 12, color: C.text2 },
  inlineStatDot: { fontSize: 12, color: C.muted },
  mobilePanelCard: {
    marginBottom: Theme.spacing.sm,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: Theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  statChipHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 54,
  },
  statSuccessBg: {
    backgroundColor: C.successSoft,
  },
  statDangerBg: {
    backgroundColor: C.errorSoft,
  },
  statChipValueText: {
    ...Theme.typography.body,
  },
  statChipLabelText: {
    fontSize: 8,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderRadius: 10,
  },
  statTotalBg: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
  },
  statPresentBg: {
    backgroundColor: C.successSoft,
  },
  statHalfBg: {
    backgroundColor: C.warningSoft,
  },
  statAbsentBg: {
    backgroundColor: C.errorSoft,
  },
  miniStatVal: {
    ...Theme.typography.bodyMd,
    color: C.text,
  },
  miniStatLabel: {
    fontSize: 9,
    color: C.muted,
    marginTop: 2,
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: C.bg,
  },
  sidebarTitle: {
    padding: 12,
    ...Theme.typography.label,
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
    ...Theme.typography.caption,
    color: Theme.colors.card,
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
    paddingLeft: Theme.spacing.md,
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
    paddingHorizontal: Theme.spacing.sm,
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
    ...Theme.typography.label,
    color: C.text,
  },
  mainPanel: {
    flex: 1,
  },
  panelHeader: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  panelTitle: {
    ...Theme.typography.bodyMd,
    color: C.text,
  },
  panelSubtitle: {
    ...Theme.typography.label,
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
    ...Theme.typography.label,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studentAvatarText: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
  },
  studentNameText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 20,
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
    ...Theme.typography.label,
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
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  footerText: {
    ...Theme.typography.label,
    color: C.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
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
    padding: Theme.spacing.md,
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
    padding: Theme.spacing.md,
  },
  modalLabel: {
    ...Theme.typography.body,
    color: C.text,
    marginBottom: 12,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Theme.spacing.sm,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.bg,
  },
  dateText: {
    ...Theme.typography.body,
    color: C.text,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateArrow: {
    ...Theme.typography.body,
    color: C.muted,
  },
  modalHint: {
    ...Theme.typography.label,
    color: C.muted,
    marginBottom: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.primary,
  },
  selectAllText: {
    ...Theme.typography.label,
    color: C.primary,
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.error,
  },
  clearAllText: {
    ...Theme.typography.label,
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
    paddingVertical: Theme.spacing.sm,
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
    ...Theme.typography.label,
    color: C.muted,
  },
  selectedCount: {
    marginTop: 12,
    ...Theme.typography.caption,
    color: C.primary,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.primary + '20',
    padding: 12,
    borderRadius: 10,
    marginTop: Theme.spacing.md,
  },
  progressText: {
    fontSize: 13,
    color: C.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  mobileStudentList: {
    marginHorizontal: -PAGE_PAD,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  mobileStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: PAGE_PAD,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  studentMetaLine: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
    lineHeight: 16,
  },
  mobileStudentInfo: {
    flex: 1,
    minWidth: 0,
  },
});
