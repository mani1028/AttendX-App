import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Calendar, Users, CheckCircle2, XCircle } from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import ClassSelector from '../../components/teacher/ClassSelector';
import AppText from '../../components/common/AppText';

interface Student {
  id: string;
  rollNo: string;
  name: string;
  present: boolean;
}

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
  const navigation = useNavigation();
  const route = useRoute();
  const selectedClass = (route.params as any)?.classData as ClassData | undefined;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassData | null>(selectedClass || null);
  const [showClassSelector, setShowClassSelector] = useState(!selectedClass);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const fetchStudents = async () => {
    if (!classInfo) return;
    setLoading(true);
    try {
      const mockStudents: Student[] = Array.from({ length: classInfo.students }, (_, i) => ({
        id: `${i + 1}`,
        rollNo: `${100 + i}`,
        name: `Student ${i + 1}`,
        present: Math.random() > 0.5,
      }));
      
      const dateStr = formatDate(selectedDate);
      const records: AttendanceRecord[] = mockStudents.map(s => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        date: dateStr,
        present: s.present,
      }));
      setAttendanceData(records);
    } catch (error) {
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classInfo) {
      fetchStudents();
    }
  }, [classInfo, selectedDate]);

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
    setLoading(true);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Attendance saved successfully');
      await fetchStudents();
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (cls: ClassData) => {
    setClassInfo(cls);
    setShowClassSelector(false);
  };

  if (showClassSelector) {
    return <ClassSelector onSelectClass={handleClassSelect} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowClassSelector(true)} style={styles.backButton}>
          <ChevronLeft size={24} color="#001F3F" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText style={styles.headerTitle}>Mark Attendance</AppText>
          <AppText style={styles.headerSubtitle}>{classInfo?.name}</AppText>
        </View>
      </View>

      {/* Date Picker */}
      <View style={styles.dateSection}>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <Calendar size={20} color="#001F3F" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText style={styles.dateSelectorLabel}>Select Date</AppText>
            <AppText style={styles.dateSelectorValue}>{formatDate(selectedDate)}</AppText>
          </View>
        </TouchableOpacity>
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
        <ActivityIndicator size="large" style={styles.loader} color="#001F3F" />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
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
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
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