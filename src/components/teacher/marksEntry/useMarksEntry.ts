import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../../services/api';
import { formatErrorMessage } from '../../../utils/helpers';
import { useAuth } from '../../../context/AuthContext';
import {
  ClassItem,
  SectionItem,
  ExamItem,
  SubjectItem,
  StudentMark,
  Assignment,
  FilterPickerMode,
} from './types';
import { getSchoolCode, getTeacherId, validateDecimalWithHalfStep } from './helpers';

export function useMarksEntry() {
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const [schoolCode, setSchoolCode] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [resolvedTeacherId, setResolvedTeacherId] = useState('');

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [inputMaxMarks, setInputMaxMarks] = useState('');
  const [inputPassMarks, setInputPassMarks] = useState('');
  const [examSubjectId, setExamSubjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [savingExamConfig, setSavingExamConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentMark[]>([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  const [inlinePickerModal, setInlinePickerModal] = useState<{
    visible: boolean;
    title: string;
    options: { label: string; value: string }[];
    selectedValue: string;
    onValueChange: (value: string) => void;
  } | null>(null);
  const [autoSave, setAutoSave] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentsRef = useRef(students);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const tid = await getTeacherId();
        const bid = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId') || '';
        if (isMounted.current) {
          setSchoolCode(code);
          setTeacherId(tid);
          setBranchId(bid);
        }
      } catch (e) {
        console.warn('Failed to load credentials', e);
      }
    };
    load();

    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, [setTabBarVisible]);

  useEffect(() => {
    const fetchTeacherAssignments = async () => {
      if (!schoolCode || !teacherId) { return; }

      const cacheKey = `teacher_marks_context_${teacherId}_${schoolCode}`;

      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          const rawAssignments = Array.isArray(data?.assignments) ? data.assignments.filter(Boolean) : [];
          const teacherData = data?.teacher_data || null;
          const canonicalId = String(teacherData?.teacher_id || teacherId).trim();
          const deptRaw = String(teacherData?.department_subject || '').trim();
          const deptSubjects = Array.from(new Set(deptRaw.split(/[,/|]+/).map((s: string) => String(s || '').trim()).filter(Boolean)));

          if (isMounted.current) {
            setTeacherAssignments(rawAssignments);
            setTeacherSubjects(deptSubjects);
            setResolvedTeacherId(canonicalId);
            setClasses(uniqueClassesFromAssignments(rawAssignments));
          }
        }
      } catch (e) {
        console.warn('Failed to load teacher context cache', e);
      }

      if (isMounted.current) { setLoadingClasses(true); }
      try {
        const res = await API.get('/staff/marks/staff-context', {
          params: { school_code: schoolCode, branch_id: branchId, teacher_id: teacherId, employee_id: teacherId },
        });
        if (!isMounted.current) { return; }

        const rawAssignments = Array.isArray(res.data?.assignments) ? res.data.assignments.filter(Boolean) : [];
        const teacherData = res.data?.teacher_data || null;
        const canonicalId = String(teacherData?.teacher_id || teacherId).trim();
        const deptRaw = String(teacherData?.department_subject || '').trim();
        const deptSubjects = Array.from(new Set(deptRaw.split(/[,/|]+/).map((s: string) => String(s || '').trim()).filter(Boolean)));

        setTeacherAssignments(rawAssignments);
        setTeacherSubjects(deptSubjects);
        setResolvedTeacherId(canonicalId);
        setClasses(uniqueClassesFromAssignments(rawAssignments));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(res.data));
      } catch (err: any) {
        if (err?.response?.status === 401) { return; }
      } finally {
        if (isMounted.current) { setLoadingClasses(false); }
      }
    };

    const fetchAllExams = async () => {
      const cacheKey = `teacher_exams_${schoolCode}`;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMounted.current) { setExams(JSON.parse(cached)); }
      } catch (e) {
        console.warn('Failed to load exams cache', e);
      }

      if (isMounted.current) { setLoadingExams(true); }
      try {
        const res = await API.get('/staff/marks/exams', { headers: { 'x-school-code': schoolCode } });
        if (!isMounted.current) { return; }
        const rawExams = Array.isArray(res.data?.exams) ? res.data.exams.filter(Boolean) : [];
        const uniqueExams = Array.from(new Map(rawExams.map((e: ExamItem) => [String(e?.exam_id), e])).values()) as ExamItem[];
        setExams(uniqueExams);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(uniqueExams));
      } catch {
        // Keep cached exams if API fails
      } finally {
        if (isMounted.current) { setLoadingExams(false); }
      }
    };

    if (schoolCode && teacherId) {
      fetchTeacherAssignments();
      fetchAllExams();
    }
  }, [schoolCode, teacherId, branchId]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId('');
      return;
    }
    const assignmentsArray = Array.isArray(teacherAssignments) ? teacherAssignments.filter(Boolean) : [];
    const sectionsData = assignmentsArray
      .filter(a => String(a?.class_id) === String(classId))
      .map(a => ({ section_id: String(a?.section_id), section_name: String(a?.section_name || '') }))
      .filter(a => a.section_id && a.section_name);
    setSections(Array.from(new Map(sectionsData.map(x => [String(x.section_id), x])).values()) as SectionItem[]);
    setSectionId('');
  }, [classId, teacherAssignments]);

  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId('');
      return;
    }
    const assignmentsArray = Array.isArray(teacherAssignments) ? teacherAssignments.filter(Boolean) : [];
    const raw = assignmentsArray
      .filter(a => String(a?.class_id) === String(classId))
      .filter(a => !sectionId || String(a?.section_id) === String(sectionId))
      .map(a => ({ subject_id: String(a?.subject_id), subject_name: a?.subject_name }))
      .filter(a => a.subject_id && a.subject_name);
    const unique = Array.from(new Map(raw.map(x => [String(x.subject_id), x])).values()) as SubjectItem[];
    const allowedSet = new Set(teacherSubjects.filter(Boolean).map(s => String(s).toLowerCase()));
    setSubjects(allowedSet.size ? unique.filter(s => allowedSet.has(String(s.subject_name || '').toLowerCase())) : unique);
    setSubjectId('');
  }, [classId, sectionId, teacherAssignments, teacherSubjects]);

  useEffect(() => {
    const fetchExamConfig = async () => {
      if (!examId || !subjectId) {
        setInputMaxMarks('');
        setInputPassMarks('');
        setExamSubjectId(null);
        setIsEditMode(false);
        return;
      }

      const cacheKey = `exam_config_${examId}_${subjectId}_${schoolCode}`;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMounted.current) {
          const found = JSON.parse(cached);
          setInputMaxMarks(found.max_marks?.toString() || '');
          setInputPassMarks(found.pass_marks?.toString() || '');
          setExamSubjectId(found.id || true);
        }
      } catch (e) {
        console.warn('Failed to load exam config cache', e);
      }

      try {
        const res = await API.get(`/staff/marks/exam-subjects/${examId}`, { headers: { 'x-school-code': schoolCode } });
        if (!isMounted.current) { return; }
        const examSubjectsRaw = Array.isArray(res.data?.exam_subjects) ? res.data.exam_subjects.filter(Boolean) : [];
        const found = examSubjectsRaw.find((s: { subject_id?: string | number }) => String(s?.subject_id) === String(subjectId));
        if (found) {
          setInputMaxMarks(found.max_marks?.toString() || '');
          setInputPassMarks(found.pass_marks?.toString() || '');
          setExamSubjectId(found.id || true);
          setIsEditMode(false);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(found));
        } else {
          setInputMaxMarks('');
          setInputPassMarks('');
          setExamSubjectId(null);
          setIsEditMode(false);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) { return; }
      }
    };
    fetchExamConfig();
  }, [examId, subjectId, schoolCode]);

  const loadStudents = async (isRefresh = false) => {
    if (!classId || !sectionId || !examId || !subjectId) {
      Alert.alert('Error', 'Please select Class, Section, Exam, and Subject');
      return;
    }

    const cacheKey = `marks_students_${examId}_${subjectId}_${classId}_${sectionId}_${schoolCode}`;

    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMounted.current) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setStudents(parsed.map(normalizeCachedStudent));
          }
        }
      } catch (e) {
        console.warn('Failed to load students cache', e);
      }
    }

    if (isMounted.current) { setLoadingStudents(true); }
    try {
      const res = await API.get(
        `/staff/marks/students/${classId}/${sectionId}/${subjectId}`,
        { params: { employee_id: resolvedTeacherId }, headers: { 'x-school-code': schoolCode } }
      );
      if (!isMounted.current) { return; }

      const studentsRaw = Array.isArray(res.data?.students) ? res.data.students.filter(Boolean) : [];
      let rows: StudentMark[] = studentsRaw.map((s: Record<string, unknown>, idx: number) => mapStudentRow(s, idx));

      try {
        const marksRes = await API.get(
          `/staff/marks/existing/${examId}/${subjectId}/${classId}/${sectionId}`,
          { headers: { 'x-school-code': schoolCode } }
        );
        if (isMounted.current) {
          const marksMap: Record<string, Record<string, unknown>> = {};
          const marksRaw = Array.isArray(marksRes.data?.marks) ? marksRes.data.marks.filter(Boolean) : [];
          marksRaw.forEach((m: { roll_no?: string }) => {
            if (m?.roll_no) { marksMap[String(m.roll_no)] = m; }
          });
          rows = rows.map(s => mergeExistingMarks(s, marksMap[String(s.roll_no)]));
        }
      } catch {
        console.warn('Failed to fetch existing marks');
      }

      if (isMounted.current) {
        setStudents(rows);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(rows));
        if (isRefresh) {
          Alert.alert('Refreshed', `Student data refreshed. ${rows.length} students loaded.`);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 401) { return; }
      if (isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to load students');
      }
    } finally {
      if (isMounted.current) { setLoadingStudents(false); }
    }
  };

  const saveMarks = async (silent = false) => {
    if (!classId || !sectionId || !examId || !subjectId) {
      if (!silent) { Alert.alert('Error', 'Please select filters before saving marks'); }
      return false;
    }
    if (!examSubjectId) {
      if (!silent) {
        Alert.alert(
          'Exam configuration missing',
          'Exam configuration is not saved. You can open Exam Configuration to save values, or continue without configuration.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Config', onPress: () => setShowConfigModal(true) },
            {
              text: 'Continue Without Config',
              onPress: () => {
                setExamSubjectId(true as unknown as string);
                setTimeout(() => { saveMarks(silent); }, 100);
              },
            },
          ]
        );
      }
      return false;
    }

    const entries = students.filter(s => s.marks_obtained !== '' && s.marks_obtained !== null);
    if (entries.length === 0) {
      if (!silent && isMounted.current) { Alert.alert('Error', 'No marks entered to save'); }
      return false;
    }

    if (isMounted.current) { setSavingMarks(true); }
    try {
      await Promise.all(entries.map(student => {
        const formData = new FormData();
        formData.append('roll_no', String(student.roll_no || student.student_id));
        formData.append('exam_id', String(examId));
        formData.append('subject_id', String(subjectId));
        formData.append('marks_obtained', student.isAbsent ? '0' : String(student.marks_obtained));
        formData.append('is_absent', student.isAbsent ? 'true' : 'false');
        formData.append('employee_id', String(resolvedTeacherId));
        return API.post('/staff/marks/enter', formData, {
          headers: { 'x-school-code': schoolCode, 'Content-Type': 'multipart/form-data' },
        });
      }));

      if (isMounted.current) {
        setStudents(prev => prev.map(s =>
          entries.find(e => e.student_id === s.student_id) ? { ...s, hasExistingMarks: true } : s
        ));
        if (!silent) {
          Alert.alert('Success', `${entries.length} student marks saved successfully.`);
        }
      }
      return true;
    } catch (err: any) {
      if (err?.response?.status === 401) { return false; }
      if (!silent && isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to save marks');
      }
      return false;
    } finally {
      if (isMounted.current) { setSavingMarks(false); }
    }
  };

  const triggerAutoSave = useCallback(() => { saveMarks(true); }, [classId, sectionId, examId, subjectId, examSubjectId, resolvedTeacherId, schoolCode, students]);

  const handleAbsentToggle = (studentId: string, isAbsent: boolean) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, isAbsent, marks_obtained: isAbsent ? '0' : '' } : s
    ));
    if (autoSave) {
      if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); }
      autoSaveTimerRef.current = setTimeout(() => triggerAutoSave(), 1500);
    }
  };

  const handleMarksChange = (studentId: string, value: string) => {
    if (value === '') {
      setStudents(prev => prev.map(s => {
        if (s.student_id !== studentId || s.isAbsent) { return s; }
        return { ...s, marks_obtained: value };
      }));
      return;
    }
    if (!validateDecimalWithHalfStep(value)) { return; }
    if (!value.endsWith('.')) {
      const numValue = parseFloat(value);
      if (inputMaxMarks) {
        const maxValue = parseFloat(inputMaxMarks);
        if (numValue < 0 || numValue > maxValue) { return; }
      }
    }
    setStudents(prev => prev.map(s => {
      if (s.student_id !== studentId || s.isAbsent) { return s; }
      return { ...s, marks_obtained: value };
    }));
    if (autoSave) {
      if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); }
      autoSaveTimerRef.current = setTimeout(() => triggerAutoSave(), 2000);
    }
  };

  const handleMaxMarksChange = (value: string) => {
    if (value === '') { setInputMaxMarks(''); return; }
    if (validateDecimalWithHalfStep(value)) { setInputMaxMarks(value); }
  };

  const handlePassMarksChange = (value: string) => {
    if (value === '') { setInputPassMarks(''); return; }
    if (validateDecimalWithHalfStep(value)) { setInputPassMarks(value); }
  };

  const saveExamConfig = async () => {
    if (!examId || !subjectId) {
      Alert.alert('Error', 'Please select Exam and Subject first');
      return;
    }
    if (!inputMaxMarks || !inputPassMarks) {
      Alert.alert('Error', 'Please enter Total Marks and Pass Marks');
      return;
    }
    const max = parseFloat(inputMaxMarks.trim());
    const pass = parseFloat(inputPassMarks.trim());
    if (Number.isNaN(max) || Number.isNaN(pass) || max <= 0 || pass < 0) {
      Alert.alert('Error', 'Total Marks and Pass Marks must be valid positive numbers');
      return;
    }

    if (isMounted.current) { setSavingExamConfig(true); }
    try {
      const formData = new FormData();
      formData.append('exam_id', String(examId));
      formData.append('subject_id', String(subjectId));
      formData.append('max_marks', String(max));
      formData.append('pass_marks', String(pass));
      const res = await API.post('/staff/marks/exam-subject-config', formData, {
        headers: { 'x-school-code': schoolCode, 'Content-Type': 'multipart/form-data' },
      });
      if (isMounted.current) {
        setExamSubjectId(res.data?.exam_subject_id || res.data?.id || res.data?.exam_subject?.id || true);
        setIsEditMode(false);
        setShowConfigModal(false);
        Alert.alert('Success', 'Exam configuration saved successfully', [
          { text: 'OK', onPress: () => loadStudents() },
        ]);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) { return; }
      if (isMounted.current) {
        Alert.alert('Error', formatErrorMessage(err?.response?.data?.detail) || 'Failed to save exam config');
      }
    } finally {
      if (isMounted.current) { setSavingExamConfig(false); }
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) { return; }
    const headers = ['Roll No', 'Student ID', 'Student Name', 'Status', 'Attendance', 'Marks', 'Grade'];
    const rows = students.map(row => [
      row.roll_number, row.student_id, row.student_full_name,
      row.hasExistingMarks && row.marks_obtained !== '' ? 'Saved' : 'Draft',
      row.isAbsent ? 'Absent' : 'Present',
      row.isAbsent ? 0 : (row.marks_obtained === '' ? '' : row.marks_obtained),
      row.isAbsent ? 'F' : (row.grade || ''),
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    Alert.alert('Export CSV', `${students.length} student records ready to export.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: () => console.log('Share CSV:', csvContent) },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudents(true);
    setRefreshing(false);
  }, [classId, sectionId, examId, subjectId, examSubjectId]);

  const openInlinePicker = (mode: FilterPickerMode) => {
    if (mode === 'section' && !classId) {
      Alert.alert('Select class first', 'Choose a class before selecting a section.');
      return;
    }
    if (mode === 'subject' && !classId) {
      Alert.alert('Select class first', 'Choose a class before selecting a subject.');
      return;
    }

    const config = {
      class: { title: 'Select Class', options: classes.map(c => ({ label: c.class_name, value: c.class_id })), selectedValue: classId, onValueChange: setClassId },
      section: { title: 'Select Section', options: sections.map(s => ({ label: s.section_name, value: s.section_id })), selectedValue: sectionId, onValueChange: setSectionId },
      exam: { title: 'Select Exam', options: exams.map(e => ({ label: e.exam_name, value: e.exam_id })), selectedValue: examId, onValueChange: setExamId },
      subject: { title: 'Select Subject', options: subjects.map(s => ({ label: s.subject_name, value: s.subject_id })), selectedValue: subjectId, onValueChange: setSubjectId },
    }[mode];

    if (config.options.length === 0) {
      const title = mode === 'section' ? 'No sections available' : mode === 'subject' ? 'No subjects available' : `No ${mode}s available`;
      Alert.alert(title, 'Please try another selection.');
      return;
    }

    setInlinePickerModal({
      visible: true,
      title: config.title,
      options: config.options,
      selectedValue: config.selectedValue,
      onValueChange: (value: string) => {
        config.onValueChange(String(value));
        setInlinePickerModal(null);
      },
    });
  };

  const totalSaved = students.filter(s => s.hasExistingMarks || s.marks_obtained !== '').length;
  const totalPending = students.filter(s => !s.hasExistingMarks && s.marks_obtained === '' && !s.isAbsent).length;
  const totalAbsent = students.filter(s => s.isAbsent).length;

  return {
    classId, sectionId, examId, subjectId,
    classes, sections, exams, subjects, students,
    inputMaxMarks, inputPassMarks, examSubjectId, isEditMode,
    loadingClasses, loadingExams, loadingStudents, refreshing, savingMarks, savingExamConfig,
    showConfigModal, inlinePickerModal, autoSave,
    totalSaved, totalPending, totalAbsent,
    setIsEditMode, setShowConfigModal, setInlinePickerModal, setAutoSave,
    loadStudents, saveMarks, saveExamConfig, exportToCSV, onRefresh,
    openInlinePicker, handleAbsentToggle, handleMarksChange,
    handleMaxMarksChange, handlePassMarksChange,
  };
}

function uniqueClassesFromAssignments(rawAssignments: Assignment[]): ClassItem[] {
  return Array.from(
    new Map(
      rawAssignments
        .filter(a => a?.class_id && a?.class_name)
        .map(a => {
          const name = String(a.class_name).trim();
          return [name.toLowerCase(), { class_id: String(a.class_id), class_name: name }];
        })
    ).values()
  ) as ClassItem[];
}

function normalizeCachedStudent(s: StudentMark, idx: number): StudentMark {
  const rollNo = String(s.roll_no || s.roll_number || `std-${idx}`).trim();
  return {
    ...s,
    roll_no: rollNo,
    student_id: rollNo,
    student_full_name: String(s.student_full_name || `Student ${idx + 1}`).trim(),
    roll_number: String(s.roll_number || idx + 1).trim(),
  };
}

function mapStudentRow(s: Record<string, unknown>, idx: number): StudentMark {
  const rollNo = String(s.roll_no || s.roll_number || s.roll || `std-${idx}`).trim();
  return {
    ...s,
    roll_no: rollNo,
    student_id: rollNo,
    student_full_name: String(s.student_full_name || s.student_name || s.name || s.full_name || `Student ${idx + 1}`).trim(),
    roll_number: String(s.roll_number || s.roll || idx + 1).trim(),
    isAbsent: false,
    marks_obtained: s?.marks_obtained === null || s?.marks_obtained === undefined ? '' : String(s.marks_obtained),
    hasExistingMarks: false,
    grade: '',
    status: '',
    mark_id: null,
  } as StudentMark;
}

function mergeExistingMarks(s: StudentMark, m?: Record<string, unknown>): StudentMark {
  if (!m) { return s; }
  return {
    ...s,
    isAbsent: Boolean(m.is_absent),
    marks_obtained: m.marks_obtained !== undefined && m.marks_obtained !== null ? String(m.marks_obtained) : '',
    mark_id: (m.mark_id as string | null) || null,
    grade: String(m.grade || ''),
    status: String(m.status || ''),
    hasExistingMarks: true,
  };
}
