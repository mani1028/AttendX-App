import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

// Types
interface Subject {
  subject_id: string;
  subject_name: string;
}

interface Homework {
  homework_id: string;
  title: string;
  description: string;
  subject_name: string;
  subject_id: string;
  assigned_date: string;
  due_date: string;
  teacher_full_name: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getStudentId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('student_id');
  return id || (await AsyncStorage.getItem('studentId')) || '';
};

const normalizeDate = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.slice(0, 10);
};

const getTodayDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Homework Card Component
const HomeworkCard: React.FC<{
  item: Homework;
  onView: (item: Homework) => void;
}> = ({ item, onView }) => (
  <AppCard style={styles.homeworkCard}>
    <View style={styles.subjectTag}>
      <Text style={styles.subjectTagText}>
        {item.subject_name || `Subject ${item.subject_id || '-'}`}
      </Text>
    </View>
    <Text style={styles.homeworkTitle}>{item.title || '-'}</Text>
    <Text style={styles.homeworkDesc} numberOfLines={2}>
      {item.description || '-'}
    </Text>
    <View style={styles.metaContainer}>
      <Text style={styles.metaText}>Assigned: {normalizeDate(item.assigned_date) || '-'}</Text>
      <Text style={styles.metaText}>Due: {normalizeDate(item.due_date) || '-'}</Text>
      <Text style={styles.metaText}>Teacher: {item.teacher_full_name || '-'}</Text>
    </View>
    <TouchableOpacity style={styles.viewBtn} onPress={() => onView(item)}>
      <Text style={styles.viewBtnText}>👁️ View</Text>
    </TouchableOpacity>
  </AppCard>
);

