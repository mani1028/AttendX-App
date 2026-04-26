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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Search,
  Users,
  User,
  GraduationCap,
  Calendar,
  Droplets,
  Phone,
  Briefcase,
  X,
  BookOpen,
  LayoutGrid,
  Info,
  ChevronRight,
  Filter
} from 'lucide-react-native';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { teacherService } from '../../services/teacherService';
import { useAuth } from '../../context/AuthContext';

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

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status?.toUpperCase() === 'ACTIVE';
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
      <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || 'INACTIVE'}
      </Text>
    </View>
  );
};

// Student Card Component
const StudentCard: React.FC<{
  student: Student;
  onView: (student: Student) => void;
}> = ({ student, onView }) => (
  <TouchableOpacity activeOpacity={0.7} onPress={() => onView(student)}>
    <AppCard style={styles.studentCard}>
      <View style={styles.cardHeader}>
        {student.student_photograph ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${student.student_photograph}` }}
            style={styles.studentAvatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials(student.student_full_name)}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.studentName} numberOfLines={1}>{student.student_full_name || '-'}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.rollTag}>
              <Text style={styles.rollTagText}>#{student.roll_number || '-'}</Text>
            </View>
            <StatusBadge status={student.student_status} />
          </View>
        </View>
        <ChevronRight size={20} color="#cbd5e1" />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardDetailsRow}>
        <View style={styles.miniDetail}>
          <Text style={styles.miniLabel}>Gender</Text>
          <Text style={styles.miniValue}>{student.gender || '-'}</Text>
        </View>
        <View style={styles.miniDetail}>
          <Text style={styles.miniLabel}>Class</Text>
          <Text style={styles.miniValue}>{student.class_grade}-{student.section}</Text>
        </View>
        <View style={styles.miniDetail}>
          <Text style={styles.miniLabel}>ID</Text>
          <Text style={styles.miniValue}>{student.student_id}</Text>
        </View>
      </View>
    </AppCard>
  </TouchableOpacity>
);

// Detail Groups for Modal
const DETAIL_GROUPS = [
  { label: 'Personal Info', icon: <User size={16} color="#001F3F" />, keys: ['student_full_name', 'gender', 'date_of_birth', 'blood_group'] },
  { label: 'Academic', icon: <GraduationCap size={16} color="#001F3F" />, keys: ['class_grade', 'section', 'roll_number', 'admission_number'] },
  { label: 'Father / Guardian', icon: <User size={16} color="#001F3F" />, keys: ['father_guardian_name', 'father_guardian_mobile', 'father_guardian_occupation'] },
  { label: 'Mother / Guardian', icon: <User size={16} color="#001F3F" />, keys: ['mother_guardian_name', 'mother_guardian_mobile', 'mother_guardian_occupation'] },
];

export default function StudentListScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const lastScrollY = useRef(0);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [records, setRecords] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rollSearch, setRollSearch] = useState<string>('');
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 15;

  // Load credentials and cached data
  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const eid = await getEmployeeId();

        if (!isMounted.current) return;

        setSchoolCode(code);
        setBranchId(bid);
        setEmployeeId(eid);

        // Load cache
        const cacheKey = `teacher_students_cache_${code}_${bid}_${eid}`;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (!isMounted.current) return;

        if (cached) {
          const { classes, students, lastClass, lastSection } = JSON.parse(cached);
          if (classes) setAssignedClasses(classes);
          if (students) setRecords(students);
          if (lastClass) setSelectedClass(lastClass);
          if (lastSection) setSelectedSection(lastSection);
        }
      } catch (e) {
        console.log('Failed to load teacher students cache');
      }
    };
    load();

    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);

  // Load assigned classes for teacher
  const loadAssignedClasses = async () => {
    if (!schoolCode || !branchId || !employeeId) return;
    
    try {
      const assigned = await teacherService.getAssignedClasses(schoolCode, branchId, employeeId);

      if (!isMounted.current) return;

      setAssignedClasses(assigned);
      
      if (assigned.length > 0 && !selectedClass) {
        setSelectedClass(assigned[0].class_grade);
        setSelectedSection(assigned[0].section);
      }

      const cacheKey = `teacher_students_cache_${schoolCode}_${branchId}_${employeeId}`;
      const existing = await AsyncStorage.getItem(cacheKey);
      const data = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ ...data, classes: assigned }));

    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Failed to load assigned classes:', error);
      }
    }
  };

  // Load students for selected class/section
  const fetchStudents = async (showLoading = true) => {
    if (!schoolCode || !branchId) return;
    if (!selectedClass || !selectedSection) return;
    
    if (showLoading) setLoading(true);
    try {
      const students = await teacherService.getStudentsByClass(
        schoolCode,
        branchId,
        selectedClass,
        selectedSection,
      );

      if (!isMounted.current) return;

      setRecords(students);
      setCurrentPage(1);

      const cacheKey = `teacher_students_cache_${schoolCode}_${branchId}_${employeeId}`;
      const existing = await AsyncStorage.getItem(cacheKey);
      const data = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        ...data,
        students,
        lastClass: selectedClass,
        lastSection: selectedSection
      }));
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Failed to fetch students:', error);
      }
    } finally {
      if (isMounted.current) {
        if (showLoading) setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (schoolCode && branchId && employeeId) {
      loadAssignedClasses();
    }
  }, [schoolCode, branchId, employeeId]);

  useEffect(() => {
    if (selectedClass && selectedSection && schoolCode && branchId) {
      fetchStudents(!records.length);
    }
  }, [selectedClass, selectedSection, schoolCode, branchId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAssignedClasses(), fetchStudents()]);
    setRefreshing(false);
  }, [selectedClass, selectedSection]);

  const filtered = useMemo(() => {
    const q = rollSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      String(r.roll_number || '').toLowerCase().includes(q) ||
      String(r.student_full_name || '').toLowerCase().includes(q)
    );
  }, [records, rollSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const classOptions = useMemo(() => {
    const uniqueClasses = new Map();
    assignedClasses.forEach(item => {
      if (!uniqueClasses.has(item.class_grade)) {
        uniqueClasses.set(item.class_grade, item.class_grade);
      }
    });
    return Array.from(uniqueClasses.keys());
  }, [assignedClasses]);

  const sectionOptions = useMemo(() => {
    return assignedClasses
      .filter(item => item.class_grade === selectedClass)
      .map(item => item.section);
  }, [assignedClasses, selectedClass]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Navy Hero Header */}
      <View style={styles.heroHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>My Students</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroGreeting}>Class Roster</Text>
              <Text style={styles.heroSubtext}>
                {filtered.length} students in {selectedClass}-{selectedSection}
              </Text>
            </View>
            <View style={styles.heroIconContainer}>
              <Users size={32} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#001F3F" />}
      >
        {/* Selection Card */}
        <AppCard style={styles.mainCard}>
          <View style={styles.cardHeaderRow}>
            <Filter size={18} color="#001F3F" />
            <Text style={styles.cardTitle}>Class Selection</Text>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Select Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {classOptions.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[styles.filterChip, selectedClass === cls && styles.filterChipActive]}
                    onPress={() => {
                      setSelectedClass(cls);
                      const firstSection = assignedClasses.find(item => item.class_grade === cls)?.section;
                      if (firstSection) setSelectedSection(firstSection);
                    }}
                  >
                    <Text style={[styles.filterChipText, selectedClass === cls && styles.filterChipTextActive]}>
                      Class {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {selectedClass && sectionOptions.length > 0 && (
            <View style={[styles.filterSection, { marginTop: 12 }]}>
              <Text style={styles.filterLabel}>Select Section</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {sectionOptions.map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[styles.filterChip, selectedSection === sec && styles.filterChipActive]}
                      onPress={() => setSelectedSection(sec)}
                    >
                      <Text style={[styles.filterChipText, selectedSection === sec && styles.filterChipTextActive]}>
                        Section {sec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </AppCard>

        {/* Search Card */}
        {selectedClass && selectedSection && (
          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or roll number..."
                placeholderTextColor="#94a3b8"
                value={rollSearch}
                onChangeText={setRollSearch}
              />
              {rollSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRollSearch('')} style={styles.clearBtn}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Student List */}
        {!selectedClass || !selectedSection ? (
          <View style={styles.emptyContainer}>
            <BookOpen size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No class selected</Text>
            <Text style={styles.emptyText}>Please select a class and section to view students</Text>
          </View>
        ) : loading ? (
          <View style={{ marginTop: 40 }}><Loader /></View>
        ) : paginated.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptyText}>We couldn't find any students matching your criteria</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listHeading}>Student Roster</Text>
            {paginated.map((student) => (
              <StudentCard
                key={student.student_id}
                student={student}
                onView={setViewStudent}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={20} color={currentPage === 1 ? '#cbd5e1' : '#001F3F'} />
                </TouchableOpacity>

                <View style={styles.pageIndicator}>
                  <Text style={styles.pageText}>Page {currentPage} of {totalPages}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={20} color={currentPage === totalPages ? '#cbd5e1' : '#001F3F'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Footer Info */}
        <View style={styles.footerBranding}>
          <Text style={styles.brandingText}>AttendX Teacher Portal</Text>
          <Text style={styles.schoolInfoText}>School: {schoolCode || '—'}</Text>
        </View>
      </ScrollView>

      {/* Student Detail Modal */}
      <Modal visible={!!viewStudent} transparent animationType="slide" onRequestClose={() => setViewStudent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTop}>
                <View style={styles.modalHandle} />
                <TouchableOpacity onPress={() => setViewStudent(null)} style={styles.modalCloseBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalProfile}>
                {viewStudent?.student_photograph ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${viewStudent.student_photograph}` }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarText}>{initials(viewStudent?.student_full_name || '')}</Text>
                  </View>
                )}
                <View style={styles.modalProfileInfo}>
                  <Text style={styles.modalStudentName}>{viewStudent?.student_full_name}</Text>
                  <View style={styles.modalProfileMeta}>
                    <View style={styles.rollTag}>
                      <Text style={styles.rollTagText}>Roll #{viewStudent?.roll_number}</Text>
                    </View>
                    <StatusBadge status={viewStudent?.student_status || ''} />
                  </View>
                </View>
              </View>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {DETAIL_GROUPS.map((group) => {
                const entries: Array<[string, unknown]> = group.keys
                  .filter(k => viewStudent?.[k as keyof Student] !== undefined && viewStudent?.[k as keyof Student] !== '')
                  .map(k => [k, viewStudent?.[k as keyof Student]] as [string, unknown]);

                if (entries.length === 0) return null;

                return (
                  <View key={group.label} style={styles.detailGroup}>
                    <View style={styles.groupHeader}>
                      {group.icon}
                      <Text style={styles.groupTitle}>{group.label}</Text>
                    </View>
                    <View style={styles.gridContainer}>
                      {entries.map(([k, v]) => (
                        <View key={k} style={styles.gridItem}>
                          <Text style={styles.gridLabel}>{fmt(k)}</Text>
                          <Text style={styles.gridValue}>{String(v ?? '—')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton title="Close Profile" onPress={() => setViewStudent(null)} style={styles.closeModalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    backgroundColor: '#001F3F',
    height: 200,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroContent: {
    marginTop: 25,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mainCard: {
    marginTop: -30,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  searchWrapper: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  listContainer: {
    gap: 12,
  },
  listHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    marginLeft: 4,
  },
  studentCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  studentAvatar: {
    width: 54,
    height: 54,
    borderRadius: 15,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rollTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rollTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#001F3F',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniDetail: {
    gap: 2,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextActive: {
    color: '#166534',
  },
  statusTextInactive: {
    color: '#991B1B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  pageBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  pageIndicator: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerBranding: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 20,
    gap: 4,
  },
  brandingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#001F3F',
    opacity: 0.5,
  },
  schoolInfoText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
  },
  modalHeader: {
    padding: 24,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 0,
    top: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 25,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  modalProfileInfo: {
    flex: 1,
    gap: 8,
  },
  modalStudentName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalProfileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalBody: {
    padding: 24,
  },
  detailGroup: {
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#001F3F',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '47%',
    gap: 4,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  closeModalBtn: {
    backgroundColor: '#001F3F',
    borderRadius: 15,
    height: 56,
  },
});