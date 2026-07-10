import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  getSchoolCode,
  getBranchId,
  groupClassItems,
  iso,
} from '../../components/principal/attendance/helpers';
import type {
  AttendanceStatement,
  AttendanceView,
  ClassItem,
  SectionGroup,
  StmtScope,
  Teacher,
} from '../../components/principal/attendance/types';

const ITEMS_PER_PAGE = 12;

export function usePrincipalAttendance() {
  const route = useRoute<any>();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [view, setView] = useState<AttendanceView>('teachers');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [refreshing, setRefreshing] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [preselectedSection, setPreselectedSection] = useState<{ class_grade: string; section: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionGroup | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const [stmtScope, setStmtScope] = useState<StmtScope>('weekly');
  const [statement, setStatement] = useState<AttendanceStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [showTeacherExport, setShowTeacherExport] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const studentGroups = useMemo(() => groupClassItems(classItems), [classItems]);

  const availableSections = useMemo(() => {
    if (!selectedSection) { return [] as SectionGroup[]; }
    return studentGroups.find(([grade]) => grade === selectedSection.class_grade)?.[1] || [];
  }, [studentGroups, selectedSection]);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ visible: true, message: msg, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  const loadTeachers = useCallback(async () => {
    if (!schoolCode || !branchId) { return; }
    setLoadingTeachers(true);
    try {
      const res = await API.get('principal/staff/attendance', {
        params: { on_date: iso(date) },
      });
      if (isMounted.current) {
        const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
        setTeachers(items);
      }
    } catch (error: any) {
      if (!isMounted.current) { return; }
      if (error?.response?.status === 401) { return; }
      showToast('Failed to load teachers', 'error');
    } finally {
      if (isMounted.current) {
        setLoadingTeachers(false);
      }
    }
  }, [schoolCode, branchId, date, showToast]);

  const loadClasses = useCallback(async () => {
    if (!schoolCode || !branchId) { return; }
    setLoadingClasses(true);
    try {
      const res = await API.get('principal/classes', {
        params: { on_date: iso(date) },
      });
      if (isMounted.current) {
        const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
        setClassItems(items);
      }
    } catch (error: any) {
      if (!isMounted.current) { return; }
      if (error?.response?.status === 401) { return; }
      showToast('Failed to load classes', 'error');
    } finally {
      if (isMounted.current) {
        setLoadingClasses(false);
      }
    }
  }, [schoolCode, branchId, date, showToast]);

  const loadStatement = useCallback(async () => {
    if (!schoolCode || !branchId) { return; }
    setLoadingStatement(true);
    try {
      const res = await API.get('principal/attendance/statements', {
        params: { scope: stmtScope, on_date: iso(date) },
      });
      if (isMounted.current) {
        setStatement(res.data);
      }
    } catch (error: any) {
      if (!isMounted.current) { return; }
      if (error?.response?.status === 401) { return; }
      console.error('Failed to load statement:', error);
    } finally {
      if (isMounted.current) {
        setLoadingStatement(false);
      }
    }
  }, [schoolCode, branchId, date, stmtScope]);

  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      if (isMounted.current) {
        setSchoolCode(code);
        setBranchId(bid);
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
    if (schoolCode && branchId) {
      loadTeachers();
      loadClasses();
      loadStatement();
    }
  }, [schoolCode, branchId, loadTeachers, loadClasses, loadStatement]);

  useEffect(() => {
    if (studentGroups.length && !selectedSection) {
      setSelectedSection(studentGroups[0][1][0] || null);
    }
  }, [studentGroups, selectedSection]);

  useEffect(() => {
    if (preselectedSection && studentGroups.length) {
      const matchedGroup = studentGroups.find(([grade]) => grade === String(preselectedSection.class_grade).trim());
      const matchedSection = matchedGroup?.[1].find(sec => sec.section === String(preselectedSection.section).trim()) || null;
      if (matchedSection) {
        setSelectedSection(matchedSection);
      }
    }
  }, [preselectedSection, studentGroups]);

  useEffect(() => {
    if (route.params?.class_grade && route.params?.section) {
      setView('students');
      setPreselectedSection({
        class_grade: route.params.class_grade,
        section: route.params.section,
      });
    } else if (route.params?.view) {
      setView(route.params.view);
    }
  }, [route.params]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, view, date]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const nameMatch = search === '' || (teacher.teacher_full_name || '').toLowerCase().includes(search.toLowerCase());
      const idMatch = search === '' || String(teacher.employee_id || '').toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === '' || teacher.status === statusFilter;
      return (nameMatch || idMatch) && statusMatch;
    });
  }, [teachers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE));
  const paginatedTeachers = filteredTeachers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const headers = useMemo(() => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  }), [schoolCode, branchId]);

  const handlePreselectedApplied = useCallback(() => {
    setPreselectedSection(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (view === 'teachers') {
        await loadTeachers();
      } else {
        await loadClasses();
      }
      await loadStatement();
    } finally {
      setRefreshing(false);
    }
  }, [view, loadTeachers, loadClasses, loadStatement]);

  const selectedClassLabel = selectedSection ? String(selectedSection.class_grade) : '—';
  const selectedSectionLabel = selectedSection ? String(selectedSection.section) : '—';

  const handleExportPress = useCallback(() => {
    if (view === 'teachers') {
      setShowTeacherExport(true);
    } else {
      setShowExport(true);
    }
  }, [view]);

  const handleSelectClass = useCallback((sections: SectionGroup[]) => {
    setSelectedSection(sections[0] || null);
    setShowClassDropdown(false);
  }, []);

  const handleSelectSection = useCallback((section: SectionGroup) => {
    setSelectedSection(section);
    setShowSectionDropdown(false);
  }, []);

  return {
    view,
    setView,
    date,
    setDate,
    showDatePicker,
    setShowDatePicker,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    refreshing,
    loadingTeachers,
    loadingClasses,
    classItems,
    preselectedSection,
    selectedSection,
    setSelectedSection,
    showClassDropdown,
    setShowClassDropdown,
    showSectionDropdown,
    setShowSectionDropdown,
    stmtScope,
    setStmtScope,
    statement,
    loadingStatement,
    showExport,
    setShowExport,
    showTeacherExport,
    setShowTeacherExport,
    toast,
    showToast,
    schoolCode,
    branchId,
    studentGroups,
    availableSections,
    filteredTeachers,
    paginatedTeachers,
    totalPages,
    headers,
    selectedClassLabel,
    selectedSectionLabel,
    handlePreselectedApplied,
    onRefresh,
    handleExportPress,
    handleSelectClass,
    handleSelectSection,
  };
}
