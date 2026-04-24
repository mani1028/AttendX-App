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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import ClassSelector from '../../components/teacher/ClassSelector';

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
      // In a real app, fetch students from API
      // For demo, use mock data
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
      // In a real app, save to API
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowClassSelector(true)} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Student Attendance - {classInfo?.name}</Text>
      </View>

      {/* Date Picker */}
      <View style={styles.dateFilter}>
        <Text style={styles.dateLabel}>📅</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
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

      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Present</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>{presentCount}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Absent</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{absentCount}</Text>
        </AppCard>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'present', 'absent'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Student List */}
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colRoll]}>Roll No</Text>
            <Text style={[styles.tableHeaderText, styles.colName]}>Name</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
            <Text style={[styles.tableHeaderText, styles.colAction]}>Action</Text>
          </View>
          {filteredStudents.map((student, idx) => (
            <View key={student.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colRoll]}>{student.rollNo}</Text>
              <Text style={[styles.tableCell, styles.colName]}>{student.name}</Text>
              <Text style={[styles.tableCell, styles.colStatus]}>
                <View style={[styles.statusBadge, student.present ? styles.statusPresent : styles.statusAbsent]}>
                  <Text style={student.present ? styles.statusTextPresent : styles.statusTextAbsent}>
                    {student.present ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </Text>
              <Text style={[styles.tableCell, styles.colAction]}>
                <TouchableOpacity
                  style={[styles.actionButton, student.present ? styles.btnAbsent : styles.btnPresent]}
                  onPress={() => toggleAttendance(student.id)}
                >
                  <Text style={styles.actionButtonText}>
                    {student.present ? 'Mark Absent' : 'Mark Present'}
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Save Button */}
      <AppButton
        title={loading ? 'Saving...' : 'Save Attendance'}
        onPress={handleSaveAttendance}
        disabled={loading}
        style={styles.saveButton}
      />
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButtonText: {
    fontSize: 13,
    color: '#475569',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  dateFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  dateLabel: {
    fontSize: 16,
  },
  dateButton: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#0f172a',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  loader: {
    marginVertical: 40,
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: '#0f172a',
  },
  colRoll: { width: 70 },
  colName: { flex: 2 },
  colStatus: { width: 80 },
  colAction: { width: 100 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusPresent: {
    backgroundColor: '#dcfce7',
  },
  statusAbsent: {
    backgroundColor: '#fee2e2',
  },
  statusTextPresent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  statusTextAbsent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnPresent: {
    backgroundColor: '#dcfce7',
  },
  btnAbsent: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  saveButton: {
    marginTop: 8,
  },
});