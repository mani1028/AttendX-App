import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import API from '../../services/api';
import { Theme } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  viewAttendanceStyles as styles,
  getSchoolCode,
  getBranchId,
  getEmployeeId,
  AttendanceSelectionCard,
  AttendanceSummaryTiles,
  AttendanceListActions,
  AttendanceStudentList,
  ExportAttendanceModal,
  AttendanceImageModal,
  ClassSectionPickerModal,
  type Student,
  type ClassItem,
  type PickerMode,
} from '../../components/teacher/viewAttendance';

export default function ViewAttendanceScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TeacherViewAttendance'>>();
  const routeParams = route.params;
  const today = new Date().toISOString().split('T')[0];
  const { setTabBarVisible } = useAuth();
  const autoLoadedRef = useRef(false);
  const [activeTab] = useState<'attendance' | 'overview'>('attendance');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');

  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [selClass, setSelClass] = useState<string>('');
  const [selSection, setSelSection] = useState<string>('');
  const [selSectionOptions, setSelSectionOptions] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);

  const [viewDate, setViewDate] = useState<string>(today);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [totalDays, setTotalDays] = useState<number>(1);

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const [showTeacherImage, setShowTeacherImage] = useState<boolean>(false);
  const [teacherImages, setTeacherImages] = useState<string[]>([]);
  const [showStudentImages, setShowStudentImages] = useState<boolean>(false);
  const [studentImages, setStudentImages] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      setSchoolCode(code);
      setBranchId(bid);
      setEmployeeId(eid);
      if (code && bid) { loadClasses(code, bid); }
    };
    load();
  }, []);

  const loadClasses = async (code: string, bid: string) => {
    setLoadingClasses(true);
    try {
      const res = await API.get('/director/classes', {
        headers: { 'X-School-Code': code, 'X-Branch-Id': bid },
      });
      const items = res.data?.items;
      const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
      setClassItems(safeItems);
      const uniqueClasses: string[] = Array.from(new Set<string>(safeItems.map((i: ClassItem) => String(i.class_grade || ''))));
      setClassOptions(uniqueClasses.filter(Boolean));
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleClassChange = (value: string) => {
    setSelClass(value);
    setSelSection('');
    if (!value) {
      setSelSectionOptions([]);
      return;
    }
    const safeItems = Array.isArray(classItems) ? classItems : [];
    const sections = [...new Set(safeItems.filter(i => i && i.class_grade === value).map(i => i.section))];
    setSelSectionOptions(sections.filter(Boolean));
  };

  const fetchOneDay = async (cls: string, sec: string, dt: string) => {
    const res = await API.post('/manage/attendance/student/fetch-report', {
      school_code: schoolCode,
      branch_id: branchId,
      attendance_date: dt,
      class_grade: cls.toLowerCase(),
      section: sec.toLowerCase(),
    });
    const data = res.data;
    const norm = (arr: any[]) => (Array.isArray(arr) ? arr : []).filter(Boolean).map(s => ({
      id: String(s.student_id || s.id || ''),
      name: s.student_full_name || s.name || s.student_name || '—',
      roll: String(s.roll_number || s.roll || s.roll_no || '—'),
    }));
    const present = norm(data?.present);
    const absent = norm(data?.absent);
    return {
      presentIds: new Set(present.map(s => s.id)),
      allStudents: [...present, ...absent],
    };
  };

  const handleView = async (classOverride?: string, sectionOverride?: string, dateOverride?: string) => {
    const cls = classOverride ?? selClass;
    const sec = sectionOverride ?? selSection;
    const dt = dateOverride ?? viewDate;

    if (!cls || !sec) {
      Alert.alert('Required', 'Please select class and section');
      return;
    }
    if (!dt) {
      Alert.alert('Required', 'Please select a date');
      return;
    }

    setLoading(true);
    setStudents(null);
    const studentMap = new Map<string, Student>();

    try {
      const { presentIds, allStudents } = await fetchOneDay(cls, sec, dt);

      if (Array.isArray(allStudents)) {
        allStudents.forEach(s => {
          if (s && s.id && !studentMap.has(s.id)) {
            studentMap.set(s.id, { id: s.id, name: s.name, roll: s.roll, presentDays: 0 });
          }
        });
      }

      if (presentIds instanceof Set) {
        presentIds.forEach(id => {
          if (id && studentMap.has(id)) {
            const student = studentMap.get(id)!;
            student.presentDays++;
          }
        });
      }

      const sorted = [...studentMap.values()].sort((a, b) => {
        const ra = Number(a.roll) || 0;
        const rb = Number(b.roll) || 0;
        return ra === rb ? a.name.localeCompare(b.name) : ra - rb;
      });

      setStudents(sorted);
      setTotalDays(1);

      if (sorted.length === 0) {
        Alert.alert('No Data', 'No attendance records found for this date');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialClass = routeParams?.class_grade?.trim();
    const initialSection = routeParams?.section?.trim();
    if (!initialClass) { return; }

    setSelClass(initialClass);
    if (initialSection) {
      setSelSection(initialSection);
      setSelSectionOptions(prev => (prev.length ? prev : [initialSection]));
    }
    if (routeParams?.date) {
      setViewDate(routeParams.date);
    }
  }, [routeParams?.class_grade, routeParams?.section, routeParams?.date]);

  useEffect(() => {
    const initialClass = routeParams?.class_grade?.trim();
    const initialSection = routeParams?.section?.trim();
    if (!initialClass || !initialSection || !schoolCode || !branchId) { return; }
    if (autoLoadedRef.current) { return; }

    autoLoadedRef.current = true;
    handleView(initialClass, initialSection, routeParams?.date || today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams?.class_grade, routeParams?.section, routeParams?.date, schoolCode, branchId, today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selClass && selSection && viewDate) {
      await handleView();
    }
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selClass, selSection, viewDate]);

  const handleExport = async (format: 'excel' | 'csv') => {
    setExporting(true);
    try {
      const response = await API.post('/director/students/export', {
        school_code: schoolCode,
        branch_id: branchId,
        class_grade: selClass,
        section: selSection,
        start_date: viewDate,
        end_date: viewDate,
        file_format: format,
      }, { responseType: 'blob' });

      const fileUri = `${RNFS.DocumentDirectoryPath}/attendance_${selClass}_${selSection}_${viewDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(response.data);
      });

      await RNFS.writeFile(fileUri, base64, 'base64');
      await RNShare.open({
        url: `file://${fileUri}`,
        type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
        title: 'Share Attendance Report',
      });
      setShowExportModal(false);
    } catch {
      Alert.alert('Error', 'Failed to export attendance');
    } finally {
      setExporting(false);
    }
  };

  const loadTeacherImage = async () => {
    if (!employeeId) {
      Alert.alert('Error', 'Employee ID not found');
      return;
    }
    setTeacherImages([]);
    setShowTeacherImage(true);
    try {
      const response = await API.get('/manage/attendance/teacher/images', {
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          employee_id: employeeId,
          attendance_date: viewDate,
        },
      });
      const images = response.data?.images;
      if (!Array.isArray(images) || images.length === 0) {
        Alert.alert('No Image', `No teacher verification image found for ${viewDate}`);
      } else {
        const imageUrls = images.filter(Boolean).map((img: any) => {
          const path = img.path || img.filename || (typeof img === 'string' ? img : '');
          return path ? API.getUri() + `/media/${path}` : null;
        }).filter(Boolean) as string[];
        setTeacherImages(imageUrls);
      }
    } catch {
      Alert.alert('Error', 'Failed to load teacher image');
    }
  };

  const loadStudentImages = async () => {
    if (!selClass || !selSection) {
      Alert.alert('Required', 'Please select class and section');
      return;
    }
    setStudentImages([]);
    setShowStudentImages(true);
    try {
      const response = await API.get('/manage/attendance/student/attendance-images', {
        params: {
          school_code: schoolCode,
          branch_id: branchId,
          class_grade: selClass,
          section: selSection,
          attendance_date: viewDate,
        },
      });
      const images = response.data?.images;
      if (!Array.isArray(images) || images.length === 0) {
        Alert.alert('No Images', `No student images found for ${viewDate}`);
      } else {
        const imageUrls = images.filter(Boolean).map((img: any) => {
          const path = typeof img === 'string' ? img : (img.path || '');
          return path ? API.getUri() + `/media/${path}` : null;
        }).filter(Boolean) as string[];
        setStudentImages(imageUrls);
      }
    } catch {
      Alert.alert('Error', 'Failed to load student images');
    }
  };

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const handleScroll = useScrollTabBar();

  const totalStudents = Array.isArray(students) ? students.length : 0;
  const totalPresent = Array.isArray(students) ? students.reduce((sum, s) => sum + (s?.presentDays || 0), 0) : 0;
  const totalAbsent = totalStudents * totalDays - totalPresent;
  const overallPct = totalStudents > 0 && totalDays > 0
    ? Math.round((totalPresent / (totalStudents * totalDays)) * 100)
    : 0;

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
          title="View Attendance"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
          {activeTab === 'attendance' ? (
            <>
              <AttendanceSelectionCard
                selClass={selClass}
                selSection={selSection}
                selSectionOptions={selSectionOptions}
                loadingClasses={loadingClasses}
                viewDate={viewDate}
                showDatePicker={showDatePicker}
                loading={loading}
                onOpenClassPicker={() => setPickerMode('class')}
                onOpenSectionPicker={() => setPickerMode('section')}
                onViewDateChange={setViewDate}
                onShowDatePicker={setShowDatePicker}
                onSearch={() => handleView()}
              />

              {students && (
                <AttendanceSummaryTiles
                  totalPresent={totalPresent}
                  totalAbsent={totalAbsent}
                  overallPct={overallPct}
                />
              )}

              {students && students.length > 0 && (
                <AttendanceListActions
                  onTeacherPhoto={loadTeacherImage}
                  onStudentPhotos={loadStudentImages}
                  onExport={() => setShowExportModal(true)}
                />
              )}

              <AttendanceStudentList loading={loading} students={students} />
            </>
          ) : (
            <View style={styles.overviewContainer}>
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <ClassSectionPickerModal
        pickerMode={pickerMode}
        classOptions={classOptions}
        selSectionOptions={selSectionOptions}
        selClass={selClass}
        selSection={selSection}
        onClose={() => setPickerMode(null)}
        onSelectClass={handleClassChange}
        onSelectSection={setSelSection}
      />

      <ExportAttendanceModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        selClass={selClass}
        selSection={selSection}
        onExport={handleExport}
        exporting={exporting}
      />

      <AttendanceImageModal
        visible={showTeacherImage}
        images={teacherImages}
        title="Teacher Verification"
        onClose={() => setShowTeacherImage(false)}
      />

      <AttendanceImageModal
        visible={showStudentImages}
        images={studentImages}
        title="Student Attendance Images"
        onClose={() => setShowStudentImages(false)}
      />
    </View>
  );
}
