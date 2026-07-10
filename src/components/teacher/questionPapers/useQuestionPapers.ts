import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { sharePdfBuffer } from '../../../utils/sharePdfBuffer';
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
} from '../../../services/teacherService';
import { storage } from '../../../storage/storage';
import { StorageKeys } from '../../../storage/StorageKeys';
import { resolveApiErrorMessage } from '../../../utils/helpers';
import { pickQuestionPaperFile, type PickedQuestionPaperFile } from '../../../utils/pickQuestionPaperFile';
import { INITIAL_FORM, type TeacherPaper, type UploadFormState } from './types';

export function useQuestionPapers() {
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
      if (!isMounted.current) return;
      setAssignments(assignmentData);
      setExamTypes(examTypeData);
    } catch (err) {
      console.error('Failed to load question paper metadata:', err);
    } finally {
      if (isMounted.current) setMetaLoading(false);
    }
  }, []);

  const fetchPapers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setLoadError(null);
    try {
      const code = schoolCode || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const branch = branchId || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
      if (!code || !branch) {
        if (!isMounted.current) return;
        setPapers([]);
        setLoadError('School or branch information is missing. Please log in again.');
        return;
      }
      const data = await getTeacherQuestionPapers({ school_code: code, branch_id: branch });
      if (!isMounted.current) return;
      setPapers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load teacher question papers:', err);
      if (!isMounted.current) return;
      setPapers([]);
      setLoadError(resolveApiErrorMessage(err, 'Could not load question papers. Pull down to retry.'));
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [schoolCode, branchId]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => {
    if (schoolCode && branchId) fetchPapers();
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

  const sectionOptions: TeacherPaperSection[] = useMemo(
    () => selectedClass?.sections || [],
    [selectedClass],
  );

  const selectedSection = useMemo(
    () => sectionOptions.find(s => String(s.section_id) === String(form.section_id)),
    [sectionOptions, form.section_id],
  );

  const subjectOptions: TeacherPaperSubject[] = useMemo(() => {
    if (selectedSection?.subjects?.length) return selectedSection.subjects;
    if (!selectedClass) return [];
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
    if (activeSubject !== 'all') list = list.filter(p => p.subject_name === activeSubject);
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

  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    resetUploadForm();
  }, [resetUploadForm]);

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
    setForm(prev => ({ ...prev, class_id: classId, section_id: '', subject_id: '' }));
  };

  const handleSectionChange = (sectionId: string) => {
    setForm(prev => ({ ...prev, section_id: sectionId, subject_id: '' }));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!schoolCode) errs.school_code = 'School information is missing. Please log in again.';
    if (!form.class_id) errs.class_id = 'Class is required';
    if (!form.section_id) errs.section_id = 'Section is required';
    if (!form.subject_id) errs.subject_id = 'Subject is required';
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.exam_type) errs.exam_type = 'Exam type is required';
    if (!editingPaper && !paperFile) errs.file = 'Question paper file is required';
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
      formData.append('file', { uri: paperFile.uri, type: paperFile.type, name: paperFile.name } as any);
    }
    if (markingFile) {
      formData.append('marking_scheme', { uri: markingFile.uri, type: markingFile.type, name: markingFile.name } as any);
    }
    return formData;
  };

  const handleSubmitUpload = async () => {
    if (submitting || !validateForm()) return;
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
      closeUploadModal();
      fetchPapers(true);
    } catch (err) {
      Alert.alert(
        editingPaper ? 'Update failed' : 'Upload failed',
        resolveApiErrorMessage(err, 'Could not save the question paper. Please try again.'),
      );
    } finally {
      if (isMounted.current) setSubmitting(false);
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
      if (picked) setMarkingFile(picked);
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
              Alert.alert('Delete failed', resolveApiErrorMessage(err, 'Could not delete this question paper.'));
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const processPaperAction = async (paperId: string, title: string, isDownload: boolean) => {
    if (processingId) return;
    const resolvedId = String(paperId || '').trim();
    if (!resolvedId) {
      Alert.alert('Cannot open file', 'This question paper is missing a file reference. Pull down to refresh.');
      return;
    }
    try {
      setProcessingId(resolvedId);
      const buffer = await downloadTeacherQuestionPaper(resolvedId);
      const safeTitle = title.replace(/[^a-zA-Z0-9._-]/g, '_');
      await sharePdfBuffer(buffer, `${safeTitle}.pdf`, isDownload ? 'Save Question Paper' : 'View Question Paper');
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('User did not share') || message.includes('cancel')) return;
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

  const classPickerOptions = assignments.map(item => ({ label: item.class_name, value: String(item.class_id) }));
  const sectionPickerOptions = sectionOptions.map(item => ({ label: item.section_name, value: String(item.section_id) }));
  const subjectPickerOptions = subjectOptions.map(item => ({ label: item.subject_name, value: String(item.subject_id) }));
  const examTypePickerOptions = examTypes.map(type => ({ label: type, value: type }));

  return {
    loading,
    refreshing,
    loadError,
    searchTerm,
    setSearchTerm,
    activeSubject,
    setActiveSubject,
    processingId,
    showUploadModal,
    editingPaper,
    form,
    formErrors,
    paperFile,
    markingFile,
    submitting,
    metaLoading,
    assignments,
    examTypes,
    selectedClass,
    selectedSection,
    subjectOptions,
    subjectFilters,
    filteredPapers,
    classPickerOpen,
    sectionPickerOpen,
    subjectPickerOpen,
    examTypePickerOpen,
    setClassPickerOpen,
    setSectionPickerOpen,
    setSubjectPickerOpen,
    setExamTypePickerOpen,
    headerSubtitle,
    classPickerOptions,
    sectionPickerOptions,
    subjectPickerOptions,
    examTypePickerOptions,
    onRefresh,
    openUploadModal,
    closeUploadModal,
    openEditModal,
    handleClassChange,
    handleSectionChange,
    handleSubmitUpload,
    handlePickPaperFile,
    handlePickMarkingFile,
    confirmDeletePaper,
    processPaperAction,
    fetchPapers,
    setForm: (patch: Partial<UploadFormState>) => setForm(prev => ({ ...prev, ...patch })),
    clearFilters: () => {
      setSearchTerm('');
      setActiveSubject('all');
    },
  };
}
