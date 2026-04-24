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
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '@react-native-vector-icons/feather';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Enhanced Homework Card Component
const HomeworkCard: React.FC<{
  item: Homework;
  onView: (item: Homework) => void;
}> = ({ item, onView }) => {
  const isOverdue = new Date(item.due_date) < new Date() && item.status !== 'SUBMITTED';
  
  return (
    <TouchableOpacity 
      style={styles.homeworkCard} 
      onPress={() => onView(item)}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.subjectBadge, { backgroundColor: getSubjectColor(item.subject_name) }]}>
          <Text style={styles.subjectBadgeText}>
            {item.subject_name?.charAt(0) || 'S'}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Icon name="alert-circle" size={12} color="#ef4444" />
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          )}
          <Icon name="more-horizontal" size={18} color="#94a3b8" />
        </View>
      </View>

      <Text style={styles.homeworkTitle} numberOfLines={1}>
        {item.title || 'Untitled Assignment'}
      </Text>
      
      <Text style={styles.homeworkDesc} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>

      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={12} color="#64748b" />
          <Text style={styles.metaText}>Due: {formatDisplayDate(item.due_date)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="user" size={12} color="#64748b" />
          <Text style={styles.metaText}>{item.teacher_full_name?.split(' ')[0] || 'Teacher'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { 
            backgroundColor: item.status === 'SUBMITTED' ? '#22c55e' : 
                           item.status === 'LATE' ? '#ef4444' : '#f59e0b' 
          }]} />
          <Text style={styles.statusText}>
            {item.status || 'PENDING'}
          </Text>
        </View>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
          <Icon name="arrow-right" size={14} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Subject Filter Chip Component
