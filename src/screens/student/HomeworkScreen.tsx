import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/feather';
import { getSubjects, getHomework } from '../../services/studentService';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import BottomSheetModal from '../../components/common/BottomSheetModal';

const { width } = Dimensions.get('window');
const ALL_SUBJECTS = 'All Subjects';

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

const truncateDescription = (description: string, length: number = 100): string => {
  if (!description) return 'No description';
  return description.length > length ? description.slice(0, length) + '...' : description;
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
          <Text style={styles.detailLabel}>Description :</Text>
          <Text style={styles.detailValue}>{truncateDescription(homework.description)}</Text>
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { userName, setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');

  const lastScrollY = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };
  const [studentId, setStudentId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>(ALL_SUBJECTS);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [filteredHomework, setFilteredHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState<boolean>(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);

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
          setHomeworkList(items);
        }
      } catch (e) {
        console.log('Failed to load cached homework');
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    setSelectedSubject(ALL_SUBJECTS);
  }, []);

  // Initial load
  useEffect(() => {
    if (schoolCode && studentId) {
      loadSubjects();
      loadHomework(selectedDate, selectedSubject);
    }
  }, [schoolCode, studentId]);

  // Apply filters whenever subjects, homework, or filter options change
  const applyFilters = useCallback(() => {
    let filtered = [...homeworkList];

    if (selectedSubject && selectedSubject !== ALL_SUBJECTS) {
      filtered = filtered.filter(hw =>
        hw.subject_name.toLowerCase() === selectedSubject.toLowerCase()
      );
    }

    if (selectedDate) {
      filtered = filtered.filter(hw =>
        normalizeDate(hw.assigned_date) === normalizeDate(selectedDate)
      );
    }

    setFilteredHomework(filtered);
  }, [homeworkList, selectedSubject, selectedDate]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadSubjects = async () => {
    try {
      const items = await getSubjects();
      setSubjects(items);
      await AsyncStorage.setItem(`homework_subjects_cache_${studentId}`, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const loadHomework = async (dateToFetch?: string, subjectToFetch?: string) => {
    if (!studentId) return;

    setLoading(true);
    try {
      const params: any = {};

      if (dateToFetch) {
        params.assigned_date = dateToFetch;
      }

      if (subjectToFetch && subjectToFetch !== ALL_SUBJECTS && subjectToFetch !== 'ALL') {
        const selectedSub = subjects.find(
          (s) =>
            String(s.subject_name || '')
              .trim()
              .toLowerCase() === subjectToFetch.toLowerCase()
        );
        if (selectedSub?.subject_id) {
          params.subject_id = selectedSub.subject_id;
        }
      }

      const items = await getHomework(params);
      setHomeworkList(items);

      // Cache the result
      await AsyncStorage.setItem(`homework_data_cache_${studentId}`, JSON.stringify(items));
    } catch (err) {
      console.error('Fetch homework failed:', err);
      setHomeworkList([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadSubjects(), loadHomework(selectedDate, selectedSubject)]);
    setRefreshing(false);
  };

  const handleViewHomework = (homework: Homework) => {
    setSelectedHomework(homework);
    setShowHomeworkModal(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setSelectedDate(dateString);
      loadHomework(dateString, selectedSubject);
    }
  };

  const handleSubjectPress = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setShowSubjectModal(false);
    loadHomework(selectedDate, subjectName);
  };

  const pendingCount = filteredHomework.filter(hw => hw.status !== 'SUBMITTED').length;

  // Header Section
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
      >
        <Icon name="arrow-left" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Home Work</Text>
      </View>
      <TouchableOpacity
        style={styles.notificationIcon}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Icon name="bell" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
      
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#3b82f6" />
        }
      >
        <View style={styles.mainCard}>
          {/* Filter Row */}
          <View style={styles.filterRow}>
            {/* Subject Filter */}
            <TouchableOpacity style={styles.filterChip} onPress={() => setShowSubjectModal(true)}>
              <Text style={styles.filterChipText} numberOfLines={1}>{selectedSubject}</Text>
              <Icon name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            {/* Date Filter */}
            <TouchableOpacity style={styles.filterChip} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.filterChipText}>{formatDisplayDate(selectedDate)}</Text>
              <Icon name="calendar" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.pendingStatusRow}>
             <View style={styles.pendingDot} />
             <Text style={styles.pendingText}>{pendingCount} Homework Pending</Text>
          </View>
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
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* Subject Selection Modal */}
      <Modal
        visible={showSubjectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectModal(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerIndicator} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)} style={styles.closePickerButton}>
                <Icon name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerOptionsList}>
              <TouchableOpacity
                style={[
                  styles.subjectOption,
                  selectedSubject === ALL_SUBJECTS && styles.selectedSubjectOption
                ]}
                onPress={() => handleSubjectPress(ALL_SUBJECTS)}
              >
                <View style={styles.subjectOptionContent}>
                   <View style={[styles.subjectIconContainer, { backgroundColor: '#f1f5f9' }]}>
                      <Icon name="grid" size={18} color="#64748b" />
                   </View>
                   <Text style={[
                     styles.subjectOptionText,
                     selectedSubject === ALL_SUBJECTS && styles.selectedSubjectOptionText
                   ]}>{ALL_SUBJECTS}</Text>
                </View>
                {selectedSubject === ALL_SUBJECTS && (
                  <View style={styles.checkContainer}>
                    <Icon name="check" size={16} color="#3b82f6" />
                  </View>
                )}
              </TouchableOpacity>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.subject_id}
                  style={[
                    styles.subjectOption,
                    selectedSubject === subject.subject_name && styles.selectedSubjectOption
                  ]}
                  onPress={() => handleSubjectPress(subject.subject_name)}
                >
                  <View style={styles.subjectOptionContent}>
                    <View style={[styles.subjectIconContainer, { backgroundColor: '#eff6ff' }]}>
                       <Icon name="book" size={18} color="#3b82f6" />
                    </View>
                    <Text style={[
                      styles.subjectOptionText,
                      selectedSubject === subject.subject_name && styles.selectedSubjectOptionText
                    ]}>{subject.subject_name}</Text>
                  </View>
                  {selectedSubject === subject.subject_name && (
                    <View style={styles.checkContainer}>
                      <Icon name="check" size={16} color="#3b82f6" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Homework Detail Modal */}
      <BottomSheetModal
        visible={showHomeworkModal}
        onClose={() => setShowHomeworkModal(false)}
        sheetStyle={styles.modalContent}
      >
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.modalHeader}
        >
          <Text style={styles.modalTitle}>HomeWork Details</Text>
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

              {/* <TouchableOpacity style={styles.submitButton}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  <Icon name="upload" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Assignment</Text>
                </LinearGradient>
              </TouchableOpacity> */}
            </>
          )}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  header: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 15,
    marginTop: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  listContainer: {
    paddingHorizontal: 4,
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
  // Subject Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '70%',
  },
  pickerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closePickerButton: {
    padding: 4,
  },
  pickerOptionsList: {
    padding: 12,
  },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectedSubjectOption: {
    backgroundColor: '#eff6ff',
  },
  subjectOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },
  selectedSubjectOptionText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
});