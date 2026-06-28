import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Share from 'react-native-share';
import {
  FileText,
  Download,
  Share2,
  Clock,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Search,
  Eye,
  Plus,
  Upload,
  Edit2,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react-native';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import {
  getTeacherQuestionPapers,
  downloadTeacherQuestionPaper,
  getTeacherPaperAssignments,
  getTeacherQuestionPaperExamTypes,
  uploadQuestionPapers,
  updateTeacherQuestionPaper,
  deleteTeacherQuestionPaper,
  type TeacherPaperClassAssignment,
  type TeacherPaperSection,
  type TeacherPaperSubject,
} from '../../services/teacherService';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { resolveApiErrorMessage } from '../../utils/helpers';
import {
  pickQuestionPaperFile,
  type PickedQuestionPaperFile,
} from '../../utils/pickQuestionPaperFile';

interface TeacherPaper {
  paper_id: string;
  title: string;
  description?: string;
  exam_type: string;
  subject_id?: string | number;
  subject_name: string;
  class_id?: string | number;
  class_name: string;
  section_id?: string | number;
  section_name: string;
  created_at: string;
  file_size: number;
  status: string;
}

interface UploadFormState {
  class_id: string;
  section_id: string;
  subject_id: string;
  title: string;
  description: string;
  exam_type: string;
}

const INITIAL_FORM: UploadFormState = {
  class_id: '',
  section_id: '',
  subject_id: '',
  title: '',
  description: '',
  exam_type: '',
};

