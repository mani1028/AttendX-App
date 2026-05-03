import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
  StatusBar,
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
  ChevronLeft,
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
  LogOut,
  Settings,
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { HM_THEME as C } from '../../constants/hmTheme';

// Types
interface Teacher {
  teacher_id: string;
  teacher_full_name: string;
  employee_id: string;
  email_id: string;
  designation: string;
  department_subject: string;
  teacher_status: string;
  status: string;
}

interface ClassItem {
  class_id: string;
  class_grade: string;
  section: string;
  students_total?: number;
  present?: number;
  label?: string;
}

interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  admission_number: string;
  status: string;
}

interface AttendanceStatement {
  teachers: {
    attendance_pct: number;
    present_equivalent: number;
    half_day_equivalent: number;
  };
  students: {
    attendance_pct: number;
    present_equivalent: number;
    half_day_equivalent: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('branch_id');
  return id || (await AsyncStorage.getItem('branchId')) || '';
};

const iso = (date: Date): string => date.toISOString().split('T')[0];

// Status Badge Component
const AttendanceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  
  if (isActive) {
    return (
      <View style={styles.statusBadgeActive}>
        <AppText style={styles.statusBadgeActiveText} weight="bold">ACTIVE</AppText>
      </View>
    );
  }
  
  return (
    <View style={styles.statusBadgeInactive}>
      <AppText style={styles.statusBadgeInactiveText} weight="bold">INACTIVE</AppText>
    </View>
  );
};

// Teacher/Student Item Component
const AttendanceItem: React.FC<{ 
  item: Teacher | Student; 
  type: 'teacher' | 'student';
  onPress?: () => void;
}> = ({ item, type, onPress }) => {
  const avatar = type === 'teacher' 
    ? (item as Teacher).teacher_full_name?.[0]?.toUpperCase() || '?'
    : (item as Student).student_full_name?.[0]?.toUpperCase() || '?';

  const title = type === 'teacher' 
    ? (item as Teacher).teacher_full_name 
    : (item as Student).student_full_name;

  const subtitle = type === 'teacher'
    ? `${(item as Teacher).designation || ''} • ${(item as Teacher).department_subject || ''}`
    : `${(item as Student).roll_number || ''} • ${(item as Student).admission_number || ''}`;

  const id = type === 'teacher' 
    ? (item as Teacher).employee_id 
    : (item as Student).admission_number;

  const status = item.status;
  const statusText = status === 'PRESENT' ? 'PRESENT' : status === 'HALF_DAY' || status === 'LATE' ? 'HALF-DAY' : 'ABSENT';
  
  const getStatusColor = () => {
    if (status === 'PRESENT') return C.success;
    if (status === 'HALF_DAY' || status === 'LATE') return C.warning;
    return C.error;
  };

  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.itemAvatar, { backgroundColor: C.primary }]}>
        <AppText style={styles.itemAvatarText} weight="bold">{avatar}</AppText>
      </View>
      
      <View style={styles.itemContent}>
        <View>
          <AppText style={styles.itemId} weight="semiBold">{id}</AppText>
          <AppText style={styles.itemTitle} weight="bold">{title}</AppText>
          <AppText style={styles.itemSubtitle}>{subtitle}</AppText>
        </View>
      </View>

      <View style={styles.itemRight}>
        <View style={[styles.statusPill, { backgroundColor: getStatusColor() + '20' }]}>
          <AppText style={[styles.statusPillText, { color: getStatusColor() }]} weight="bold">
            {statusText}
          </AppText>
        </View>
        <ChevronRight size={20} color={C.text2} />
      </View>
    </TouchableOpacity>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  percentage: number;
  presentEq: number;
  halfDayEq: number;
  isActive?: boolean;
}> = ({ label, percentage, presentEq, halfDayEq, isActive }) => {
  return (
    <AppCard style={[styles.statCard, isActive && styles.statCardActive]}>
      <AppText style={[styles.statLabel, isActive && styles.statLabelActive]} weight="bold">
        {label}
      </AppText>
      <AppText style={[styles.statValue, isActive && styles.statValueActive]} weight="bold">
        {percentage}%
      </AppText>
      <View style={styles.statMeta}>
        <AppText style={styles.statMetaText}>Present eq: {presentEq}</AppText>
        <AppText style={styles.statMetaText}>Half-day eq: {halfDayEq}</AppText>
      </View>
    </AppCard>
  );
};

