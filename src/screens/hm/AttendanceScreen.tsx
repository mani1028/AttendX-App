import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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
  const getText = () => {
    if (status === 'PRESENT') return 'PRESENT';
    if (status === 'HALF_DAY' || status === 'LATE') return 'HALF DAY';
    return 'ABSENT';
  };
  return (
    <View style={[styles.badge, getStyle()]}>
      <Text style={[styles.badgeText, getStyle()]}>{getText()}</Text>
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
        <View style={[styles.teacherAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.teacherAvatarText}>
            {(teacher.teacher_full_name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{teacher.teacher_full_name || '—'}</Text>
          <Text style={styles.teacherEmail}>{teacher.email_id || '—'}</Text>
        </View>
        <StatusBadge status={teacher.status || 'ABSENT'} />
      </View>
      <View style={styles.teacherDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>EMP ID:</Text>
          <Text style={styles.detailValue}>{teacher.employee_id || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Designation:</Text>
          <Text style={styles.detailValue}>{teacher.designation || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Department:</Text>
          <Text style={styles.detailValue}>{teacher.department_subject || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <View style={[styles.profileBadge, isActive ? styles.profileActive : styles.profileInactive]}>
            <Text style={[styles.profileBadgeText, isActive ? styles.profileActiveText : styles.profileInactiveText]}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
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

      if (type === 'teachers') {
        const response = await API.get('/hm/teachers/export', {
          headers,
          params: { start_date: from, end_date: to, file_format: 'csv' },
          responseType: 'blob',
        });
        // For mobile, save and share
        const fileUri = FileSystem.documentDirectory + `teachers_attendance_${from}_to_${to}.csv`;
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(response.data);
        });
        await FileSystem.writeAsStringAsync(fileUri, base64.split(',')[1], { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
        showToast('Teachers export completed');
      } else {
        const tasks: { class_grade: string; section: string }[] = [];
        groups.forEach(([grade, sections]) => {
          sections.forEach(sec => {
            if (selectedSections.has(`${grade}:${sec.section}`)) {
              tasks.push({ class_grade: grade, section: sec.section });
            }
          });
        });
        const response = await API.get('/hm/students/export', {
          headers,
          params: {
            start_date: from,
            end_date: to,
            class_sections: JSON.stringify(tasks),
            file_format: 'csv',
          },
          responseType: 'blob',
        });
        const fileUri = FileSystem.documentDirectory + `students_attendance_${from}_to_${to}.csv`;
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(response.data);
        });
        await FileSystem.writeAsStringAsync(fileUri, base64.split(',')[1], { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
        showToast(`Students export completed - ${selectedCount} sections`);
      }
      onClose();
    } catch (error) {
      showToast('Export failed', 'error');
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
            <Text style={styles.modalTitle}>
              Export {type === 'teachers' ? 'Teacher' : 'Student'} Attendance
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Date Range */}
            <Text style={styles.modalLabel}>Date Range</Text>
            <View style={styles.dateRangeRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateText}>{iso(startDate)}</Text>
              </TouchableOpacity>
              <Text style={styles.dateArrow}>→</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateText}>{iso(endDate)}</Text>
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
            <Text style={styles.modalHint}>{dateRangeLength} day{dateRangeLength !== 1 ? 's' : ''} selected</Text>

            {/* Student Section Selection */}
            {type === 'students' && groups.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.modalLabel}>Classes & Sections</Text>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
                      <Text style={styles.selectAllText}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll}>
                      <Text style={styles.clearAllText}>Clear All</Text>
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
                          <Text style={styles.classDotText}>{grade}</Text>
                        </View>
                        <Text style={styles.classTitle}>Class {grade}</Text>
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
                            <Text style={styles.sectionText}>Section {sec.section}</Text>
                            <Text style={styles.sectionCount}>{sec.students_total || 0} students</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                <Text style={styles.selectedCount}>
                  {selectedCount === 0 ? 'No sections selected' : `${selectedCount} section${selectedCount !== 1 ? 's' : ''} selected`}
                </Text>
              </>
            )}

            {exporting && (
              <View style={styles.progressWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.progressText}>{progress || 'Preparing export...'}</Text>
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
    if (!groups.length && !selectedSection) {
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
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyTitle}>Select a class section</Text>
        <Text style={styles.emptyText}>Choose from the left panel</Text>
      </View>
    );
  }

  return (
    <View style={styles.splitLayout}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Classes & Sections</Text>
        <ScrollView>
          {groups.map(([grade, sections]) => {
            const color = classColor(grade);
            const total = sections.reduce((sum, s) => sum + (s.students_total || 0), 0);
            return (
              <View key={grade} style={styles.classGroup}>
                <View style={[styles.classHeader, { backgroundColor: color + '10' }]}>
                  <View style={[styles.classDot, { backgroundColor: color }]}>
                    <Text style={styles.classDotText}>{grade}</Text>
                  </View>
                  <View>
                    <Text style={styles.classTitle}>Class {grade}</Text>
                    <Text style={styles.classSubtitle}>
                      {total} students · {sections.length} section{sections.length !== 1 ? 's' : ''}
                    </Text>
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
                        <Text style={[styles.sectionName, isSelected && styles.sectionNameSelected]}>
                          Section {sec.section}
                        </Text>
                        <Text style={styles.sectionSubtitle}>{sec.students_total || 0} students</Text>
                      </View>
                      <View style={[styles.sectionPct, presentPct > 75 ? styles.sectionPctHigh : styles.sectionPctLow]}>
                        <Text style={styles.sectionPctText}>{presentPct}%</Text>
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
            <Text style={styles.panelTitle}>
              Class {selectedSection.class_grade} — Section {selectedSection.section}
            </Text>
            <Text style={styles.panelSubtitle}>{iso(date)}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statChip, styles.statTotal]}>
              <Text style={styles.statValue}>{students.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statChip, styles.statPresent]}>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={[styles.statChip, styles.statHalf]}>
              <Text style={styles.statValue}>{halfDayCount}</Text>
              <Text style={styles.statLabel}>Half Day</Text>
            </View>
            <View style={[styles.statChip, styles.statAbsent]}>
              <Text style={styles.statValue}>{absentCount}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={[styles.statChip, attendancePct > 75 ? styles.statSuccess : styles.statDanger]}>
              <Text style={styles.statValue}>{attendancePct}%</Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchFilterBar}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, roll no, admission no..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
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
                  <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                    {status || 'All'}
                  </Text>
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
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>Try adjusting your search</Text>
          </View>
        ) : (
          <ScrollView horizontal>
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colNumber]}>#</Text>
                <Text style={[styles.tableHeaderText, styles.colName]}>Student</Text>
                <Text style={[styles.tableHeaderText, styles.colRoll]}>Roll No</Text>
                <Text style={[styles.tableHeaderText, styles.colAdmission]}>Admission No</Text>
                <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
              </View>
              {filteredStudents.map((student, idx) => {
                const isPresent = student.status === 'PRESENT';
                const isHalfDay = student.status === 'HALF_DAY' || student.status === 'LATE';
                return (
                  <View key={student.student_id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colNumber, styles.cellNumber]}>{idx + 1}</Text>
                    <View style={[styles.tableCell, styles.colName, styles.cellName]}>
                      <View style={[styles.studentAvatar, { backgroundColor: classColor(selectedSection.class_grade) }]}>
                        <Text style={styles.studentAvatarText}>
                          {(student.student_full_name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.studentNameText}>{student.student_full_name || '—'}</Text>
                    </View>
                    <Text style={[styles.tableCell, styles.colRoll, styles.cellMono]}>{student.roll_number || '—'}</Text>
                    <Text style={[styles.tableCell, styles.colAdmission, styles.cellMono]}>{student.admission_number || '—'}</Text>
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
          <Text style={styles.attendanceLabel}>Attendance</Text>
          <View style={styles.attendanceTrack}>
            <View style={[styles.attendanceFill, { width: `${attendancePct}%` }]} />
          </View>
          <Text style={[styles.attendancePct, attendancePct > 75 ? styles.attendancePctHigh : styles.attendancePctLow]}>
            {attendancePct}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function HMAttendanceScreen() {
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [view, setView] = useState<'teachers' | 'students'>('teachers');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  
  // Teacher data
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  
  // Student data
  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [preselectedSection, setPreselectedSection] = useState<{ class_grade: string; section: string } | null>(null);
  
  // Statement data
  const [stmtScope, setStmtScope] = useState<'weekly' | 'monthly'>('weekly');
  const [statement, setStatement] = useState<AttendanceStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false);
  
  // Export modals
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showTeacherExport, setShowTeacherExport] = useState<boolean>(false);
  
  // Toast
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: string }>({ visible: false, message: '', type: 'success' });
  
  const ITEMS_PER_PAGE = 12;

  const showToast = useCallback((msg: string, type: string = 'success') => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      setSchoolCode(code);
      setBranchId(bid);
    };
    load();
  }, []);

  // Load teachers
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

  // Load classes for student view
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

  // Load attendance statement
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

  // Initial loads
  useEffect(() => {
    if (schoolCode && branchId) {
      loadTeachers();
      loadClasses();
      loadStatement();
    }
  }, [schoolCode, branchId]);

  // Handle URL params for preselected section
  useEffect(() => {
    // For mobile, we can get params from navigation if needed
    // This is kept for compatibility with web version
  }, []);

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const nameMatch = search === '' || (teacher.teacher_full_name || '').toLowerCase().includes(search.toLowerCase());
      const idMatch = search === '' || String(teacher.employee_id || '').toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === '' || teacher.status === statusFilter;
      return (nameMatch || idMatch) && statusMatch;
    });
  }, [teachers, search, statusFilter]);

  // Pagination
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
      {/* Toast */}
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📊 Attendance Management</Text>
          <Text style={styles.subtitle}>
            {view === 'teachers' ? `${filteredTeachers.length} teachers` : `${classItems.length} classes`}
          </Text>
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'teachers' && styles.toggleBtnActive]}
              onPress={() => setView('teachers')}
            >
              <Text style={[styles.toggleText, view === 'teachers' && styles.toggleTextActive]}>👨‍🏫 Teachers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'students' && styles.toggleBtnActive]}
              onPress={() => setView('students')}
            >
              <Text style={[styles.toggleText, view === 'students' && styles.toggleTextActive]}>👨‍🎓 Students</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>📅 {iso(date)}</Text>
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
              <Text style={[styles.scopeText, stmtScope === 'weekly' && styles.scopeTextActive]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeBtn, stmtScope === 'monthly' && styles.scopeBtnActive]}
              onPress={() => setStmtScope('monthly')}
            >
              <Text style={[styles.scopeText, stmtScope === 'monthly' && styles.scopeTextActive]}>Monthly</Text>
            </TouchableOpacity>
          </View>

          <AppButton title="🔄 Refresh" onPress={onRefresh} type="secondary" />
        </View>

        {/* Attendance Statement Card */}
        <AppCard style={styles.statementCard}>
          <View style={styles.statementHeader}>
            <Text style={styles.statementTitle}>
              {stmtScope === 'monthly' ? 'Monthly' : 'Weekly'} Attendance Statement
            </Text>
            {loadingStatement ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.statementRange}>
                {statement?.period?.start_date} to {statement?.period?.end_date}
              </Text>
            )}
          </View>
          <View style={styles.statementGrid}>
            <View style={styles.statementItem}>
              <Text style={styles.statementItemLabel}>Teachers</Text>
              <Text style={styles.statementItemValue}>{statement?.teachers?.attendance_pct ?? 0}%</Text>
              <Text style={styles.statementItemSub}>
                Present eq: {statement?.teachers?.present_equivalent ?? 0} | Half: {statement?.teachers?.half_day_equivalent ?? 0}
              </Text>
            </View>
            <View style={styles.statementItem}>
              <Text style={styles.statementItemLabel}>Students</Text>
              <Text style={styles.statementItemValue}>{statement?.students?.attendance_pct ?? 0}%</Text>
              <Text style={styles.statementItemSub}>
                Present eq: {statement?.students?.present_equivalent ?? 0} | Half: {statement?.students?.half_day_equivalent ?? 0}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Teachers View */}
        {view === 'teachers' && (
          <>
            <View style={styles.filterBar}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or employee ID..."
                  placeholderTextColor="#94a3b8"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>✕</Text>
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
                      <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                        {status || 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {loadingTeachers ? (
              <Loader />
            ) : paginatedTeachers.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👨‍🏫</Text>
                <Text style={styles.emptyTitle}>No teachers found</Text>
                <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
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
                      <Text style={styles.pageBtnText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
                    <TouchableOpacity
                      style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <Text style={styles.pageBtnText}>▶</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* Students View */}
        {view === 'students' && (
          loadingClasses ? (
            <Loader />
          ) : classItems.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👨‍🎓</Text>
              <Text style={styles.emptyTitle}>No classes available</Text>
              <Text style={styles.emptyText}>No class data found for this date</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏫 School: {schoolCode || '—'}</Text>
          <Text style={styles.footerText}>🏢 Branch: {branchId || '—'}</Text>
          <Text style={styles.footerText}>📅 Data as of {iso(date)}</Text>
        </View>
      </ScrollView>

      {/* Export Modals */}
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
    backgroundColor: '#f0f2f7',
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
    backgroundColor: '#059669',
  },
  toastError: {
    backgroundColor: '#dc2626',
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 13,
    color: '#4a5568',
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
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  toggleTextActive: {
    color: '#fff',
  },
  dateBtn: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  dateText: {
    fontSize: 13,
    color: '#0d1b2a',
  },
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  scopeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  scopeBtnActive: {
    backgroundColor: '#2563eb',
  },
  scopeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
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
    fontWeight: '700',
    color: '#0d1b2a',
  },
  statementRange: {
    fontSize: 11,
    color: '#64748b',
  },
  statementGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statementItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
  },
  statementItemLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  statementItemValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  statementItemSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  filterBar: {
    marginBottom: 16,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0d1b2a',
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
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
    fontWeight: '700',
    color: '#fff',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  teacherEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  teacherDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 100,
    fontSize: 12,
    color: '#64748b',
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: '#0d1b2a',
    fontWeight: '500',
  },
  profileBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  profileActive: {
    backgroundColor: '#dcfce7',
  },
  profileInactive: {
    backgroundColor: '#fee2e2',
  },
  profileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  profileActiveText: {
    color: '#15803d',
  },
  profileInactiveText: {
    color: '#b91c1c',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgePresent: {
    backgroundColor: '#dcfce7',
  },
  badgeHalfDay: {
    backgroundColor: '#fef3c7',
  },
  badgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    color: '#4a5568',
  },
  pageInfo: {
    fontSize: 13,
    color: '#64748b',
  },
  splitLayout: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
    minHeight: 500,
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: '#e4e9f2',
    backgroundColor: '#f8fafc',
  },
  sidebarTitle: {
    padding: 12,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94a3b8',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
    backgroundColor: '#fff',
  },
  classGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
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
    fontWeight: '800',
    color: '#fff',
  },
  classTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  classSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sectionItemSelected: {
    backgroundColor: '#dbeafe',
    borderLeftColor: '#2563eb',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94a3b8',
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0d1b2a',
  },
  sectionNameSelected: {
    fontWeight: '700',
    color: '#2563eb',
  },
  sectionSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  sectionPct: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionPctHigh: {
    backgroundColor: '#dcfce7',
  },
  sectionPctLow: {
    backgroundColor: '#fee2e2',
  },
  sectionPctText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  mainPanel: {
    flex: 1,
  },
  panelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  panelSubtitle: {
    fontSize: 11,
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
  },
  statPresent: {
    backgroundColor: '#dcfce7',
  },
  statHalf: {
    backgroundColor: '#fef3c7',
  },
  statAbsent: {
    backgroundColor: '#fee2e2',
  },
  statSuccess: {
    backgroundColor: '#dcfce7',
  },
  statDanger: {
    backgroundColor: '#fee2e2',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  searchFilterBar: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
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
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
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
    borderBottomColor: '#e4e9f2',
  },
  tableCell: {
    fontSize: 13,
    color: '#0d1b2a',
  },
  cellNumber: {
    textAlign: 'center',
    color: '#94a3b8',
  },
  cellName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cellMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#64748b',
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
    fontWeight: '700',
    color: '#fff',
  },
  studentNameText: {
    fontWeight: '600',
    color: '#0d1b2a',
  },
  attendanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
    backgroundColor: '#f8fafc',
  },
  attendanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  attendanceTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e4e9f2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  attendanceFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  attendancePct: {
    fontSize: 13,
    fontWeight: '700',
  },
  attendancePctHigh: {
    color: '#059669',
  },
  attendancePctLow: {
    color: '#dc2626',
  },
  footer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
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
    color: '#64748b',
  },
  modalHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94a3b8',
    marginLeft: 'auto',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxIndeterminate: {
    backgroundColor: '#94a3b8',
    borderColor: '#94a3b8',
  },
  checkboxSmall: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94a3b8',
    marginRight: 10,
  },
  checkboxSmallChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 20,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  sectionRowSelected: {
    backgroundColor: '#dbeafe',
  },
  sectionText: {
    flex: 1,
    fontSize: 13,
    color: '#0d1b2a',
  },
  sectionCount: {
    fontSize: 11,
    color: '#64748b',
  },
  selectedCount: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  progressText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
});