import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  RefreshControl,
  PermissionsAndroid,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { getQuestionPapers, getExamTypes, downloadQuestionPaper } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import BottomSheetModal from '../../components/common/BottomSheetModal';

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
  if (!dateString) {return '—';}
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) {return '—';}
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
    // Android 10 (API 29) and above do not need WRITE_EXTERNAL_STORAGE for scoped storage downloads
    if (Platform.Version >= 29) {
      return true;
    }
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
  isProcessing: boolean;
}> = ({ paper, onView, onDownload, isProcessing }) => {
  return (
    <View
      style={styles.paperCard}
    >
      <View style={styles.paperCardHeader}>
        <View style={styles.paperTypeBadge}>
          <Icon name="file-text" size={12} color={C.colors.blue} />
          <Text style={styles.paperTypeText}>{String(paper.exam_type ?? '').toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.paperTitle}>{String(paper.title ?? '')}</Text>

      <View style={styles.paperMeta}>
        <View style={styles.metaItem}>
          <Icon name="user" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>{String(paper.teacher_name || 'Unknown Teacher')}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>{String(formatDate(paper.created_at))}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="file" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>{formatFileSize(paper.file_size)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="bookmark" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>
            {String(`${paper.class_name || ''}${paper.class_name && paper.section_name ? ' ' : ''}${paper.section_name || ''}`)}
          </Text>
        </View>
      </View>

      <View style={styles.paperActions}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color={C.colors.blue} />
            <Text style={styles.processingText}>Preparing file...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onView(paper.paper_id)}
            >
              <View style={styles.viewBtnContent}>
                <Icon name="eye" size={16} color={C.colors.card} />
                <Text style={styles.actionBtnText}>View</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => onDownload(paper.paper_id, paper.title)}
            >
              <Icon name="download" size={16} color={C.colors.blue} />
              <Text style={styles.actionBtnOutlineText}>Download</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// Subject Section Component
const SubjectSection: React.FC<{
  subject: Subject;
  isExpanded: boolean;
  onToggle: () => void;
  onView: (paperId: string) => void;
  onDownload: (paperId: string, title: string) => void;
  processingId: string | null;
}> = ({ subject, isExpanded, onToggle, onView, onDownload, processingId }) => {
  return (
    <View style={styles.subjectSection}>
      <TouchableOpacity
        style={styles.subjectHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.subjectIcon}>
          <Text style={styles.subjectIconText}>
            {(subject.subject_name || '').charAt(0)}
          </Text>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectTitle}>{String(subject.subject_name ?? '')}</Text>
          <View style={styles.paperCountBadge}>
            <Text style={styles.paperCountBadgeText}>{String(subject.papers.length ?? 0)}</Text>
          </View>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={C.colors.textMuted}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.papersList}>
          {subject.papers.length === 0 ? (
            <View style={styles.noPapersContainer}>
              <Icon name="file" size={32} color={C.colors.border} />
              <Text style={styles.noPapersText}>No papers available</Text>
            </View>
          ) : (
            subject.papers.map((paper) => (
              <PaperCard
                key={paper.paper_id}
                paper={paper}
                onView={onView}
                onDownload={onDownload}
                isProcessing={processingId === paper.paper_id}
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
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.filterModal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Filter Papers</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="x" size={24} color={C.colors.textMuted} />
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
          <LinearGradient
            colors={[C.colors.blue, C.colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyModalGradient}
          >
            <Text style={styles.applyModalBtnText}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
};

export default function QuestionPapersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
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
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch exam types
  const fetchExamTypes = useCallback(async () => {
    try {
      const res = await getExamTypes();
      setExamTypes(res.exam_types || []);
    } catch (err: any) {
      console.error('Failed to fetch exam types:', err);
    }
  }, []);

  // Fetch papers with filters
  const fetchPapers = useCallback(async (isRefresh = false) => {
    const isActuallyRefresh = isRefresh === true;
    if (!isActuallyRefresh) {setLoading(true);}
    try {
      const params: any = {};
      if (filterSubject !== 'all') {params.subject_id = filterSubject;}
      if (filterExamType !== 'all') {params.exam_type = filterExamType;}

      const res = await getQuestionPapers(params);
      const data = res.subjects || res.data?.subjects || [];

      setSubjects(data);

      // Build subject options for filter
      setSubjectOptions(prev => {
        const isCleanRefresh = isActuallyRefresh && filterSubject === 'all' && filterExamType === 'all';
        if (prev.length === 0 || isCleanRefresh) {
          const options = [...new Map<string, string>(data.map((s: Subject) => [String(s.subject_id), String(s.subject_name)])).entries()];
          return options.map(([id, name]) => ({ id, name }));
        }
        return prev;
      });

      // Auto-expand first subject if any
      if (data.length > 0) {
        setExpandedSubjects((prev) => {
          if (Object.keys(prev).length === 0) {
            return { [data[0].subject_id]: true };
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch question papers:', err);
      const errorMsg = err?.message || 'Failed to load question papers';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSubject, filterExamType]);

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) {return subjects;}
    const term = searchTerm.toLowerCase();
    return subjects
      .map((sub: Subject) => ({
        ...sub,
        papers: sub.papers.filter(
          (p) =>
            p.title.toLowerCase().includes(term) ||
            (p.teacher_name || '').toLowerCase().includes(term)
        ),
      }))
      .filter((sub: Subject) => sub.papers.length > 0);
  }, [subjects, searchTerm]);

  const totalFilteredPapers = useMemo(() => {
    return filteredSubjects.reduce((sum, sub) => sum + sub.papers.length, 0);
  }, [filteredSubjects]);

  useEffect(() => {
    fetchExamTypes();
  }, [fetchExamTypes]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExamTypes();
    fetchPapers(true);
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const processPaperAction = async (paperId: string, title: string, isDownload: boolean) => {
    if (processingId) {return;}

    try {
      setProcessingId(paperId);

      const paperBuffer = await downloadQuestionPaper(paperId);
      if (!paperBuffer || paperBuffer.byteLength === 0) {
        throw new Error('Received empty file from server');
      }

      const base64Data = arrayBufferToBase64(paperBuffer);
      const dataUri = `data:application/pdf;base64,${base64Data}`;

      const shareOptions = {
        url: dataUri,
        type: 'application/pdf',
        title: isDownload ? 'Save Question Paper' : 'View Question Paper',
        failOnCancel: false,
      };

      await Share.open(shareOptions);

    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('User did not share') || message.includes('cancel')) {
        // Ignore cancel
      } else {
        console.error(`Failed to ${isDownload ? 'download' : 'view'} paper:`, err);
        Alert.alert('Error', err.message || `Could not ${isDownload ? 'download' : 'open'} the file`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleView = (paperId: string) => {
    const paper = subjects.flatMap(s => s.papers).find(p => p.paper_id === paperId);
    processPaperAction(paperId, paper?.title || 'Paper', false);
  };

  const handleDownload = (paperId: string, title: string) => {
    processPaperAction(paperId, title, true);
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
  const handleScroll = useScrollTabBar();


  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('StudentDashboard' as never);
  };

  return (
    <View style={styles.container}>


      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 20 }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={C.colors.card} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question Papers</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Papers List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search and Filter Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color={C.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title or teacher..."
              placeholderTextColor={C.colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
              onSubmitEditing={() => fetchPapers()}
            />
            {searchTerm !== '' ? (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="x" size={16} color={C.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon name="sliders" size={18} color={hasActiveFilters ? C.colors.card : C.colors.textSec} />
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
                    <Icon name="x" size={12} color={C.colors.textSec} />
                  </TouchableOpacity>
                </View>
              )}
              {filterSubject !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    Subject: {subjectOptions.find((s) => s.id === filterSubject)?.name}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterSubject('all')}>
                    <Icon name="x" size={12} color={C.colors.textSec} />
                  </TouchableOpacity>
                </View>
              )}
              {filterExamType !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>Type: {filterExamType}</Text>
                  <TouchableOpacity onPress={() => setFilterExamType('all')}>
                    <Icon name="x" size={12} color={C.colors.textSec} />
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
        {!loading && filteredSubjects.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Icon name="folder" size={20} color={C.colors.blue} />
              <Text style={styles.statNumber}>{filteredSubjects.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Icon name="file-text" size={20} color={C.colors.success} />
              <Text style={styles.statNumber}>{totalFilteredPapers}</Text>
              <Text style={styles.statLabel}>Papers</Text>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.colors.primary} />
            <Text style={styles.loadingText}>Loading question papers...</Text>
          </View>
        ) : filteredSubjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="file" size={48} color={C.colors.border} />
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
          filteredSubjects.map((subject) => (
            <SubjectSection
              key={subject.subject_id}
              subject={subject}
              isExpanded={searchTerm.trim() !== '' || !!expandedSubjects[subject.subject_id]}
              onToggle={() => toggleSubject(subject.subject_id)}
              onView={handleView}
              onDownload={handleDownload}
              processingId={processingId}
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
    backgroundColor: C.colors.background,
  },
  header: {
    backgroundColor: C.colors.primary,
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
    ...Theme.typography.h3,
    color: C.colors.card,
    textAlign: 'center',
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.colors.card,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...C.shadow.sm,
  },
  searchInput: {
    flex: 1,
    ...Theme.typography.bodyMd,
    color: C.colors.primary,
    marginLeft: Theme.spacing.sm,
    paddingVertical: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.colors.card,
    height: 50,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...C.shadow.sm,
  },
  filterButtonActive: {
    backgroundColor: C.colors.primary,
    borderColor: C.colors.primary,
  },
  filterButtonText: {
    ...Theme.typography.bodyMd,
    fontWeight: '600',
    color: C.colors.textSec,
  },
  filterButtonTextActive: {
    color: C.colors.card,
  },
  filterDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.colors.error,
    borderWidth: 2,
    borderColor: C.colors.card,
  },
  activeFilters: {
    marginTop: 12,
    marginBottom: Theme.spacing.xs,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: Theme.spacing.md,
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.colors.blueLight,
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeFilterText: {
    ...Theme.typography.caption,
    color: C.colors.primary,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 13,
    color: C.colors.error,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.colors.card,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderRadius: 16,
    ...C.shadow.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    ...Theme.typography.h1,
    color: C.colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: C.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.colors.border,
  },
  subjectSection: {
    backgroundColor: C.colors.card,
    borderRadius: 16,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
    ...C.shadow.sm,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: 12,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIconText: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.card,
  },
  subjectInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Theme.spacing.sm,
  },
  subjectTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.colors.primary,
  },
  paperCountBadge: {
    backgroundColor: C.colors.blueLight,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paperCountBadgeText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: C.colors.blue,
  },
  papersList: {
    padding: Theme.spacing.md,
    paddingTop: 0,
  },
  paperCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  paperCardHeader: {
    marginBottom: 12,
  },
  paperTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: C.colors.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paperTypeText: {
    ...Theme.typography.label,
    fontWeight: '800',
    color: C.colors.blue,
    textTransform: 'uppercase',
  },
  paperTitle: {
    ...Theme.typography.h3,
    color: C.colors.primary,
    marginBottom: 12,
  },
  paperMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 8,
    marginBottom: Theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: C.colors.textMuted,
  },
  paperActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: C.colors.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  viewBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnOutline: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.colors.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: Theme.colors.card,
  },
  actionBtnText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  actionBtnOutlineText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: C.colors.blue,
  },
  processingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: C.colors.backgroundAlt,
    borderRadius: 8,
  },
  processingText: {
    ...Theme.typography.caption,
    color: C.colors.textSec,
    fontWeight: '500',
  },
  noPapersContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noPapersText: {
    fontSize: 13,
    color: C.colors.textMuted,
  },
  loadingContainer: {
    minHeight: 220,
    paddingVertical: Theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: C.colors.textSec,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingVertical: 36,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: C.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.colors.border,
    ...C.shadow.sm,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    ...Theme.typography.body,
    color: C.colors.textSec,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  resetEmptyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.colors.background,
  },
  resetEmptyBtnText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: C.colors.blue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: C.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: C.colors.primary,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.colors.primary,
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingHorizontal: Theme.spacing.lg,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.colors.textMuted,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  filterOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.background,
  },
  filterOptionActive: {
    backgroundColor: C.colors.blueLight,
    borderColor: C.colors.blue,
  },
  filterOptionText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: C.colors.textSec,
  },
  filterOptionTextActive: {
    color: C.colors.blue,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 16,
    padding: Theme.spacing.lg,
    backgroundColor: C.colors.card,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
  },
  resetModalBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetModalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.colors.textSec,
  },
  applyModalBtn: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
  },
  applyModalGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyModalBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.colors.card,
  },
});
