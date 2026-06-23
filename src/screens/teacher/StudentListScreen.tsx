import { useScrollTabBar } from '../../hooks/useScrollTabBar';
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
  UserPlus,
} from 'lucide-react-native';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import * as teacherService from '../../services/teacherService';
import { updateStudentProfile } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import type { RootStackParamList } from '../../navigation/types';
import BottomSheetModal from '../../components/common/BottomSheetModal';
import StandardPageHeader from '../../components/layout/StandardPageHeader';

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
  if (!photo) {return null;}

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
  if (!name) {return '?';}
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
          <AppText weight="bold" style={[styles.statusBadgeText, { color: isActive ? '#22c55e' : Theme.colors.error }]}>
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
  const { setTabBarVisible, isClassTeacher: authIsClassTeacher } = useAuth();
  const isMounted = useRef(true);
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
  const [lockedClassGrade, setLockedClassGrade] = useState<string>('');
  const [lockedSection, setLockedSection] = useState<string>('');
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editStudent, setEditStudent] = useState<Partial<Student>>({});
  const [savingStudent, setSavingStudent] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(authIsClassTeacher);

  // Load credentials
  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      const classTeacherStr = await AsyncStorage.getItem('is_class_teacher');

      if (isMounted.current) {
        setSchoolCode(code);
        setBranchId(bid);
        setEmployeeId(eid);
        if (classTeacherStr !== null) {
          setIsClassTeacher(classTeacherStr === 'true');
        }
      }

      if (classTeacherStr === 'true' || classTeacherStr === '1' || authIsClassTeacher) {
        try {
          const profile = await teacherService.getTeacherProfile();
          if (isMounted.current) {
            const profileClassGrade = String(profile?.class_grade || profile?.className || '').trim();
            const profileSection = String(profile?.section || profile?.section_name || '').trim();
            if (profileClassGrade && profileSection) {
              setLockedClassGrade(profileClassGrade);
              setLockedSection(profileSection);
              setSelectedClass(profileClassGrade);
              setSelectedSection(profileSection);
            }
          }
        } catch (profileError) {
          if (__DEV__) {
            console.log('[StudentListScreen] Failed to load teacher profile scope:', profileError);
          }
        }
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
    if (!schoolCode || !branchId || !employeeId) {return;}
    try {
      const assigned = await teacherService.getAssignedClasses(schoolCode, branchId, employeeId);
      if (__DEV__) {
        console.log('[StudentListScreen] Assigned classes loaded:', assigned);
      }
      if (isMounted.current) {
        const normalized = Array.isArray(assigned) ? assigned.filter(Boolean) : [];
        const scoped = isClassTeacher && lockedClassGrade && lockedSection
          ? normalized.filter(item => String(item.class_grade) === lockedClassGrade && String(item.section) === lockedSection)
          : normalized;

        setAssignedClasses(scoped);
        if (scoped.length > 0) {
          const first = scoped[0];
          const nextClass = String(first.class_grade || '').trim();
          const nextSection = String(first.section || '').trim();
          if (!selectedClass || isClassTeacher) {setSelectedClass(nextClass);}
          if (!selectedSection || isClassTeacher) {setSelectedSection(nextSection);}
          if (__DEV__) {
            console.log('[StudentListScreen] Initial class set to:', nextClass, nextSection);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load assigned classes:', error);
    }
  }, [schoolCode, branchId, employeeId, isClassTeacher, lockedClassGrade, lockedSection, selectedClass, selectedSection]);

  // When credentials become available, load assigned classes
  useEffect(() => {
    if (schoolCode && branchId && employeeId) {
      loadAssignedClasses();
    }
  }, [schoolCode, branchId, employeeId, loadAssignedClasses]);

  useEffect(() => {
    if (viewStudent) {
      setEditStudent({
        student_full_name: viewStudent.student_full_name || '',
        gender: viewStudent.gender || '',
        date_of_birth: viewStudent.date_of_birth || '',
        blood_group: viewStudent.blood_group || '',
        father_guardian_name: viewStudent.father_guardian_name || '',
        father_guardian_mobile: viewStudent.father_guardian_mobile || '',
        mother_guardian_name: viewStudent.mother_guardian_name || '',
        mother_guardian_mobile: viewStudent.mother_guardian_mobile || '',
      });
      setIsEditingStudent(false);
    } else {
      setEditStudent({});
      setIsEditingStudent(false);
    }
  }, [viewStudent]);

  // Load students
  const fetchStudents = useCallback(async (showLoading = true) => {
    if (!schoolCode || !branchId || !selectedClass || !selectedSection) {
      if (__DEV__) {
        console.log('[StudentListScreen] Skipping fetchStudents - missing params:', {
          schoolCode: !!schoolCode,
          branchId: !!branchId,
          selectedClass: selectedClass || '(empty)',
          selectedSection: selectedSection || '(empty)',
        });
      }
      return;
    }
    if (showLoading) {setLoading(true);}
    try {
      if (__DEV__) {
        console.log('[StudentListScreen] Fetching students for:', { schoolCode, branchId, selectedClass, selectedSection });
      }
      const students = await teacherService.getStudentsByClass(
        schoolCode,
        branchId,
        selectedClass,
        selectedSection,
        employeeId
      );
      if (__DEV__) {
        console.log('[StudentListScreen] Students fetched:', students?.length || 0, 'students');
        if (!students || students.length === 0) {
          console.warn('[StudentListScreen] No students returned for class:', selectedClass, 'section:', selectedSection);
        }
      }
      if (isMounted.current) {
        setRecords(students || []);
      }
    } catch (error: any) {
      console.error('[StudentListScreen] Failed to fetch students:', error?.message || error);
      if (isMounted.current) {
        setRecords([]);
      }
    } finally {
      if (isMounted.current) {setLoading(false);}
    }
  }, [schoolCode, branchId, selectedClass, selectedSection]);

  // Ensure we fetch students once assigned classes are available
  useEffect(() => {
    if (!isMounted.current) {return;}
    if (assignedClasses && assignedClasses.length > 0) {
      // If no class/section selected yet, select the first one
      if (!selectedClass || !selectedSection) {
        const first = assignedClasses[0];
        if (first) {
          const nextClass = first.class_grade;
          const nextSection = first.section;
          setSelectedClass(nextClass);
          setSelectedSection(nextSection);
          if (__DEV__) {
            console.log('[StudentListScreen] Setting initial class/section:', nextClass, nextSection);
          }
        }
      }
    }
  }, [assignedClasses]);

  // Fetch students when class/section change
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection, fetchStudents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAssignedClasses(), fetchStudents(false)]);
    } catch (err) {
      if (__DEV__) {
        console.error('[StudentListScreen] Refresh failed:', err);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadAssignedClasses, fetchStudents]);

  const handleSaveStudent = useCallback(async () => {
    if (!viewStudent?.student_id) {return;}

    const payload = {
      student_id: viewStudent.student_id,
      student_full_name: String(editStudent.student_full_name || '').trim(),
      gender: String(editStudent.gender || '').trim(),
      date_of_birth: String(editStudent.date_of_birth || '').trim(),
      blood_group: String(editStudent.blood_group || '').trim(),
      father_guardian_name: String(editStudent.father_guardian_name || '').trim(),
      father_guardian_mobile: String(editStudent.father_guardian_mobile || '').trim(),
      mother_guardian_name: String(editStudent.mother_guardian_name || '').trim(),
      mother_guardian_mobile: String(editStudent.mother_guardian_mobile || '').trim(),
      class_grade: String(viewStudent.class_grade || '').trim(),
      section: String(viewStudent.section || '').trim(),
      data_type: 'student',
    };

    setSavingStudent(true);
    try {
      await updateStudentProfile(payload);
      const updatedStudent: Student = {
        ...viewStudent,
        ...editStudent,
      } as Student;
      setViewStudent(updatedStudent);
      setRecords(prev => prev.map(student => student.student_id === updatedStudent.student_id ? updatedStudent : student));
      setIsEditingStudent(false);
      Alert.alert('Success', 'Student profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Failed to update student profile');
    } finally {
      setSavingStudent(false);
    }
  }, [viewStudent, editStudent]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) {return records;}
    return records.filter(r =>
      r.student_full_name.toLowerCase().includes(q) ||
      r.roll_number.toLowerCase().includes(q) ||
      r.student_id.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  // Debug: log key state values to diagnose empty list rendering
  useEffect(() => {
    if (__DEV__) {
      try {
        console.log('[StudentListScreen.debug] selectedClass:', selectedClass,
          'selectedSection:', selectedSection,
          'records.length:', Array.isArray(records) ? records.length : 0,
          'filtered.length:', Array.isArray(filtered) ? filtered.length : 0,
          'searchQuery:', JSON.stringify(searchQuery)
        );
      } catch (e) {
        console.log('[StudentListScreen.debug] failed to stringify debug values', e);
      }
    }
  }, [selectedClass, selectedSection, records, filtered, searchQuery]);
  const handleScroll = useScrollTabBar();


  const classOptions = useMemo(() => {
    if (isClassTeacher && lockedClassGrade) {return [lockedClassGrade];}
    const unique = new Set(assignedClasses.map(c => c.class_grade));
    return Array.from(unique);
  }, [assignedClasses, isClassTeacher, lockedClassGrade]);

  const sectionOptions = useMemo(() => {
    if (isClassTeacher && lockedSection) {return [lockedSection];}
    return Array.from(new Set(assignedClasses
      .filter(c => c.class_grade === selectedClass)
      .map(c => c.section)));
  }, [assignedClasses, selectedClass, isClassTeacher, lockedSection]);

  return (
    <View style={styles.container}>


      {/* Navy Standard Header */}
      <StandardPageHeader title="Student List" onBackPress={() => navigation.goBack()} />

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
            <Filter size={18} color={Theme.colors.primary} />
            <AppText weight="bold" style={styles.filterTitle}>Filter by Class</AppText>
          </View>
          {isClassTeacher ? (
            <View style={styles.lockedScopeCard}>
              <AppText weight="bold" style={styles.lockedScopeText}>
                Class {selectedClass || lockedClassGrade || '-'} • Section {selectedSection || lockedSection || '-'}
              </AppText>
              <AppText style={styles.lockedScopeHint}>
                Class teachers can view only their assigned class.
              </AppText>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {classOptions.map((cls, index) => (
                  <TouchableOpacity
                    key={`class-${cls || index}`}
                    style={[styles.chip, selectedClass === cls && styles.chipActive]}
                    onPress={() => {
                      setSelectedClass(cls);
                      const firstSec = assignedClasses.find(c => c.class_grade === cls)?.section;
                      if (firstSec) {setSelectedSection(firstSec);}
                    }}
                  >
                    <AppText weight="semibold" style={[styles.chipText, selectedClass === cls && styles.chipTextActive]}>
                      Class {cls}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedClass !== '' && (
                <View style={styles.sectionPicker}>
                  <AppText weight="bold" style={styles.sectionLabel}>Section:</AppText>
                  <View style={styles.sectionChips}>
                    {sectionOptions.map((sec, index) => (
                      <TouchableOpacity
                        key={`section-${sec || index}`}
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
            </>
          )}
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <AppText weight="bold" style={styles.listTitle}>All Students</AppText>
          <AppText weight="semibold" style={styles.listCount}>{filtered.length} Students</AppText>
        </View>

        {/* Student List */}
        {loading ? (
          <ActivityIndicator size="large" color="#6648dc" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#CBD5E1" />
            <AppText weight="bold" style={styles.emptyTitle}>No Students Found</AppText>
            <AppText style={styles.emptySub}>We couldn't find any students for the selected criteria.</AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((student, index) => (
              <StudentCard key={student.student_id || `${student.roll_number}-${index}`} student={student} onView={setViewStudent} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB - Add Student (If allowed) */}
      {false && isClassTeacher && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('DirectorStudentRegistration' as any)}
        >
          <UserPlus size={24} color={Theme.colors.card} />
        </TouchableOpacity>
      )}

      {/* Student Detail Modal */}
      <BottomSheetModal visible={!!viewStudent} onClose={() => setViewStudent(null)} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHandle} />
          <TouchableOpacity onPress={() => setViewStudent(null)} style={styles.modalClose}>
            <X size={24} color={Theme.colors.textSec} />
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
              <View style={[styles.modalStatusBadge, { backgroundColor: viewStudent?.student_status === 'ACTIVE' ? Theme.colors.success : Theme.colors.error }]}>
                <AppText weight="bold" style={styles.modalStatusText}>{viewStudent?.student_status}</AppText>
              </View>
            </View>
            <AppText weight="bold" style={styles.modalName}>{viewStudent?.student_full_name}</AppText>
            <AppText weight="semibold" style={styles.modalSub}>{viewStudent?.student_id} • Roll {viewStudent?.roll_number}</AppText>
          </View>

          <View style={styles.modalActionRow}>
            {isClassTeacher && (
              <AppButton
                title={isEditingStudent ? 'Cancel Edit' : 'Edit Profile'}
                type="secondary"
                onPress={() => setIsEditingStudent(prev => !prev)}
                style={styles.modalActionBtn}
              />
            )}
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
                  {isEditingStudent ? (
                    <TextInput
                      style={styles.editInput}
                      value={String(editStudent.gender || '')}
                      onChangeText={(value) => setEditStudent(prev => ({ ...prev, gender: value }))}
                      placeholder="Gender"
                    />
                  ) : (
                    <AppText weight="bold" style={styles.infoValue}>{viewStudent?.gender || '—'}</AppText>
                  )}
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
                  {isEditingStudent ? (
                    <TextInput
                      style={styles.editInput}
                      value={String(editStudent.date_of_birth || '')}
                      onChangeText={(value) => setEditStudent(prev => ({ ...prev, date_of_birth: value }))}
                      placeholder="YYYY-MM-DD"
                    />
                  ) : (
                    <AppText weight="bold" style={styles.infoValue}>{viewStudent?.date_of_birth || '—'}</AppText>
                  )}
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Search size={18} color={Theme.colors.success} />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Blood Group</AppText>
                  {isEditingStudent ? (
                    <TextInput
                      style={styles.editInput}
                      value={String(editStudent.blood_group || '')}
                      onChangeText={(value) => setEditStudent(prev => ({ ...prev, blood_group: value }))}
                      placeholder="Blood Group"
                    />
                  ) : (
                    <AppText weight="bold" style={styles.infoValue}>{viewStudent?.blood_group || '—'}</AppText>
                  )}
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
                  <Phone size={16} color="#6648dc" />
                </TouchableOpacity>
              </View>
              {isEditingStudent ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.father_guardian_name || '')}
                    onChangeText={(value) => setEditStudent(prev => ({ ...prev, father_guardian_name: value }))}
                    placeholder="Father / Guardian Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.father_guardian_mobile || '')}
                    onChangeText={(value) => setEditStudent(prev => ({ ...prev, father_guardian_mobile: value }))}
                    placeholder="Father / Guardian Mobile"
                    keyboardType="phone-pad"
                  />
                </>
              ) : (
                <>
                  <AppText weight="bold" style={styles.parentName}>{viewStudent?.father_guardian_name || '—'}</AppText>
                  <AppText weight="semibold" style={styles.parentPhone}>{viewStudent?.father_guardian_mobile || '—'}</AppText>
                </>
              )}
            </View>

            <View style={styles.parentDivider} />

            <View style={styles.parentItem}>
              <View style={styles.parentHeader}>
                <AppText weight="bold" style={styles.parentRole}>Mother / Guardian</AppText>
                <TouchableOpacity style={styles.callBtn}>
                  <Phone size={16} color="#6648dc" />
                </TouchableOpacity>
              </View>
              {isEditingStudent ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.mother_guardian_name || '')}
                    onChangeText={(value) => setEditStudent(prev => ({ ...prev, mother_guardian_name: value }))}
                    placeholder="Mother / Guardian Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.mother_guardian_mobile || '')}
                    onChangeText={(value) => setEditStudent(prev => ({ ...prev, mother_guardian_mobile: value }))}
                    placeholder="Mother / Guardian Mobile"
                    keyboardType="phone-pad"
                  />
                </>
              ) : (
                <>
                  <AppText weight="bold" style={styles.parentName}>{viewStudent?.mother_guardian_name || '—'}</AppText>
                  <AppText weight="semibold" style={styles.parentPhone}>{viewStudent?.mother_guardian_mobile || '—'}</AppText>
                </>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          {isEditingStudent ? (
            <AppButton
              title={savingStudent ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveStudent}
              disabled={savingStudent}
              style={styles.doneBtn}
            />
          ) : (
            <AppButton
              title="Done"
              onPress={() => setViewStudent(null)}
              style={styles.doneBtn}
            />
          )}
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingBottom: 30,
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
    paddingBottom: Theme.spacing.md,
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
    color: Theme.colors.card,
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
    backgroundColor: Theme.colors.card,
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
    ...Theme.typography.bodyMd,
    color: '#1E293B',
  },
  filterBtn: {
    padding: 5,
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.background,
    marginLeft: 5,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 100,
  },
  filterCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: Theme.spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  filterTitle: {
    fontSize: 16,
    color: Theme.colors.primary,
  },
  chipScroll: {
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  sectionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingTop: 15,
  },
  sectionLabel: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginRight: 12,
  },
  sectionChips: {
    flexDirection: 'row',
    gap: 8,
  },
  lockedScopeCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  lockedScopeText: {
    ...Theme.typography.body,
    color: Theme.colors.primary,
  },
  lockedScopeHint: {
    marginTop: Theme.spacing.xs,
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  secChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  secChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  secChipText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  secChipTextActive: {
    color: Theme.colors.card,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
  },
  listTitle: {
    fontSize: 18,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  listCount: {
    fontSize: 13,
    color: Theme.colors.textSec,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  listContainer: {
    gap: 12,
  },
  modalActionRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  modalActionBtn: {
    alignSelf: 'flex-start',
  },
  editInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    marginTop: 6,
    color: '#1E293B',
    ...Theme.typography.body,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.md,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Theme.colors.background,
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
    color: Theme.colors.card,
  },
  studentDetails: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    ...Theme.typography.bodyMd,
    color: '#1E293B',
  },
  studentClass: {
    fontSize: 13,
    color: Theme.colors.textMuted,
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
    marginTop: Theme.spacing.md,
  },
  emptySub: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
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
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Theme.colors.primary,
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
    backgroundColor: Theme.colors.card,
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
    backgroundColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLargeAvatarText: {
    fontSize: 32,
    color: Theme.colors.primary,
  },
  modalStatusBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: Theme.colors.card,
  },
  modalStatusText: {
    ...Theme.typography.label,
    color: Theme.colors.card,
  },
  modalName: {
    fontSize: 22,
    color: '#1E293B',
  },
  modalSub: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  infoSection: {
    backgroundColor: Theme.colors.background,
    borderRadius: 30,
    padding: 20,
    marginBottom: Theme.spacing.lg,
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
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    ...Theme.typography.body,
    color: '#1E293B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: Theme.spacing.md,
    marginLeft: Theme.spacing.xs,
  },
  parentCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    padding: 20,
  },
  parentItem: {
    paddingVertical: 10,
  },
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  parentRole: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    textTransform: 'uppercase',
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentName: {
    fontSize: 16,
    color: '#1E293B',
  },
  parentPhone: {
    ...Theme.typography.body,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.xs,
  },
  parentDivider: {
    height: 1,
    backgroundColor: Theme.colors.background,
    marginVertical: 15,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
  },
  doneBtn: {
    backgroundColor: Theme.colors.primary,
    height: 56,
    borderRadius: 16,
  },
});