const SubjectFilterChip: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
  count?: number;
}> = ({ label, isSelected, onPress, count }) => (
  <TouchableOpacity
    style={[styles.filterChip, isSelected && styles.filterChipActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
      {label}
    </Text>
    {count !== undefined && count > 0 && (
      <View style={[styles.filterChipCount, isSelected && styles.filterChipCountActive]}>
        <Text style={[styles.filterChipCountText, isSelected && styles.filterChipCountTextActive]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// Helper function for subject colors
const getSubjectColor = (subject: string): string => {
  const colors = {
    'Math': '#3b82f6',
    'Science': '#10b981',
    'English': '#f59e0b',
    'History': '#8b5cf6',
    'Geography': '#06b6d4',
    'Physics': '#ef4444',
    'Chemistry': '#84cc16',
    'Biology': '#14b8a6',
  };
  return colors[subject as keyof typeof colors] || '#64748b';
};

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
  const [showFilterSheet, setShowFilterSheet] = useState<boolean>(false);

  // Subject options for filter with counts
  const subjectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      const subject = item.subject_name || 'Unknown';
      counts[subject] = (counts[subject] || 0) + 1;
    });
    
    return [
      { value: 'ALL', label: 'All Subjects', count: allItems.length },
      ...subjects.map((s) => ({
        value: String(s.subject_name || '').trim(),
        label: String(s.subject_name || '').trim(),
        subject_id: s.subject_id,
        count: counts[s.subject_name] || 0,
      })),
    ];
  }, [subjects, allItems]);

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
    await Promise.all([loadSubjects(), loadHomework(assignedDate, subjectFilter)]);
    setRefreshing(false);
  };

  const handleApplyFilters = async () => {
    await loadHomework(assignedDate, subjectFilter);
    setShowFilterSheet(false);
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

  const pendingCount = filteredItems.filter(i => i.status !== 'SUBMITTED').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#3b82f6" />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.welcomeSection}>
              <View>
                <Text style={styles.welcomeGreeting}>Good {getGreeting()}! 👋</Text>
                <Text style={styles.welcomeTitle}>Homework</Text>
                <Text style={styles.welcomeSub}>Track your daily assignments</Text>
              </View>
              <TouchableOpacity style={styles.notificationIcon}>
                {pendingCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                  </View>
                )}
                <Icon name="bell" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Summary */}
        <View style={styles.statsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={[styles.statCard, styles.statCardTotal]}>
              <Icon name="book-open" size={22} color="#3b82f6" />
              <Text style={styles.statNumber}>{filteredItems.length}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={[styles.statCard, styles.statCardPending]}>
              <Icon name="clock" size={22} color="#f59e0b" />
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSubmitted]}>
              <Icon name="check-circle" size={22} color="#22c55e" />
              <Text style={styles.statNumber}>{filteredItems.length - pendingCount}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
          </ScrollView>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterSheet(true)}
          >
            <Icon name="filter" size={18} color="#3b82f6" />
            <Text style={styles.filterButtonText}>Filters</Text>
            {(subjectFilter !== 'ALL' || assignedDate !== getTodayDate()) && (
              <View style={styles.activeFilterDot} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateFilterButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={16} color="#64748b" />
            <Text style={styles.dateFilterText}>
              {formatDisplayDate(assignedDate)}
            </Text>
            <Icon name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Subject Chips Quick Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.subjectChipsScroll}
          contentContainerStyle={styles.subjectChipsContainer}
        >
          {subjectOptions.slice(0, 6).map((subject) => (
            <SubjectFilterChip
              key={subject.value}
              label={subject.label}
              isSelected={subjectFilter === subject.value}
              onPress={() => setSubjectFilter(subject.value)}
              count={subject.count}
            />
          ))}
        </ScrollView>

        {/* Homework Grid */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading assignments...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="book" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No Homework Found</Text>
            <Text style={styles.emptyText}>
              No assignments available for the selected filters
            </Text>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                setSubjectFilter('ALL');
                setAssignedDate(getTodayDate());
                loadHomework(getTodayDate(), 'ALL');
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredItems.map((item) => (
              <HomeworkCard key={item.homework_id} item={item} onView={handleViewHomework} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal Sheet */}
      <Modal
        visible={showFilterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter Assignments</Text>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)}>
                <Icon name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterSheetBody}>
              <Text style={styles.filterSheetLabel}>Subject</Text>
              <View style={styles.filterSheetSubjects}>
                {subjectOptions.map((subject) => (
                  <TouchableOpacity
                    key={subject.value}
                    style={[
                      styles.filterSheetChip,
                      subjectFilter === subject.value && styles.filterSheetChipActive,
                    ]}
                    onPress={() => setSubjectFilter(subject.value)}
                  >
                    <Text style={[
                      styles.filterSheetChipText,
                      subjectFilter === subject.value && styles.filterSheetChipTextActive,
                    ]}>
                      {subject.label}
                    </Text>
                    <Text style={[
                      styles.filterSheetChipCount,
                      subjectFilter === subject.value && styles.filterSheetChipCountActive,
                    ]}>
                      {subject.count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSheetLabel}>Due Date Status</Text>
              <View style={styles.statusFilterContainer}>
                <TouchableOpacity style={styles.statusFilterButton}>
                  <Text style={styles.statusFilterText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statusFilterButton}>
                  <Text style={styles.statusFilterText}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statusFilterButton}>
                  <Text style={styles.statusFilterText}>Overdue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statusFilterButton}>
                  <Text style={styles.statusFilterText}>Completed</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.filterSheetFooter}>
              <TouchableOpacity 
                style={styles.resetFiltersButton}
                onPress={() => {
                  setSubjectFilter('ALL');
                  setAssignedDate(getTodayDate());
                }}
              >
                <Text style={styles.resetFiltersText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={handleApplyFilters}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyFiltersGradient}
                >
                  <Text style={styles.applyFiltersText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  <View style={styles.detailSection}>
                    <View style={styles.detailSubjectBadge}>
                      <Text style={styles.detailSubjectText}>
                        {selectedHomework.subject_name}
                      </Text>
                    </View>
                    <Text style={styles.detailTitle}>{selectedHomework.title}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <View style={styles.descriptionBox}>
                      <Text style={styles.detailValue}>
                        {selectedHomework.description || 'No description provided'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailInfoItem}>
                      <Icon name="calendar" size={16} color="#64748b" />
                      <Text style={styles.detailInfoLabel}>Due Date</Text>
                      <Text style={styles.detailInfoValue}>
                        {formatDisplayDate(selectedHomework.due_date)}
                      </Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Icon name="user" size={16} color="#64748b" />
                      <Text style={styles.detailInfoLabel}>Teacher</Text>
                      <Text style={styles.detailInfoValue}>
                        {selectedHomework.teacher_full_name}
                      </Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Icon name="calendar" size={16} color="#64748b" />
                      <Text style={styles.detailInfoLabel}>Assigned</Text>
                      <Text style={styles.detailInfoValue}>
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

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(assignedDate || getTodayDate())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  gradientHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#bfdbfe',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 16,
  },
  statsScroll: {
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: width * 0.28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardTotal: {
    borderTopWidth: 3,
    borderTopColor: '#3b82f6',
  },
  statCardPending: {
    borderTopWidth: 3,
    borderTopColor: '#f59e0b',
  },
  statCardSubmitted: {
    borderTopWidth: 3,
    borderTopColor: '#22c55e',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  dateFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateFilterText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  subjectChipsScroll: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  subjectChipsContainer: {
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterChipCount: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterChipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterChipCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipCountTextActive: {
    color: '#ffffff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  homeworkCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  homeworkDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  metaContainer: {
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 12,
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
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterSheetBody: {
    padding: 20,
  },
  filterSheetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  filterSheetSubjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  filterSheetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  filterSheetChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterSheetChipText: {
    fontSize: 14,
    color: '#475569',
  },
  filterSheetChipTextActive: {
    color: '#ffffff',
  },
  filterSheetChipCount: {
    fontSize: 12,
    color: '#64748b',
  },
  filterSheetChipCountActive: {
    color: '#ffffff',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#475569',
  },
  filterSheetFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  resetFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  resetFiltersText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  applyFiltersButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyFiltersGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
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
  detailSection: {
    marginBottom: 24,
  },
  detailSubjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailSubjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  detailInfoItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 8,
  },
  detailInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  detailInfoValue: {
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
});