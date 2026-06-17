import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute } from '@react-navigation/native';
import { ChevronLeft, Calendar, Users, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/common/AppButton';
import ClassSelector from '../../components/teacher/ClassSelector';
import AppText from '../../components/common/AppText';
import { getStudentsByClass, markAttendance, getClassesSections } from '../../services/teacherService';

interface ClassData {
  id: string;
  name: string;
  students: number;
  teacher: string;
  attendance: number;
}

interface AttendanceRecord {
  id: string;
  rollNo: string;
  name: string;
  date: string;
  present: boolean;
}

export default function MarkAttendanceScreen() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const selectedClass = (route.params as any)?.classData as ClassData | undefined;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSession, setSelectedDateSession] = useState<'1' | '2'>('1');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassData[]>([]);
  const [classInfo, setClassInfo] = useState<ClassData | null>(selectedClass || null);
  const [showClassSelector, setShowClassSelector] = useState(!selectedClass);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const safeText = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return fallback;
  };

  const parseClassGradeSection = (name: string) => {
    const normalized = name.trim();
    const gradeMatch = normalized.match(/class\s*(\d+)/i);
    const sectionMatch = normalized.match(/section\s*([A-Za-z0-9]+)/i) || normalized.match(/class\s*\d+\s*[-:]?\s*([A-Za-z0-9]+)/i);
    return {
      grade: gradeMatch ? gradeMatch[1] : normalized,
      section: sectionMatch ? sectionMatch[1] : '',
    };
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const schoolCode = await AsyncStorage.getItem('school_code') || '';
      const branchId = await AsyncStorage.getItem('branch_id') || '';
      const data = await getClassesSections(branchId, schoolCode);
      const items = Array.isArray(data?.items) ? data.items : [];
      
      const mappedClasses: ClassData[] = items.map((c: any, idx: number) => ({
        id: c.section_id || `${c.class_id}_${c.section || c.section_name || idx}` || String(Math.random()),
        name: `Class ${c.class_grade || c.class_name || ''} Section ${c.section || c.section_name || ''}`.trim(),
        students: c.students_total || 0,
        teacher: '',
        attendance: 0,
      }));
      
      setClassOptions(mappedClasses);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showClassSelector) {
      loadClasses();
    }
  }, [showClassSelector]);

  const fetchStudents = useCallback(async () => {
    if (!classInfo) return;
    setLoading(true);
    try {
      const schoolCode =
        (await AsyncStorage.getItem('school_code')) ||
        (await AsyncStorage.getItem('schoolCode')) ||
        (await AsyncStorage.getItem('school_id')) ||
        (await AsyncStorage.getItem('schoolId')) ||
        '';
      const branchId =
        (await AsyncStorage.getItem('branch_id')) ||
        (await AsyncStorage.getItem('branchId')) ||
        '';
      const dateStr = formatDate(selectedDate);
      const { grade, section } = parseClassGradeSection(classInfo.name);
      const employeeId = 
        (await AsyncStorage.getItem('employee_id')) ||
        (await AsyncStorage.getItem('employeeId')) ||
        '';
      const students = schoolCode && branchId
        ? await getStudentsByClass(schoolCode, branchId, grade, section, employeeId)
        : [];

      const records: AttendanceRecord[] = Array.isArray(students) && students.length > 0
        ? students.map((student: any, index: number) => ({
            id: safeText(student.student_id ?? student.id ?? `student-${index + 1}`),
            rollNo: safeText(student.roll_no ?? student.rollNo ?? student.roll_number ?? index + 1),
            name: safeText(student.name ?? student.student_name ?? student.full_name ?? `Student ${index + 1}`),
            date: dateStr,
            present: Boolean(student.present ?? student.is_present ?? student.attendance_status === 'present'),
          }))
        : Array.from({ length: classInfo.students }, (_, i) => ({
            id: `${i + 1}`,
            rollNo: `${100 + i}`,
            name: `Student ${i + 1}`,
            date: dateStr,
            present: Math.random() > 0.5,
          }));

      setAttendanceData(records);
    } catch (error) {
      console.error('Failed to load students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [classInfo, selectedDate]);

  useEffect(() => {
    if (classInfo) {
      fetchStudents();
    }
  }, [classInfo, selectedDate, fetchStudents]);

  const dateFiltered = attendanceData.filter(s => s.date === formatDate(selectedDate));
  
  const filteredStudents = dateFiltered.filter(student => {
    if (filter === 'present') return student.present;
    if (filter === 'absent') return !student.present;
    return true;
  });

  const presentCount = dateFiltered.filter(s => s.present).length;
  const absentCount = dateFiltered.filter(s => !s.present).length;
  const totalCount = dateFiltered.length;

  const toggleAttendance = (studentId: string) => {
    setAttendanceData(prev =>
      prev.map(student =>
        student.id === studentId && student.date === formatDate(selectedDate)
          ? { ...student, present: !student.present }
          : student
      )
    );
  };

  const handleSaveAttendance = async () => {
    if (!classInfo) {
      Alert.alert('Error', 'Please select a class first.');
      return;
    }

    setLoading(true);
    try {
      const schoolCode =
        (await AsyncStorage.getItem('school_code')) ||
        (await AsyncStorage.getItem('schoolCode')) ||
        (await AsyncStorage.getItem('school_id')) ||
        (await AsyncStorage.getItem('schoolId')) ||
        '';
      const branchId =
        (await AsyncStorage.getItem('branch_id')) ||
        (await AsyncStorage.getItem('branchId')) ||
        '';
      const employeeId = 
        (await AsyncStorage.getItem('employee_id')) ||
        (await AsyncStorage.getItem('employeeId')) ||
        '';

      if (!schoolCode || !branchId) {
        Alert.alert('Error', 'Missing school or branch information.');
        return;
      }

      const { grade, section } = parseClassGradeSection(classInfo.name);
      const payload = {
        school_code: schoolCode,
        branch_id: branchId,
        employee_id: employeeId,
        class_grade: grade,
        section,
        attendance_date: formatDate(selectedDate),
        attendance_session: parseInt(selectedSession, 10),
        students: attendanceData.map(student => ({
          roll_no: student.rollNo,
          status: student.present ? 'present' : 'absent',
        })),
      };

      await markAttendance(schoolCode, branchId, payload);
      Alert.alert('Success', 'Attendance saved successfully');
      await fetchStudents();
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      Alert.alert('Error', error?.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (cls: ClassData) => {
    setClassInfo(cls);
    setShowClassSelector(false);
  };

  if (showClassSelector) {
    return <ClassSelector onSelectClass={handleClassSelect} classes={classOptions} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Curved Navy Header - Sticky at the top */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 16, paddingBottom: 24 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => setShowClassSelector(true)} style={styles.backBtn} accessibilityLabel="Go back">
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText weight="bold" style={styles.headerTitleText}>Mark Attendance</AppText>
            <AppText weight="medium" style={styles.headerSubtitleText}>{classInfo?.name}</AppText>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollStyle} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.dateSection}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.dateSelector, { flex: 1 }]} onPress={() => setShowDatePicker(true)}>
            <Calendar size={20} color="#6648dc" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText style={styles.dateSelectorLabel}>Select Date</AppText>
              <AppText style={styles.dateSelectorValue}>{formatDate(selectedDate)}</AppText>
            </View>
          </TouchableOpacity>
          
          <View style={[styles.dateSelector, { width: 120 }]}>
            <Clock size={20} color="#6648dc" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText style={styles.dateSelectorLabel}>Session</AppText>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={() => setSelectedDateSession(selectedSession === '1' ? '2' : '1')}
              >
                <AppText style={styles.dateSelectorValue}>{selectedSession === '1' ? 'Morn' : 'After'}</AppText>
                <ChevronDown size={14} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#F0F9FF', borderLeftColor: '#0284C7' }]}>
          <AppText style={styles.statValue}>{totalCount}</AppText>
          <AppText style={styles.statLabel}>Total</AppText>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderLeftColor: '#16A34A' }]}>
          <AppText style={[styles.statValue, { color: '#16A34A' }]}>{presentCount}</AppText>
          <AppText style={styles.statLabel}>Present</AppText>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderLeftColor: '#DC2626' }]}>
          <AppText style={[styles.statValue, { color: '#DC2626' }]}>{absentCount}</AppText>
          <AppText style={styles.statLabel}>Absent</AppText>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'present', 'absent'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <AppText style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Student List */}
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} color="#6648dc" />
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={48} color="#CBD5E1" />
          <AppText style={styles.emptyStateText}>No students found</AppText>
        </View>
      ) : (
        <View style={styles.studentList}>
          {filteredStudents.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <AppText style={styles.studentName}>{student.name}</AppText>
                <AppText style={styles.studentRoll}>Roll: {student.rollNo}</AppText>
              </View>
              <TouchableOpacity
                style={[styles.attendanceToggle, student.present && styles.togglePresent]}
                onPress={() => toggleAttendance(student.id)}
              >
                {student.present ? (
                  <CheckCircle2 size={20} color="#16A34A" />
                ) : (
                  <XCircle size={20} color="#DC2626" />
                )}
                <AppText style={[styles.toggleLabel, student.present && styles.toggleLabelPresent]}>
                  {student.present ? 'Present' : 'Absent'}
                </AppText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Save Button */}
      {!loading && (
        <AppButton
          title="Save Attendance"
          onPress={handleSaveAttendance}
          disabled={loading}
          style={styles.saveButton}
        />
      )}
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollStyle: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  headerStandard: {
    backgroundColor: '#1e3a8a',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowOpacity: 0.06,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {},
    }),
  },
  dateSelectorLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  dateSelectorValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderLeftWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.04,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {},
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#6648dc',
    borderColor: '#6648dc',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  loader: {
    marginVertical: 60,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  studentList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowOpacity: 0.06,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  studentRoll: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  attendanceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  togglePresent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBEF63',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  toggleLabelPresent: {
    color: '#16A34A',
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
});