import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  StatusBar,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  ChevronLeft,
  Search,
  Users,
  User,
  GraduationCap,
  Calendar,
  X,
  ChevronRight,
  Filter,
  Bell,
  Mail,
  Phone,
  UserPlus
} from 'lucide-react-native';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import * as teacherService from '../../services/teacherService';
import { useAuth } from '../../context/AuthContext';
import HM_THEME from '../../constants/hmTheme';
import AppText from '../../components/common/AppText';
import { RootStackParamList } from '../../navigation/AppNavigator';
import BottomSheetModal from '../../components/common/BottomSheetModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  class_grade: string;
  section: string;
  gender: string;
  student_status: 'ACTIVE' | 'INACTIVE';
  student_photograph?: string;
  date_of_birth?: string;
  blood_group?: string;
  father_guardian_name?: string;
  father_guardian_mobile?: string;
  mother_guardian_name?: string;
  mother_guardian_mobile?: string;
  admission_number?: string;
}

interface AssignedClass {
  class_grade: string;
  section: string;
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

const getStudentPhotoUri = (value?: string): string | null => {
  const photo = String(value || '').trim();
  if (!photo) return null;

  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  const compact = photo.replace(/\s+/g, '');
  if (compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact)) {
    return `data:image/jpeg;base64,${compact.replace(/-/g, '+').replace(/_/g, '/')}`;
  }

  return photo;
};

const getEmployeeId = async (): Promise<string> => {
  const id = await AsyncStorage.getItem('employee_id');
  return id || (await AsyncStorage.getItem('employeeId')) || '';
};

const fmt = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const initials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

// Student Card Component
const StudentCard: React.FC<{
  student: Student;
  onView: (student: Student) => void;
}> = ({ student, onView }) => {
  const isActive = student.student_status?.toUpperCase() === 'ACTIVE';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onView(student)} style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={styles.studentAvatarContainer}>
          <View style={styles.avatarWrapper}>
            {getStudentPhotoUri(student.student_photograph) ? (
              <Image
                source={{ uri: getStudentPhotoUri(student.student_photograph)! }}
                style={styles.studentAvatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <AppText weight="bold" style={styles.avatarText}>{initials(student.student_full_name)}</AppText>
              </View>
            )}
          </View>
        </View>
        <View style={styles.studentDetails}>
          <AppText weight="bold" style={styles.studentName} numberOfLines={1}>{student.student_full_name}</AppText>
          <AppText weight="regular" style={styles.studentClass}>Class {student.class_grade} • Section {student.section}</AppText>
        </View>
      </View>
      
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#f0fdf4' : '#fef2f2' }]}>
          <AppText weight="bold" style={[styles.statusBadgeText, { color: isActive ? '#22c55e' : '#ef4444' }]}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </AppText>
        </View>
        <ChevronRight size={18} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
};