const formatDate = (dateString?: string): string => {
  if (!dateString) {
    return '—';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) {
    return '—';
  }
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

function PickerField({
  label,
  value,
  placeholder,
  onPress,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={styles.formGroup}>
      <AppText weight="semibold" style={styles.formLabel}>{label}</AppText>
      <TouchableOpacity accessibilityRole="button" style={styles.pickerField} onPress={onPress}>
        <AppText style={[styles.pickerValue, !value && styles.pickerPlaceholder]}>
          {value || placeholder}
        </AppText>
        <ChevronDown size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>
      {error ? <AppText style={styles.fieldError}>{error}</AppText> : null}
    </View>
  );
}

export default function TeacherQuestionPapersScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isMounted = useRef(true);

  const [papers, setPapers] = useState<TeacherPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubject, setActiveSubject] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<TeacherPaperClassAssignment[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPaper, setEditingPaper] = useState<TeacherPaper | null>(null);
  const [form, setForm] = useState<UploadFormState>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [paperFile, setPaperFile] = useState<PickedQuestionPaperFile | null>(null);
  const [markingFile, setMarkingFile] = useState<PickedQuestionPaperFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [examTypePickerOpen, setExamTypePickerOpen] = useState(false);

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadContext = async () => {
      const code = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const branch = (await storage.getString(StorageKeys.BRANCH_ID)) || '';
      if (isMounted.current) {
        setSchoolCode(code);
        setBranchId(branch);
      }
    };
    loadContext();
  }, []);

  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [assignmentData, examTypeData] = await Promise.all([
        getTeacherPaperAssignments(),
        getTeacherQuestionPaperExamTypes(),
      ]);
      if (!isMounted.current) {
        return;
      }
      setAssignments(assignmentData);
      setExamTypes(examTypeData);
    } catch (err) {
      console.error('Failed to load question paper metadata:', err);
    } finally {
      if (isMounted.current) {
        setMetaLoading(false);
      }
    }
  }, []);

  const fetchPapers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const code = schoolCode || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const branch = branchId || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
      if (!code || !branch) {
        if (!isMounted.current) {
          return;
        }
        setPapers([]);
        setLoadError('School or branch information is missing. Please log in again.');
        return;
      }

      const data = await getTeacherQuestionPapers({
        school_code: code,
        branch_id: branch,
      });
      if (!isMounted.current) {
        return;
      }
      setPapers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load teacher question papers:', err);
      if (!isMounted.current) {
        return;
      }
      setPapers([]);
      setLoadError(
        resolveApiErrorMessage(err, 'Could not load question papers. Pull down to retry.'),
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [schoolCode, branchId]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (schoolCode && branchId) {
      fetchPapers();
    }
  }, [fetchPapers, schoolCode, branchId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPapers(true);
    fetchMeta();
  };

  const selectedClass = useMemo(
    () => assignments.find(c => String(c.class_id) === String(form.class_id)),
    [assignments, form.class_id],
  );

  const sectionOptions: TeacherPaperSection[] = useMemo(() => {
    return selectedClass?.sections || [];
  }, [selectedClass]);

  const selectedSection = useMemo(
    () => sectionOptions.find(s => String(s.section_id) === String(form.section_id)),
    [sectionOptions, form.section_id],
  );

  const subjectOptions: TeacherPaperSubject[] = useMemo(() => {
    if (selectedSection?.subjects?.length) {
      return selectedSection.subjects;
    }
    if (!selectedClass) {
      return [];
    }
    const merged: TeacherPaperSubject[] = [];
    selectedClass.sections.forEach(section => {
      section.subjects.forEach(subject => {
        if (!merged.find(item => String(item.subject_id) === String(subject.subject_id))) {
          merged.push(subject);
        }
      });
    });
    return merged;
  }, [selectedClass, selectedSection]);

  const subjectFilters = useMemo(() => {
    const names = [...new Set(papers.map(p => p.subject_name).filter(Boolean))].sort();
    return [{ key: 'all', label: 'All' }, ...names.map(n => ({ key: n, label: n }))];
  }, [papers]);

  const filteredPapers = useMemo(() => {
    let list = papers;
    if (activeSubject !== 'all') {
      list = list.filter(p => p.subject_name === activeSubject);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(term) ||
          p.exam_type.toLowerCase().includes(term) ||
          p.class_name.toLowerCase().includes(term),
      );
    }
    return list;
  }, [papers, activeSubject, searchTerm]);

  const resetUploadForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setPaperFile(null);
    setMarkingFile(null);
    setEditingPaper(null);
  }, []);

  const openUploadModal = useCallback(() => {
    resetUploadForm();
    setShowUploadModal(true);
  }, [resetUploadForm]);

  const openEditModal = useCallback((paper: TeacherPaper) => {
    setEditingPaper(paper);
    setForm({
      class_id: paper.class_id != null ? String(paper.class_id) : '',
      section_id: paper.section_id != null ? String(paper.section_id) : '',
      subject_id: paper.subject_id != null ? String(paper.subject_id) : '',
      title: paper.title || '',
      description: paper.description || '',
      exam_type: paper.exam_type || '',
    });
    setFormErrors({});
    setPaperFile(null);
    setMarkingFile(null);
    setShowUploadModal(true);
  }, []);

  const handleClassChange = (classId: string) => {
    setForm(prev => ({
      ...prev,
      class_id: classId,
      section_id: '',
      subject_id: '',
    }));
  };

  const handleSectionChange = (sectionId: string) => {
    setForm(prev => ({
      ...prev,
      section_id: sectionId,
      subject_id: '',
    }));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!schoolCode) {
      errs.school_code = 'School information is missing. Please log in again.';
    }
    if (!form.class_id) {
      errs.class_id = 'Class is required';
    }
    if (!form.section_id) {
      errs.section_id = 'Section is required';
    }
    if (!form.subject_id) {
      errs.subject_id = 'Subject is required';
    }
    if (!form.title.trim()) {
      errs.title = 'Title is required';
    }
    if (!form.exam_type) {
      errs.exam_type = 'Exam type is required';
    }
    if (!editingPaper && !paperFile) {
      errs.file = 'Question paper file is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildFormData = (): FormData => {
    const selectedClassItem = assignments.find(c => String(c.class_id) === String(form.class_id));
    const selectedSectionItem = selectedClassItem?.sections.find(
      s => String(s.section_id) === String(form.section_id),
    );
    const selectedSubjectItem = subjectOptions.find(
      s => String(s.subject_id) === String(form.subject_id),
    );

    const formData = new FormData();
    formData.append('class_id', form.class_id);
    formData.append('section_id', form.section_id);
    formData.append('subject_id', form.subject_id);
    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('exam_type', form.exam_type);
    formData.append('is_published', 'true');
    formData.append('class_name', selectedClassItem?.class_name || '');
    formData.append('class_grade', selectedClassItem?.class_name || '');
    formData.append('section_name', selectedSectionItem?.section_name || '');
    formData.append('section', selectedSectionItem?.section_name || '');
    formData.append('subject_name', selectedSubjectItem?.subject_name || '');

    if (paperFile) {
      formData.append('file', {
        uri: paperFile.uri,
        type: paperFile.type,
        name: paperFile.name,
      } as any);
    }

    if (markingFile) {
      formData.append('marking_scheme', {
        uri: markingFile.uri,
        type: markingFile.type,
        name: markingFile.name,
      } as any);
    }

    return formData;
  };

  const handleSubmitUpload = async () => {
    if (submitting || !validateForm()) {
      return;
    }
    if (!schoolCode || !branchId) {
      Alert.alert('Missing session', 'School or branch information is missing. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = buildFormData();
      if (editingPaper) {
        await updateTeacherQuestionPaper(editingPaper.paper_id, schoolCode, branchId, formData);
        Alert.alert('Updated', 'Question paper updated successfully.');
      } else {
        await uploadQuestionPapers(schoolCode, branchId, formData);
        Alert.alert('Uploaded', 'Question paper uploaded and is now visible to students.');
      }
      setShowUploadModal(false);
      resetUploadForm();
      fetchPapers(true);
    } catch (err) {
      Alert.alert(
        editingPaper ? 'Update failed' : 'Upload failed',
        resolveApiErrorMessage(err, 'Could not save the question paper. Please try again.'),
      );
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const handlePickPaperFile = async () => {
    try {
      const picked = await pickQuestionPaperFile();
      if (picked) {
        setPaperFile(picked);
        setFormErrors(prev => {
          const next = { ...prev };
          delete next.file;
          return next;
        });
      }
    } catch (err) {
      Alert.alert('File selection failed', resolveApiErrorMessage(err, 'Could not pick the file.'));
    }
  };

  const handlePickMarkingFile = async () => {
    try {
      const picked = await pickQuestionPaperFile();
      if (picked) {
        setMarkingFile(picked);
      }
    } catch (err) {
      Alert.alert('File selection failed', resolveApiErrorMessage(err, 'Could not pick the marking scheme.'));
    }
  };

  const confirmDeletePaper = (paper: TeacherPaper) => {
    Alert.alert(
      'Delete question paper',
      `Delete "${paper.title}"? Students will no longer be able to access this paper.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(paper.paper_id);
              await deleteTeacherQuestionPaper(paper.paper_id);
              fetchPapers(true);
            } catch (err) {
              Alert.alert(
                'Delete failed',
                resolveApiErrorMessage(err, 'Could not delete this question paper.'),
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const processPaperAction = async (paperId: string, title: string, isDownload: boolean) => {
    if (processingId) {
      return;
    }
    try {
      setProcessingId(paperId);
      const buffer = await downloadTeacherQuestionPaper(paperId);
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Received an empty file from the server.');
      }
      const base64Data = arrayBufferToBase64(buffer);
      const dataUri = `data:application/pdf;base64,${base64Data}`;
      await Share.open({
        url: dataUri,
        type: 'application/pdf',
        title: isDownload ? 'Save Question Paper' : 'View Question Paper',
        failOnCancel: false,
      });
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('User did not share') || message.includes('cancel')) {
        return;
      }
      Alert.alert(
        isDownload ? 'Download failed' : 'Could not open file',
        resolveApiErrorMessage(err, `Could not ${isDownload ? 'download' : 'open'} "${title}".`),
      );
    } finally {
      setProcessingId(null);
    }
  };

  const headerSubtitle = loading
    ? 'Loading papers...'
    : loadError
      ? 'Unable to load papers'
      : `${filteredPapers.length} paper${filteredPapers.length === 1 ? '' : 's'} available`;

  const classPickerOptions = assignments.map(item => ({
    label: item.class_name,
    value: String(item.class_id),
  }));

  const sectionPickerOptions = sectionOptions.map(item => ({
    label: item.section_name,
    value: String(item.section_id),
  }));

  const subjectPickerOptions = subjectOptions.map(item => ({
    label: item.subject_name,
    value: String(item.subject_id),
  }));

  const examTypePickerOptions = examTypes.map(type => ({ label: type, value: type }));

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Question Papers"
        subtitle={headerSubtitle}
        onBackPress={() =>
          navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)
        }
        rightActions={(
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={openUploadModal}
              accessibilityLabel="Upload question paper"
            >
              <Plus size={20} color={Theme.colors.card} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh question papers"
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          </View>
        )}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[innerPageLayoutStyles.contentFront, styles.pageBody]}>
          <View style={styles.toolbarCard}>
            <View style={styles.searchRow}>
              <Search size={18} color={Theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title, type or class..."
                placeholderTextColor={Theme.colors.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
                returnKeyType="search"
              />
            </View>

            {subjectFilters.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <View style={styles.filterRow}>
                  {subjectFilters.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterChip, activeSubject === f.key && styles.filterChipActive]}
                      onPress={() => setActiveSubject(f.key)}
                    >
                      <AppText
                        weight={activeSubject === f.key ? 'bold' : 'regular'}
                        style={[styles.filterText, activeSubject === f.key && styles.filterTextActive]}
                      >
                        {f.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {loadError ? (
            <AppCard style={styles.errorCard}>
              <AlertCircle size={32} color={Theme.colors.error} />
              <AppText weight="semibold" style={styles.errorTitle}>Could not load papers</AppText>
              <AppText style={styles.errorText}>{loadError}</AppText>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPapers()}>
                <AppText weight="semibold" style={styles.retryBtnText}>Try again</AppText>
              </TouchableOpacity>
            </AppCard>
          ) : loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <AppText style={styles.loaderText}>Loading question papers...</AppText>
            </View>
          ) : filteredPapers.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <FileText size={40} color="#cbd5e1" />
              <AppText weight="semibold" style={styles.emptyTitle}>No question papers found</AppText>
              <AppText style={styles.emptyText}>
                {searchTerm || activeSubject !== 'all'
                  ? 'Try adjusting your search or subject filter.'
                  : 'Upload question papers for your classes and they will appear here for students.'}
              </AppText>
              {(searchTerm || activeSubject !== 'all') ? (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    setSearchTerm('');
                    setActiveSubject('all');
                  }}
                >
                  <AppText weight="semibold" style={styles.retryBtnText}>Clear filters</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.uploadEmptyBtn} onPress={openUploadModal}>
                  <Upload size={18} color={Theme.colors.card} />
                  <AppText weight="semibold" style={styles.uploadEmptyBtnText}>Upload Paper</AppText>
                </TouchableOpacity>
              )}
            </AppCard>
          ) : (
            filteredPapers.map(paper => (
              <AppCard key={paper.paper_id} style={styles.paperCard}>
                <View style={styles.paperTop}>
                  <View style={styles.paperIconWrap}>
                    <FileText size={20} color={Theme.colors.primary} />
                  </View>
                  {paper.exam_type ? (
                    <View style={styles.typeBadge}>
                      <AppText weight="semibold" style={styles.typeBadgeText}>
                        {paper.exam_type.toUpperCase()}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                <AppText weight="bold" style={styles.paperTitle}>{paper.title}</AppText>

                <View style={styles.paperMeta}>
                  {paper.subject_name ? (
                    <View style={styles.metaItem}>
                      <BookOpen size={14} color={Theme.colors.textMuted} />
                      <AppText style={styles.metaText}>{paper.subject_name}</AppText>
                    </View>
                  ) : null}
                  {(paper.class_name || paper.section_name) ? (
                    <AppText style={styles.metaText}>
                      Class {paper.class_name || '—'}{paper.section_name ? ` · ${paper.section_name}` : ''}
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.paperDetails}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.detailText}>{formatDate(paper.created_at)}</AppText>
                  </View>
                  <AppText style={styles.detailText}>{formatFileSize(paper.file_size)}</AppText>
                </View>

                <View style={styles.paperActions}>
                  {processingId === paper.paper_id ? (
                    <View style={styles.processingRow}>
                      <ActivityIndicator size="small" color={Theme.colors.primary} />
                      <AppText style={styles.processingText}>Preparing file...</AppText>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => processPaperAction(paper.paper_id, paper.title, false)}
                      >
                        <Eye size={16} color={Theme.colors.primary} />
                        <AppText weight="medium" style={styles.actionText}>View</AppText>
                      </TouchableOpacity>
                      <View style={styles.actionDivider} />
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => processPaperAction(paper.paper_id, paper.title, true)}
                      >
                        <Download size={16} color={Theme.colors.primary} />
                        <AppText weight="medium" style={styles.actionText}>Download</AppText>
                      </TouchableOpacity>
                      <View style={styles.actionDivider} />
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openEditModal(paper)}
                      >
                        <Edit2 size={16} color={Theme.colors.primary} />
                        <AppText weight="medium" style={styles.actionText}>Edit</AppText>
                      </TouchableOpacity>
                      <View style={styles.actionDivider} />
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => confirmDeletePaper(paper)}
                      >
                        <Trash2 size={16} color={Theme.colors.error} />
                        <AppText weight="medium" style={styles.actionTextDanger}>Delete</AppText>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </AppCard>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.fab}
        onPress={openUploadModal}
        accessibilityLabel="Upload question paper"
      >
        <Plus size={24} color={Theme.colors.card} />
      </TouchableOpacity>

      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowUploadModal(false);
          resetUploadForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" style={styles.modalTitle}>
                  {editingPaper ? 'Edit Question Paper' : 'Upload Question Paper'}
                </AppText>
                <AppText style={styles.modalSubtitle}>
                  Select class, subject, exam type and attach a PDF or image (max 10 MB).
                </AppText>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
              >
                <X size={22} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {metaLoading && assignments.length === 0 ? (
                <View style={styles.modalLoader}>
                  <ActivityIndicator color={Theme.colors.primary} />
                  <AppText style={styles.loaderText}>Loading class assignments...</AppText>
                </View>
              ) : (
                <>
                  <PickerField
                    label="Class *"
                    value={selectedClass?.class_name || ''}
                    placeholder="Select class"
                    onPress={() => setClassPickerOpen(true)}
                    error={formErrors.class_id}
                  />
                  <PickerField
                    label="Section *"
                    value={selectedSection?.section_name || ''}
                    placeholder={form.class_id ? 'Select section' : 'Select class first'}
                    onPress={() => form.class_id && setSectionPickerOpen(true)}
                    error={formErrors.section_id}
                  />
                  <PickerField
                    label="Subject *"
                    value={
                      subjectOptions.find(s => String(s.subject_id) === String(form.subject_id))?.subject_name || ''
                    }
                    placeholder={form.section_id ? 'Select subject' : 'Select section first'}
                    onPress={() => form.section_id && setSubjectPickerOpen(true)}
                    error={formErrors.subject_id}
                  />
                  <PickerField
                    label="Exam Type *"
                    value={form.exam_type}
                    placeholder={examTypes.length ? 'Select exam type' : 'No exam types available'}
                    onPress={() => examTypes.length > 0 && setExamTypePickerOpen(true)}
                    error={formErrors.exam_type}
                  />

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>Title *</AppText>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Mid-Term Mathematics"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={form.title}
                      onChangeText={text => setForm(prev => ({ ...prev, title: text }))}
                    />
                    {formErrors.title ? <AppText style={styles.fieldError}>{formErrors.title}</AppText> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>Description / Instructions</AppText>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Duration, max marks, etc."
                      placeholderTextColor={Theme.colors.textMuted}
                      value={form.description}
                      onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>
                      Question Paper File{editingPaper ? '' : ' *'}
                    </AppText>
                    <TouchableOpacity accessibilityRole="button" style={styles.filePickBox} onPress={handlePickPaperFile}>
                      <Upload size={20} color={Theme.colors.primary} />
                      <AppText style={styles.filePickText}>
                        {paperFile?.name || (editingPaper ? 'Tap to replace file (optional)' : 'Tap to choose PDF or image')}
                      </AppText>
                    </TouchableOpacity>
                    {formErrors.file ? <AppText style={styles.fieldError}>{formErrors.file}</AppText> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <AppText weight="semibold" style={styles.formLabel}>Marking Scheme (optional)</AppText>
                    <TouchableOpacity accessibilityRole="button" style={styles.filePickBox} onPress={handlePickMarkingFile}>
                      <Upload size={20} color={Theme.colors.primary} />
                      <AppText style={styles.filePickText}>
                        {markingFile?.name || 'Tap to attach marking scheme'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton
                title="Cancel"
                type="secondary"
                onPress={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                style={styles.modalFooterBtn}
              />
              <AppButton
                title={submitting ? 'Saving...' : editingPaper ? 'Update' : 'Upload'}
                onPress={handleSubmitUpload}
                disabled={submitting || metaLoading}
                style={styles.modalFooterBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomPickerModal
        visible={classPickerOpen}
        title="Select Class"
        options={classPickerOptions}
        selectedValue={form.class_id}
        onValueChange={value => handleClassChange(String(value))}
        onClose={() => setClassPickerOpen(false)}
      />
      <CustomPickerModal
        visible={sectionPickerOpen}
        title="Select Section"
        options={sectionPickerOptions}
        selectedValue={form.section_id}
        onValueChange={value => handleSectionChange(String(value))}
        onClose={() => setSectionPickerOpen(false)}
      />
      <CustomPickerModal
        visible={subjectPickerOpen}
        title="Select Subject"
        options={subjectPickerOptions}
        selectedValue={form.subject_id}
        onValueChange={value => setForm(prev => ({ ...prev, subject_id: String(value) }))}
        onClose={() => setSubjectPickerOpen(false)}
      />
      <CustomPickerModal
        visible={examTypePickerOpen}
        title="Select Exam Type"
        options={examTypePickerOptions}
        selectedValue={form.exam_type}
        onValueChange={value => setForm(prev => ({ ...prev, exam_type: String(value) }))}
        onClose={() => setExamTypePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  pageBody: { paddingHorizontal: Theme.spacing.md, paddingBottom: 96 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...Theme.shadow.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.text,
    paddingVertical: 0,
  },
  filterScroll: { marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: Theme.spacing.sm },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterText: { fontSize: 14, color: Theme.colors.text },
  filterTextActive: { color: '#ffffff' },
  loaderWrap: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  loaderText: { color: Theme.colors.textMuted },
  errorCard: { padding: 24, alignItems: 'center', gap: 8 },
  errorTitle: { color: Theme.colors.text, fontSize: 16, marginTop: 4 },
  errorText: { color: Theme.colors.textMuted, textAlign: 'center', ...Theme.typography.body },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
  },
  retryBtnText: { color: Theme.colors.card },
  emptyCard: { padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { color: Theme.colors.text, marginTop: 4 },
  emptyText: { color: Theme.colors.textMuted, textAlign: 'center', ...Theme.typography.body },
  uploadEmptyBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
  },
  uploadEmptyBtnText: { color: Theme.colors.card },
  paperCard: { padding: 20, marginBottom: 12 },
  paperTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm },
  paperIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    backgroundColor: '#eef2ff',
  },
  typeBadgeText: { fontSize: 11, color: Theme.colors.primary },
  paperTitle: { fontSize: 16, color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  paperMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: Theme.spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Theme.typography.caption, color: Theme.colors.textMuted },
  paperDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { ...Theme.typography.caption, color: Theme.colors.textMuted },
  paperActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionText: { fontSize: 13, color: Theme.colors.primary },
  actionTextDanger: { fontSize: 13, color: Theme.colors.error },
  actionDivider: { width: 1, height: 20, backgroundColor: Theme.colors.border },
  processingRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  processingText: { color: Theme.colors.textMuted, ...Theme.typography.body },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: 12,
  },
  modalTitle: { fontSize: 18, color: Theme.colors.text },
  modalSubtitle: { marginTop: 4, color: Theme.colors.textMuted, ...Theme.typography.caption },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  modalScroll: { maxHeight: 520 },
  modalScrollContent: { padding: 20, paddingBottom: 8 },
  modalLoader: { paddingVertical: 32, alignItems: 'center', gap: 10 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  modalFooterBtn: { flex: 1 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, color: Theme.colors.text, marginBottom: 6 },
  pickerField: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: { flex: 1, color: Theme.colors.text, ...Theme.typography.body },
  pickerPlaceholder: { color: Theme.colors.textMuted },
  textInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 14,
    color: Theme.colors.text,
    ...Theme.typography.body,
  },
  textArea: { minHeight: 88, paddingTop: 12, paddingBottom: 12 },
  filePickBox: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filePickText: { flex: 1, color: Theme.colors.textMuted, ...Theme.typography.body },
  fieldError: { marginTop: 4, color: Theme.colors.error, fontSize: 12 },
});
