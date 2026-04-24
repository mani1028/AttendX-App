import React, { useEffect, useState, useCallback } from 'react';
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
  Share,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

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

// Status Badge Component
const StatusBadge: React.FC<{ present: boolean }> = ({ present }) => {
  return (
    <View style={[styles.statusBadge, present ? styles.statusPresent : styles.statusAbsent]}>
      <Text style={[styles.statusText, present ? styles.statusTextPresent : styles.statusTextAbsent]}>
        {present ? 'Present' : 'Absent'}
      </Text>
    </View>
  );
};

// Student Card Component
const StudentCard: React.FC<{ student: Student; index: number; totalDays: number }> = ({ 
  student, 
  index, 
  totalDays 
}) => {
  const present = student.presentDays > 0;
  
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentNumber}>
        <Text style={styles.studentNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.studentInfo}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>{(student.name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.studentDetails}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentRoll}>Roll: {student.roll}</Text>
        </View>
      </View>
      <StatusBadge present={present} />
    </View>
  );
};

// Export Modal Component
const ExportModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  schoolCode: string;
  branchId: string;
  selClass: string;
  selSection: string;
  onExport: (format: 'excel' | 'csv') => void;
  exporting: boolean;
}> = ({ visible, onClose, schoolCode, branchId, selClass, selSection, onExport, exporting }) => {
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
            <View style={styles.modalHeaderIcon}>
              <Text style={styles.modalHeaderIconText}>📊</Text>
            </View>
            <View>
              <Text style={styles.modalTitle}>Export Attendance</Text>
              <Text style={styles.modalSubtitle}>
                Class {selClass}–{selSection}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Start Date */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>📅 Start Date</Text>
              <TouchableOpacity 
                style={styles.modalDateBtn} 
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.modalDateText}>{fmtDate(startDate)}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={new Date(startDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setStartDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>

            {/* End Date */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>📅 End Date</Text>
              <TouchableOpacity 
                style={styles.modalDateBtn} 
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.modalDateText}>{fmtDate(endDate)}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={new Date(endDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setEndDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>

            {/* Format Selection */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Format</Text>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'excel' && styles.formatBtnActive]}
                  onPress={() => setFormat('excel')}
                >
                  <Text style={[styles.formatBtnText, format === 'excel' && styles.formatBtnTextActive]}>
                    Excel (.xlsx)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'csv' && styles.formatBtnActive]}
                  onPress={() => setFormat('csv')}
                >
                  <Text style={[styles.formatBtnText, format === 'csv' && styles.formatBtnTextActive]}>
                    CSV (.csv)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.modalPreview}>
              <View style={styles.modalPreviewDot} />
              <Text style={styles.modalPreviewText}>
                Exporting {days} day{days !== 1 ? 's' : ''} · {fmtDate(startDate)}
                {startDate !== endDate && ` → ${fmtDate(endDate)}`} · {format.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton 
              title={exporting ? 'Exporting...' : `Export ${format.toUpperCase()}`} 
              onPress={handleExport}
              disabled={exporting}
            />
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
            <Text style={styles.imageModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.imageModalClose}>
              <Text style={styles.imageModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageModalBody}>
            {images.length === 0 ? (
              <View style={styles.imageModalEmpty}>
                <Text style={styles.imageModalEmptyIcon}>📷</Text>
                <Text style={styles.imageModalEmptyText}>No images found</Text>
              </View>
            ) : (
              <>
                <Image source={{ uri: images[activeIndex] }} style={styles.imageModalMain} />
                {images.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageModalThumbs}>
                    {images.map((img, idx) => (
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
                <Text style={styles.imageModalCounter}>
                  Image {activeIndex + 1} of {images.length}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ViewAttendanceScreen() {
  const today = new Date().toISOString().split('T')[0];
  
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
  
  // View
  const [viewDate, setViewDate] = useState<string>(today);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [totalDays, setTotalDays] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewedInfo, setViewedInfo] = useState<ViewedInfo | null>(null);
  
  // Export
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  
  // Images
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
      const res = await API.get('/hm/classes', {
        headers: { 'X-School-Code': code, 'X-Branch-Id': bid },
      });
      const items = res.data?.items || [];
      setClassItems(items);
      const uniqueClasses = [...new Set(items.map((i: ClassItem) => i.class_grade))];
      setClassOptions(uniqueClasses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load classes');
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
    const sections = [...new Set(classItems.filter(i => i.class_grade === value).map(i => i.section))];
    setSelSectionOptions(sections);
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
    const norm = (arr: any[]) => (arr || []).map(s => ({
      id: String(s.student_id || s.id || ''),
      name: s.student_full_name || s.name || s.student_name || '—',
      roll: String(s.roll_number || s.roll || s.roll_no || '—'),
    }));
    const present = norm(data.present || []);
    const absent = norm(data.absent || []);
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
      
      allStudents.forEach(s => {
        if (s.id && !studentMap.has(s.id)) {
          studentMap.set(s.id, { id: s.id, name: s.name, roll: s.roll, presentDays: 0 });
        }
      });
      
      presentIds.forEach(id => {
        if (studentMap.has(id)) {
          const student = studentMap.get(id)!;
          student.presentDays++;
        }
      });

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
      Alert.alert('Error', 'Failed to fetch attendance data');
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
      // For mobile, we'll use a different approach - share via API
      const response = await API.post('/hm/students/export', {
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

      // Save and share file
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
      
      Alert.alert('Success', `Attendance exported as ${format.toUpperCase()}`);
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
      
      const images = response.data?.images || [];
      if (images.length === 0) {
        Alert.alert('No Image', `No teacher verification image found for ${viewDate}`);
      } else {
        const imageUrls = images.map((img: any) => {
          const path = img.path || img.filename || img;
          return API.getUri() + `/media/${path}`;
        });
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
      
      const images = response.data?.images || [];
      if (images.length === 0) {
        Alert.alert('No Images', `No student images found for ${viewDate}`);
      } else {
        const imageUrls = images.map((img: any) => {
          const path = typeof img === 'string' ? img : img.path;
          return API.getUri() + `/media/${path}`;
        });
        setStudentImages(imageUrls);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load student images');
    } finally {
      setLoadingStudentImages(false);
    }
  };

  const totalStudents = students?.length ?? 0;
  const totalPresent = students?.reduce((sum, s) => sum + s.presentDays, 0) ?? 0;
  const totalAbsent = totalStudents * totalDays - totalPresent;
  const overallPct = totalStudents > 0 && totalDays > 0
    ? Math.round((totalPresent / (totalStudents * totalDays)) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <AppCard style={styles.statCard}>
            <Text style={styles.statValue}>{totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
            <Text style={styles.statSub}>
              {viewedInfo ? `Class ${viewedInfo.class}-${viewedInfo.section}` : 'Select class'}
            </Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{totalPresent}</Text>
            <Text style={styles.statLabel}>Present</Text>
            <Text style={styles.statSub}>{overallPct}% attendance</Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>{totalAbsent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
            <Text style={styles.statSub}>{100 - overallPct}% absent</Text>
          </AppCard>
          <AppCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: overallPct >= 80 ? '#059669' : overallPct >= 50 ? '#d97706' : '#dc2626' }]}>
              {overallPct}%
            </Text>
            <Text style={styles.statLabel}>Attendance Rate</Text>
            <Text style={styles.statSub}>
              {overallPct >= 80 ? 'Excellent' : overallPct >= 50 ? 'Needs attention' : 'Critical'}
            </Text>
          </AppCard>
        </View>

        {/* Control Card */}
        <AppCard style={styles.controlCard}>
          <Text style={styles.controlTitle}>📊 Attendance Controls</Text>

          {/* Class Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>🎓 Class</Text>
            {loadingClasses ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {classOptions.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, selClass === c && styles.chipActive]}
                      onPress={() => handleClassChange(c)}
                    >
                      <Text style={[styles.chipText, selClass === c && styles.chipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Section Selection */}
          {selClass && (
            <View style={styles.field}>
              <Text style={styles.label}>🔤 Section</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {selSectionOptions.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, selSection === s && styles.chipActive]}
                      onPress={() => setSelSection(s)}
                    >
                      <Text style={[styles.chipText, selSection === s && styles.chipTextActive]}>
                        Section {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Date Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>📅 Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{fmtDate(viewDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(viewDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setViewDate(date.toISOString().split('T')[0]);
                }}
              />
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <AppButton
              title={loading ? 'Loading...' : 'View Attendance'}
              onPress={handleView}
              disabled={loading || !selClass || !selSection}
              style={styles.viewBtn}
            />
            <AppButton
              title="Export"
              onPress={() => setShowExportModal(true)}
              disabled={!selClass || !selSection}
              type="secondary"
              style={styles.exportBtn}
            />
          </View>
        </AppCard>

        {/* Image Buttons */}
        {students && students.length > 0 && (
          <View style={styles.imageBtnRow}>
            <TouchableOpacity style={styles.imageBtn} onPress={loadTeacherImage}>
              <Text style={styles.imageBtnText}>📷 Teacher Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageBtn} onPress={loadStudentImages}>
              <Text style={styles.imageBtnText}>📸 Student Images</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student List */}
        {loading ? (
          <Loader />
        ) : students === null ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyText}>
              {selClass && selSection
                ? `Select a date and click "View Attendance" to load records for Class ${selClass}-${selSection}.`
                : 'Select class, section and date above, then click View Attendance.'}
            </Text>
          </AppCard>
        ) : students.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Records</Text>
            <Text style={styles.emptyText}>No attendance records found for this date.</Text>
          </AppCard>
        ) : (
          <AppCard style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Student Attendance</Text>
              <View style={styles.listBadges}>
                <View style={[styles.pill, styles.pillGreen]}>
                  <Text style={styles.pillText}>✓ {totalPresent} Present</Text>
                </View>
                <View style={[styles.pill, styles.pillRed]}>
                  <Text style={styles.pillText}>✗ {totalAbsent} Absent</Text>
                </View>
              </View>
            </View>

            {students.map((student, idx) => (
              <StudentCard key={student.id} student={student} index={idx} totalDays={totalDays} />
            ))}
          </AppCard>
        )}
      </ScrollView>

      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        schoolCode={schoolCode}
        branchId={branchId}
        selClass={selClass}
        selSection={selSection}
        onExport={handleExport}
        exporting={exporting}
      />

      {/* Teacher Image Modal */}
      <ImageModal
        visible={showTeacherImage}
        images={teacherImages}
        title="📸 Teacher Verification Photo"
        onClose={() => setShowTeacherImage(false)}
      />

      {/* Student Images Modal */}
      <ImageModal
        visible={showStudentImages}
        images={studentImages}
        title={`📷 Student Attendance Images — ${viewedInfo?.date ? fmtDate(viewedInfo.date) : ''}`}
        onClose={() => setShowStudentImages(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0d1b2a',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#4a5568',
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    color: '#8898aa',
    marginTop: 2,
  },
  controlCard: {
    padding: 18,
    marginBottom: 16,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#4a5568',
  },
  chipTextActive: {
    color: '#fff',
  },
  dateBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  viewBtn: {
    flex: 2,
  },
  exportBtn: {
    flex: 1,
  },
  imageBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageBtn: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignItems: 'center',
  },
  imageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#4a5568',
    textAlign: 'center',
  },
  listCard: {
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  listBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillGreen: {
    backgroundColor: '#d1fae5',
  },
  pillRed: {
    backgroundColor: '#fee2e2',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  studentNumber: {
    width: 32,
  },
  studentNumberText: {
    fontSize: 12,
    color: '#8898aa',
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d1b2a',
  },
  studentRoll: {
    fontSize: 11,
    color: '#4a5568',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPresent: {
    backgroundColor: '#d1fae5',
  },
  statusAbsent: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPresent: {
    color: '#059669',
  },
  statusTextAbsent: {
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  modalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderIconText: {
    fontSize: 18,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#4a5568',
    marginTop: 2,
  },
  modalClose: {
    marginLeft: 'auto',
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  modalBody: {
    padding: 16,
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  modalDateBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modalDateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  formatBtnActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#059669',
  },
  formatBtnText: {
    fontSize: 13,
    color: '#4a5568',
  },
  formatBtnTextActive: {
    color: '#059669',
    fontWeight: '600',
  },
  modalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    marginTop: 8,
  },
  modalPreviewDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  modalPreviewText: {
    flex: 1,
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  imageModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  imageModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalCloseText: {
    fontSize: 16,
    color: '#4a5568',
  },
  imageModalBody: {
    padding: 16,
    alignItems: 'center',
  },
  imageModalMain: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  imageModalThumbs: {
    flexDirection: 'row',
    marginTop: 12,
  },
  imageModalThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#e4e9f2',
    overflow: 'hidden',
  },
  imageModalThumbActive: {
    borderColor: '#2563eb',
  },
  imageModalThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageModalCounter: {
    marginTop: 12,
    fontSize: 12,
    color: '#4a5568',
  },
  imageModalEmpty: {
    alignItems: 'center',
    padding: 40,
  },
  imageModalEmptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  imageModalEmptyText: {
    fontSize: 14,
    color: '#4a5568',
  },
});