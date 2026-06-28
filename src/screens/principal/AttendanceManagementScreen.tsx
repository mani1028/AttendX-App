import { useScrollTabBar } from '../../hooks/useScrollTabBar';
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
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await storage.getString(StorageKeys.BRANCH_ID);
  return id || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
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
    if (status === 'PRESENT') {return C.success;}
    if (status === 'HALF_DAY' || status === 'LATE') {return C.warning;}
    return C.error;
  };

  return (
    <TouchableOpacity accessibilityRole="button" style={styles.itemCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.itemAvatar, { backgroundColor: C.primary }]}>
        <AppText style={styles.itemAvatarText} weight="bold">{avatar}</AppText>
      </View>

      <View style={styles.itemContent}>
        <View>
          <AppText style={styles.itemId} weight="semibold">{id}</AppText>
          <AppText style={styles.itemTitle} weight="bold">{title}</AppText>
          <AppText style={styles.itemSubtitle}>{subtitle}</AppText>

          <View style={[styles.statusChip, { backgroundColor: getStatusColor() + '20' }]}>
            <AppText style={[styles.statusChipText, { color: getStatusColor() }]} weight="bold">
              {statusText}
            </AppText>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color={C.text2} />
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
    <AppCard style={StyleSheet.flatten([styles.statCard, isActive && styles.statCardActive])}>
      <View style={[styles.statAccent, isActive && styles.statAccentActive]} />
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


      <StandardPageHeader
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

      <View style={[styles.contentOverlap, innerPageLayoutStyles.contentFront]}>
        <ScrollView
         style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
          contentContainerStyle={styles.contentContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
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

                  <View style={[styles.pickerControl, { marginLeft: 12 }]}>
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
      </View>

      {/* Footer Tabs - Principal Portal style */}
      <View style={[styles.footerTabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('PrincipalDashboard' as never)}>
          <View style={[styles.footerIconWrap, route.name === 'PrincipalDashboard' && styles.footerIconWrapActive]}>
            <Home size={22} color={route.name === 'PrincipalDashboard' ? '#6648dc' : '#8a96a6'} />
          </View>
          <AppText style={[styles.footerTabText, route.name === 'PrincipalDashboard' && styles.footerTabTextActive]} weight="semibold">Home</AppText>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('TeacherManagement' as never)}>
          <View style={[styles.footerIconWrap, route.name === 'TeacherManagement' && styles.footerIconWrapActive]}>
            <Users size={22} color={route.name === 'TeacherManagement' ? '#6648dc' : '#8a96a6'} />
          </View>
          <AppText style={[styles.footerTabText, route.name === 'TeacherManagement' && styles.footerTabTextActive]} weight="semibold">Staff</AppText>
        </TouchableOpacity>

        <View style={styles.footerCenterSlot}>
          <TouchableOpacity accessibilityRole="button" style={styles.footerFab} onPress={() => navigation.navigate('TeacherAssignment' as never)} activeOpacity={0.85}>
            <View style={styles.footerFabInner}>
              <GraduationCap size={20} color={Theme.colors.card} />
            </View>
          </TouchableOpacity>
          <AppText style={styles.footerCenterLabel} weight="semibold">Teacher{'\n'}Assignment</AppText>
        </View>

        <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('StudentManagement' as never)}>
          <View style={[styles.footerIconWrap, route.name === 'StudentManagement' && styles.footerIconWrapActive]}>
            <GraduationCap size={22} color={route.name === 'StudentManagement' ? '#6648dc' : '#8a96a6'} />
          </View>
          <AppText style={[styles.footerTabText, route.name === 'StudentManagement' && styles.footerTabTextActive]} weight="semibold">Students</AppText>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.footerTab} onPress={() => navigation.navigate('Settings' as never)}>
          <View style={[styles.footerIconWrap, route.name === 'Settings' && styles.footerIconWrapActive]}>
            <Settings size={22} color={route.name === 'Settings' ? '#6648dc' : '#8a96a6'} />
          </View>
          <AppText style={[styles.footerTabText, route.name === 'Settings' && styles.footerTabTextActive]} weight="semibold">Settings</AppText>
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
  contentOverlap: {
    flex: 1,
        backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 110,
  },
  pageHeader: {
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 26,
    color: C.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: C.primary,
    ...Theme.typography.caption,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 18,
    backgroundColor: C.white,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  statCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  statAccent: {
    height: 4,
    width: '100%',
    backgroundColor: 'transparent',
    marginBottom: 12,
    borderRadius: 999,
  },
  statAccentActive: {
    backgroundColor: C.primary,
  },
  statLabel: {
    fontSize: 13,
    color: C.text2,
    marginBottom: Theme.spacing.sm,
  },
  statLabelActive: {
    color: C.primary,
  },
  statValue: {
    fontSize: 30,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  statValueActive: {
    color: C.primary,
  },
  statMeta: {
    gap: 4,
  },
  statMetaText: {
    ...Theme.typography.label,
    color: C.text2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 18,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: 'rgba(31, 111, 235, 0.05)',
  },
  tabText: {
    ...Theme.typography.bodyMd,
    color: C.text2,
  },
  tabTextActive: {
    color: C.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 18,
    right: 18,
    height: 2.5,
    backgroundColor: C.primary,
    borderRadius: 999,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Theme.spacing.md,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  filterChip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 111, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    ...Theme.typography.caption,
    color: C.text2,
  },
  filterChipTextActive: {
    color: Theme.colors.card,
  },
  searchSection: {
    marginBottom: Theme.spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  searchInput: {
    flex: 1,
    marginHorizontal: Theme.spacing.sm,
    ...Theme.typography.body,
    color: C.text,
  },
  controlsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Theme.spacing.md,
  },
  dateControl: {
    flex: 1,
  },
  typeControl: {
    flex: 1,
  },
  controlLabel: {
    ...Theme.typography.caption,
    color: C.text2,
    marginBottom: 6,
  },
  controlInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  dropdownControl: {
    justifyContent: 'space-between',
  },
  controlValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  classSelector: {
    marginBottom: Theme.spacing.md,
  },
  classSelectorLabel: {
    fontSize: 13,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  classScroll: {
    flexGrow: 0,
  },
  classOption: {
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: Theme.spacing.sm,
  },
  classOptionActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  classOptionText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  classOptionTextActive: {
    color: Theme.colors.card,
  },
  listContainer: {
    gap: 12,
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Theme.spacing.md,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  itemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    color: Theme.colors.card,
    fontSize: 16,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemId: {
    ...Theme.typography.label,
    color: C.text2,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: Theme.spacing.xs,
  },
  statusChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusChipText: {
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  classSelectorRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  pickerControl: {
    flex: 1,
  },
  controlLabelSmall: {
    ...Theme.typography.caption,
    color: C.text2,
    marginBottom: 6,
  },
  pickerInput: {
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    justifyContent: 'center',
  },
  pickerValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    padding: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 12,
    color: C.text,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalItemActive: {
    backgroundColor: C.primarySoft,
  },
  modalItemText: {
    ...Theme.typography.body,
    color: C.text,
  },
  modalClose: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: C.primary,
    ...Theme.typography.bodyMd,
    fontWeight: '600',
  },
  itemSubtitle: {
    ...Theme.typography.caption,
    color: C.text2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusPillText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  statusBadgeActive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  statusBadgeActiveText: {
    ...Theme.typography.label,
    color: '#065F46',
  },
  statusBadgeInactive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  statusBadgeInactiveText: {
    ...Theme.typography.label,
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
    alignItems: 'flex-end',
    backgroundColor: '#050d1a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
    }),
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  footerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  footerIconWrapActive: {
    backgroundColor: 'rgba(11,76,246,0.14)',
  },
  footerTabText: {
    fontSize: 9,
    color: '#8a96a6',
  },
  footerTabTextActive: {
    color: '#6648dc',
    fontSize: 10,
  },
  footerCenterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 2,
  },
  footerFab: {
    position: 'absolute',
    top: -26,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0b2750',
    borderWidth: 2,
    borderColor: 'rgba(30,58,138,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 14 },
    }),
  },
  footerFabInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6648dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCenterLabel: {
    fontSize: 9,
    color: '#8a96a6',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 11,
  },
});