export default function StudentListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const lastScrollY = useRef(0);

  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [records, setRecords] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // Load credentials
  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      if (isMounted.current) {
        setSchoolCode(code);
        setBranchId(bid);
        setEmployeeId(eid);
      }
    };
    load();
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);

  // Load assigned classes
  const loadAssignedClasses = useCallback(async () => {
    if (!schoolCode || !branchId || !employeeId) return;
    try {
      const assigned = await teacherService.getAssignedClasses(schoolCode, branchId, employeeId);
      if (isMounted.current) {
        setAssignedClasses(assigned);
        if (assigned.length > 0 && !selectedClass) {
          setSelectedClass(assigned[0].class_grade);
          setSelectedSection(assigned[0].section);
        }
      }
    } catch (error) {
      console.error('Failed to load assigned classes:', error);
    }
  }, [schoolCode, branchId, employeeId]);

  // Load students
  const fetchStudents = useCallback(async (showLoading = true) => {
    if (!schoolCode || !branchId || !selectedClass || !selectedSection) return;
    if (showLoading) setLoading(true);
    try {
      const students = await teacherService.getStudentsByClass(
        schoolCode,
        branchId,
        selectedClass,
        selectedSection,
      );
      if (isMounted.current) {
        setRecords(students);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [schoolCode, branchId, selectedClass, selectedSection]);

  useEffect(() => {
    loadAssignedClasses();
  }, [loadAssignedClasses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAssignedClasses(), fetchStudents(false)]);
    setRefreshing(false);
  }, [loadAssignedClasses, fetchStudents]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      r.student_full_name.toLowerCase().includes(q) ||
      r.roll_number.toLowerCase().includes(q) ||
      r.student_id.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

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

  const classOptions = useMemo(() => {
    const unique = new Set(assignedClasses.map(c => c.class_grade));
    return Array.from(unique);
  }, [assignedClasses]);

  const sectionOptions = useMemo(() => {
    return assignedClasses
      .filter(c => c.class_grade === selectedClass)
      .map(c => c.section);
  }, [assignedClasses, selectedClass]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={HM_THEME.navy} />

      {/* Navy Standard Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : (navigation as any).navigate('TeacherDashboard')}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.headerTitle}>Manage Profiles</AppText>
          <TouchableOpacity style={styles.notificationBtn}>
            <Bell size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by roll no, or name"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Filter size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Class Filter */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <Filter size={18} color={HM_THEME.navy} />
            <AppText weight="bold" style={styles.filterTitle}>Filter by Class</AppText>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {classOptions.map(cls => (
              <TouchableOpacity
                key={cls}
                style={[styles.chip, selectedClass === cls && styles.chipActive]}
                onPress={() => {
                  setSelectedClass(cls);
                  const firstSec = assignedClasses.find(c => c.class_grade === cls)?.section;
                  if (firstSec) setSelectedSection(firstSec);
                }}
              >
                <AppText weight="semiBold" style={[styles.chipText, selectedClass === cls && styles.chipTextActive]}>
                  Class {cls}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedClass !== '' && (
            <View style={styles.sectionPicker}>
              <AppText weight="bold" style={styles.sectionLabel}>Section:</AppText>
              <View style={styles.sectionChips}>
                {sectionOptions.map(sec => (
                  <TouchableOpacity
                    key={sec}
                    style={[styles.secChip, selectedSection === sec && styles.secChipActive]}
                    onPress={() => setSelectedSection(sec)}
                  >
                    <AppText weight="bold" style={[styles.secChipText, selectedSection === sec && styles.secChipTextActive]}>
                      {sec}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <AppText weight="bold" style={styles.listTitle}>All Students</AppText>
          <AppText weight="semiBold" style={styles.listCount}>{filtered.length} Students</AppText>
        </View>

        {/* Student List */}
        {loading ? (
          <ActivityIndicator size="large" color="#001F3F" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#CBD5E1" />
            <AppText weight="bold" style={styles.emptyTitle}>No Students Found</AppText>
            <AppText style={styles.emptySub}>We couldn't find any students for the selected criteria.</AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map(student => (
              <StudentCard key={student.student_id} student={student} onView={setViewStudent} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB - Add Student (If allowed) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('HMStudentRegistration' as any)}
      >
        <UserPlus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Student Detail Modal */}
      <BottomSheetModal visible={!!viewStudent} onClose={() => setViewStudent(null)} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHandle} />
          <TouchableOpacity onPress={() => setViewStudent(null)} style={styles.modalClose}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.modalProfileHeader}>
            <View style={styles.modalAvatarContainer}>
              {getStudentPhotoUri(viewStudent?.student_photograph) ? (
                <Image
                  source={{ uri: getStudentPhotoUri(viewStudent?.student_photograph)! }}
                  style={styles.modalLargeAvatar}
                />
              ) : (
                <View style={styles.modalLargePlaceholder}>
                  <AppText weight="bold" style={styles.modalLargeAvatarText}>{initials(viewStudent?.student_full_name || '')}</AppText>
                </View>
              )}
              <View style={[styles.modalStatusBadge, { backgroundColor: viewStudent?.student_status === 'ACTIVE' ? '#10b981' : '#ef4444' }]}>
                <AppText weight="bold" style={styles.modalStatusText}>{viewStudent?.student_status}</AppText>
              </View>
            </View>
            <AppText weight="bold" style={styles.modalName}>{viewStudent?.student_full_name}</AppText>
            <AppText weight="semiBold" style={styles.modalSub}>{viewStudent?.student_id} • Roll {viewStudent?.roll_number}</AppText>
          </View>

          {/* Info Sections */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#eef2ff' }]}>
                  <GraduationCap size={18} color="#6366f1" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Class & Section</AppText>
                  <AppText weight="bold" style={styles.infoValue}>{viewStudent?.class_grade} - {viewStudent?.section}</AppText>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#fdf2f8' }]}>
                  <User size={18} color="#ec4899" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Gender</AppText>
                  <AppText weight="bold" style={styles.infoValue}>{viewStudent?.gender || '—'}</AppText>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#fff7ed' }]}>
                  <Calendar size={18} color="#f97316" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Date of Birth</AppText>
                  <AppText weight="bold" style={styles.infoValue}>{viewStudent?.date_of_birth || '—'}</AppText>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Search size={18} color="#10b981" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Blood Group</AppText>
                  <AppText weight="bold" style={styles.infoValue}>{viewStudent?.blood_group || '—'}</AppText>
                </View>
              </View>
            </View>
          </View>

          {/* Parents Info */}
          <AppText weight="bold" style={styles.sectionTitle}>Parent / Guardian Details</AppText>
          <View style={styles.parentCard}>
            <View style={styles.parentItem}>
              <View style={styles.parentHeader}>
                <AppText weight="bold" style={styles.parentRole}>Father / Guardian</AppText>
                <TouchableOpacity style={styles.callBtn}>
                  <Phone size={16} color="#001F3F" />
                </TouchableOpacity>
              </View>
              <AppText weight="bold" style={styles.parentName}>{viewStudent?.father_guardian_name || '—'}</AppText>
              <AppText weight="semiBold" style={styles.parentPhone}>{viewStudent?.father_guardian_mobile || '—'}</AppText>
            </View>

            <View style={styles.parentDivider} />

            <View style={styles.parentItem}>
              <View style={styles.parentHeader}>
                <AppText weight="bold" style={styles.parentRole}>Mother / Guardian</AppText>
                <TouchableOpacity style={styles.callBtn}>
                  <Phone size={16} color="#001F3F" />
                </TouchableOpacity>
              </View>
              <AppText weight="bold" style={styles.parentName}>{viewStudent?.mother_guardian_name || '—'}</AppText>
              <AppText weight="semiBold" style={styles.parentPhone}>{viewStudent?.mother_guardian_mobile || '—'}</AppText>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          <AppButton
            title="Done"
            onPress={() => setViewStudent(null)}
            style={styles.doneBtn}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: HM_THEME.navy,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  filterBtn: {
    padding: 5,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    marginLeft: 5,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 100,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  filterTitle: {
    fontSize: 16,
    color: HM_THEME.navy,
  },
  chipScroll: {
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: HM_THEME.navy,
    borderColor: HM_THEME.navy,
  },
  chipText: {
    fontSize: 14,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sectionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 15,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 12,
  },
  sectionChips: {
    flexDirection: 'row',
    gap: 8,
  },
  secChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secChipActive: {
    backgroundColor: HM_THEME.navy,
    borderColor: HM_THEME.navy,
  },
  secChipText: {
    fontSize: 14,
    color: '#64748B',
  },
  secChipTextActive: {
    color: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 18,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  listCount: {
    fontSize: 13,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  listContainer: {
    gap: 12,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatarContainer: {
    marginRight: 15,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studentAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  studentDetails: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 15,
    color: '#1E293B',
  },
  studentClass: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#1E293B',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: HM_THEME.navy,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: HM_THEME.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  modalClose: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  modalBody: {
    padding: 20,
  },
  modalProfileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalAvatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  modalLargeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 30,
  },
  modalLargePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLargeAvatarText: {
    fontSize: 32,
    color: HM_THEME.navy,
  },
  modalStatusBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  modalStatusText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  modalName: {
    fontSize: 22,
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 30,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
    marginLeft: 4,
  },
  parentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
  },
  parentItem: {
    paddingVertical: 10,
  },
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parentRole: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentName: {
    fontSize: 16,
    color: '#1E293B',
  },
  parentPhone: {
    fontSize: 14,
    color: HM_THEME.navy,
    marginTop: 4,
  },
  parentDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 15,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doneBtn: {
    backgroundColor: HM_THEME.navy,
    height: 56,
    borderRadius: 16,
  },
});