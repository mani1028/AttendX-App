import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import Loader from '../../components/common/Loader';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Platform, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import { RefreshCw } from 'lucide-react-native';
import { getSubjects, getHomework } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { homeworkStyles as styles } from '../../components/student/homework/homeworkStyles';

const { width } = Dimensions.get('window');
const ALL_DATES = 'All Dates';
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
  if (!value) {return '';}
  return value.slice(0, 10);
};

const formatDisplayDate = (dateString: string): string => {
  if (!dateString) {return 'Not specified';}
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const truncateDescription = (description: string, length: number = 100): string => {
  if (!description) {return 'No description';}
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
  const navigation = useNavigation<any>();
  const { userName, setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const handleScroll = useScrollTabBar();

  const [studentId, setStudentId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>(ALL_SUBJECTS);
  const [selectedDate, setSelectedDate] = useState<string>('');
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
        if (cachedSubjects) {setSubjects(JSON.parse(cachedSubjects));}

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

  // Initial load — fetch all homework (no date filter) so assignments aren't hidden
  useEffect(() => {
    if (schoolCode && studentId) {
      loadSubjects();
      loadHomework(undefined, selectedSubject);
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
    if (!studentId) {return;}

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
    await Promise.all([loadSubjects(), loadHomework(selectedDate || undefined, selectedSubject)]);
    setRefreshing(false);
  };

  const handleViewHomework = (homework: Homework) => {
    setSelectedHomework(homework);
    setShowHomeworkModal(true);
  };

  const handleDateChange = (event: any, pickedDate?: Date) => {
    setShowDatePicker(false);
    if (pickedDate) {
      const dateString = pickedDate.toISOString().split('T')[0];
      setSelectedDate(dateString);
      loadHomework(dateString, selectedSubject);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    loadHomework(undefined, selectedSubject);
  };

  const handleSubjectPress = (subjectName: string) => {
    setSelectedSubject(subjectName);
    setShowSubjectModal(false);
    loadHomework(selectedDate || undefined, subjectName);
  };

  const pendingCount = filteredHomework.filter(hw => hw.status !== 'SUBMITTED').length;
  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={C.colors.primary} />}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        title="Homework"
        subtitle={`${pendingCount} pending assignment${pendingCount === 1 ? '' : 's'}`}
        onBackPress={() => (canGoBack ? navigation.goBack() : navigation.navigate('MainTabs'))}
        showBack={canGoBack}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={refreshAll}
            accessibilityLabel="Refresh homework"
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />
        <View style={styles.pageBody}>
          {/* Filter Row */}
          <View style={styles.filterRow}>
            {/* Subject Filter */}
            <TouchableOpacity style={styles.filterChip} onPress={() => setShowSubjectModal(true)}>
              <Text style={styles.filterChipText} numberOfLines={1}>{selectedSubject}</Text>
              <Icon name="chevron-down" size={16} color={C.colors.textSec} />
            </TouchableOpacity>

            {/* Date Filter */}
            <TouchableOpacity style={styles.filterChip} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.filterChipText}>
                {selectedDate ? formatDisplayDate(selectedDate) : ALL_DATES}
              </Text>
              <Icon name="calendar" size={14} color={C.colors.textSec} />
            </TouchableOpacity>
            {selectedDate ? (
              <TouchableOpacity style={styles.filterChip} onPress={clearDateFilter}>
                <Icon name="x" size={14} color={C.colors.textSec} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.pendingStatusRow}>
             <View style={styles.pendingDot} />
             <Text style={styles.pendingText}>{pendingCount} Homework Pending</Text>
          </View>

        {/* Homework List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <Loader size="lg" label="Loading homework…" />
          </View>
        ) : filteredHomework.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="book-open" size={48} color={C.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Homework</Text>
            <Text style={styles.emptyText}>No assignments found for the selected filters</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredHomework.map((homework, index) => (
              <HomeworkCard
                key={homework.homework_id || `hw-${index}`}
                homework={homework}
                onView={handleViewHomework}
              />
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate ? new Date(selectedDate) : new Date()}
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
                <Icon name="x" size={20} color={C.colors.textSec} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerOptionsList}>
              <TouchableOpacity
                style={[
                  styles.subjectOption,
                  selectedSubject === ALL_SUBJECTS && styles.selectedSubjectOption,
                ]}
                onPress={() => handleSubjectPress(ALL_SUBJECTS)}
              >
                <View style={styles.subjectOptionContent}>
                   <View style={[styles.subjectIconContainer, { backgroundColor: C.colors.backgroundAlt }]}>
                      <Icon name="grid" size={18} color={C.colors.textSec} />
                   </View>
                   <Text style={[
                     styles.subjectOptionText,
                     selectedSubject === ALL_SUBJECTS && styles.selectedSubjectOptionText,
                   ]}>{ALL_SUBJECTS}</Text>
                </View>
                {selectedSubject === ALL_SUBJECTS && (
                  <View style={styles.checkContainer}>
                    <Icon name="check" size={16} color={C.colors.blue} />
                  </View>
                )}
              </TouchableOpacity>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.subject_id}
                  style={[
                    styles.subjectOption,
                    selectedSubject === subject.subject_name && styles.selectedSubjectOption,
                  ]}
                  onPress={() => handleSubjectPress(subject.subject_name)}
                >
                  <View style={styles.subjectOptionContent}>
                    <View style={[styles.subjectIconContainer, { backgroundColor: C.colors.blueLight }]}>
                       <Icon name="book" size={18} color={C.colors.blue} />
                    </View>
                    <Text style={[
                      styles.subjectOptionText,
                      selectedSubject === subject.subject_name && styles.selectedSubjectOptionText,
                    ]}>{subject.subject_name}</Text>
                  </View>
                  {selectedSubject === subject.subject_name && (
                    <View style={styles.checkContainer}>
                      <Icon name="check" size={16} color={C.colors.blue} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Homework Detail Modal */}
      <Modal
        visible={showHomeworkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHomeworkModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHomeworkModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.pickerModalContent, styles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Homework Details</Text>
              <TouchableOpacity onPress={() => setShowHomeworkModal(false)}>
                <Icon name="x" size={24} color={C.colors.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedHomework && (
                <>
                  <View style={styles.modalSubjectBadge}>
                    <Text style={styles.modalSubjectText}>{selectedHomework.subject_name}</Text>
                  </View>
                  <Text style={styles.modalHomeworkTitle}>
                    {selectedHomework.title || selectedHomework.subject_name || 'Homework'}
                  </Text>

                  <View style={styles.modalDetailSection}>
                    <Text style={styles.modalDetailLabel}>Description</Text>
                    <Text style={styles.modalDetailText}>
                      {selectedHomework.description || 'No description provided'}
                    </Text>
                  </View>

                  <View style={styles.modalInfoGrid}>
                    <View style={styles.modalInfoItem}>
                      <Icon name="calendar" size={16} color={C.colors.textSec} />
                      <Text style={styles.modalInfoLabel}>Due Date</Text>
                      <Text style={styles.modalInfoValue}>
                        {formatDisplayDate(selectedHomework.due_date)}
                      </Text>
                    </View>
                    <View style={styles.modalInfoItem}>
                      <Icon name="user" size={16} color={C.colors.textSec} />
                      <Text style={styles.modalInfoLabel}>Teacher</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedHomework.teacher_full_name}
                      </Text>
                    </View>
                    <View style={styles.modalInfoItem}>
                      <Icon name="calendar" size={16} color={C.colors.textSec} />
                      <Text style={styles.modalInfoLabel}>Assigned</Text>
                      <Text style={styles.modalInfoValue}>
                        {formatDisplayDate(selectedHomework.assigned_date)}
                      </Text>
                    </View>
                  </View>

                  {selectedHomework.attachment_url ? (
                    <TouchableOpacity style={styles.attachmentButton}>
                      <Icon name="paperclip" size={16} color={C.colors.primary} />
                      <Text style={styles.attachmentText}>View Attachment</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