export default function HomeworkScreen() {
  const { userName } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [assignedDate, setAssignedDate] = useState<string>(getTodayDate());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allItems, setAllItems] = useState<Homework[]>([]);
  const [filteredItems, setFilteredItems] = useState<Homework[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState<boolean>(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);

  // Subject options for filter
  const subjectOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Subjects' },
      ...subjects.map((s) => ({
        value: String(s.subject_name || '').trim(),
        label: String(s.subject_name || '').trim(),
        subject_id: s.subject_id,
      })),
    ];
  }, [subjects]);

  // Load stored credentials
  useEffect(() => {
    const loadCredentials = async () => {
      const code = await getSchoolCode();
      const id = await getStudentId();
      setSchoolCode(code);
      setStudentId(id);
    };
    loadCredentials();
  }, []);

  // Initial load
  useEffect(() => {
    if (schoolCode && studentId) {
      loadSubjects();
      loadHomework(assignedDate, subjectFilter);
    }
  }, [schoolCode, studentId]);

  const applyFrontendFilters = (
    items: Homework[],
    selectedSubject: string,
    selectedAssignedDate: string
  ) => {
    let result = [...items];

    if (selectedSubject && selectedSubject !== 'ALL') {
      result = result.filter(
        (item) =>
          String(item.subject_name || '')
            .trim()
            .toLowerCase() === String(selectedSubject).trim().toLowerCase()
      );
    }

    if (selectedAssignedDate) {
      result = result.filter(
        (item) => normalizeDate(item.assigned_date) === normalizeDate(selectedAssignedDate)
      );
    }

    setFilteredItems(result);
  };

  const loadSubjects = async () => {
    try {
      const res = await API.get('/manage/student-dashboard/subjects', {
        params: {
          school_code: schoolCode,
          student_id: studentId,
        },
      });
      setSubjects(res.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setSubjects([]);
    }
  };

  const loadHomework = async (dateToFetch: string, subjectToFetch: string) => {
    if (!schoolCode || !studentId) return;

    try {
      const params: any = {
        school_code: schoolCode,
        student_id: studentId,
      };

      if (dateToFetch) {
        params.assigned_date = dateToFetch;
      }

      if (subjectToFetch && subjectToFetch !== 'ALL') {
        const selectedSubject = subjects.find(
          (s) =>
            String(s.subject_name || '')
              .trim()
              .toLowerCase() === subjectToFetch.toLowerCase()
        );
        if (selectedSubject?.subject_id) {
          params.subject_id = selectedSubject.subject_id;
        }
      }

      const res = await API.get('/manage/student-dashboard/homework', { params });
      const items = res.data?.items || [];
      setAllItems(items);
      applyFrontendFilters(items, subjectToFetch || subjectFilter, dateToFetch);
    } catch (err) {
      console.error('Fetch homework failed:', err);
      setAllItems([]);
      setFilteredItems([]);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadSubjects(), loadHomework(assignedDate, subjectFilter)]);
    setRefreshing(false);
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    await loadHomework(assignedDate, subjectFilter);
    setLoading(false);
  };

  const handleViewHomework = (homework: Homework) => {
    setSelectedHomework(homework);
    setShowHomeworkModal(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setAssignedDate(dateStr);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.accent} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View>
            <AppText style={styles.welcomeTitle}>Good {getGreeting()}, {userName?.split(' ')[0] || 'Student'}!</AppText>
            <AppText style={styles.welcomeSub}>Stay updated with your daily assignments.</AppText>
          </View>
          <View style={styles.dateBadge}>
            <Icon name="calendar" size={12} color={colors.textMuted} />
            <AppText style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </AppText>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <AppText style={styles.title}>📚 Homework</AppText>
            <AppText style={styles.subText}>{filteredItems.length} records</AppText>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={refreshAll}>
            <Icon name="refresh-cw" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Filters Card */}
        <AppCard style={styles.filterCard}>
          {/* Subject Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {subjectOptions.map((subject) => (
                  <TouchableOpacity
                    key={subject.value}
                    style={[
                      styles.filterChip,
                      subjectFilter === subject.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSubjectFilter(subject.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        subjectFilter === subject.value && styles.filterChipTextActive,
                      ]}
                    >
                      {subject.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Date Picker */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Assigned Date</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>{assignedDate || 'Select date'}</Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(assignedDate || getTodayDate())}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Apply Button */}
          <AppButton
            title={loading ? 'Searching...' : 'Apply Filters'}
            onPress={handleApplyFilters}
            disabled={loading}
            style={styles.applyBtn}
          />
        </AppCard>

        {/* Homework Grid */}
        {loading ? (
          <Loader />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No homework found</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredItems.map((item) => (
              <HomeworkCard key={item.homework_id} item={item} onView={handleViewHomework} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Homework Detail Modal */}
      <Modal
        visible={showHomeworkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHomeworkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Homework Details</Text>
              <TouchableOpacity onPress={() => setShowHomeworkModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedHomework && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Title</Text>
                    <Text style={styles.detailValue}>{selectedHomework.title || '-'}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Subject</Text>
                    <Text style={styles.detailValue}>
                      {selectedHomework.subject_name || `Subject ${selectedHomework.subject_id || '-'}`}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <View style={styles.descriptionBox}>
                      <Text style={styles.detailValue}>
                        {selectedHomework.description || 'No description provided'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Teacher</Text>
                    <Text style={styles.detailValue}>{selectedHomework.teacher_full_name || '-'}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>{normalizeDate(selectedHomework.due_date) || '-'}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subText: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: 8,
  },
  refreshBtn: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshBtnText: {
    display: 'none',
  },
  filterCard: {
    padding: 18,
    marginBottom: 20,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  datePickerText: {
    fontSize: 14,
    color: '#0f172a',
  },
  calendarIcon: {
    fontSize: 16,
  },
  applyBtn: {
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  homeworkCard: {
    width: '48%',
    marginBottom: 16,
    padding: 16,
  },
  subjectTag: {
    backgroundColor: '#eff6ff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  subjectTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  homeworkDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
    minHeight: 40,
  },
  metaContainer: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  viewBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    fontSize: 24,
    color: '#64748b',
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontWeight: '700',
    color: '#374151',
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    color: '#6b7280',
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
});