export default function AttendanceManagementScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

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

  const headers = useMemo(() => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  }), [schoolCode, branchId]);

  // Load Teachers
  const loadTeachers = useCallback(async () => {
    if (!schoolCode || !branchId) return;
    setLoadingTeachers(true);
    try {
      const res = await API.get('hm/teachers/attendance', {
        headers,
        params: { on_date: iso(date) },
      });
      if (isMounted.current) {
        setTeachers(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) return;
      console.error('Failed to load teachers:', error);
    } finally {
      if (isMounted.current) setLoadingTeachers(false);
    }
  }, [schoolCode, branchId, date, headers]);

  // Load Classes
  const loadClasses = useCallback(async () => {
    if (!schoolCode || !branchId) return;
    try {
      const res = await API.get('hm/classes', { headers });
      if (isMounted.current) {
        setClassItems(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) return;
      console.error('Failed to load classes:', error);
    }
  }, [schoolCode, branchId, headers]);

  // Load Students
  const loadStudents = useCallback(async (classItem: ClassItem) => {
    if (!schoolCode || !branchId || !classItem) return;
    setLoadingStudents(true);
    try {
      const res = await API.get('hm/students', {
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
      if (!isMounted.current || error?.response?.status === 401) return;
      console.error('Failed to load students:', error);
    } finally {
      if (isMounted.current) setLoadingStudents(false);
    }
  }, [schoolCode, branchId, date, headers]);

  // Load Statement
  const loadStatement = useCallback(async () => {
    if (!schoolCode || !branchId) return;
    setLoadingStatement(true);
    try {
      const res = await API.get('hm/attendance/statements', {
        headers,
        params: { scope: stmtScope, on_date: iso(date) },
      });
      if (isMounted.current) {
        setStatement(res.data);
      }
    } catch (error: any) {
      if (!isMounted.current || error?.response?.status === 401) return;
      console.error('Failed to load statement:', error);
    } finally {
      if (isMounted.current) setLoadingStatement(false);
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
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HMDashboard' as never)}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Attendance</AppText>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => Alert.alert('Notifications', 'No notifications')}>
          <Bell size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Page Title & Badge */}
        <View style={styles.pageHeader}>
          <View>
            <AppText style={styles.pageTitle} weight="bold">Attendance Management</AppText>
            <View style={styles.badge}>
              <AppText style={styles.badgeText} weight="bold">
                {view === 'teachers' ? `${teacherCount} Teachers` : `${classItems.length} Classes`}
              </AppText>
            </View>
          </View>
        </View>

        {/* Stat Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            label="Teachers"
            percentage={statement?.teachers?.attendance_pct || 0}
            presentEq={statement?.teachers?.present_equivalent || 0}
            halfDayEq={statement?.teachers?.half_day_equivalent || 0}
            isActive={view === 'teachers'}
          />
          <StatCard
            label="Students"
            percentage={statement?.students?.attendance_pct || 0}
            presentEq={statement?.students?.present_equivalent || 0}
            halfDayEq={statement?.students?.half_day_equivalent || 0}
            isActive={view === 'students'}
          />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, view === 'teachers' && styles.tabActive]}
            onPress={() => setView('teachers')}
          >
            <AppText style={[styles.tabText, view === 'teachers' && styles.tabTextActive]} weight="bold">
              Teachers
            </AppText>
            {view === 'teachers' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
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
            <TouchableOpacity
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
            <Search size={18} color={C.text2} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, ID, email.."
              placeholderTextColor={C.text2}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={18} color={C.text2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date & Type Selectors */}
        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.dateControl} onPress={() => setShowDatePicker(true)}>
            <AppText style={styles.controlLabel}>Date</AppText>
            <View style={styles.controlInput}>
              <Calendar size={16} color={C.primary} />
              <AppText style={styles.controlValue}>{iso(date)}</AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.typeControl} onPress={() => setStmtScope(stmtScope === 'weekly' ? 'monthly' : 'weekly')}>
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
              if (selectedDate) setDate(selectedDate);
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
                  <AttendanceItem
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
            {/* Class Selector */}
            {classItems.length > 0 && (
              <View style={styles.classSelector}>
                <AppText style={styles.classSelectorLabel} weight="bold">Classes & Sections</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                  {classItems.map(classItem => (
                    <TouchableOpacity
                      key={`${classItem.class_grade}-${classItem.section}`}
                      style={[
                        styles.classOption,
                        selectedClass?.class_grade === classItem.class_grade &&
                        selectedClass?.section === classItem.section &&
                        styles.classOptionActive
                      ]}
                      onPress={() => setSelectedClass(classItem)}
                    >
                      <AppText
                        style={[
                          styles.classOptionText,
                          selectedClass?.class_grade === classItem.class_grade &&
                          selectedClass?.section === classItem.section &&
                          styles.classOptionTextActive
                        ]}
                        weight="bold"
                      >
                        Class {classItem.class_grade} - {classItem.section}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
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
                  <AttendanceItem
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

      {/* Footer Tabs */}
      <View style={[styles.footerTabs, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.footerTab} onPress={() => navigation.navigate('HMDashboard' as never)}>
          <Home size={22} color={C.text2} />
          <AppText style={styles.footerTabText} weight="semiBold">Home</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => navigation.navigate('TeacherManagement' as never)}>
          <Users size={22} color={C.text2} />
          <AppText style={styles.footerTabText} weight="semiBold">Staff</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerTab, styles.footerTabActive]}>
          <Award size={22} color={C.primary} />
          <AppText style={[styles.footerTabText, styles.footerTabTextActive]} weight="semiBold">Assignment</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => navigation.navigate('StudentManagement' as never)}>
          <Users size={22} color={C.text2} />
          <AppText style={styles.footerTabText} weight="semiBold">Students</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => navigation.navigate('TeacherManagement' as never)}>
          <LogOut size={22} color={C.text2} />
          <AppText style={styles.footerTabText} weight="semiBold">Leave</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: '#001F3F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  notificationBtn: {
    padding: 8,
    width: 40,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    color: C.text,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: C.primary,
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
  },
  statCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  statLabel: {
    fontSize: 13,
    color: C.text2,
    marginBottom: 8,
  },
  statLabelActive: {
    color: C.primary,
  },
  statValue: {
    fontSize: 28,
    color: C.text,
    marginBottom: 8,
  },
  statValueActive: {
    color: C.primary,
  },
  statMeta: {
    gap: 4,
  },
  statMetaText: {
    fontSize: 11,
    color: C.text2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    color: C.text2,
  },
  tabTextActive: {
    color: C.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: C.text2,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: C.text,
  },
  controlsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateControl: {
    flex: 1,
  },
  typeControl: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    color: C.text2,
    marginBottom: 6,
  },
  controlInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    gap: 8,
  },
  dropdownControl: {
    justifyContent: 'space-between',
  },
  controlValue: {
    fontSize: 14,
    color: C.text,
  },
  classSelector: {
    marginBottom: 16,
  },
  classSelectorLabel: {
    fontSize: 13,
    color: C.text,
    marginBottom: 8,
  },
  classScroll: {
    flexGrow: 0,
  },
  classOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  classOptionActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  classOptionText: {
    fontSize: 12,
    color: C.text,
  },
  classOptionTextActive: {
    color: '#fff',
  },
  listContainer: {
    gap: 12,
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
  },
  itemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    color: '#fff',
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemId: {
    fontSize: 11,
    color: C.text2,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 14,
    color: C.text,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: C.text2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeActive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  statusBadgeActiveText: {
    fontSize: 11,
    color: '#065F46',
  },
  statusBadgeInactive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  statusBadgeInactiveText: {
    fontSize: 11,
    color: '#991B1B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.text,
  },
  emptyText: {
    fontSize: 13,
    color: C.text2,
  },
  footerTabs: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  footerTabActive: {
    backgroundColor: C.primarySoft,
  },
  footerTabText: {
    fontSize: 11,
    color: C.text2,
  },
  footerTabTextActive: {
    color: C.primary,
  },
});
