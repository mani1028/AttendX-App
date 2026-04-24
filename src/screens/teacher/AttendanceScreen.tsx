import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

// Types
interface TeacherData {
  employee_id: string;
  teacher_full_name: string;
  branch_id: string;
}

interface AssignedClass {
  class_grade: string;
  section: string;
}

interface Student {
  student_id: string;
  name: string;
  roll: string;
  admission_number?: string;
}

interface StudentWithStatus extends Student {
  _defaultStatus: 'PRESENT' | 'ABSENT';
  _currentStatus?: 'PRESENT' | 'ABSENT';
  _changed?: boolean;
  mark_id?: string | null;
  hasExistingMarks?: boolean;
}

interface AttendanceResult {
  summary: {
    total_students: number;
    present_count: number;
    absent_count: number;
    duplicate_count: number;
    images_processed: number;
    total_faces_detected: number;
    unknown_faces_count: number;
  };
  present: Student[];
  absent: Student[];
  duplicates: Student[];
  per_image_results?: any[];
  date?: string;
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

const getAuthToken = async (): Promise<string> => {
  const token = await AsyncStorage.getItem('token');
  return token || '';
};

// Step Labels
const stepLabels = ['Teacher Auth', 'Verified', 'Attendance', 'Report'];

// Status Badge Component
const StatusBadge: React.FC<{ status: 'present' | 'absent' | 'changed' }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'present': return styles.badgePresent;
      case 'absent': return styles.badgeAbsent;
      case 'changed': return styles.badgeChanged;
    }
  };
  const getText = () => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'changed': return 'Edited';
    }
  };
  return (
    <View style={[styles.badge, getStyle()]}>
      <Text style={styles.badgeText}>{getText()}</Text>
    </View>
  );
};

// Stepper Component
const Stepper: React.FC<{ step: number }> = ({ step }) => (
  <View style={styles.stepperContainer}>
    {stepLabels.map((label, idx) => {
      const stepNumber = idx + 1;
      const isDone = stepNumber < step;
      const isActive = stepNumber === step;
      return (
        <View key={label} style={styles.stepItem}>
          <View style={[styles.stepCircle, isDone && styles.stepDone, isActive && styles.stepActive]}>
            {isDone ? (
              <Text style={styles.stepIcon}>✓</Text>
            ) : (
              <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNumber}</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]}>
            {label}
          </Text>
          {idx < stepLabels.length - 1 && (
            <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
          )}
        </View>
      );
    })}
  </View>
);

