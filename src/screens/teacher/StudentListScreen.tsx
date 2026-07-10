import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
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
import ScreenSkeleton from '../../components/common/ScreenSkeleton';
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
import BloodGroupPicker from '../../components/common/BloodGroupPicker';
import { isValidBloodGroup } from '../../utils/studentRegistrationValidation';
import type { RootStackParamList } from '../../navigation/types';
import BottomSheetModal from '../../components/common/BottomSheetModal';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { studentListStyles as styles } from '../../components/teacher/studentList/studentListStyles';


import {
  StudentListCard,
  getSchoolCode,
  getBranchId,
  getEmployeeId,
  getStudentPhotoUri,
  initials,
  type Student,
  type AssignedClass,
  StudentDetailSheet,
} from '../../components/teacher/studentList';


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
          setIsClassTeacher(classTeacherStr === 'true' || classTeacherStr === '1');
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

    const bloodGroup = String(editStudent.blood_group || '').trim();
    if (bloodGroup && !isValidBloodGroup(bloodGroup)) {
      Alert.alert('Invalid Blood Group', 'Select a valid blood group from the list.');
      return;
    }

    const payload = {
      student_id: viewStudent.student_id,
      student_full_name: String(editStudent.student_full_name || '').trim(),
      gender: String(editStudent.gender || '').trim(),
      date_of_birth: String(editStudent.date_of_birth || '').trim(),
      blood_group: bloodGroup,
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


      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.contentContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <StandardPageHeader
          title="Student List"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipScroll]}>
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
          <ScreenSkeleton variant="list" />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#CBD5E1" />
            <AppText weight="bold" style={styles.emptyTitle}>No Students Found</AppText>
            <AppText style={styles.emptySub}>We couldn't find any students for the selected criteria.</AppText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((student, index) => (
              <StudentListCard key={student.student_id || `${student.roll_number}-${index}`} student={student} onView={setViewStudent} />
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {/* FAB - Add Student (If allowed) */}
      {false && isClassTeacher && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('TeacherStudentRegistration' as any)}
        >
          <UserPlus size={24} color={Theme.colors.card} />
        </TouchableOpacity>
      )}

      <StudentDetailSheet
        student={viewStudent}
        isEditing={isEditingStudent}
        editStudent={editStudent}
        saving={savingStudent}
        isClassTeacher={isClassTeacher}
        onClose={() => setViewStudent(null)}
        onToggleEdit={() => setIsEditingStudent(prev => !prev)}
        onEditChange={patch => setEditStudent(prev => ({ ...prev, ...patch }))}
        onSave={handleSaveStudent}
      />
    </View>
  );
}
