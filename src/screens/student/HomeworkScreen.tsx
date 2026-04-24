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
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Types
interface Subject {
  subject_id: string;
  subject_name: string;
  teacher_name?: string;
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
  attachment_url?: string;
  status?: 'PENDING' | 'SUBMITTED' | 'LATE';
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

const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return 'Not specified';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Bottom Navigation Bar Component (matching attendance screen)
interface BottomTabItem {
  id: string;
  label: string;
  icon: string;
}

const BOTTOM_TAB_ITEMS: BottomTabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'homework', label: 'Home Work', icon: 'book-open' },
  { id: 'more', label: 'More', icon: 'more-horizontal' },
  { id: 'leave', label: 'Leave', icon: 'calendar' },
  { id: 'marks', label: 'Marks', icon: 'star' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

const BottomTabBar: React.FC<{
  activeTab: string;
  onTabPress: (tabId: string) => void;
}> = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.bottomBarContainer}>
      <View style={styles.bottomBarInner}>
        {BOTTOM_TAB_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.bottomTabItem}
              onPress={() => onTabPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.bottomIconWrapper, isActive && styles.bottomIconWrapperActive]}>
                <Icon
                  name={item.icon}
                  size={22}
                  color={isActive ? '#3b82f6' : '#94a3b8'}
                />
              </View>
              <Text
                style={[
                  styles.bottomTabLabel,
                  isActive && styles.bottomTabLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Homework Card Component (matches image design)
const HomeworkCard: React.FC<{
  homework: Homework;
  onView: (homework: Homework) => void;
}> = ({ homework, onView }) => {
  return (
    <View style={styles.homeworkCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.subjectName}>{homework.subject_name}</Text>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Assigned Date :</Text>
          <Text style={styles.detailValue}>{formatDisplayDate(homework.assigned_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Due Date :</Text>
          <Text style={styles.detailValue}>{formatDisplayDate(homework.due_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Teacher :</Text>
          <Text style={styles.detailValue}>{homework.teacher_full_name || 'Admin'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.viewButton} onPress={() => onView(homework)}>
        <Text style={styles.viewButtonText}>View</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function HomeworkScreen() {
  const { userName } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [filteredHomework, setFilteredHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState<boolean>(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [activeTab, setActiveTab] = useState<string>('homework');

  // Load school code and student ID
  useEffect(() => {
    const loadInitialData = async () => {
      const code = await getSchoolCode();
      const id = await getStudentId();
      setSchoolCode(code);
      setStudentId(id);

      // Load cached subjects and homework
      try {
        const cachedSubjects = await AsyncStorage.getItem(`homework_subjects_cache_${id}`);
        if (cachedSubjects) setSubjects(JSON.parse(cachedSubjects));

        const cachedHomework = await AsyncStorage.getItem(`homework_data_cache_${id}`);
        if (cachedHomework) {
          const items = JSON.parse(cachedHomework);
          setAllItems(items);
          applyFrontendFilters(items, subjectFilter, assignedDate);
        }
      } catch (e) {
        console.log('Failed to load cached homework');
      }
    };
    loadInitialData();
  }, []);

  // Initial load
  useEffect(() => {
    if (schoolCode && studentId) {
      loadSubjects();
      loadHomework(assignedDate, subjectFilter);
    }
  }, [schoolCode, studentId]);

  // Apply filters whenever subjects, homework, or filter options change
  useEffect(() => {
    applyFilters();
  }, [subjects, homeworkList, selectedSubject, selectedDate]);

  const loadSubjects = async () => {
    try {
      const res = await API.get('/manage/student-dashboard/subjects', {
        params: { school_code: schoolCode, student_id: studentId },
      });
      const items = res.data?.items || [];
      setSubjects(items);
      await AsyncStorage.setItem(`homework_subjects_cache_${studentId}`, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const loadHomework = async (dateToFetch: string, subjectToFetch: string) => {
    if (!schoolCode || !studentId) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadSubjects(), loadHomework()]);
    setRefreshing(false);
  };

  const handleViewHomework = (homework: Homework) => {
    setSelectedHomework(homework);
    setShowHomeworkModal(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleSubjectPress = (subjectName: string) => {
    setSelectedSubject(subjectName);
  };

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    // Placeholder for navigation - replace with your router logic
    console.log(`Navigate to ${tabId}`);
  };

  const pendingCount = filteredHomework.filter(hw => hw.status !== 'SUBMITTED').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#3b82f6" />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home Work</Text>
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingCount}>{pendingCount}</Text>
            <Text style={styles.pendingLabel}>Pending</Text>
          </View>
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          {/* Subject Filter */}
          <TouchableOpacity style={styles.filterChip} onPress={() => {}}>
            <Text style={styles.filterChipText}>{selectedSubject}</Text>
            <Icon name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>

          {/* Date Filter */}
          <TouchableOpacity style={styles.filterChip} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.filterChipText}>{formatDisplayDate(selectedDate)}</Text>
            <Icon name="calendar" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Homework List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading homework...</Text>
          </View>
        ) : filteredHomework.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="book-open" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Homework</Text>
            <Text style={styles.emptyText}>No assignments found for the selected filters</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredHomework.map((homework) => (
              <HomeworkCard
                key={homework.homework_id}
                homework={homework}
                onView={handleViewHomework}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Homework Detail Modal */}
      <Modal
        visible={showHomeworkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHomeworkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Assignment Details</Text>
              <TouchableOpacity onPress={() => setShowHomeworkModal(false)}>
                <Icon name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalBody}>
              {selectedHomework && (
                <>
                  <View style={styles.modalSubjectBadge}>
                    <Text style={styles.modalSubjectText}>{selectedHomework.subject_name}</Text>
                  </View>
                  <Text style={styles.modalHomeworkTitle}>{selectedHomework.title}</Text>
                  
                  <View style={styles.modalDetailSection}>
                    <Text style={styles.modalDetailLabel}>Description</Text>
                    <Text style={styles.modalDetailText}>
                      {selectedHomework.description || 'No description provided'}
                    </Text>
                  </View>

                  <View style={styles.modalInfoGrid}>
                    <View style={styles.modalInfoItem}>
                      <Icon name="calendar" size={16} color="#64748b" />
                      <Text style={styles.modalInfoLabel}>Due Date</Text>
                      <Text style={styles.modalInfoValue}>
                        {formatDisplayDate(selectedHomework.due_date)}
                      </Text>
                    </View>
                    <View style={styles.modalInfoItem}>
                      <Icon name="user" size={16} color="#64748b" />
                      <Text style={styles.modalInfoLabel}>Teacher</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedHomework.teacher_full_name}
                      </Text>
                    </View>
                    <View style={styles.modalInfoItem}>
                      <Icon name="calendar" size={16} color="#64748b" />
                      <Text style={styles.modalInfoLabel}>Assigned</Text>
                      <Text style={styles.modalInfoValue}>
                        {formatDisplayDate(selectedHomework.assigned_date)}
                      </Text>
                    </View>
                  </View>

                  {selectedHomework.attachment_url && (
                    <TouchableOpacity style={styles.attachmentButton}>
                      <Icon name="paperclip" size={16} color="#3b82f6" />
                      <Text style={styles.attachmentText}>View Attachment</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.submitButton}>
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitGradient}
                    >
                      <Icon name="upload" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit Assignment</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  pendingContainer: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
  },
  pendingCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d97706',
  },
  pendingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d97706',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  homeworkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 110,
  },
  detailValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    padding: 20,
  },
  modalSubjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalSubjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalHomeworkTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  modalDetailSection: {
    marginBottom: 20,
  },
  modalDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  modalInfoItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 8,
  },
  modalInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  modalInfoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0f172a',
    textAlign: 'center',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    marginBottom: 16,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Bottom Navigation Styles
  bottomBarContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 8,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    minWidth: 58,
  },
  bottomIconWrapper: {
    padding: 6,
    borderRadius: 30,
  },
  bottomIconWrapperActive: {
    backgroundColor: '#eff6ff',
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomTabLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
});