// Toast Component
const Toast: React.FC<{
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
  onClose: () => void;
}> = ({ visible, title, message, icon = 'ℹ️', color = '#2563eb', onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={[styles.toast, { borderLeftColor: color }]}>
      <Text style={styles.toastIcon}>{icon}</Text>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{title}</Text>
        {message && <Text style={styles.toastMessage}>{message}</Text>}
      </View>
      <TouchableOpacity onPress={onClose}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function TeacherAttendanceScreen() {
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Camera
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraUse, setCameraUse] = useState<'teacher' | 'student'>('teacher');
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  
  // Form
  const [form, setForm] = useState({
    employee_id: '',
    branch_id: '',
    class_grade: '',
    section: '',
    attendance_date: new Date().toISOString().split('T')[0],
    attendance_session: '1',
  });
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dailySessions, setDailySessions] = useState<number>(1);
  
  // Class/Section options
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [sectionOptions, setSectionOptions] = useState<any[]>([]);
  
  // Teacher verification
  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState<string>('');
  
  // Student attendance
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [studentImagesCaptured, setStudentImagesCaptured] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [manualStatusById, setManualStatusById] = useState<Record<string, string>>({});
  const [manualFilter, setManualFilter] = useState<string>('review');
  const [manualSaving, setManualSaving] = useState<boolean>(false);
  const [viewingGallery, setViewingGallery] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [savedAttendanceData, setSavedAttendanceData] = useState<any>(null);
  
  // Toast
  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    icon?: string;
    color?: string;
  }>({ visible: false, title: '' });

  const showToast = useCallback((title: string, message?: string, icon?: string, color?: string) => {
    setToast({ visible: true, title, message, icon, color });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ visible: false, title: '' });
  }, []);

  // Persist attendance state
  useEffect(() => {
    const persist = async () => {
      if (!schoolCode || !employeeId) return;
      const cacheKey = `teacher_attendance_cache_${schoolCode}_${branchId}_${employeeId}`;
      try {
        const state = {
          form,
          studentImages,
          studentImagesCaptured,
          result,
          step,
          timestamp: new Date().getTime()
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist attendance state', e);
      }
    };
    const timer = setTimeout(persist, 1000);
    return () => clearTimeout(timer);
  }, [form, studentImages, studentImagesCaptured, result, step, schoolCode, branchId, employeeId]);

  // Load credentials and permissions
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      const bid = await getBranchId();
      const eid = await getEmployeeId();
      setSchoolCode(code);
      setBranchId(bid);
      setEmployeeId(eid);
      setForm(prev => ({ ...prev, employee_id: eid, branch_id: bid }));
      
      // Try to restore teacher session/verification data
      const sessionKey = `teacher_session_${eid}_${code}`;
      const attendanceCacheKey = `teacher_attendance_cache_${code}_${bid}_${eid}`;
      try {
        const [cachedSession, cachedAttendance] = await Promise.all([
          AsyncStorage.getItem(sessionKey),
          AsyncStorage.getItem(attendanceCacheKey)
        ]);

        if (cachedSession) {
          const sessionData = JSON.parse(cachedSession);
          setTeacherData(sessionData.teacher_data);
          setAssignedClasses(sessionData.assigned_classes);
          // If we have cached teacher data, we can potentially skip step 1
          // but for security we'll stay on step 1 unless user is verified
          // setStep(2);
        }

        if (cachedAttendance) {
          const state = JSON.parse(cachedAttendance);
          if (state.form) setForm(prev => ({ ...prev, ...state.form }));
          if (state.studentImages) setStudentImages(state.studentImages);
          if (state.studentImagesCaptured) setStudentImagesCaptured(state.studentImagesCaptured);
          if (state.result) setResult(state.result);
          if (state.step) setStep(state.step);
        }
      } catch (e) {
        console.warn('Failed to load teacher attendance cache', e);
      }

      // Load attendance settings
      if (code && bid) {
        const settingsCacheKey = `attendance_settings_${code}_${bid}`;
        try {
          const cachedSettings = await AsyncStorage.getItem(settingsCacheKey);
          if (cachedSettings) {
            setDailySessions(JSON.parse(cachedSettings).daily_sessions === 2 ? 2 : 1);
          }
        } catch (e) {}

        try {
          const res = await API.get('/hm/attendance/settings', {
            headers: { 'X-School-Code': code, 'X-Branch-Id': bid },
          });
          const sessions = res.data?.daily_sessions === 2 ? 2 : 1;
          setDailySessions(sessions);
          await AsyncStorage.setItem(settingsCacheKey, JSON.stringify(res.data));
        } catch {
          // Keep cached or default
        }
      }
    };
    load();
    
    // Request camera permission
    Camera.requestCameraPermission().then(permission => {
      setHasPermission(permission === 'authorized');
    });
  }, []);

  // Load classes
  const loadClasses = useCallback(async () => {
    if (!branchId || !schoolCode) return;

    const cacheKey = `classes_sections_${branchId}_${schoolCode}`;

    // Try loading from cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const items = JSON.parse(cached);
        setClassOptions(items);
        const currentCls = items.find(
          (c: any) => String(c.class_name).trim() === String(form.class_grade).trim()
        );
        setSectionOptions(currentCls?.sections || []);
      }
    } catch (e) {
      console.warn('Failed to load classes cache', e);
    }

    try {
      const res = await API.get('/manage/classes-sections', {
        params: { branch_id: branchId },
        headers: { 'X-School-Code': schoolCode },
      });
      const items = res.data?.items || [];
      setClassOptions(items);
      
      const currentCls = items.find(
        (c: any) => String(c.class_name).trim() === String(form.class_grade).trim()
      );
      setSectionOptions(currentCls?.sections || []);

      await AsyncStorage.setItem(cacheKey, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to load classes:', err);
      // Keep cached options if API fails
    }
  }, [branchId, schoolCode, form.class_grade]);

  useEffect(() => {
    if (branchId && schoolCode) {
      loadClasses();
    }
  }, [branchId, schoolCode, loadClasses]);

  // Capture image from camera
  const captureImage = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
      });
      return `file://${photo.path}`;
    } catch (err) {
      console.error('Capture failed:', err);
      return null;
    }
  };

  const startCamera = async (useFor: 'teacher' | 'student') => {
    if (cameraActive && cameraUse !== useFor) {
      setCameraActive(false);
      setTimeout(() => {
        setCameraUse(useFor);
        setCameraActive(true);
      }, 500);
    } else if (!cameraActive) {
      setCameraUse(useFor);
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const handleTeacherCapture = async () => {
    const img = await captureImage();
    if (img) {
      setTeacherImage(img);
      showToast('Photo captured', 'Teacher image is ready', '✅', '#22C55E');
    } else {
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleTeacherUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0].uri) {
        setTeacherImage(response.assets[0].uri);
        showToast('Teacher photo uploaded', response.assets[0].fileName, '📁', '#2563eb');
      }
    });
  };

  const handleStudentCapture = async () => {
    const img = await captureImage();
    if (img) {
      setPreviewImage(img);
      setShowPreview(true);
      stopCamera();
    } else {
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const handleStudentUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9, selectionLimit: 0 }, (response) => {
      if (response.assets && response.assets[0]?.uri) {
        setPreviewImage(response.assets[0].uri);
        setShowPreview(true);
      }
    });
  };

  const confirmStudentImage = async () => {
    if (previewImage) {
      setStudentImages(prev => [...prev, previewImage]);
      setStudentImagesCaptured(true);
      setPreviewImage(null);
      setShowPreview(false);
      showToast('Image added', `${studentImages.length + 1} image(s) captured`, '✅', '#22C55E');
    }
  };

  const retakeImage = () => {
    setPreviewImage(null);
    setShowPreview(false);
  };

  const removeStudentImage = (index: number) => {
    setStudentImages(prev => prev.filter((_, i) => i !== index));
    if (studentImages.length === 1) {
      setStudentImagesCaptured(false);
    }
  };

  const verifyTeacher = async () => {
    if (!teacherImage) {
      Alert.alert('Error', 'Please capture or upload teacher image');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('school_code', schoolCode);
      formData.append('employee_id', employeeId);
      formData.append('branch_id', branchId);
      formData.append('image', {
        uri: teacherImage,
        type: 'image/jpeg',
        name: 'teacher.jpg',
      } as any);
      if (dailySessions === 1) formData.append('attendance_session', '1');

      const res = await API.post('/manage/verify-teacher', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      const assigned = data.assigned_classes || [];
      setTeacherData(data);
      setAssignedClasses(assigned);
      
      // Cache session data
      const sessionKey = `teacher_session_${employeeId}_${schoolCode}`;
      await AsyncStorage.setItem(sessionKey, JSON.stringify({
        teacher_data: data,
        assigned_classes: assigned,
        timestamp: new Date().getTime()
      }));

      // Save branch ID
      if (data.branch_id) {
        await AsyncStorage.setItem('branch_id', String(data.branch_id));
        setBranchId(String(data.branch_id));
      }

      await loadClasses();

      if (assigned.length === 1) {
        const first = assigned[0];
        setSelectedClassKey(`${first.class_grade}__${first.section}`);
        setForm(prev => ({
          ...prev,
          class_grade: first.class_grade,
          section: first.section,
        }));
      }

      stopCamera();
      setTeacherImage(null);
      setStudentImagesCaptured(false);
      setStudentImages([]);
      setStep(2);
      
      showToast('Identity verified!', `Welcome, ${data.teacher_full_name || 'Teacher'}`, '✅', '#22C55E');
      
      if (assigned.length === 0) {
        showToast('No class assigned', 'HM must assign your class and section', '⚠️', '#F59E0B');
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const sendImageToBackend = async (imageData: string) => {
    const currentEmployeeId = String(teacherData?.employee_id || employeeId || '').trim();

    if (!branchId) throw new Error('Branch ID missing');
    if (!currentEmployeeId) throw new Error('Employee ID missing');

    try {
      const payload = {
        school_code: schoolCode,
        branch_id: branchId,
        employee_id: currentEmployeeId,
        class_grade: form.class_grade || 'NA',
        section: form.section || 'NA',
        attendance_date: form.attendance_date,
        image: imageData,
      };
      if (dailySessions === 1) payload.attendance_session = 1;

      const res = await API.post('/manage/attendance/student/upload-image', payload);
      if (res.data) {
        setStudentImagesCaptured(true);
        setStudentImages(prev => [...prev, imageData]);
        showToast('Image captured & sent', 'Image saved to backend', '✅', '#22C55E');
        return { success: true, data: res.data };
      }
      throw new Error(res.data?.detail || 'Image upload failed');
    } catch (err: any) {
      throw new Error(err.message || 'Image upload failed');
    }
  };

  const processAttendance = async () => {
    if (studentImages.length === 0) {
      Alert.alert('Error', 'Please capture or upload at least one student image');
      return;
    }

    if (!form.class_grade || !form.section) {
      Alert.alert('Error', 'Please select class and section');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        school_code: schoolCode,
        branch_id: branchId,
        employee_id: String(teacherData?.employee_id || employeeId || '').trim(),
        class_grade: form.class_grade,
        section: form.section,
        attendance_date: form.attendance_date,
        preview_only: true,
        images: studentImages,
      };
      if (dailySessions === 1) payload.attendance_session = 1;

      const res = await API.post('/manage/attendance/student/view', payload);
      
      setResult(res.data);
      setManualMode(false);
      setStep(4);
      
      showToast('Attendance scanned', 'Review the preview and save', '📊', '#22C55E');
    } catch (err: any) {
      Alert.alert('Processing Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const saveAttendance = async () => {
    setManualSaving(true);
    try {
      const payload: any = {
        school_code: schoolCode,
        branch_id: branchId,
        employee_id: String(teacherData?.employee_id || employeeId || '').trim(),
        class_grade: form.class_grade,
        section: form.section,
        attendance_date: form.attendance_date,
        preview_only: false,
        images: studentImages,
      };
      if (dailySessions === 1) payload.attendance_session = 1;

      // Add manual statuses
      if (manualMode && Object.keys(manualStatusById).length > 0) {
        const manualAttendance = manualRows.map(row => ({
          student_id: row.student_id,
          status: manualStatusById[row.student_id] || row._defaultStatus,
        }));
        payload.manual_attendance = JSON.stringify(manualAttendance);
      }

      const res = await API.post('/manage/attendance/student/view', payload);

      Alert.alert('Success', 'Attendance saved successfully');
      setSavedAttendanceData(res.data);
      setViewingGallery(true);
      setCurrentImageIndex(0);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      setManualSaving(false);
    }
  };

  const resetFlow = async () => {
    stopCamera();
    setStep(1);
    setTeacherImage(null);
    setTeacherData(null);
    setAssignedClasses([]);
    setStudentImages([]);
    setStudentImagesCaptured(false);
    setResult(null);
    setManualMode(false);
    setManualStatusById({});
    setForm({
      employee_id: employeeId,
      branch_id: branchId,
      class_grade: '',
      section: '',
      attendance_date: new Date().toISOString().split('T')[0],
      attendance_session: '1',
    });
    setSelectedClassKey('');
    setPreviewImage(null);
    setShowPreview(false);
    setViewingGallery(false);
    setSavedAttendanceData(null);

    const cacheKey = `teacher_attendance_cache_${schoolCode}_${branchId}_${employeeId}`;
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (e) {}
  };

  // Assigned class options
  const assignedClassOptions = useMemo(() => {
    return assignedClasses.map(item => ({
      key: `${item.class_grade}__${item.section}`,
      class_grade: item.class_grade,
      section: item.section,
      label: `Class ${item.class_grade} - Section ${item.section}`,
    }));
  }, [assignedClasses]);

  const effectiveClassOptions = useMemo(() => {
    if (assignedClasses.length > 0) {
      const uniqueClasses = [...new Set(assignedClasses.map(c => c.class_grade))];
      return uniqueClasses.map(className => ({
        class_name: className,
        sections: assignedClasses.filter(c => c.class_grade === className).map(c => c.section),
      }));
    }
    return classOptions;
  }, [assignedClasses, classOptions]);

  const effectiveSectionOptions = useMemo(() => {
    if (assignedClasses.length > 0) {
      return assignedClasses.filter(c => c.class_grade === form.class_grade).map(c => c.section);
    }
    const currentCls = classOptions.find(
      (c: any) => String(c.class_name).trim() === String(form.class_grade).trim()
    );
    return currentCls?.sections || [];
  }, [assignedClasses, classOptions, form.class_grade]);

  // Manual rows for review
  const manualRows = useMemo(() => {
    const presentRows = (result?.present || []).map(s => ({ ...s, _defaultStatus: 'PRESENT' as const }));
    const absentRows = (result?.absent || []).map(s => ({ ...s, _defaultStatus: 'ABSENT' as const }));
    return [...presentRows, ...absentRows].filter(s => String(s.student_id || '').trim());
  }, [result]);

  const manualRowsWithState = useMemo(() => {
    return manualRows.map(row => {
      const sid = String(row.student_id || '').trim();
      const currentStatus = String(manualStatusById[sid] || row._defaultStatus || 'ABSENT').toUpperCase();
      const defaultStatus = String(row._defaultStatus || 'ABSENT').toUpperCase();
      return {
        ...row,
        _currentStatus: currentStatus as 'PRESENT' | 'ABSENT',
        _defaultStatus: defaultStatus as 'PRESENT' | 'ABSENT',
        _changed: currentStatus !== defaultStatus,
      };
    });
  }, [manualRows, manualStatusById]);

  const manualCounts = useMemo(() => {
    const total = manualRowsWithState.length;
    const present = manualRowsWithState.filter(r => r._currentStatus === 'PRESENT').length;
    const absent = manualRowsWithState.filter(r => r._currentStatus === 'ABSENT').length;
    const changed = manualRowsWithState.filter(r => r._changed).length;
    const review = manualRowsWithState.filter(r => r._changed || r._currentStatus === 'ABSENT').length;
    return { total, present, absent, changed, review };
  }, [manualRowsWithState]);

  const filteredManualRows = useMemo(() => {
    switch (manualFilter) {
      case 'review': return manualRowsWithState.filter(r => r._changed || r._currentStatus === 'ABSENT');
      case 'present': return manualRowsWithState.filter(r => r._currentStatus === 'PRESENT');
      case 'absent': return manualRowsWithState.filter(r => r._currentStatus === 'ABSENT');
      case 'changed': return manualRowsWithState.filter(r => r._changed);
      default: return manualRowsWithState;
    }
  }, [manualFilter, manualRowsWithState]);

  useEffect(() => {
    if (!manualRows.length) {
      setManualStatusById({});
      return;
    }
    const next: Record<string, string> = {};
    for (const row of manualRows) {
      const sid = String(row.student_id || '').trim();
      if (sid) next[sid] = row._defaultStatus;
    }
    setManualStatusById(next);
    setManualFilter('review');
  }, [manualRows]);

  const manualHasChanges = manualRowsWithState.some(row => row._changed);
  const attendanceRate = useMemo(() => {
    if (!result?.summary?.total_students) return 0;
    return Math.round((result.summary.present_count / result.summary.total_students) * 100);
  }, [result]);

  const handleClassChange = (className: string) => {
    setForm(prev => ({ ...prev, class_grade: className, section: '' }));
    setSelectedClassKey('');
  };

  const handleSectionChange = (section: string) => {
    setForm(prev => ({ ...prev, section }));
    const selected = assignedClassOptions.find(opt => opt.class_grade === form.class_grade && opt.section === section);
    if (selected) setSelectedClassKey(selected.key);
  };

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        icon={toast.icon}
        color={toast.color}
        onClose={hideToast}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
      >
        {/* Camera View */}
        {cameraActive && hasPermission && device && (
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={cameraActive}
              photo={true}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraStep}>
                {cameraUse === 'teacher' ? 'Teacher Verification' : `Image ${studentImages.length + 1}/3`}
              </Text>
              <View style={styles.cameraControls}>
                {cameraUse === 'student' && studentImages.length > 0 && (
                  <TouchableOpacity style={styles.cameraDoneBtn} onPress={() => stopCamera()}>
                    <Text style={styles.cameraDoneText}>✓ DONE ({studentImages.length})</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cameraCaptureBtn}
                  onPress={cameraUse === 'teacher' ? handleTeacherCapture : handleStudentCapture}
                >
                  <Text style={styles.cameraCaptureText}>📸</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.closeCameraBtn} onPress={stopCamera}>
              <Text style={styles.closeCameraText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stepper */}
        <Stepper step={step} />

        {/* Step 1: Teacher Verification */}
        {step === 1 && (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>👨‍🏫 Teacher Face Verification</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Employee ID</Text>
                <TextInput style={styles.input} value={employeeId} editable={false} placeholder="Employee ID" />
              </View>

              {!cameraActive && (
                <View style={styles.buttonRow}>
                  <AppButton title="📷 Start Camera" onPress={() => startCamera('teacher')} />
                  <AppButton title="📁 Upload Photo" onPress={handleTeacherUpload} type="secondary" />
                </View>
              )}

              {cameraActive && cameraUse === 'teacher' && (
                <View style={styles.buttonRow}>
                  <AppButton title="📸 Capture" onPress={handleTeacherCapture} />
                  <AppButton title="❌ Close Camera" onPress={stopCamera} type="secondary" />
                </View>
              )}

              {teacherImage && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: teacherImage }} style={styles.previewImage} />
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>✓ Ready</Text>
                  </View>
                </View>
              )}

              <AppButton
                title={loading ? 'Verifying...' : 'Verify Teacher'}
                onPress={verifyTeacher}
                disabled={loading || !teacherImage}
              />
            </View>
          </AppCard>
        )}

        {/* Step 2: Class Selection */}
        {step === 2 && teacherData && (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>✅ Verified Teacher</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.teacherInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{teacherData.teacher_full_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Employee ID:</Text>
                  <Text style={styles.infoValue}>{teacherData.employee_id}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned Classes:</Text>
                  <Text style={styles.infoValue}>{assignedClasses.length}</Text>
                </View>
              </View>

              {/* Teacher Verification Image Display */}
              {teacherImage && (
                <View style={styles.verificationImageContainer}>
                  <View style={styles.verificationImageHeader}>
                    <View style={styles.verificationCheck}>
                      <Text style={styles.verificationCheckText}>✓</Text>
                    </View>
                    <View>
                      <Text style={styles.verificationTitle}>Teacher Verification Image</Text>
                      <Text style={styles.verificationSubtitle}>
                        Captured for {teacherData.teacher_full_name} verification
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verificationImageWrapper}>
                    <Image source={{ uri: teacherImage }} style={styles.verificationImage} />
                  </View>
                </View>
              )}

              {assignedClasses.length > 0 && (
                <>
                  <Text style={styles.label}>Select Class for Attendance</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {assignedClassOptions.map(opt => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.chip, selectedClassKey === opt.key && styles.chipActive]}
                          onPress={() => {
                            setSelectedClassKey(opt.key);
                            setForm(prev => ({ ...prev, class_grade: opt.class_grade, section: opt.section }));
                          }}
                        >
                          <Text style={[styles.chipText, selectedClassKey === opt.key && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={styles.buttonRow}>
                <AppButton title="Continue →" onPress={() => setStep(3)} />
                <AppButton title="Start Over" onPress={resetFlow} type="secondary" />
              </View>
            </View>
          </AppCard>
        )}

        {/* Step 3: Student Attendance */}
        {step === 3 && (
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>👥 Student Attendance</Text>
            </View>
            <View style={styles.cardBody}>
              {/* Class Selection */}
              <View style={styles.field}>
                <Text style={styles.label}>Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {effectiveClassOptions.map((c: any) => (
                      <TouchableOpacity
                        key={c.class_name}
                        style={[styles.chip, form.class_grade === c.class_name && styles.chipActive]}
                        onPress={() => handleClassChange(c.class_name)}
                      >
                        <Text style={[styles.chipText, form.class_grade === c.class_name && styles.chipTextActive]}>
                          {c.class_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Section Selection */}
              {form.class_grade && (
                <View style={styles.field}>
                  <Text style={styles.label}>Section</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {effectiveSectionOptions.map((sec: string) => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, form.section === sec && styles.chipActive]}
                          onPress={() => handleSectionChange(sec)}
                        >
                          <Text style={[styles.chipText, form.section === sec && styles.chipTextActive]}>
                            Section {sec}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Date Selection */}
              <View style={styles.field}>
                <Text style={styles.label}>Attendance Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateButtonText}>{form.attendance_date}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(form.attendance_date)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setForm(prev => ({ ...prev, attendance_date: date.toISOString().split('T')[0] }));
                    }}
                  />
                )}
              </View>

              {/* Session Selection (if applicable) */}
              {dailySessions === 2 && (
                <View style={styles.field}>
                  <Text style={styles.label}>Attendance Session</Text>
                  <View style={styles.sessionContainer}>
                    {['1', '2'].map(session => (
                      <TouchableOpacity
                        key={session}
                        style={[styles.sessionChip, form.attendance_session === session && styles.sessionChipActive]}
                        onPress={() => setForm(prev => ({ ...prev, attendance_session: session }))}
                      >
                        <Text style={[styles.sessionText, form.attendance_session === session && styles.sessionTextActive]}>
                          Session {session} ({session === '1' ? 'Morning' : 'Afternoon'})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Capture Buttons */}
              <View style={styles.buttonRow}>
                {!cameraActive && (
                  <AppButton title="📷 Start Camera" onPress={() => startCamera('student')} />
                )}
                {cameraActive && cameraUse === 'student' && (
                  <AppButton title="📸 Capture" onPress={handleStudentCapture} />
                )}
                <AppButton title="📁 Upload" onPress={handleStudentUpload} type="secondary" />
                {cameraActive && cameraUse === 'student' && (
                  <AppButton title="❌ Stop Camera" onPress={stopCamera} type="secondary" />
                )}
              </View>

              {/* Captured Images Grid */}
              {studentImages.length > 0 && (
                <View style={styles.imageSection}>
                  <Text style={styles.label}>📸 Captured Images ({studentImages.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imageGrid}>
                      {studentImages.map((img, idx) => (
                        <View key={idx} style={styles.imageThumb}>
                          <Image source={{ uri: img }} style={styles.thumbImage} />
                          <TouchableOpacity style={styles.removeBtn} onPress={() => removeStudentImage(idx)}>
                            <Text style={styles.removeBtnText}>✕</Text>
                          </TouchableOpacity>
                          <Text style={styles.imageLabel}>Image {idx + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <AppButton
                  title={loading ? 'Processing...' : 'Scan / Preview'}
                  onPress={processAttendance}
                  disabled={loading || !studentImagesCaptured || !form.class_grade || !form.section}
                />
                <AppButton title="Back" onPress={() => setStep(2)} type="secondary" />
              </View>
            </View>
          </AppCard>
        )}

        {/* Step 4: Results */}
        {step === 4 && result && (
          <>
            {/* Summary Grid */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{result.summary.total_students}</Text>
                <Text style={styles.summaryLabel}>Total Students</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{result.summary.present_count}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{result.summary.absent_count}</Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{attendanceRate}%</Text>
                <Text style={styles.summaryLabel}>Attendance Rate</Text>
              </View>
            </View>

            {/* Manual Review Section */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Manual Review</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.manualStrip}>
                  <Text style={styles.manualText}>
                    {manualHasChanges ? `${manualCounts.changed} row(s) changed manually` : 'No manual changes detected'}
                  </Text>
                  <View style={styles.manualStats}>
                    <StatusBadge status="present" />
                    <Text>{manualCounts.present}</Text>
                    <StatusBadge status="absent" />
                    <Text>{manualCounts.absent}</Text>
                    {manualHasChanges && <StatusBadge status="changed" />}
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterBar}>
                    {['review', 'all', 'present', 'absent', 'changed'].map(filter => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.filterPill, manualFilter === filter && styles.filterPillActive]}
                        onPress={() => setManualFilter(filter)}
                      >
                        <Text style={[styles.filterText, manualFilter === filter && styles.filterTextActive]}>
                          {filter} ({manualCounts[filter as keyof typeof manualCounts]})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.buttonRow}>
                  <AppButton
                    title={manualMode ? 'Hide Manual Edit' : 'Open Manual Edit (Optional)'}
                    onPress={() => setManualMode(!manualMode)}
                    type="secondary"
                  />
                  {manualHasChanges && (
                    <AppButton title="Reset to Scan Result" onPress={() => {
                      if (manualRows.length) {
                        const next: Record<string, string> = {};
                        for (const row of manualRows) {
                          const sid = String(row.student_id || '').trim();
                          if (sid) next[sid] = row._defaultStatus;
                        }
                        setManualStatusById(next);
                      }
                    }} type="secondary" />
                  )}
                </View>

                {manualMode && (
                  <>
                    <ScrollView horizontal>
                      <View>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderText, styles.colRoll]}>Roll</Text>
                          <Text style={[styles.tableHeaderText, styles.colName]}>Name</Text>
                          <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
                        </View>
                        {filteredManualRows.map(item => {
                          const isPresent = item._currentStatus === 'PRESENT';
                          return (
                            <View key={item.student_id} style={[styles.tableRow, isPresent ? styles.rowPresent : styles.rowAbsent, item._changed && styles.rowChanged]}>
                              <Text style={[styles.tableCell, styles.colRoll]}>{item.roll || '-'}</Text>
                              <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
                              <View style={[styles.tableCell, styles.colStatus]}>
                                <View style={styles.statusSelector}>
                                  <TouchableOpacity
                                    style={[styles.statusOption, isPresent && styles.statusOptionActive]}
                                    onPress={() => setManualStatusById(prev => ({ ...prev, [item.student_id]: 'PRESENT' }))}
                                  >
                                    <Text style={[styles.statusOptionText, isPresent && styles.statusOptionTextActive]}>P</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.statusOption, !isPresent && styles.statusOptionActive]}
                                    onPress={() => setManualStatusById(prev => ({ ...prev, [item.student_id]: 'ABSENT' }))}
                                  >
                                    <Text style={[styles.statusOptionText, !isPresent && styles.statusOptionTextActive]}>A</Text>
                                  </TouchableOpacity>
                                </View>
                                {item._changed && <StatusBadge status="changed" />}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <AppButton
                      title={manualSaving ? 'Saving...' : (manualHasChanges ? 'Save Manual Attendance' : 'Save Image Attendance')}
                      onPress={saveAttendance}
                      disabled={manualSaving}
                    />
                  </>
                )}
              </View>
            </AppCard>

            {/* Present/Absent Lists */}
            <View style={styles.resultGrid}>
              {/* Present Students */}
              <AppCard style={styles.resultCard}>
                <View style={styles.resultCardHeader}>
                  <View style={[styles.resultIcon, styles.resultIconGreen]}>
                    <Text style={styles.resultIconText}>✓</Text>
                  </View>
                  <View>
                    <Text style={styles.resultTitle}>Present Students</Text>
                    <Text style={styles.resultSubtitle}>{result.present?.length || 0} student(s)</Text>
                  </View>
                </View>
                {!result.present?.length ? (
                  <Text style={styles.resultEmpty}>No present students detected</Text>
                ) : (
                  <ScrollView horizontal>
                    <View>
                      <View style={styles.miniTableHeader}>
                        <Text style={[styles.miniTableHeaderText, styles.colRollMini]}>Roll</Text>
                        <Text style={[styles.miniTableHeaderText, styles.colNameMini]}>Student</Text>
                      </View>
                      {result.present.map((student, idx) => (
                        <View key={idx} style={styles.miniTableRow}>
                          <Text style={[styles.miniTableCell, styles.colRollMini]}>{student.roll || '-'}</Text>
                          <Text style={[styles.miniTableCell, styles.colNameMini]}>{student.name}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </AppCard>

              {/* Absent Students */}
              <AppCard style={styles.resultCard}>
                <View style={styles.resultCardHeader}>
                  <View style={[styles.resultIcon, styles.resultIconRed]}>
                    <Text style={styles.resultIconText}>✗</Text>
                  </View>
                  <View>
                    <Text style={styles.resultTitle}>Absent Students</Text>
                    <Text style={styles.resultSubtitle}>{result.absent?.length || 0} student(s)</Text>
                  </View>
                </View>
                {!result.absent?.length ? (
                  <Text style={styles.resultEmpty}>No absent students</Text>
                ) : (
                  <ScrollView horizontal>
                    <View>
                      <View style={styles.miniTableHeader}>
                        <Text style={[styles.miniTableHeaderText, styles.colRollMini]}>Roll</Text>
                        <Text style={[styles.miniTableHeaderText, styles.colNameMini]}>Student</Text>
                      </View>
                      {result.absent.map((student, idx) => (
                        <View key={idx} style={styles.miniTableRow}>
                          <Text style={[styles.miniTableCell, styles.colRollMini]}>{student.roll || '-'}</Text>
                          <Text style={[styles.miniTableCell, styles.colNameMini]}>{student.name}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </AppCard>

              {/* Duplicate Students */}
              {result.duplicates && result.duplicates.length > 0 && (
                <AppCard style={styles.resultCard}>
                  <View style={styles.resultCardHeader}>
                    <View style={[styles.resultIcon, styles.resultIconAmber]}>
                      <Text style={styles.resultIconText}>⚠</Text>
                    </View>
                    <View>
                      <Text style={styles.resultTitle}>Duplicate Students</Text>
                      <Text style={styles.resultSubtitle}>{result.duplicates.length} student(s)</Text>
                    </View>
                  </View>
                  <ScrollView horizontal>
                    <View>
                      <View style={styles.miniTableHeader}>
                        <Text style={[styles.miniTableHeaderText, styles.colRollMini]}>Roll</Text>
                        <Text style={[styles.miniTableHeaderText, styles.colNameMini]}>Student</Text>
                      </View>
                      {result.duplicates.map((student, idx) => (
                        <View key={idx} style={styles.miniTableRow}>
                          <Text style={[styles.miniTableCell, styles.colRollMini]}>{student.roll || '-'}</Text>
                          <Text style={[styles.miniTableCell, styles.colNameMini]}>{student.name}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </AppCard>
              )}
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                Date: {result.date || form.attendance_date} • Unknown Faces: {result.summary?.unknown_faces_count || 0} • Faces Detected: {result.summary?.total_faces_detected || 0}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <AppButton title="Save Attendance" onPress={saveAttendance} disabled={manualSaving} />
              <AppButton
                title="Process Again"
                onPress={() => {
                  setResult(null);
                  setManualMode(false);
                  setManualStatusById({});
                  setStep(3);
                }}
                type="secondary"
              />
              <AppButton title="Start New Session" onPress={resetFlow} type="secondary" />
            </View>
          </>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={showPreview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Image</Text>
            {previewImage && <Image source={{ uri: previewImage }} style={styles.modalImage} />}
            <View style={styles.modalButtons}>
              <AppButton title="Retake" onPress={retakeImage} type="secondary" />
              <AppButton title="Confirm" onPress={confirmStudentImage} />
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
    backgroundColor: '#f8fbff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e4e9f2',
    zIndex: 1,
  },
  stepDone: {
    backgroundColor: '#059669',
  },
  stepActive: {
    backgroundColor: '#2563eb',
    borderWidth: 2.5,
    borderColor: '#2563eb',
  },
  stepIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepNumber: {
    color: '#4a5568',
    fontSize: 13,
    fontWeight: '800',
  },
  stepNumberActive: {
    color: '#2563eb',
  },
  stepLabel: {
    fontSize: 10,
    color: '#8898aa',
    marginTop: 4,
    textAlign: 'center',
    width: 70,
  },
  stepLabelActive: {
    color: '#0d1b2a',
    fontWeight: '700',
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: '#e4e9f2',
    marginHorizontal: 4,
    marginBottom: 20,
  },
  stepConnectorDone: {
    backgroundColor: '#059669',
  },
  toast: {
    position: 'absolute',
    top: 60,
    right: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
  },
  toastIcon: {
    fontSize: 18,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#0d1b2a',
  },
  toastMessage: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 2,
  },
  toastClose: {
    fontSize: 16,
    color: '#94a3b8',
    padding: 4,
  },
  cameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraStep: {
    position: 'absolute',
    top: -80,
    backgroundColor: 'rgba(37,99,235,0.9)',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  cameraControls: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  cameraDoneBtn: {
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  cameraDoneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  cameraCaptureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCaptureText: {
    fontSize: 24,
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCameraText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5',
    backgroundColor: '#f7f9fc',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardBody: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  previewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  previewBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  teacherInfo: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    fontWeight: '700',
    color: '#64748b',
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 13,
  },
  verificationImageContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    borderRadius: 12,
  },
  verificationImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  verificationCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationCheckText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  verificationTitle: {
    fontWeight: '800',
    color: '#15803d',
    fontSize: 14,
  },
  verificationSubtitle: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 2,
  },
  verificationImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  verificationImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  dateButton: {
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#0f172a',
  },
  sessionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    alignItems: 'center',
  },
  sessionChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sessionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  sessionTextActive: {
    color: '#fff',
  },
  imageSection: {
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  imageThumb: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7edf5',
    borderRadius: 16,
    padding: 16,
    minWidth: '30%',
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
  },
  manualStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fbff',
    borderRadius: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  manualText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  manualStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ee',
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterTextActive: {
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    alignItems: 'center',
  },
  tableCell: {
    // Keep shared cell style View-safe; text-specific styles belong on Text nodes.
  },
  colRoll: { width: 60 },
  colName: { width: 120 },
  colStatus: { width: 100 },
  rowPresent: {
    backgroundColor: '#f0fdf4',
  },
  rowAbsent: {
    backgroundColor: '#fef2f2',
  },
  rowChanged: {
    borderWidth: 2,
    borderColor: '#fde68a',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  statusOptionActive: {
    backgroundColor: '#2563eb',
  },
  statusOptionText: {
    fontWeight: '600',
    color: '#475569',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgePresent: {
    backgroundColor: '#dcfce7',
  },
  badgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  badgeChanged: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  resultGrid: {
    gap: 16,
    marginBottom: 16,
  },
  resultCard: {
    overflow: 'hidden',
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafcff',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconGreen: {
    backgroundColor: '#dcfce7',
  },
  resultIconRed: {
    backgroundColor: '#fee2e2',
  },
  resultIconAmber: {
    backgroundColor: '#fef3c7',
  },
  resultIconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  resultEmpty: {
    padding: 16,
    textAlign: 'center',
    color: '#64748b',
  },
  miniTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5',
  },
  miniTableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  miniTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  miniTableCell: {
    fontSize: 13,
    color: '#0f172a',
  },
  colRollMini: { width: 60 },
  colNameMini: { width: 150 },
  infoNote: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoNoteText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});