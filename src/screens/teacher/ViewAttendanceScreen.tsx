import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Calendar,
  Download,
  Camera,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  Filter,
  LayoutGrid
} from 'lucide-react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import API from '../../services/api';
import { Theme } from '../../theme/theme';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import AppText from '../../components/common/AppText';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import type { RootStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface Student {
  id: string;
  name: string;
  roll: string;
  presentDays: number;
}

interface ClassItem {
  class_grade: string;
  section: string;
}

interface ViewedInfo {
  class: string;
  section: string;
  date: string;
  days: number;
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

const fmtDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
};

// Student Card Component
const StudentCard: React.FC<{ student: Student; index: number }> = ({
  student, 
  index, 
}) => {
  const present = student.presentDays > 0;
  
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={[styles.studentAvatar, { backgroundColor: present ? '#ecfdf5' : '#fef2f2' }]}>
          <AppText style={[styles.studentAvatarText, { color: present ? '#10b981' : '#ef4444' }]}>
            {(student.name || '?')[0].toUpperCase()}
          </AppText>
        </View>
        <View style={styles.studentDetails}>
          <AppText style={styles.studentName}>{student.name}</AppText>
          <AppText style={styles.studentRoll}>Roll No: {student.roll}</AppText>
        </View>
      </View>
      <View style={[styles.statusBadge, present ? styles.statusPresent : styles.statusAbsent]}>
        <AppText style={[styles.statusText, present ? styles.statusTextPresent : styles.statusTextAbsent]}>
          {present ? 'Present' : 'Absent'}
        </AppText>
      </View>
    </View>
  );
};

