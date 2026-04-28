import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
  RefreshControl,
  PermissionsAndroid,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Icon from '@react-native-vector-icons/feather';
import { getQuestionPapers, getExamTypes, downloadQuestionPaper } from '../../services/studentService';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Types
interface Paper {
  paper_id: string;
  title: string;
  exam_type: string;
  teacher_name?: string;
  created_at?: string;
  class_name?: string;
  section_name?: string;
  file_size?: number;
  file_type?: string;
}

interface Subject {
  subject_id: string;
  subject_name: string;
  subject_code?: string;
  papers: Paper[];
}

interface FilterOptions {
  subject: string;
  examType: string;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const arrayBufferToBase64 = (data: ArrayBuffer): string => {
  const runtimeBuffer = (globalThis as any).Buffer;
  if (runtimeBuffer?.from) {
    return runtimeBuffer.from(data).toString('base64');
  }

  const bytes = new Uint8Array(data);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  const btoaFn = (globalThis as any).btoa;
  if (typeof btoaFn === 'function') {
    return btoaFn(binary);
  }

  throw new Error('Base64 encoder is unavailable');
};

const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'App needs access to your storage to download files',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Storage permission error:', err);
      return false;
    }
  }
  return true;
};

// Paper Card Component
const PaperCard: React.FC<{
  paper: Paper;
  onView: (paperId: string) => void;
  onDownload: (paperId: string, title: string) => void;
}> = ({ paper, onView, onDownload }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <TouchableOpacity
      style={styles.paperCard}
      activeOpacity={0.9}
      onLongPress={() => setShowActions(!showActions)}
      onPress={() => setShowActions(!showActions)}
    >
      <View style={styles.paperCardHeader}>
        <View style={styles.paperTypeBadge}>
          <Icon name="file-text" size={12} color="#3b82f6" />
          <Text style={styles.paperTypeText}>{paper.exam_type}</Text>
        </View>
        {paper.file_size && (
          <View style={styles.fileSizeBadge}>
            <Icon name="hard-drive" size={10} color="#64748b" />
            <Text style={styles.fileSizeText}>{formatFileSize(paper.file_size)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.paperTitle}>{paper.title}</Text>

      <View style={styles.paperMeta}>
        <View style={styles.metaItem}>
          <Icon name="user" size={12} color="#64748b" />
          <Text style={styles.metaText}>{paper.teacher_name || 'Unknown Teacher'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={12} color="#64748b" />
          <Text style={styles.metaText}>{formatDate(paper.created_at)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="bookmark" size={12} color="#64748b" />
          <Text style={styles.metaText}>
            {paper.class_name} {paper.section_name}
          </Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.paperActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onView(paper.paper_id)}
          >
            <View style={styles.actionGradient}>
              <Icon name="eye" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>View</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => onDownload(paper.paper_id, paper.title)}
          >
            <Icon name="download" size={14} color="#3b82f6" />
            <Text style={styles.actionBtnOutlineText}>Download</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Subject Section Component
const SubjectSection: React.FC<{
  subject: Subject;
  isExpanded: boolean;
  onToggle: () => void;
  onView: (paperId: string) => void;
  onDownload: (paperId: string, title: string) => void;
}> = ({ subject, isExpanded, onToggle, onView, onDownload }) => {
  return (
    <View style={styles.subjectSection}>
      <TouchableOpacity
        style={styles.subjectHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.subjectIconContainer}>
          <View style={styles.subjectIcon}>
            <Text style={styles.subjectIconText}>
              {subject.subject_name.charAt(0)}
            </Text>
          </View>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectTitle}>{subject.subject_name}</Text>
          {subject.subject_code && (
            <Text style={styles.subjectCode}>Code: {subject.subject_code}</Text>
          )}
        </View>
        <View style={styles.paperCount}>
          <Text style={styles.paperCountText}>{subject.papers.length}</Text>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#64748b"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.papersList}>
          {subject.papers.length === 0 ? (
            <View style={styles.noPapersContainer}>
              <Icon name="file" size={32} color="#cbd5e1" />
              <Text style={styles.noPapersText}>No papers available</Text>
            </View>
          ) : (
            subject.papers.map((paper) => (
              <PaperCard
                key={paper.paper_id}
                paper={paper}
                onView={onView}
                onDownload={onDownload}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
};

// Filter Modal Component
const FilterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  subjects: Array<{ id: string; name: string }>;
  examTypes: string[];
  currentFilterSubject: string;
  currentFilterExamType: string;
}> = ({
  visible,
  onClose,
  onApply,
  subjects,
  examTypes,
  currentFilterSubject,
  currentFilterExamType,
}) => {
  const [selectedSubject, setSelectedSubject] = useState(currentFilterSubject);
  const [selectedExamType, setSelectedExamType] = useState(currentFilterExamType);

  const handleReset = () => {
    setSelectedSubject('all');
    setSelectedExamType('all');
  };

  const handleApply = () => {
    onApply({ subject: selectedSubject, examType: selectedExamType });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Papers</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>Subject</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedSubject === 'all' && styles.filterOptionActive,
                ]}
                onPress={() => setSelectedSubject('all')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedSubject === 'all' && styles.filterOptionTextActive,
                  ]}
                >
                  All Subjects
                </Text>
              </TouchableOpacity>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.filterOption,
                    selectedSubject === subject.id && styles.filterOptionActive,
                  ]}
                  onPress={() => setSelectedSubject(subject.id)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedSubject === subject.id && styles.filterOptionTextActive,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Exam Type</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedExamType === 'all' && styles.filterOptionActive,
                ]}
                onPress={() => setSelectedExamType('all')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedExamType === 'all' && styles.filterOptionTextActive,
                  ]}
                >
                  All Types
                </Text>
              </TouchableOpacity>
              {examTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    selectedExamType === type && styles.filterOptionActive,
                  ]}
                  onPress={() => setSelectedExamType(type)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedExamType === type && styles.filterOptionTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetModalBtn} onPress={handleReset}>
              <Text style={styles.resetModalBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyModalBtn} onPress={handleApply}>
              <View style={styles.applyModalGradient}>
                <Text style={styles.applyModalBtnText}>Apply Filters</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function QuestionPapersScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterExamType, setFilterExamType] = useState<string>('all');
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [totalPapers, setTotalPapers] = useState(0);

  // Fetch exam types
  const fetchExamTypes = useCallback(async () => {
    try {
      const res = await getExamTypes();
      setExamTypes(res.exam_types || []);
    } catch (err) {
      console.error('Failed to fetch exam types:', err);
    }
  }, []);

  // Fetch papers with filters
  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterSubject !== 'all') params.subject_id = filterSubject;
      if (filterExamType !== 'all') params.exam_type = filterExamType;

      const res = await getQuestionPapers(params);

      let data = res.subjects || res.data?.subjects || [];

      // Apply client-side search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        data = data
          .map((sub: Subject) => ({
            ...sub,
            papers: sub.papers.filter(
              (p) =>
                p.title.toLowerCase().includes(term) ||
                (p.teacher_name || '').toLowerCase().includes(term)
            ),
          }))
          .filter((sub: Subject) => sub.papers.length > 0);
      }

      setSubjects(data);

      const total = data.reduce((sum: number, sub: Subject) => sum + sub.papers.length, 0);
      setTotalPapers(total);

      // Auto-expand first subject if any
      if (data.length > 0 && !expandedSubjects[data[0].subject_id]) {
        setExpandedSubjects((prev) => ({ ...prev, [data[0].subject_id]: true }));
      }

      // Build subject options for filter
      const options = [...new Map<string, string>(data.map((s: Subject) => [String(s.subject_id), String(s.subject_name)])).entries()];
      setSubjectOptions(options.map(([id, name]) => ({ id, name })));
    } catch (err) {
      console.error('Failed to fetch question papers:', err);
      Alert.alert('Error', 'Failed to load question papers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSubject, filterExamType, searchTerm, expandedSubjects]);

  useEffect(() => {
    fetchExamTypes();
  }, [fetchExamTypes]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPapers();
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const handleView = async (paperId: string) => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Cannot view file without storage permission');
        return;
      }

      const fileUri = `${RNFS.DocumentDirectoryPath}/question_paper_${paperId}.pdf`;
      const paperBuffer = await downloadQuestionPaper(paperId);
      const base64Data = arrayBufferToBase64(paperBuffer);

      await RNFS.writeFile(fileUri, base64Data, 'base64');

      await Share.open({
        url: Platform.OS === 'android' ? `file://${fileUri}` : fileUri,
        type: 'application/pdf',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('Failed to view paper:', err);
      Alert.alert('Error', 'Could not open the file');
    }
  };

  const handleDownload = async (paperId: string, title: string) => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Cannot download file without storage permission');
        return;
      }

      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileUri = `${RNFS.DocumentDirectoryPath}/${sanitizedTitle}.pdf`;
      const paperBuffer = await downloadQuestionPaper(paperId);
      const base64Data = arrayBufferToBase64(paperBuffer);

      await RNFS.writeFile(fileUri, base64Data, 'base64');

      await Share.open({
        url: Platform.OS === 'android' ? `file://${fileUri}` : fileUri,
        type: 'application/pdf',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('Failed to download paper:', err);
      Alert.alert('Error', 'Could not download the file');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('all');
    setFilterExamType('all');
  };

  const applyFilters = (filters: FilterOptions) => {
    setFilterSubject(filters.subject);
    setFilterExamType(filters.examType);
  };

  const hasActiveFilters =
    searchTerm !== '' || filterSubject !== 'all' || filterExamType !== 'all';

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('StudentDashboard' as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question Papers</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or teacher..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            onSubmitEditing={fetchPapers}
          />
          {searchTerm !== '' ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Icon name="x" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="sliders" size={18} color={hasActiveFilters ? '#fff' : '#64748b'} />
          <Text
            style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}
          >
            Filter
          </Text>
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFilters}
        >
          <View style={styles.activeFiltersContainer}>
            {searchTerm !== '' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Search: {searchTerm}</Text>
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Icon name="x" size={12} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            {filterSubject !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Subject: {subjectOptions.find((s) => s.id === filterSubject)?.name}
                </Text>
                <TouchableOpacity onPress={() => setFilterSubject('all')}>
                  <Icon name="x" size={12} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            {filterExamType !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Type: {filterExamType}</Text>
                <TouchableOpacity onPress={() => setFilterExamType('all')}>
                  <Icon name="x" size={12} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Stats Summary */}
      {!loading && subjects.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="folder" size={20} color="#3b82f6" />
            <Text style={styles.statNumber}>{subjects.length}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Icon name="file-text" size={20} color="#10b981" />
            <Text style={styles.statNumber}>{totalPapers}</Text>
            <Text style={styles.statLabel}>Papers</Text>
          </View>
        </View>
      )}

      {/* Papers List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading question papers...</Text>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="file" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No question papers available</Text>
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Check back later for new study materials'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.resetEmptyBtn} onPress={resetFilters}>
                <Text style={styles.resetEmptyBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          subjects.map((subject) => (
            <SubjectSection
              key={subject.subject_id}
              subject={subject}
              isExpanded={!!expandedSubjects[subject.subject_id]}
              onToggle={() => toggleSubject(subject.subject_id)}
              onView={handleView}
              onDownload={handleDownload}
            />
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={applyFilters}
        subjects={subjectOptions}
        examTypes={examTypes}
        currentFilterSubject={filterSubject}
        currentFilterExamType={filterExamType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#001F3F',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: Platform.OS === 'ios' ? 0 : 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    borderRadius: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  activeFilters: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#475569',
  },
  clearAllText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    paddingVertical: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subjectSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  subjectIconContainer: {
    width: 44,
    height: 44,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subjectCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  paperCount: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paperCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  papersList: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paperCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paperCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paperTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paperTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3b82f6',
  },
  fileSizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileSizeText: {
    fontSize: 10,
    color: '#64748b',
  },
  paperTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
  },
  paperMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  paperActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  noPapersContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noPapersText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetEmptyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  resetEmptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#475569',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  resetModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  resetModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  applyModalBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyModalGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});