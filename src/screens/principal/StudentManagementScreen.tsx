import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary, type CameraOptions, type ImageLibraryOptions } from 'react-native-image-picker';
import { Plus, RefreshCw, Users } from 'lucide-react-native';
import * as RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import API, { buildApiUrl } from '../../services/api';
import { getPrincipalStudentProfile } from '../../services/principalService';
import { useAuth } from '../../context/AuthContext';
import { Theme, C } from '../../theme/tokens';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import AppText from '../../components/common/AppText';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { validateStudentRegistrationStep, buildStudentRegistrationFormData } from '../../utils/studentRegistrationValidation';
import { submitStudentRegistration } from '../../services/teacherService';
import { formatErrorMessage } from '../../utils/helpers';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import {
  AddClassModal,
  StudentDirectoryTab,
  StudentEnrollmentForm,
  StudentProfileSheet,
  INITIAL_FORM,
  STEPS,
  readLS,
  resolveStudentId,
  calcAgeFromDOB,
  PAGE_PAD,
  type ClassItem,
  type FormData,
  type SelectedClass,
  type Student,
} from '../../components/principal/studentManagement';

export default function StudentPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const isCompactScreen = width < 520;
  const columnCount = width < 420 ? 1 : 2;
  const { setTabBarVisible } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'enroll'>('list');
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [cErr, setCErr] = useState('');
  const [selected, setSelected] = useState<SelectedClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sErr, setSErr] = useState('');
  const [sLoading, setSLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState<'dob' | 'doa'>('dob');
  const ITEMS_PER_PAGE = 10;

  const closeViewStudent = () => setViewStudent(null);

  const validateStep = (s: number) => {
    const errors = validateStudentRegistrationStep(s, formData, {
      hasPhoto: Boolean(selectedPhoto),
      requireRollNumber: false,
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
      setServerError('');
    }
  };

  const prevStep = () => {
    setStep(s => s - 1);
    setServerError('');
  };

  const handlePickImage = (type: 'camera' | 'library') => {
    const options: CameraOptions & ImageLibraryOptions = {
      mediaType: 'photo' as const,
      includeBase64: false,
      quality: 0.5 as const,
      maxWidth: 720,
      maxHeight: 720,
    };

    const callback = (res: any) => {
      if (res.didCancel) { return; }
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to capture image');
        return;
      }
      if (res.assets && res.assets[0]) {
        setSelectedPhoto(res.assets[0]);
        setFieldErrors(p => {
          const n = { ...p };
          delete n.photo;
          return n;
        });
      }
    };

    if (type === 'camera') { launchCamera(options, callback); }
    else { launchImageLibrary(options, callback); }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) { return; }

    setLoading(true);
    setServerError('');
    setServerSuccess('');

    try {
      const registrationFormData = buildStudentRegistrationFormData(
        { ...formData, student_full_name: `${formData.first_name} ${formData.last_name}`.trim() },
        {
          schoolCode,
          branchId,
          photoFile: selectedPhoto,
          includeSchoolCode: true,
        },
      );

      await submitStudentRegistration(schoolCode, branchId, registrationFormData);

      setServerSuccess('Student registered successfully!');
      setTimeout(() => {
        setServerSuccess('');
        setStep(0);
        setFormData({ ...INITIAL_FORM });
        setSelectedPhoto(null);
        setActiveTab('list');
        loadStudents(formData.class_grade, formData.section);
      }, 2000);
    } catch (err: any) {
      setServerError(
        formatErrorMessage(err?.response?.data?.detail)
        || err?.message
        || 'Registration failed. Please check the form and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      if (dateType === 'dob') {
        setFormData(p => ({ ...p, date_of_birth: dateStr, age: calcAgeFromDOB(dateStr) }));
        setFieldErrors(p => {
          const n = { ...p };
          delete n.date_of_birth;
          return n;
        });
      } else {
        setFormData(p => ({ ...p, date_of_admission: dateStr }));
      }
    }
  };

  const handleEnrollmentNextOrSubmit = () => {
    if (step === STEPS.length - 1) {
      handleSubmit();
    } else {
      nextStep();
    }
  };

  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = useScrollTabBar();

  useEffect(() => {
    if (schoolCode && branchId) {
      loadClasses();
    }
  }, [schoolCode, branchId]);

  useEffect(() => {
    if (selected?.class_grade && selected?.section) {
      loadStudents(selected.class_grade, selected.section);
    }
    setCurrentPage(1);
  }, [selected?.class_grade, selected?.section, query]);

  const loadCredentials = async () => {
    const code = await readLS('school_code', 'schoolCode', 'school_id', 'schoolId');
    const branch = await readLS('branch_id', 'branchId', 'branch_code', 'branchCode');
    setSchoolCode(code);
    setBranchId(branch);
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  });

  const loadClasses = async () => {
    if (!schoolCode || !branchId) {
      setCErr('Missing credentials — please log in again.');
      return;
    }

    setCErr('');

    try {
      const res = await API.get('/principal/classes', { headers: getHeaders() });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setClasses(items);

      if (!selected && items.length) {
        const f = items[0];
        setSelected({
          class_grade: f.class_grade,
          section: String(f.section || '').trim(),
          label: f.label,
        });
      }
    } catch (err: any) {
      setCErr(err?.response?.data?.detail || 'Unable to load classes.');
    }
  };

  const loadStudents = async (classGrade: string, section: string) => {
    setSLoading(true);
    setSErr('');

    try {
      const res = await API.get('/principal/students', {
        headers: getHeaders(),
        params: {
          class_grade: classGrade,
          section: String(section || '').trim(),
        },
      });
      setStudents(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err: any) {
      setSErr(err?.response?.data?.detail || 'Unable to load students.');
    } finally {
      setSLoading(false);
    }
  };

  const handleAddClass = async (payload: { class_name: string; sections: string[] }) => {
    await API.post('/principal/classes', payload, { headers: getHeaders() });
    await loadClasses();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const refreshPromises = [loadClasses()];
    if (selected?.class_grade && selected?.section) {
      refreshPromises.push(loadStudents(selected.class_grade, selected.section));
    }
    await Promise.all(refreshPromises);
    setRefreshing(false);
  };

  const handleExport = async () => {
    if (!selected?.class_grade || !selected?.section) { return; }

    try {
      const params = new URLSearchParams({
        class_grade: selected.class_grade,
        section: selected.section,
      });

      const response = await fetch(`${buildApiUrl('/principal/students/export')}?${params.toString()}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Download failed');
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Export returned empty file');
      }

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const filename = `students_${String(selected.label).replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

        try {
          await RNFS.writeFile(filePath, base64Data.split(',')[1], 'base64');

          await RNShare.open({
            url: `file://${filePath}`,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            title: 'Export Students',
          });
        } catch (err: any) {
          if (err.message !== 'User did not share') {
            Alert.alert('Error', err.message || 'Failed to share file');
          }
        }
      };
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Download failed');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) { return students; }

    return students.filter((s) =>
      String(s.student_full_name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, query]);

  const summaryStats = useMemo(() => {
    const presentCount = students.filter(s => s.status === 'PRESENT').length;
    const absentCount = students.filter(s => s.status === 'ABSENT').length;
    return {
      total: students.length,
      present: presentCount,
      absent: absentCount,
      visible: filtered.length,
    };
  }, [students, filtered]);

  const gradeOptions = useMemo(
    () => Array.from(new Set(classes.map(c => c.class_grade))).sort().map(g => ({ label: `Class ${g}`, value: g })),
    [classes],
  );

  const sectionOptions = useMemo(
    () => classes
      .filter(c => c.class_grade === selected?.class_grade)
      .map(c => c.section)
      .filter((sec, i, arr) => arr.indexOf(sec) === i)
      .sort()
      .map(sec => ({ label: `Section ${sec}`, value: sec })),
    [classes, selected?.class_grade],
  );

  const handleGradeChange = useCallback((val: string) => {
    if (!val) {
      setSelected(null);
      return;
    }
    const curSec = selected?.section || '';
    const possibleSections = classes.filter(c => c.class_grade === val).map(c => c.section);
    const newSec = possibleSections.includes(curSec) ? curSec : (possibleSections[0] || '');
    const match = classes.find(cl => cl.class_grade === val && cl.section === newSec);
    if (match) {
      setSelected({ class_grade: match.class_grade, section: match.section, label: match.label });
    } else {
      setSelected({ class_grade: val, section: newSec, label: `${val}-${newSec}` });
    }
  }, [classes, selected?.section]);

  const handleSectionChange = useCallback((val: string) => {
    if (!selected?.class_grade || !val) { return; }
    const match = classes.find(cl => cl.class_grade === selected.class_grade && cl.section === val);
    if (match) {
      setSelected({ class_grade: match.class_grade, section: match.section, label: match.label });
    } else {
      setSelected({ class_grade: selected.class_grade, section: val, label: `${selected.class_grade}-${val}` });
    }
  }, [classes, selected?.class_grade]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const visibleStart = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  const openAttendance = (student: Student) => {
    const studentId = resolveStudentId(student);
    if (!studentId) {
      Alert.alert('Missing student ID', 'This student record has no ID for attendance lookup.');
      return;
    }
    (navigation as any).navigate('PrincipalStudentAttendanceReport', {
      studentId,
      studentName: student.student_full_name,
      rollNumber: student.roll_number || studentId,
      classGrade: selected?.class_grade,
      section: selected?.section,
    });
  };

  const openViewStudent = useCallback(async (student: Student) => {
    setViewStudent(student);
    try {
      const profile = await API.get('/principal/students', {
        headers: getHeaders(),
        params: {
          class_grade: selected?.class_grade,
          section: selected?.section,
        },
      }).then((res) => {
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const match = items.find((row: Student) => {
          const rowId = resolveStudentId(row);
          const target = resolveStudentId(student);
          return rowId && target && rowId.toUpperCase() === target.toUpperCase();
        });
        return match || student;
      }).catch(() => student);

      const enriched = await getPrincipalStudentProfile(
        resolveStudentId(profile) || profile.roll_number,
        getHeaders(),
      );

      if (enriched) {
        setViewStudent({
          ...student,
          ...profile,
          student_full_name: enriched.student_full_name || student.student_full_name,
          roll_number: enriched.roll_number || student.roll_number,
          student_id: enriched.student_id || student.student_id,
          parent_name: enriched.parent_name || enriched.father_guardian_name || student.parent_name,
          phone: enriched.phone || enriched.father_guardian_mobile || student.phone,
          emergency_contact: enriched.emergency_contact || enriched.emergency_contact_number || student.emergency_contact,
          email: enriched.email || enriched.parent_guardian_email || student.email,
          dob: enriched.dob || enriched.date_of_birth || student.dob,
          gender: enriched.gender || student.gender,
          address: enriched.address || student.address,
        });
      } else {
        setViewStudent({ ...student, ...profile });
      }
    } catch {
      setViewStudent(student);
    }
  }, [getHeaders, selected?.class_grade, selected?.section]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          scrollWithContent
          title="Student Management"
          subtitle="Student directory and registration"
          onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          containerStyle={styles.headerBleed}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={handleRefresh}
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

        <View style={innerPageLayoutStyles.scrollBody}>
          <View style={[innerPageLayoutStyles.segmentedControl, styles.tabSwitcher]}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[innerPageLayoutStyles.segmentedTab, activeTab === 'list' && innerPageLayoutStyles.segmentedTabActive]}
              onPress={() => setActiveTab('list')}
            >
              <Users size={16} color={segmentedControlIconColor(activeTab === 'list')} />
              <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'list' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
                Student Directory
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[innerPageLayoutStyles.segmentedTab, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabActive]}
              onPress={() => setActiveTab('enroll')}
            >
              <Plus size={16} color={segmentedControlIconColor(activeTab === 'enroll')} />
              <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
                Student Register
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {activeTab === 'list' ? (
              <StudentDirectoryTab
                isCompactScreen={isCompactScreen}
                classes={classes}
                selected={selected}
                students={students}
                summaryStats={summaryStats}
                query={query}
                onQueryChange={setQuery}
                sLoading={sLoading}
                sErr={sErr}
                cErr={cErr}
                paginated={paginated}
                filteredCount={filtered.length}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                currentPage={currentPage}
                totalPages={totalPages}
                onRefresh={handleRefresh}
                onExport={handleExport}
                onAddClass={() => setShowAddModal(true)}
                onOpenGradePicker={() => setShowGradePicker(true)}
                onOpenSectionPicker={() => setShowSectionPicker(true)}
                onViewProfile={openViewStudent}
                onOpenAttendance={openAttendance}
                onPageChange={setCurrentPage}
                onReloadStudents={() => selected && loadStudents(selected.class_grade, selected.section)}
              />
            ) : (
              <StudentEnrollmentForm
                step={step}
                formData={formData}
                fieldErrors={fieldErrors}
                loading={loading}
                serverError={serverError}
                serverSuccess={serverSuccess}
                classes={classes}
                selectedPhoto={selectedPhoto}
                showDatePicker={showDatePicker}
                dateType={dateType}
                onFormDataChange={setFormData}
                onFieldErrorsChange={setFieldErrors}
                onSelectedPhotoChange={setSelectedPhoto}
                onShowDatePickerChange={setShowDatePicker}
                onDateTypeChange={setDateType}
                onPrevStep={prevStep}
                onNextOrSubmit={handleEnrollmentNextOrSubmit}
                onPickImage={handlePickImage}
                onDateChange={handleDateChange}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <CustomPickerModal
        visible={showGradePicker}
        title="Select Class"
        options={gradeOptions}
        selectedValue={selected?.class_grade || ''}
        onValueChange={handleGradeChange}
        onClose={() => setShowGradePicker(false)}
      />
      <CustomPickerModal
        visible={showSectionPicker}
        title="Select Section"
        options={sectionOptions}
        selectedValue={selected?.section || ''}
        onValueChange={handleSectionChange}
        onClose={() => setShowSectionPicker(false)}
      />

      <AddClassModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddClass}
        existingClasses={classes}
      />

      <StudentProfileSheet
        student={viewStudent}
        selectedClass={selected}
        columnCount={columnCount}
        windowHeight={windowHeight}
        bottomInset={insets.bottom}
        onClose={closeViewStudent}
        onOpenAttendance={openAttendance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAGE_PAD,
    paddingBottom: 100,
  },
  headerBleed: {
    marginHorizontal: -PAGE_PAD,
    marginBottom: Theme.spacing.md,
  },
  tabSwitcher: {
    marginBottom: Theme.spacing.sm,
  },
  content: {
    paddingTop: Theme.spacing.xs,
  },
});