// Export Modal Component
const ExportModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  selClass: string;
  selSection: string;
  onExport: (format: 'excel' | 'csv') => void;
  exporting: boolean;
}> = ({ visible, onClose, selClass, selSection, onExport, exporting }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [format, setFormat] = useState<'excel' | 'csv'>('excel');
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setStartDate(today);
      setEndDate(today);
      setFormat('excel');
    }
  }, [visible, today]);

  const handleExport = () => {
    if (startDate > endDate) {
      Alert.alert('Invalid Range', 'Start date must be ≤ end date');
      return;
    }
    onExport(format);
  };

  const days = (() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.modalTitle}>Export Attendance</AppText>
              <AppText style={styles.modalSubtitle}>
                Class {selClass}–{selSection}
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <XCircle size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.modalField}>
              <AppText style={styles.modalLabel}>Start Date</AppText>
              <TouchableOpacity 
                style={styles.modalDateBtn} 
                onPress={() => setShowStartPicker(true)}
              >
                <Calendar size={18} color="#64748B" style={{ marginRight: 10 }} />
                <AppText style={styles.modalDateText}>{fmtDate(startDate)}</AppText>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={new Date(startDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onValueChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setStartDate(date.toISOString().split('T')[0]);
                  }}
                  onDismiss={() => setShowStartPicker(false)}
                />
              )}
            </View>

            <View style={styles.modalField}>
              <AppText style={styles.modalLabel}>End Date</AppText>
              <TouchableOpacity 
                style={styles.modalDateBtn} 
                onPress={() => setShowEndPicker(true)}
              >
                <Calendar size={18} color="#64748B" style={{ marginRight: 10 }} />
                <AppText style={styles.modalDateText}>{fmtDate(endDate)}</AppText>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={new Date(endDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onValueChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setEndDate(date.toISOString().split('T')[0]);
                  }}
                  onDismiss={() => setShowEndPicker(false)}
                />
              )}
            </View>

            <View style={styles.modalField}>
              <AppText style={styles.modalLabel}>Format</AppText>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'excel' && styles.formatBtnActive]}
                  onPress={() => setFormat('excel')}
                >
                  <AppText style={[styles.formatBtnText, format === 'excel' && styles.formatBtnTextActive]}>
                    Excel (.xlsx)
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'csv' && styles.formatBtnActive]}
                  onPress={() => setFormat('csv')}
                >
                  <AppText style={[styles.formatBtnText, format === 'csv' && styles.formatBtnTextActive]}>
                    CSV (.csv)
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalPreview}>
              <AppText style={styles.modalPreviewText}>
                Exporting {days} day{days !== 1 ? 's' : ''} · {format.toUpperCase()}
              </AppText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmExportBtn}
              onPress={handleExport}
              disabled={exporting}
            >
              <AppText style={styles.confirmExportBtnText}>
                {exporting ? 'Exporting...' : 'Export Now'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Image Modal Component
const ImageModal: React.FC<{
  visible: boolean;
  images: string[];
  title: string;
  onClose: () => void;
}> = ({ visible, images, title, onClose }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    if (visible) setActiveIndex(0);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.imageModalOverlay}>
        <View style={styles.imageModalContent}>
          <View style={styles.imageModalHeader}>
            <AppText style={styles.imageModalTitle}>{title}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.imageModalClose}>
              <XCircle size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.imageModalBody}>
            {images.length === 0 ? (
              <View style={styles.imageModalEmpty}>
                <Camera size={48} color="#CBD5E1" />
                <AppText style={styles.imageModalEmptyText}>No images found</AppText>
              </View>
            ) : (
              <>
                <Image source={{ uri: images[activeIndex] }} style={styles.imageModalMain} />
                {images.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageModalThumbs}>
                    {images.filter(Boolean).map((img, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.imageModalThumb, activeIndex === idx && styles.imageModalThumbActive]}
                        onPress={() => setActiveIndex(idx)}
                      >
                        <Image source={{ uri: img }} style={styles.imageModalThumbImg} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <AppText style={styles.imageModalCounter}>
                  Image {activeIndex + 1} of {images.length}
                </AppText>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ViewAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const today = new Date().toISOString().split('T')[0];
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  const [activeTab, setActiveTab] = useState<'attendance' | 'overview'>('attendance');
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  
  // Class/Section
  const [classItems, setClassItems] = useState<ClassItem[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [selClass, setSelClass] = useState<string>('');
  const [selSection, setSelSection] = useState<string>('');
  const [selSectionOptions, setSelSectionOptions] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);

  // Attendance Data
  const [viewDate, setViewDate] = useState<string>(today);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [totalDays, setTotalDays] = useState<number>(1);
  const [viewedInfo, setViewedInfo] = useState<ViewedInfo | null>(null);

  // UI States
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'class' | 'section' | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Image Viewer States
  const [showTeacherImage, setShowTeacherImage] = useState<boolean>(false);
  const [teacherImages, setTeacherImages] = useState<string[]>([]);
  const [loadingTeacherImage, setLoadingTeacherImage] = useState<boolean>(false);
  const [showStudentImages, setShowStudentImages] = useState<boolean>(false);
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [loadingStudentImages, setLoadingStudentImages] = useState<boolean>(false);

  // Load credentials
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      setSchoolCode(code);
      setBranchId(bid);
      setEmployeeId(eid);
      if (code && bid) loadClasses(code, bid);
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

  const handleView = async () => {
    if (!selClass || !selSection) {
      Alert.alert('Required', 'Please select class and section');
      return;
    }
    if (!viewDate) {
      Alert.alert('Required', 'Please select a date');
      return;
    }

    setLoading(true);
    setStudents(null);

    const studentMap = new Map<string, Student>();

    try {
      const { presentIds, allStudents } = await fetchOneDay(selClass, selSection, viewDate);
      
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
      setViewedInfo({ class: selClass, section: selSection, date: viewDate, days: 1 });

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selClass && selSection && viewDate) {
      await handleView();
    }
    setRefreshing(false);
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
      }, {
        responseType: 'blob',
      });

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
    } catch (error) {
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

    setLoadingTeacherImage(true);
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
    } catch (error) {
      Alert.alert('Error', 'Failed to load teacher image');
    } finally {
      setLoadingTeacherImage(false);
    }
  };

  const loadStudentImages = async () => {
    if (!selClass || !selSection) {
      Alert.alert('Required', 'Please select class and section');
      return;
    }

    setLoadingStudentImages(true);
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
    } catch (error) {
      Alert.alert('Error', 'Failed to load student images');
    } finally {
      setLoadingStudentImages(false);
    }
  };

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

  const totalStudents = Array.isArray(students) ? students.length : 0;
  const totalPresent = Array.isArray(students) ? students.reduce((sum, s) => sum + (s?.presentDays || 0), 0) : 0;
  const totalAbsent = totalStudents * totalDays - totalPresent;
  const overallPct = totalStudents > 0 && totalDays > 0
    ? Math.round((totalPresent / (totalStudents * totalDays)) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Navy Standard Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText weight="bold" style={styles.headerTitle}>Attendance</AppText>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (navigation as any).navigate('Notifications')}
          >
            <Bell size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <AppText weight="bold" style={styles.headerGreeting}>View Records</AppText>
          <AppText style={styles.headerSubtext}>Review and export student attendance logs</AppText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'attendance' ? (
          <>
            {/* Class & Date Selection */}
            <View style={styles.selectionCard}>
              <View style={styles.fieldRow}>
                <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
                  <AppText style={styles.label}>Class</AppText>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setPickerMode('class')}
                  >
                    <Users size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <AppText style={styles.dropdownText} aria-label="Select Class">
                      {selClass ? `Class ${selClass}` : 'Select Class'}
                    </AppText>
                    <ChevronRight size={16} color="#64748B" style={{ transform: [{ rotate: '90deg' }] }} />
                  </TouchableOpacity>
                  <AppText style={styles.helperText}>
                    {loadingClasses ? 'Loading classes…' : 'Tap to choose a class'}
                  </AppText>
                </View>

                <View style={[styles.field, { flex: 1 }]}> 
                  <AppText style={styles.label}>Section</AppText>
                  <TouchableOpacity
                    style={[styles.dropdown, !selClass && styles.dropdownDisabled]}
                    onPress={() => selClass ? setPickerMode('section') : Alert.alert('Select class first', 'Choose a class before selecting a section.')}
                    disabled={!selClass}
                    aria-label="Select Section"
                  >
                    <LayoutGrid size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <AppText style={styles.dropdownText} aria-label="Select Section">
                      {selSection ? `Section ${selSection}` : 'Select Section'}
                    </AppText>
                    <ChevronRight size={16} color="#64748B" style={{ transform: [{ rotate: '90deg' }] }} />
                  </TouchableOpacity>
                  <AppText style={styles.helperText}>
                    {selClass ? `${selSectionOptions.length} section${selSectionOptions.length === 1 ? '' : 's'} available` : 'Pick a class first'}
                  </AppText>
                </View>
              </View>

              <View style={styles.field}>
                <AppText style={styles.label}>Date</AppText>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={18} color="#64748B" style={{ marginRight: 10 }} />
                  <AppText style={styles.dateInputText}>{fmtDate(viewDate)}</AppText>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(viewDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onValueChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setViewDate(date.toISOString().split('T')[0]);
                    }}
                    onDismiss={() => setShowDatePicker(false)}
                  />
                )}
              </View>

              <AppButton
                title={loading ? 'Searching...' : 'Search Attendance'}
                onPress={handleView}
                disabled={loading || !selClass || !selSection}
                style={styles.searchBtn}
              />
            </View>

            {/* Summary Tiles */}
            {students && (
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryTile, { backgroundColor: '#eef2ff' }]}>
                  <CheckCircle2 size={24} color="#6366f1" />
                  <AppText style={styles.summaryValue}>{totalPresent}</AppText>
                  <AppText style={styles.summaryLabel}>Present</AppText>
                </View>
                <View style={[styles.summaryTile, { backgroundColor: '#fef2f2' }]}>
                  <XCircle size={24} color="#ef4444" />
                  <AppText style={styles.summaryValue}>{totalAbsent}</AppText>
                  <AppText style={styles.summaryLabel}>Absent</AppText>
                </View>
                <View style={[styles.summaryTile, { backgroundColor: '#f0fdf4' }]}>
                  <Users size={24} color="#10b981" />
                  <AppText style={styles.summaryValue}>{overallPct}%</AppText>
                  <AppText style={styles.summaryLabel}>Attendance</AppText>
                </View>
              </View>
            )}

            {/* List Actions */}
            {students && students.length > 0 && (
              <View style={styles.listActions}>
                <TouchableOpacity style={styles.actionIconButton} onPress={loadTeacherImage}>
                  <Camera size={20} color={Theme.colors.primary} />
                  <AppText style={styles.actionIconLabel}>Teacher Photo</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconButton} onPress={loadStudentImages}>
                  <Users size={20} color={Theme.colors.primary} />
                  <AppText style={styles.actionIconLabel}>Student Photos</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconButton} onPress={() => setShowExportModal(true)}>
                  <Download size={20} color={Theme.colors.primary} />
                  <AppText style={styles.actionIconLabel}>Export</AppText>
                </TouchableOpacity>
              </View>
            )}

            {/* Student List */}
            {loading ? (
              <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
            ) : students === null ? (
              <View style={styles.emptyState}>
                <Search size={48} color="#CBD5E1" />
                <AppText style={styles.emptyStateTitle}>No Records Selected</AppText>
                <AppText style={styles.emptyStateSub}>Select class and date to view attendance records</AppText>
              </View>
            ) : students.length === 0 ? (
              <View style={styles.emptyState}>
                <Filter size={48} color="#CBD5E1" />
                <AppText style={styles.emptyStateTitle}>No Records Found</AppText>
                <AppText style={styles.emptyStateSub}>Try a different date or class</AppText>
              </View>
            ) : (
              <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                  <AppText style={styles.listHeaderText}>Student Details</AppText>
                  <AppText style={styles.listHeaderCount}>{students.length} Total</AppText>
                </View>
                {students.filter(Boolean).map((student, idx) => (
                  <StudentCard key={student.id || idx} student={student} index={idx} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.overviewContainer}>
            {/* Overview content placeholder - can be expanded later */}
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={Theme.colors.primary} />
              <AppText style={[styles.emptyStateSub, { marginTop: 10 }]}>Loading statistical overview...</AppText>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={pickerMode !== null} transparent animationType="fade" onRequestClose={() => setPickerMode(null)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View>
                <AppText style={styles.pickerTitle}>{pickerMode === 'class' ? 'Select Class' : 'Select Section'}</AppText>
                <AppText style={styles.pickerSubtitle}>
                  {pickerMode === 'class' ? 'Choose the class to load available sections.' : 'Choose a section for the selected class.'}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => setPickerMode(null)} style={styles.pickerCloseBtn}>
                <XCircle size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerShell}>
              <ScrollView style={{ maxHeight: 350 }}>
                {pickerMode === 'class' ? (
                  <>
                    {!Array.isArray(classOptions) || classOptions.length === 0 ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <AppText style={{ color: '#64748B' }}>No classes available</AppText>
                      </View>
                    ) : (
                      classOptions.filter(Boolean).map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.pickerOption,
                            selClass === item && styles.pickerOptionActive
                          ]}
                          onPress={() => {
                            handleClassChange(item);
                            setPickerMode(null);
                          }}
                        >
                          <AppText style={[
                            styles.pickerOptionText,
                            selClass === item && styles.pickerOptionTextActive
                          ]}>
                            Class {item}
                          </AppText>
                          {selClass === item && <CheckCircle2 size={18} color={Theme.colors.primary} />}
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    {!Array.isArray(selSectionOptions) || selSectionOptions.length === 0 ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <AppText style={{ color: '#64748B' }}>No sections available</AppText>
                      </View>
                    ) : (
                      selSectionOptions.filter(Boolean).map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.pickerOption,
                            selSection === item && styles.pickerOptionActive
                          ]}
                          onPress={() => {
                            setSelSection(item);
                            setPickerMode(null);
                          }}
                        >
                          <AppText style={[
                            styles.pickerOptionText,
                            selSection === item && styles.pickerOptionTextActive
                          ]}>
                            Section {item}
                          </AppText>
                          {selSection === item && <CheckCircle2 size={18} color={Theme.colors.primary} />}
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}
              </ScrollView>
            </View>

            <View style={styles.pickerActions}>
              <TouchableOpacity style={[styles.pickerCancelBtn, { flex: 1 }]} onPress={() => setPickerMode(null)}>
                <AppText style={styles.pickerCancelText}>Close</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        selClass={selClass}
        selSection={selSection}
        onExport={handleExport}
        exporting={exporting}
      />

      <ImageModal
        visible={showTeacherImage}
        images={teacherImages}
        title="Teacher Verification"
        onClose={() => setShowTeacherImage(false)}
      />

      <ImageModal
        visible={showStudentImages}
        images={studentImages}
        title="Student Attendance Images"
        onClose={() => setShowStudentImages(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({

      android: { elevation: 10 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerContent: {
    marginTop: 24,
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  tabWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -15,
    paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: 'transparent',
    gap: 12,
    marginBottom: 10,
    zIndex: 50,
    ...Platform.select({

      android: { elevation: 50 },

      ios: {},

    }),
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeTabText: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 6,
    paddingBottom: 120,
  },
  selectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dropdownDisabled: {
    opacity: 0.55,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  dateInputText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryTile: {
    flex: 1,
    padding: 16,
    borderRadius: 28,
    alignItems: 'center',
    ...Platform.select({

      android: { elevation: 3 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  listActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  actionIconButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    ...Platform.select({

      android: { elevation: 1 },

      ios: {},

    }),
  },
  actionIconLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginTop: 6,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  studentDetails: {
    marginLeft: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentRoll: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusPresent: {
    backgroundColor: '#ecfdf5',
  },
  statusAbsent: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPresent: {
    color: '#10b981',
  },
  statusTextAbsent: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  modalDateText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  formatBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  formatBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  formatBtnTextActive: {
    color: '#FFFFFF',
  },
  modalPreview: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  confirmExportBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
  },
  confirmExportBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  imageModalClose: {
    padding: 4,
  },
  imageModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  imageModalMain: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  imageModalThumbs: {
    flexDirection: 'row',
    marginTop: 16,
  },
  imageModalThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  imageModalThumbActive: {
    borderColor: Theme.colors.primary,
  },
  imageModalThumbImg: {
    width: '100%',
    height: '100%',
  },
  imageModalCounter: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  imageModalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  imageModalEmptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  pickerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerShell: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionActive: {
    backgroundColor: '#F1F5F9',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  pickerCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  pickerDoneBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overviewContainer: {
    paddingTop: 40,
  },
});
