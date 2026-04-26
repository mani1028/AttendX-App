import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronLeft,
  Camera as CameraIcon,
  Upload,
  UserCheck,
  LayoutGrid,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Clock,
  Calendar
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as teacherService from '../../services/teacherService';
import { colors } from '../../constants/theme';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Step Labels
const stepLabels = ['Auth', 'Verified', 'Setup', 'Result'];

// Status Badge Component
const StatusBadge: React.FC<{ status: 'present' | 'absent' | 'changed' }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'present': return { bg: '#DCFCE7', text: '#15803D', icon: <CheckCircle2 size={12} color="#15803D" /> };
      case 'absent': return { bg: '#FEE2E2', text: '#B91C1C', icon: <XCircle size={12} color="#B91C1C" /> };
      case 'changed': return { bg: '#FEF3C7', text: '#B45309', icon: <Clock size={12} color="#B45309" /> };
    }
  };
  const config = getStyle();
  const getText = () => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'changed': return 'Edited';
    }
  };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.badgeText, { color: config.text }]}>{getText()}</Text>
    </View>
  );
};

// Stepper Component
const Stepper: React.FC<{ step: number }> = ({ step }) => (
  <View style={styles.stepperWrapper}>
    <View style={styles.stepperContainer}>
      {stepLabels.map((label, idx) => {
        const stepNumber = idx + 1;
        const isDone = stepNumber < step;
        const isActive = stepNumber === step;
        return (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                isDone && styles.stepDone,
                isActive && styles.stepActive
              ]}>
                {isDone ? (
                  <CheckCircle2 size={16} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNumber}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} numberOfLines={1}>
                {label}
              </Text>
            </View>
            {idx < stepLabels.length - 1 && (
              <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
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
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    isMounted.current = true;
    const unsubscribe = navigation.addListener('focus', () => {
      setTabBarVisible(true);
    });
    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [navigation, setTabBarVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
      setTabBarVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

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

  // Teacher verification
  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState<string>('');
  
  // Student attendance
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [manualStatusById, setManualStatusById] = useState<Record<string, string>>({});
  const [manualFilter, setManualFilter] = useState<string>('review');
  const [manualSaving, setManualSaving] = useState<boolean>(false);

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
  }, [form, studentImages, result, step, schoolCode, branchId, employeeId]);

  // Load credentials and permissions
  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const eid = await getEmployeeId();
        if (!isMounted.current) return;
        setSchoolCode(code);
        setBranchId(bid);
        setEmployeeId(eid);
        setForm(prev => ({ ...prev, employee_id: eid, branch_id: bid }));

        const sessionKey = `teacher_session_${eid}_${code}`;
        const attendanceCacheKey = `teacher_attendance_cache_${code}_${bid}_${eid}`;

        const [cachedSession, cachedAttendance] = await Promise.all([
          AsyncStorage.getItem(sessionKey),
          AsyncStorage.getItem(attendanceCacheKey)
        ]);

        if (!isMounted.current) return;

        if (cachedSession) {
          const sessionData = JSON.parse(cachedSession);
          setTeacherData(sessionData.teacher_data);
          setAssignedClasses(sessionData.assigned_classes);
        }

        if (cachedAttendance) {
          const state = JSON.parse(cachedAttendance);
          if (state.form) setForm(prev => ({ ...prev, ...state.form }));
          if (state.studentImages) setStudentImages(state.studentImages);
          if (state.result) setResult(state.result);
          if (state.step) setStep(state.step);
        }

        if (code && bid) {
          const data = await teacherService.getAttendanceSettings({ 'X-School-Code': code, 'X-Branch-Id': bid });
          if (isMounted.current) {
            setDailySessions(data?.daily_sessions === 2 ? 2 : 1);
          }
        }
      } catch (e) {
        console.warn('Failed to load teacher attendance cache', e);
      }
    };
    load();
    
    Camera.requestCameraPermission().then(permission => {
      if (isMounted.current) {
        setHasPermission(permission === 'authorized');
      }
    });
  }, []);

  // Load classes
  const loadClasses = useCallback(async () => {
    if (!branchId || !schoolCode) return;
    try {
      const data = await teacherService.getClassesSections(branchId, schoolCode);
      if (isMounted.current) {
        setClassOptions(data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }, [branchId, schoolCode]);

  useEffect(() => {
    if (branchId && schoolCode) {
      loadClasses();
    }
  }, [branchId, schoolCode, loadClasses]);

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
    setCameraUse(useFor);
    setCameraActive(true);
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const handleTeacherCapture = async () => {
    const img = await captureImage();
    if (img && isMounted.current) {
      setTeacherImage(img);
      showToast('Photo captured', 'Teacher image is ready', '✅', '#22C55E');
    }
  };

  const handleTeacherUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0].uri) {
        setTeacherImage(response.assets[0].uri);
      }
    });
  };

  const handleStudentCapture = async () => {
    const img = await captureImage();
    if (img) {
      setPreviewImage(img);
      setShowPreview(true);
      stopCamera();
    }
  };

  const handleStudentUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0]?.uri) {
        setPreviewImage(response.assets[0].uri);
        setShowPreview(true);
      }
    });
  };

  const confirmStudentImage = async () => {
    if (previewImage) {
      setStudentImages(prev => [...prev, previewImage]);
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
  };

  const verifyTeacher = async () => {
    if (!teacherImage) return;
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

      const data = await teacherService.verifyTeacher(formData);

      if (!isMounted.current) return;

      const assigned = data.assigned_classes || [];
      setTeacherData(data);
      setAssignedClasses(assigned);
      
      const sessionKey = `teacher_session_${employeeId}_${schoolCode}`;
      await AsyncStorage.setItem(sessionKey, JSON.stringify({
        teacher_data: data,
        assigned_classes: assigned,
        timestamp: new Date().getTime()
      }));

      if (!isMounted.current) return;

      await loadClasses();

      if (!isMounted.current) return;

      if (assigned.length === 1) {
        const first = assigned[0];
        setSelectedClassKey(`${first.class_grade}__${first.section}`);
        setForm(prev => ({ ...prev, class_grade: first.class_grade, section: first.section }));
      }

      setCameraActive(false); // instead of stopCamera() to be explicit
      setTeacherImage(null);
      setStudentImages([]);
      setStep(2);
      showToast('Identity verified!', `Welcome, ${data.teacher_full_name}`, '✅', '#22C55E');
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (!isMounted.current) return;
      Alert.alert('Verification Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const processAttendance = async () => {
    if (studentImages.length === 0 || !form.class_grade || !form.section) return;
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
      const data = await teacherService.processAttendance(payload);
      if (!isMounted.current) return;
      setResult(data);
      setStep(4);
      showToast('Attendance scanned', 'Review and save', '📊', '#22C55E');
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (!isMounted.current) return;
      Alert.alert('Processing Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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

      if (Object.keys(manualStatusById).length > 0) {
        const manualAttendance = manualRows.map(row => ({
          student_id: row.student_id,
          status: manualStatusById[row.student_id] || row._defaultStatus,
        }));
        payload.manual_attendance = JSON.stringify(manualAttendance);
      }

      await teacherService.processAttendance(payload);
      if (isMounted.current) {
        Alert.alert('Success', 'Attendance saved successfully', [{ text: 'OK', onPress: resetFlow }]);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      if (!isMounted.current) return;
      Alert.alert('Save Failed', err?.response?.data?.detail || 'Please try again');
    } finally {
      if (isMounted.current) {
        setManualSaving(false);
      }
    }
  };

  const resetFlow = async () => {
    setStep(1);
    setTeacherImage(null);
    setTeacherData(null);
    setAssignedClasses([]);
    setStudentImages([]);
    setResult(null);
    setManualStatusById({});
    setForm({
      employee_id: employeeId,
      branch_id: branchId,
      class_grade: '',
      section: '',
      attendance_date: new Date().toISOString().split('T')[0],
      attendance_session: '1',
    });
    const cacheKey = `teacher_attendance_cache_${schoolCode}_${branchId}_${employeeId}`;
    try { await AsyncStorage.removeItem(cacheKey); } catch (e) {}
  };

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
    return { all: total, present, absent, changed, review };
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
          <Text style={styles.heroTitle}>Mark Attendance</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroGreeting}>Scan Attendance</Text>
          <Text style={styles.heroSubtext}>AI-powered facial recognition for student attendance</Text>
        </View>
      </View>

      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        icon={toast.icon}
        color={toast.color}
        onClose={hideToast}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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
                  <CameraIcon size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.closeCameraBtn} onPress={stopCamera}>
              <XCircle size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Stepper */}
        <Stepper step={step} />

        {/* Step 1: Teacher Verification */}
        {step === 1 && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <UserCheck size={20} color="#001F3F" />
              <Text style={styles.cardTitle}>Teacher Verification</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Employee ID</Text>
                <TextInput style={styles.input} value={employeeId} editable={false} placeholder="Employee ID" />
              </View>

              {!cameraActive && (
                <View style={styles.buttonGrid}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#001F3F' }]} onPress={() => startCamera('teacher')}>
                    <CameraIcon size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Open Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]} onPress={handleTeacherUpload}>
                    <Upload size={20} color="#001F3F" />
                    <Text style={[styles.actionBtnText, { color: '#001F3F' }]}>Upload Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {teacherImage && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: teacherImage }} style={styles.previewImage} />
                  <View style={styles.previewBadge}>
                    <CheckCircle2 size={12} color="#fff" />
                    <Text style={styles.previewBadgeText}>Ready</Text>
                  </View>
                </View>
              )}

              <AppButton
                title={loading ? 'Verifying...' : 'Verify Identity'}
                onPress={verifyTeacher}
                disabled={loading || !teacherImage}
                style={styles.primaryButton}
              />
            </View>
          </AppCard>
        )}

        {/* Step 2: Class Selection */}
        {step === 2 && teacherData && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <CheckCircle2 size={20} color="#10B981" />
              <Text style={styles.cardTitle}>Teacher Verified</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.teacherInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{teacherData.teacher_full_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Employee ID</Text>
                  <Text style={styles.infoValue}>{teacherData.employee_id}</Text>
                </View>
              </View>

              {assignedClasses.length > 0 && (
                <View style={styles.field}>
                  <Text style={styles.label}>Select Assigned Class</Text>
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
                </View>
              )}

              <View style={styles.buttonRow}>
                <AppButton title="Continue →" onPress={() => setStep(3)} style={[styles.primaryButton, { flex: 1 }]} />
                <AppButton title="Reset" onPress={resetFlow} type="secondary" style={{ flex: 1 }} />
              </View>
            </View>
          </AppCard>
        )}

        {/* Step 3: Student Attendance */}
        {step === 3 && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <LayoutGrid size={20} color="#001F3F" />
              <Text style={styles.cardTitle}>Attendance Configuration</Text>
            </View>

            <View style={styles.cardBody}>
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
                          Class {c.class_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

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

              <View style={styles.field}>
                <Text style={styles.label}>Attendance Date</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={16} color="#64748B" />
                  <Text style={styles.dateSelectorText}>{form.attendance_date}</Text>
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

              <View style={styles.imageGridHeader}>
                <Text style={styles.label}>Student Images</Text>
                <Text style={styles.imageCount}>{studentImages.length}/3</Text>
              </View>

              {!cameraActive && (
                <View style={styles.buttonGrid}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#001F3F' }]}
                    onPress={() => startCamera('student')}
                    disabled={studentImages.length >= 3}
                  >
                    <CameraIcon size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Capture Students</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
                    onPress={handleStudentUpload}
                    disabled={studentImages.length >= 3}
                  >
                    <Upload size={20} color="#001F3F" />
                    <Text style={[styles.actionBtnText, { color: '#001F3F' }]}>Upload</Text>
                  </TouchableOpacity>
                </View>
              )}

              {studentImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                  {studentImages.map((img, idx) => (
                    <View key={idx} style={styles.thumbWrapper}>
                      <Image source={{ uri: img }} style={styles.thumbImg} />
                      <TouchableOpacity style={styles.thumbRemove} onPress={() => removeStudentImage(idx)}>
                        <XCircle size={18} color="#EF4444" fill="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={styles.buttonRow}>
                <AppButton
                  title={loading ? 'Scanning...' : 'Scan / Preview'}
                  onPress={processAttendance}
                  disabled={loading || studentImages.length === 0 || !form.class_grade || !form.section}
                  style={[styles.primaryButton, { flex: 2 }]}
                />
                <AppButton title="Back" onPress={() => setStep(2)} type="secondary" style={{ flex: 1 }} />
              </View>
            </View>
          </AppCard>
        )}

        {/* Step 4: Results */}
        {step === 4 && result && (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.miniStatCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.miniStatVal}>{result.summary.total_students}</Text>
                <Text style={styles.miniStatLabel}>Total</Text>
              </View>
              <View style={[styles.miniStatCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.miniStatVal}>{result.summary.present_count}</Text>
                <Text style={styles.miniStatLabel}>Present</Text>
              </View>
              <View style={[styles.miniStatCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.miniStatVal}>{result.summary.absent_count}</Text>
                <Text style={styles.miniStatLabel}>Absent</Text>
              </View>
              <View style={[styles.miniStatCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.miniStatVal}>{attendanceRate}%</Text>
                <Text style={styles.miniStatLabel}>Rate</Text>
              </View>
            </View>

            <AppCard style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <AlertCircle size={20} color="#F59E0B" />
                <Text style={styles.cardTitle}>Manual Review</Text>
              </View>

              <View style={styles.cardBody}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {['review', 'all', 'present', 'absent', 'changed'].map(filter => (
                    <TouchableOpacity
                      key={filter}
                      style={[styles.filterChip, manualFilter === filter && styles.filterChipActive]}
                      onPress={() => setManualFilter(filter)}
                    >
                      <Text style={[styles.filterChipText, manualFilter === filter && styles.filterChipTextActive]}>
                        {filter.charAt(0).toUpperCase() + filter.slice(1)} ({manualCounts[filter as keyof typeof manualCounts]})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.tableWrapper}>
                  <View style={styles.tHeader}>
                    <Text style={[styles.tHead, { width: 40 }]}>#</Text>
                    <Text style={[styles.tHead, { flex: 1 }]}>Student Name</Text>
                    <Text style={[styles.tHead, { width: 80, textAlign: 'center' }]}>Status</Text>
                  </View>

                  {filteredManualRows.map((item, idx) => (
                    <View key={item.student_id} style={styles.tRow}>
                      <Text style={[styles.tCell, { width: 40, color: '#94A3B8' }]}>{item.roll || idx + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tCellName}>{item.name}</Text>
                        {item._changed && <Text style={styles.changedText}>• Manually Edited</Text>}
                      </View>
                      <View style={styles.statusToggle}>
                        <TouchableOpacity
                          style={[styles.toggleBtn, item._currentStatus === 'PRESENT' && styles.toggleBtnP]}
                          onPress={() => setManualStatusById(prev => ({ ...prev, [item.student_id]: 'PRESENT' }))}
                        >
                          <Text style={[styles.toggleText, item._currentStatus === 'PRESENT' && styles.toggleTextActive]}>P</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleBtn, item._currentStatus === 'ABSENT' && styles.toggleBtnA]}
                          onPress={() => setManualStatusById(prev => ({ ...prev, [item.student_id]: 'ABSENT' }))}
                        >
                          <Text style={[styles.toggleText, item._currentStatus === 'ABSENT' && styles.toggleTextActive]}>A</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.buttonRow}>
                   <AppButton
                    title={manualSaving ? 'Saving...' : 'Finalize & Save'}
                    onPress={saveAttendance}
                    disabled={manualSaving}
                    style={[styles.primaryButton, { flex: 1 }]}
                    icon={<Save size={20} color="#fff" />}
                  />
                  <TouchableOpacity style={styles.retryBtn} onPress={() => setStep(3)}>
                    <RefreshCw size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          </>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={showPreview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Capture</Text>
              <TouchableOpacity onPress={retakeImage}>
                <XCircle size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {previewImage && <Image source={{ uri: previewImage }} style={styles.modalImage} />}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={retakeImage}>
                <Text style={styles.modalBtnTextSecondary}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={confirmStudentImage}>
                <Text style={styles.modalBtnTextPrimary}>Use Photo</Text>
              </TouchableOpacity>
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
    height: 180,
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
    marginTop: 20,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  stepperWrapper: {
    marginTop: -30,
    marginBottom: 20,
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepActive: {
    backgroundColor: '#001F3F',
  },
  stepDone: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#001F3F',
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: '#F1F5F9',
    marginTop: -15,
  },
  stepConnectorDone: {
    backgroundColor: '#10B981',
  },
  mainCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 0,
    elevation: 2,
    shadowOpacity: 0.05,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardBody: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  previewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#001F3F',
    borderRadius: 12,
    height: 50,
  },
  teacherInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#0C4A6E',
    fontWeight: '700',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  dateSelectorText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  imageGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageCount: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  thumbScroll: {
    marginBottom: 16,
  },
  thumbWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  thumbRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  miniStatCard: {
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowOpacity: 0.05,
  },
  miniStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#001F3F',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tHead: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tCell: {
    fontSize: 13,
    fontWeight: '600',
  },
  tCellName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  changedText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
    marginTop: 1,
  },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    width: 80,
  },
  toggleBtn: {
    flex: 1,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  toggleBtnP: {
    backgroundColor: '#10B981',
  },
  toggleBtnA: {
    backgroundColor: '#EF4444',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  toggleTextActive: {
    color: '#fff',
  },
  retryBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
    zIndex: 9999,
    borderLeftWidth: 5,
  },
  toastIcon: { fontSize: 24, marginRight: 12 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  toastMessage: { fontSize: 12, color: '#64748B', marginTop: 2 },
  toastClose: { color: '#CBD5E1', fontSize: 18, padding: 4 },
  cameraContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraStep: {
    backgroundColor: 'rgba(0,31,63,0.8)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  cameraCaptureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraDoneBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cameraDoneText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  closeCameraBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalImage: { width: '100%', height: 300, borderRadius: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnPrimary: { backgroundColor: '#001F3F' },
  modalBtnSecondary: { backgroundColor: '#F1F5F9' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '700' },
  modalBtnTextSecondary: { color: '#64748B', fontWeight: '700' },
});
