import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Calendar,
  Search,
  Download,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  X,
  Home,
  Award,
  Settings,
  GraduationCap,
} from 'lucide-react-native';
import API from '../../services/api';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';


import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import { attendanceHubStyles as styles } from '../../components/principal/attendance/attendanceHubStyles';
import {
  getSchoolCode,
  getBranchId,
  iso,
  AttendanceStatCard,
  AttendanceHubItem,
  AttendanceFooterTabs,
  type Teacher,
  type ClassItem,
  type Student,
  type AttendanceStatement,
} from '../../components/principal/attendance';

export default function AttendanceManagementScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');

  const [view, setView] = useState<'teachers' | 'students'>('teachers');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PRESENT' | 'ABSENT' | 'HALF_DAY'>('all');

  const [refreshing, setRefreshing] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  const [statement, setStatement] = useState<AttendanceStatement | null>(null);
  const [stmtScope, setStmtScope] = useState<'weekly' | 'monthly'>('weekly');
  const [loadingStatement, setLoadingStatement] = useState(false);

  const isMounted = useRef(true);

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
  }, []);
  const handleScroll = useScrollTabBar();


  const headers = useMemo(() => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  }), [schoolCode, branchId]);

  // Load Teachers
  const loadTeachers = useCallback(async () => {
    if (!schoolCode || !branchId) {return;}
    setLoadingTeachers(true);
    try {
      const res = await API.get('principal/staff/attendance', {
        headers,
        params: { on_date: iso(date) },
      });
      if (isMounted.current) {
        setTeachers(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) {return;}
      console.error('Failed to load teachers:', error);
    } finally {
      if (isMounted.current) {setLoadingTeachers(false);}
    }
  }, [schoolCode, branchId, date, headers]);

  // Load Classes
  const loadClasses = useCallback(async () => {
    if (!schoolCode || !branchId) {return;}
    try {
      const res = await API.get('principal/classes', { headers });
      if (isMounted.current) {
        setClassItems(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) {return;}
      console.error('Failed to load classes:', error);
    }
  }, [schoolCode, branchId, headers]);

  // Load Students
  const loadStudents = useCallback(async (classItem: ClassItem) => {
    if (!schoolCode || !branchId || !classItem) {return;}
    setLoadingStudents(true);
    try {
      const res = await API.get('principal/students', {
        headers,
        params: {
          class_grade: classItem.class_grade,
          section: classItem.section,
          on_date: iso(date),
        },
      });
      if (isMounted.current) {
        setStudents(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) {return;}
      console.error('Failed to load students:', error);
    } finally {
      if (isMounted.current) {setLoadingStudents(false);}
    }
  }, [schoolCode, branchId, date, headers]);

  // Load Statement
  const loadStatement = useCallback(async () => {
    if (!schoolCode || !branchId) {return;}
    setLoadingStatement(true);
    try {
      const res = await API.get('principal/attendance/statements', {
        headers,
        params: { scope: stmtScope, on_date: iso(date) },
      });
      if (isMounted.current) {
        setStatement(res.data);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) {return;}
      console.error('Failed to load statement:', error);
    } finally {
      if (isMounted.current) {setLoadingStatement(false);}
    }
  }, [schoolCode, branchId, date, stmtScope, headers]);

  useEffect(() => {
    if (schoolCode && branchId) {
      loadTeachers();
      loadClasses();
      loadStatement();
    }
  }, [schoolCode, branchId, loadTeachers, loadClasses, loadStatement]);

  useEffect(() => {
    if (view === 'students' && classItems.length > 0 && !selectedClass) {
      setSelectedClass(classItems[0]);
    }
  }, [view, classItems, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    }
  }, [selectedClass, loadStudents]);

  // Filtering
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const nameMatch = search === '' || t.teacher_full_name?.toLowerCase().includes(search.toLowerCase());
      const idMatch = search === '' || t.employee_id?.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === 'all' || t.status === statusFilter;
      return (nameMatch || idMatch) && statusMatch;
    });
  }, [teachers, search, statusFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const nameMatch = search === '' || s.student_full_name?.toLowerCase().includes(search.toLowerCase());
      const rollMatch = search === '' || s.roll_number?.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === 'all' || s.status === statusFilter;
      return (nameMatch || rollMatch) && statusMatch;
    });
  }, [students, search, statusFilter]);

  const teacherCount = teachers.length;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTeachers();
      await loadClasses();
      await loadStatement();
      if (selectedClass) {
        await loadStudents(selectedClass);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadTeachers, loadClasses, loadStatement, selectedClass, loadStudents]);

  return (
    <View style={styles.container}>


      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Attendance Hub"
          subtitle="Monitor daily presence across the institution"
          onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={() => Alert.alert('Notifications', 'No notifications')}
            >
              <Bell size={22} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

          {/* Page Title & Badge */}
          <View style={styles.pageHeader}>
            <View>
              <AppText style={styles.pageTitle} weight="bold">Real-time Stats</AppText>
              <View style={styles.badge}>
                <AppText style={styles.badgeText} weight="bold">
                  {view === 'teachers' ? `${teacherCount} Teachers` : `${classItems.length} Classes`}
                </AppText>
              </View>
            </View>
          </View>

          {/* Stat Cards */}
          <View style={styles.statsContainer}>
            <AttendanceStatCard
              label="Teachers"
              percentage={statement?.teachers?.attendance_pct || 0}
              presentEq={statement?.teachers?.present_equivalent || 0}
              halfDayEq={statement?.teachers?.half_day_equivalent || 0}
              isActive={view === 'teachers'}
            />
            <AttendanceStatCard
              label="Students"
              percentage={statement?.students?.attendance_pct || 0}
              presentEq={statement?.students?.present_equivalent || 0}
              halfDayEq={statement?.students?.half_day_equivalent || 0}
              isActive={view === 'students'}
            />
          </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.tab, view === 'teachers' && styles.tabActive]}
            onPress={() => setView('teachers')}
          >
            <AppText style={[styles.tabText, view === 'teachers' && styles.tabTextActive]} weight="bold">
              Teachers
            </AppText>
            {view === 'teachers' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.tab, view === 'students' && styles.tabActive]}
            onPress={() => setView('students')}
          >
            <AppText style={[styles.tabText, view === 'students' && styles.tabTextActive]} weight="bold">
              Students
            </AppText>
            {view === 'students' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {['all', 'PRESENT', 'ABSENT', 'HALF_DAY'].map(filter => (
            <TouchableOpacity accessibilityRole="button"
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter as any)}
            >
              <AppText
                style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}
                weight="bold"
              >
                {filter === 'all' ? 'ALL' : filter === 'HALF_DAY' ? 'HALF-DAY' : filter}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search & Filters */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Search size={18} color={C.text2} style={{ marginRight: Theme.spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, ID, email.."
              placeholderTextColor={C.text2}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity accessibilityRole="button" onPress={() => setSearch('')}>
                <X size={18} color={C.text2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date & Type Selectors */}
        <View style={styles.controlsSection}>
          <TouchableOpacity accessibilityRole="button" style={styles.dateControl} onPress={() => setShowDatePicker(true)}>
            <AppText style={styles.controlLabel}>Date</AppText>
            <View style={styles.controlInput}>
              <Calendar size={16} color={C.primary} />
              <AppText style={styles.controlValue}>{iso(date)}</AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={styles.typeControl} onPress={() => setStmtScope(stmtScope === 'weekly' ? 'monthly' : 'weekly')}>
            <AppText style={styles.controlLabel}>Type</AppText>
            <View style={[styles.controlInput, styles.dropdownControl]}>
              <AppText style={styles.controlValue}>{stmtScope === 'weekly' ? 'weekly' : 'monthly'}</AppText>
            </View>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {setDate(selectedDate);}
            }}
          />
        )}

        {/* Teacher List */}
        {view === 'teachers' && (
          <>
            {loadingTeachers ? (
              <Loader />
            ) : filteredTeachers.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color={C.text2} />
                <AppText style={styles.emptyTitle} weight="bold">No teachers found</AppText>
                <AppText style={styles.emptyText}>Try adjusting your filters</AppText>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredTeachers.map(teacher => (
                  <AttendanceHubItem
                    key={teacher.teacher_id}
                    item={teacher}
                    type="teacher"
                    onPress={() => Alert.alert(teacher.teacher_full_name, `ID: ${teacher.employee_id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Student List */}
        {view === 'students' && (
          <>
            {/* Class Selector as two picker controls + modal */}
            {classItems.length > 0 && (
              <>
                <View style={styles.classSelectorRow}>
                  <View style={styles.pickerControl}>
                    <AppText style={styles.controlLabelSmall}>Class</AppText>
                    <TouchableOpacity accessibilityRole="button" style={styles.pickerInput} onPress={() => setShowClassModal(true)}>
                      <AppText style={styles.pickerValue}>Class {selectedClass?.class_grade || '-'}</AppText>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.pickerControl, { marginLeft: Theme.spacing.md }]}>
                    <AppText style={styles.controlLabelSmall}>Section</AppText>
                    <TouchableOpacity accessibilityRole="button" style={styles.pickerInput} onPress={() => setShowClassModal(true)}>
                      <AppText style={styles.pickerValue}>{selectedClass?.section || '-'}</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                <Modal visible={showClassModal} animationType="slide" transparent>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <AppText style={styles.modalTitle} weight="bold">Select class & section</AppText>
                      <ScrollView>
                        {classItems.map(ci => (
                          <TouchableOpacity accessibilityRole="button"
                            key={`${ci.class_grade}-${ci.section}`}
                            style={[styles.modalItem, selectedClass?.class_grade === ci.class_grade && selectedClass?.section === ci.section && styles.modalItemActive]}
                            onPress={() => {
                              setSelectedClass(ci);
                              setShowClassModal(false);
                            }}
                          >
                            <AppText style={styles.modalItemText}>Class {ci.class_grade} - {ci.section}</AppText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TouchableOpacity accessibilityRole="button" style={styles.modalClose} onPress={() => setShowClassModal(false)}>
                        <AppText style={styles.modalCloseText}>Close</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </>
            )}

            {loadingStudents ? (
              <Loader />
            ) : filteredStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color={C.text2} />
                <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
                <AppText style={styles.emptyText}>Try adjusting your filters</AppText>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredStudents.map(student => (
                  <AttendanceHubItem
                    key={student.student_id}
                    item={student}
                    type="student"
                    onPress={() => Alert.alert(student.student_full_name, `Roll: ${student.roll_number}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}

          <View style={{ height: 40 }} />
        </ScrollView>

      <AttendanceFooterTabs bottomInset={insets.bottom} />
    </View>
  );
}
