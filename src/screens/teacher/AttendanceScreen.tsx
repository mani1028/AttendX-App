import { useScrollTabBar } from '../../hooks/useScrollTabBar';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { useCameraDevice, Camera } from 'react-native-vision-camera';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  Calendar,
  Bell,
  RefreshCcw,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as teacherService from '../../services/teacherService';
import { Theme } from '../../theme/tokens';
const colors = Theme.colors;
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import CustomPickerModal from '../../components/common/CustomPickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface TeacherData {
  employee_id: string;
  teacher_full_name: string;
  branch_id: string;
  enable_video_attendance?: boolean | string;
  is_class_teacher?: boolean;
  teacher_type?: string;
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
  per_frame_results?: any[];
  date?: string;
}

// Helper functions
const getTodayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const cleanBase64 = (base64: string): string => {
  if (!base64) {return '';}
  return base64.replace(/^data:image\/\w+;base64,/, '');
};

const MAX_STUDENT_IMAGES = 5;

// Step Labels
const stepLabels = ['Teacher Auth', 'Verified', 'Student Setup', 'Review & Save'];

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
      <AppText style={[styles.badgeText, { color: config.text }]}>{getText()}</AppText>
    </View>
  );
};

// Stepper Component
const Stepper: React.FC<{ step: number; isClassTeacher: boolean }> = ({ step, isClassTeacher }) => {
  const currentStepLabels = isClassTeacher
    ? ['Teacher Auth', 'Verified', 'Student Setup', 'Review & Save']
    : ['Teacher Auth', 'Verified'];

  return (
    <View style={styles.stepperWrapper}>
      <View style={styles.stepperContainer}>
        {currentStepLabels.map((label, idx) => {
          const stepNumber = idx + 1;
          const isDone = stepNumber < step;
          const isActive = stepNumber === step;
          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isDone && styles.stepDone,
                  isActive && styles.stepActive,
                ]}>
                  {isDone ? (
                    <CheckCircle2 size={16} color={Theme.colors.card} />
                  ) : (
                    <AppText style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{stepNumber}</AppText>
                  )}
                </View>
                <AppText style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} numberOfLines={1}>
                  {label}
                </AppText>
              </View>
              {idx < currentStepLabels.length - 1 && (
                <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

// Toast Component
const Toast: React.FC<{
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
  onClose: () => void;
}> = ({ visible, title, message, icon = 'ℹ️', color = '#6648dc', onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) {return null;}

  return (
    <View style={[styles.toast, { borderLeftColor: color }]}>
      <AppText style={styles.toastIcon}>{icon}</AppText>
      <View style={styles.toastContent}>
        <AppText style={styles.toastTitle}>{title}</AppText>
        {message && <AppText style={styles.toastMessage}>{message}</AppText>}
      </View>
      <TouchableOpacity onPress={onClose}>
        <AppText style={styles.toastClose}>✕</AppText>
      </TouchableOpacity>
    </View>
  );
};

// Global safety check for Vision Camera native module
const isCameraAvailable = typeof Camera !== 'undefined' && Camera !== null;

// Separate component to safely call useCameraDevice hook.
// Must only render when isCameraAvailable is true, otherwise the hook crashes.
const CameraDeviceResolver = React.memo(({ position, onDevice }: { position: 'back' | 'front'; onDevice: (d: any) => void }) => {
  const device = useCameraDevice(position);
  React.useEffect(() => { onDevice(device); }, [device]);
  return null;
});

// Wrap CameraDeviceResolver so the native module crash is caught locally
// instead of killing the entire screen.
const SafeCameraDeviceResolver = React.memo(({ position, onDevice }: { position: 'back' | 'front'; onDevice: (d: any) => void }) => (
  <ErrorBoundary fallback={null}>
    <CameraDeviceResolver position={position} onDevice={onDevice} />
  </ErrorBoundary>
));
SafeCameraDeviceResolver.displayName = 'SafeCameraDeviceResolver';

export default function TeacherAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible, userRole } = useAuth();
  const isTeacherRole = userRole?.toLowerCase().includes('teacher');
  const isMounted = useRef(true);
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [videoAttendanceEnabled, setVideoAttendanceEnabled] = useState<boolean>(false);
  const [attendanceInputMode, setAttendanceInputMode] = useState<'image' | 'video'>('image');

  // Camera
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraUse, setCameraUse] = useState<'teacher' | 'student'>('teacher');
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');

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

  // Hide the app tab bar while the camera view is active so only the camera is visible
  useEffect(() => {
    try {
      setTabBarVisible(!cameraActive);
    } catch (e) {
      // ignore
    }
  }, [cameraActive, setTabBarVisible]);
  const handleScroll = useScrollTabBar();

  const cameraRef = useRef<Camera>(null);

  // useCameraDevice must be called unconditionally (React hooks rules).
  // We use a separate CameraDeviceResolver component that only mounts when
  // the native module is available, avoiding the null-crash on Android.
  const [_resolvedDevice, setResolvedDevice] = useState<any>(undefined);
  const device = isCameraAvailable ? _resolvedDevice : undefined;

  // Form
  const [form, setForm] = useState({
    employee_id: '',
    branch_id: '',
    class_grade: '',
    section: '',
    attendance_date: getTodayDateString(),
    attendance_session: '1',
  });
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [dailySessions, setDailySessions] = useState<number>(1);
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; options: { label: string; value: any }[]; selectedValue: any; onValueChange: (value: any) => void } | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string } | null>(null);

  // Class/Section options
  const [classOptions, setClassOptions] = useState<any[]>([]);

  // Teacher verification
  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState<string>('');
  const [enableManualAttendance, setEnableManualAttendance] = useState<boolean>(false);

  // Student attendance
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [manualStatusById, setManualStatusById] = useState<Record<string, string>>({});
  const [manualFilter, setManualFilter] = useState<string>('review');
  const [manualSaving, setManualSaving] = useState<boolean>(false);
  const [sessionMarked, setSessionMarked] = useState({ session1: false, session2: false });
  const [viewingGallery, setViewingGallery] = useState<boolean>(false);
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

  // Helper function to check if current session is already marked
  const isCurrentSessionMarked = useCallback(() => {
    const currentSession = parseInt(form.attendance_session || '1', 10);
    return currentSession === 1 ? sessionMarked.session1 : sessionMarked.session2;
  }, [form.attendance_session, sessionMarked]);

  // Check session marked status
  const checkSessionMarkedStatus = useCallback(async () => {
    const activeSchoolCode = schoolCode || (await getSchoolCode());
    const activeEmployeeId = String(teacherData?.employee_id || employeeId || (await getEmployeeId()) || '').trim();

    if (!activeSchoolCode || !activeEmployeeId) {return;}

    try {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      const items = await teacherService.getTeacherMyAttendance({
        school_code: activeSchoolCode,
        employee_id: activeEmployeeId,
        month,
        year,
      });
      const todayDate = getTodayDateString();
      const todayAttendance = items.find(
        (item: any) => (item.date || item.attendance_date) === todayDate,
      );

      if (todayAttendance) {
        setSessionMarked({
          session1: todayAttendance.session1_status === 'PRESENT',
          session2: todayAttendance.session2_status === 'PRESENT',
        });
      }
    } catch (err) {
      console.error('Error checking session status:', err);
    }
  }, [schoolCode, employeeId, teacherData]);

  // Persist attendance state
  useEffect(() => {
    const persist = async () => {
      if (!schoolCode || !employeeId) {return;}
      const cacheKey = `teacher_attendance_cache_${schoolCode}_${branchId}_${employeeId}`;
      try {
        const state = {
          form,
          studentImages,
          result,
          step,
          teacherData,
          assignedClasses,
          timestamp: new Date().getTime(),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist attendance state', e);
      }
    };
    const timer = setTimeout(persist, 1000);
    return () => clearTimeout(timer);
  }, [form, studentImages, result, step, teacherData, assignedClasses, schoolCode, branchId, employeeId]);

  // Load credentials and permissions
  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const eid = await getEmployeeId();
        const classTeacherFlag = await AsyncStorage.getItem('is_class_teacher');
        if (!isMounted.current) {return;}
        setSchoolCode(code);
        setBranchId(bid);
        setEmployeeId(eid);
        setIsClassTeacher(classTeacherFlag === '1' || String(classTeacherFlag).toLowerCase() === 'true');
        setForm(prev => ({ ...prev, employee_id: eid, branch_id: bid }));

        const sessionKey = `teacher_session_${eid}_${code}`;
        const attendanceCacheKey = `teacher_attendance_cache_${code}_${bid}_${eid}`;

        const [cachedSession, cachedAttendance] = await Promise.all([
          AsyncStorage.getItem(sessionKey),
          AsyncStorage.getItem(attendanceCacheKey),
        ]);

        if (!isMounted.current) {return;}

        if (cachedSession) {
          const sessionData = JSON.parse(cachedSession);
          setTeacherData(sessionData?.teacher_data || null);
          setAssignedClasses(Array.isArray(sessionData?.assigned_classes) ? sessionData.assigned_classes.filter(Boolean) : []);
        }

        if (cachedAttendance) {
          const state = JSON.parse(cachedAttendance);
          if (state?.form) {
            setForm(prev => ({
              ...prev,
              ...state.form,
              attendance_date: getTodayDateString(), // Always force today's date
            }));
          }
          if (Array.isArray(state?.studentImages)) {setStudentImages(state.studentImages.filter(Boolean));}
          if (state?.result) {setResult(state.result);}
          if (state?.step) {setStep(state.step);}
          if (state?.teacherData) {setTeacherData(state.teacherData);}
          if (Array.isArray(state?.assignedClasses)) {setAssignedClasses(state.assignedClasses);}
        }

        if (code && bid) {
          const data = await teacherService.getAttendanceSettings({ 'X-School-Code': code, 'X-Branch-Id': bid });
          if (isMounted.current) {
            setDailySessions(data?.daily_sessions === 2 ? 2 : 1);
            setEnableManualAttendance(Boolean(data?.enable_manual_attendance));
          }
        }
      } catch (e) {
        console.warn('Failed to load teacher attendance cache', e);
      }
    };
    load();

    if (isCameraAvailable) {
      try {
        Camera.requestCameraPermission().then(permission => {
          if (isMounted.current) {
            setHasPermission(permission === 'granted');
          }
        });
      } catch (e) {
        console.warn('Camera permission request failed (native module not linked):', e);
      }
    }
  }, []);

  // Load classes
  const loadClasses = useCallback(async () => {
    if (!branchId || !schoolCode) {return;}
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
    if (!cameraRef.current) {return null;}
    try {
      const photo = await cameraRef.current.takePhoto({
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
    const desiredPosition: 'back' | 'front' = useFor === 'teacher' ? 'front' : 'back';

    try {
      if (!isCameraAvailable) {
        Alert.alert('Camera Unavailable', 'Camera module is not available on this device.');
        return;
      }
      const permission = await Camera.requestCameraPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      if (!granted) {
        Alert.alert(
          'Camera Permission',
          'Camera permission is required to capture photos. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Verify the requested camera device is available before activating
      setCameraPosition(desiredPosition);
      // Small delay to allow device state to update
      setTimeout(() => {
        if (isMounted.current && device) {
          setCameraActive(true);
        } else if (isMounted.current) {
          // Device not available, try alternate position
          const alternatePosition: 'back' | 'front' = desiredPosition === 'front' ? 'back' : 'front';
          setCameraPosition(alternatePosition);
          setTimeout(() => {
            if (isMounted.current) {
              setCameraActive(true);
            }
          }, 200);
        }
      }, 200);
    } catch (err) {
      console.error('Failed to request camera permission:', err);
      Alert.alert('Camera Error', 'Unable to access camera. Please check permissions.');
    }
  };

  const toggleCamera = () => {
    setCameraPosition(prev => prev === 'back' ? 'front' : 'back');
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const handleTeacherCapture = async () => {
    const img = await captureImage();
    if (img && isMounted.current) {
      setTeacherImage(img);
      setCameraActive(false);
      showToast('Photo captured', 'Teacher image is ready', '✅', '#22C55E');
    }
  };

  const handleTeacherUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0]?.uri) {
        setTeacherImage(response.assets[0].uri);
        showToast('Teacher photo uploaded', 'Image ready for verification', '📁', '#1a1a1a');
      }
    });
  };

  const handleStudentCapture = async () => {
    if (studentImages.length >= MAX_STUDENT_IMAGES) {
      showToast('Maximum reached', `You can only add up to ${MAX_STUDENT_IMAGES} images`, '⚠️', '#F59E0B');
      stopCamera();
      return;
    }
    const img = await captureImage();
    if (img) {
      setPreviewImage(img);
      setShowPreview(true);
      stopCamera();
    }
  };

  const handleStudentUpload = () => {
    if (studentImages.length >= MAX_STUDENT_IMAGES) {
      showToast('Maximum reached', `You can only add up to ${MAX_STUDENT_IMAGES} images`, '⚠️', '#F59E0B');
      return;
    }
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0]?.uri) {
        setPreviewImage(response.assets[0].uri);
        setShowPreview(true);
      }
    });
  };

  const confirmStudentImage = async () => {
    if (previewImage && studentImages.length < MAX_STUDENT_IMAGES) {
      setStudentImages(prev => [...prev, previewImage]);
      setPreviewImage(null);
      setShowPreview(false);
      showToast('Image added', `${studentImages.length + 1} image(s) ready`, '✅', '#22C55E');
    } else if (studentImages.length >= MAX_STUDENT_IMAGES) {
      showToast('Maximum reached', `You can only add up to ${MAX_STUDENT_IMAGES} images`, '⚠️', '#F59E0B');
      setShowPreview(false);
      setPreviewImage(null);
    }
  };

  const retakeImage = () => {
    setPreviewImage(null);
    setShowPreview(false);
    // If camera was active for student, restart it
    if (cameraUse === 'student' && !cameraActive && studentImages.length < MAX_STUDENT_IMAGES) {
      startCamera('student');
    }
  };

  const removeStudentImage = (index: number) => {
    setStudentImages(prev => prev.filter((_, i) => i !== index));
    showToast('Image removed', `${studentImages.length - 1} image(s) remaining`, '🗑️', '#EF4444');
  };

  const verifyTeacher = async () => {
    if (!teacherImage) {
      showToast('Image Required', 'Please capture or upload your photo first', '📸', Theme.colors.primary);
      startCamera('teacher');
      return;
    }
    setLoading(true);
    try {
      // Convert image to Base64 as required by the backend
      const imagePath = teacherImage.replace('file://', '');
      const rawBase64 = await RNFS.readFile(imagePath, 'base64');
      const base64Image = cleanBase64(rawBase64);

      const payload: any = {
        school_code: schoolCode || (await getSchoolCode()),
        employee_id: String(employeeId || (await getEmployeeId()) || '').trim(),
        branch_id: branchId || (await getBranchId()),
        image: base64Image,
        attendance_session: parseInt(form.attendance_session || '1', 10),
      };

      // Ensure suppressLogoutOn401 is applied at service level to prevent logout on wrong face
      const data = await teacherService.verifyTeacher(payload);

      if (!isMounted.current) {return;}

      const assigned = Array.isArray(data?.assigned_classes) ? data.assigned_classes.filter(Boolean) : [];
      setTeacherData(data);
      setAssignedClasses(assigned);
      setVideoAttendanceEnabled(data.enable_video_attendance === true || data.enable_video_attendance === 'true');
      setIsClassTeacher(data.is_class_teacher || false);

      const sessionKey = `teacher_session_${employeeId}_${schoolCode}`;
      await AsyncStorage.setItem(sessionKey, JSON.stringify({
        teacher_data: data,
        assigned_classes: assigned,
        timestamp: new Date().getTime(),
      }));

      // Check session marked status
      await checkSessionMarkedStatus();

      if (!isMounted.current) {return;}

      await loadClasses();

      if (!isMounted.current) {return;}

      if (assigned.length === 1) {
        const first = assigned[0];
        setSelectedClassKey(`${first.class_grade}__${first.section}`);
        setForm(prev => ({ ...prev, class_grade: first.class_grade, section: first.section }));
      }

      setCameraActive(false);
      setStep(2); // Show "Verified" screen first to allow class confirmation
      showToast('Identity verified!', `Welcome, ${data.teacher_full_name}`, '✅', '#22C55E');
    } catch (err: any) {
      if (!isMounted.current) {return;}

      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail
        || err?.response?.data?.message
        || err?.response?.data?.error
        || (typeof err?.response?.data === 'string' ? err.response.data : null);
      const errorMsg = backendDetail || err?.message || 'Please try again';

      const isFaceRelated = (msg: string) =>
        msg?.toLowerCase().includes('face') ||
        msg?.toLowerCase().includes('recogni') ||
        msg?.toLowerCase().includes('match') ||
        msg?.toLowerCase().includes('detect') ||
        msg?.toLowerCase().includes('embed');

      if (status === 401 || (status === 400 && isFaceRelated(errorMsg))) {
        const verificationError = isFaceRelated(errorMsg)
          ? errorMsg
          : 'Face not recognized. Please try again with a clearer photo.';

        setErrorModal({
          visible: true,
          title: 'Face Verification Failed',
          message: verificationError + '\n\nDo not log out — stay in the app and try again.',
        });
        return;
      }

      setErrorModal({
        visible: true,
        title: 'Verification Failed',
        message: errorMsg,
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const processAttendance = async () => {
    if (studentImages.length === 0 || !form.class_grade || !form.section) {
      Alert.alert('Missing Info', 'Please select class, section and capture at least one image.');
      return;
    }

    if (isClassTeacher && isCurrentSessionMarked()) {
      Alert.alert('Session Already Marked', `Attendance for ${form.attendance_session === '1' ? 'Session 1 (Morning)' : 'Session 2 (Afternoon)'} has already been marked for today.`);
      return;
    }

    const activeSchoolCode = schoolCode || (await getSchoolCode());
    const activeBranchId = branchId || (await getBranchId());
    const activeEmployeeId = String(teacherData?.employee_id || employeeId || (await getEmployeeId()) || '').trim();

    if (!activeSchoolCode || !activeBranchId) {
      Alert.alert('Configuration Error', 'School code or Branch ID is missing. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Convert all student images to Base64
      const base64Images = await Promise.all(
        studentImages.map(async (uri) => {
          const raw = await RNFS.readFile(uri.replace('file://', ''), 'base64');
          return cleanBase64(raw);
        })
      );

      const payload: any = {
        school_code: activeSchoolCode,
        branch_id: activeBranchId,
        employee_id: activeEmployeeId,
        class_grade: String(form.class_grade).toLowerCase(),
        section: String(form.section).toLowerCase(),
        attendance_date: form.attendance_date,
        preview_only: true,
        images: base64Images, // Send all images for better detection
      };

      // Only add attendance_session if dailySessions is 2
      if (dailySessions === 1) {
        payload.attendance_session = 1;
      } else {
        payload.attendance_session = parseInt(form.attendance_session || '1', 10);
      }

      const data = await teacherService.processAttendance(payload);
      if (!isMounted.current) {return;}

      // Merge results - keep previously present students from multiple image submissions
      setResult((prevResult: AttendanceResult | null) => {
        if (!prevResult) {return data;}

        // Merge logic: combine present lists, remove promoted students from absent
        const prevPresentIds = new Set((prevResult.present || []).map(s => s.student_id));
        const newPresentIds = new Set((data.present || []).map((s: any) => s.student_id));

        // Keep all previously present students
        const mergedPresentIds = new Set([...prevPresentIds, ...newPresentIds]);

        // Build merged present list
        const mergedPresent: Student[] = [];
        const seenIds = new Set();

        // Add from previous result
        (prevResult.present || []).forEach((student: any) => {
          const id = student.student_id;
          if (id && !seenIds.has(id)) {
            mergedPresent.push(student);
            seenIds.add(id);
          }
        });

        // Add new students from current result
        (data.present || []).forEach((student: any) => {
          const id = student.student_id;
          if (id && !seenIds.has(id)) {
            mergedPresent.push(student);
            seenIds.add(id);
          }
        });

        // Build merged absent list (exclude promoted students)
        const mergedAbsent = (data.absent || []).filter((student: any) => {
          const id = student.student_id;
          return !mergedPresentIds.has(id);
        });

        return {
          ...data,
          present: mergedPresent,
          absent: mergedAbsent,
          summary: {
            ...data.summary,
            present_count: mergedPresent.length,
            absent_count: mergedAbsent.length,
            total_students: mergedPresent.length + mergedAbsent.length,
          },
        };
      });

      setStep(4);
      showToast('Attendance scanned', 'Review the report and save if needed', '📊', '#22C55E');
    } catch (err: any) {
      if (!isMounted.current) {return;}
      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail || err?.response?.data?.message;
      const errorMsg = backendDetail || err?.message || 'Please try again';

      if (status === 401) {
        Alert.alert('Session Expired', 'Please verify your identity again.');
        setStep(1); // Force re-verification
        return;
      }

      // Handle service unavailable errors with retry option
      if (status === 503 || status === 502 || status === 504) {
        const serviceError = status === 503
          ? 'The face verification service is temporarily unavailable.'
          : 'The server is temporarily unavailable.';

        Alert.alert(
          'Service Unavailable',
          `${serviceError} Please wait a moment and try again.`,
          [
            {
              text: 'Retry',
              onPress: () => {
                if (isMounted.current) {
                  processAttendance(); // Recursive retry
                }
              },
            },
            {
              text: 'Cancel',
              onPress: () => {
                if (isMounted.current) {
                  setLoading(false);
                }
              },
            },
          ]
        );
        return;
      }

      Alert.alert('Processing Failed', errorMsg);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const saveAttendance = async () => {
    const activeSchoolCode = schoolCode || (await getSchoolCode());
    const activeBranchId = branchId || (await getBranchId());
    const activeEmployeeId = String(teacherData?.employee_id || employeeId || (await getEmployeeId()) || '').trim();

    if (!activeSchoolCode || !activeBranchId) {
      Alert.alert('Configuration Error', 'School code or Branch ID is missing. Please log in again.');
      return;
    }

    setManualSaving(true);
    try {
      // Convert all student images to Base64
      const base64Images = await Promise.all(
        studentImages.map(async (uri) => {
          const raw = await RNFS.readFile(uri.replace('file://', ''), 'base64');
          return cleanBase64(raw);
        })
      );

      const payload: any = {
        school_code: activeSchoolCode,
        branch_id: activeBranchId,
        employee_id: activeEmployeeId,
        class_grade: String(form.class_grade).toLowerCase(),
        section: String(form.section).toLowerCase(),
        attendance_date: form.attendance_date,
        preview_only: false, // Actually save now
        images: base64Images,
      };

      if (dailySessions === 1) {
        payload.attendance_session = 1;
      } else {
        payload.attendance_session = parseInt(form.attendance_session || '1', 10);
      }

      // Add manual attendance if changes were made
      if (Object.keys(manualStatusById).length > 0) {
        const manualAttendance = manualRows.map(row => ({
          student_id: row.student_id,
          status: manualStatusById[row.student_id] || row._defaultStatus,
        }));
        payload.manual_attendance = manualAttendance;
      }

      const data = await teacherService.processAttendance(payload);
      if (isMounted.current) {
        // Update session marked status
        const currentSession = parseInt(form.attendance_session || '1', 10);
        setSessionMarked(prev => ({
          ...prev,
          [`session${currentSession}`]: true,
        }));

        setSavedAttendanceData(data);
        setViewingGallery(true);
        showToast('Attendance saved', `${data?.summary?.present_count || 0} present, ${data?.summary?.absent_count || 0} absent`, '✅', '#22C55E');
      }
    } catch (err: any) {
      if (!isMounted.current) {return;}
      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail || err?.response?.data?.message;
      const errorMsg = backendDetail || err?.message || 'Please try again';

      if (status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please verify your identity again.');
        setStep(1);
        return;
      }

      // Handle service unavailable errors with retry option
      if (status === 503 || status === 502 || status === 504) {
        const serviceError = status === 503
          ? 'The face verification service is temporarily unavailable.'
          : 'The server is temporarily unavailable.';

        Alert.alert(
          'Service Unavailable',
          `${serviceError} Please wait a moment and try again.`,
          [
            {
              text: 'Retry',
              onPress: () => {
                if (isMounted.current) {
                  saveAttendance(); // Recursive retry
                }
              },
            },
            {
              text: 'Cancel',
              onPress: () => {
                if (isMounted.current) {
                  setManualSaving(false);
                }
              },
            },
          ]
        );
        return;
      }

      Alert.alert('Save Failed', errorMsg);
    } finally {
      if (isMounted.current) {
        setManualSaving(false);
      }
    }
  };

  const resetManualChanges = () => {
    if (!manualRows.length) {return;}
    const next: Record<string, string> = {};
    for (const row of manualRows) {
      const sid = String(row.student_id || '').trim();
      if (sid) {next[sid] = row._defaultStatus;}
    }
    setManualStatusById(next);
    setManualFilter('review');
    showToast('Reset complete', 'Changes reverted to scan results', '🔄', '#F59E0B');
  };

  const resetFlow = async () => {
    stopCamera();
    setStep(1);
    setTeacherImage(null);
    setTeacherData(null);
    setAssignedClasses([]);
    setStudentImages([]);
    setResult(null);
    setManualStatusById({});
    setPreviewImage(null);
    setShowPreview(false);
    setViewingGallery(false);
    setSavedAttendanceData(null);
    setForm({
      employee_id: employeeId,
      branch_id: branchId,
      class_grade: '',
      section: '',
      attendance_date: getTodayDateString(),
      attendance_session: '1',
    });
    setSessionMarked({ session1: false, session2: false });
    const cacheKey = `teacher_attendance_cache_${schoolCode}_${branchId}_${employeeId}`;
    try { await AsyncStorage.removeItem(cacheKey); } catch (e) {}
  };

  const assignedClassOptions = useMemo(() => {
    if (!Array.isArray(assignedClasses)) {return [];}
    return assignedClasses
      .filter(item => item !== null && item !== undefined)
      .map((item, idx) => ({
        key: item?.class_grade && item?.section ? `${item.class_grade}__${item.section}` : `class-opt-${idx}`,
        class_grade: item?.class_grade || '',
        section: item?.section || '',
        label: `Class ${item?.class_grade || '?'} - Section ${item?.section || '?'}`,
      }));
  }, [assignedClasses]);

  const effectiveClassOptions = useMemo(() => {
    if (Array.isArray(assignedClasses) && assignedClasses.length > 0) {
      const uniqueClasses = [...new Set(assignedClasses.filter(c => c && c.class_grade).map(c => c.class_grade))];
      return uniqueClasses.map(className => ({
        class_name: className,
        sections: assignedClasses.filter(c => c && c.class_grade === className).map(c => c.section).filter(Boolean),
      }));
    }
    return Array.isArray(classOptions) ? classOptions.filter(Boolean) : [];
  }, [assignedClasses, classOptions]);

  const effectiveSectionOptions = useMemo(() => {
    if (Array.isArray(assignedClasses) && assignedClasses.length > 0) {
      return assignedClasses
        .filter(c => c && c.class_grade === form.class_grade)
        .map(c => c.section)
        .filter(Boolean);
    }
    const classOptionsArray = Array.isArray(classOptions) ? classOptions.filter(Boolean) : [];
    const currentCls = classOptionsArray.find(
      (c: any) => c && String(c.class_name || '').trim() === String(form.class_grade || '').trim()
    );
    return Array.isArray(currentCls?.sections) ? currentCls.sections.filter(Boolean) : [];
  }, [assignedClasses, classOptions, form.class_grade]);

  const manualRows = useMemo(() => {
    if (!result) {return [];}
    const presentRows = Array.isArray(result.present)
      ? result.present.filter(s => s !== null).map(s => ({ ...s, _defaultStatus: 'PRESENT' as const }))
      : [];
    const absentRows = Array.isArray(result.absent)
      ? result.absent.filter(s => s !== null).map(s => ({ ...s, _defaultStatus: 'ABSENT' as const }))
      : [];
    return [...presentRows, ...absentRows].filter(s => s && String(s.student_id || '').trim());
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

  const manualHasChanges = useMemo(() => manualRowsWithState.some(row => row._changed), [manualRowsWithState]);

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
      if (sid) {next[sid] = row._defaultStatus;}
    }
    setManualStatusById(next);
    setManualFilter('review');
  }, [manualRows]);

  const attendanceRate = useMemo(() => {
    if (!result?.summary?.total_students) {return 0;}
    return Math.round((result.summary.present_count / result.summary.total_students) * 100);
  }, [result]);

  const handleClassChange = (className: string) => {
    setForm(prev => ({ ...prev, class_grade: className, section: '' }));
    setSelectedClassKey('');
  };

  const handleSectionChange = (section: string) => {
    setForm(prev => ({ ...prev, section }));
    const selected = assignedClassOptions.find(opt => opt.class_grade === form.class_grade && opt.section === section);
    if (selected) {setSelectedClassKey(selected.key);}
  };

  // If viewing gallery after save
  if (viewingGallery && savedAttendanceData) {
    const groupImages = savedAttendanceData?.image_urls || [];
    return (
      <View style={styles.container}>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backBtn} onPress={resetFlow}>
                <ChevronLeft size={24} color={Theme.colors.card} />
              </TouchableOpacity>
              <AppText style={styles.headerTitle}>Attendance Saved</AppText>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.heroContent}>
              <AppText style={styles.heroGreeting}>Success! ✅</AppText>
              <AppText style={styles.heroSubtext}>Attendance has been recorded</AppText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.miniStatCard, { borderLeftColor: '#3B82F6' }]}>
              <AppText style={styles.miniStatVal}>{savedAttendanceData?.summary?.total_students || 0}</AppText>
              <AppText style={styles.miniStatLabel}>Total</AppText>
            </View>
            <View style={[styles.miniStatCard, { borderLeftColor: '#10B981' }]}>
              <AppText style={styles.miniStatVal}>{savedAttendanceData?.summary?.present_count || 0}</AppText>
              <AppText style={styles.miniStatLabel}>Present</AppText>
            </View>
            <View style={[styles.miniStatCard, { borderLeftColor: '#EF4444' }]}>
              <AppText style={styles.miniStatVal}>{savedAttendanceData?.summary?.absent_count || 0}</AppText>
              <AppText style={styles.miniStatLabel}>Absent</AppText>
            </View>
          </View>

          {/* Teacher Image Section */}
          {teacherImage && (
            <AppCard style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ fontSize: 20 }}>👨‍🏫</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.cardTitle}>Teacher Verification Image</AppText>
                  <AppText style={styles.resultSub}>{teacherData?.teacher_full_name || 'Teacher'} - {form.attendance_date}</AppText>
                </View>
              </View>
              <View style={{ padding: Theme.spacing.lg, alignItems: 'center' }}>
                <Image source={{ uri: teacherImage }} style={{ width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' }} />
              </View>
            </AppCard>
          )}

          {/* Student Images Section */}
          {groupImages.length > 0 && (
            <AppCard style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <CameraIcon size={20} color={Theme.colors.primary} />
                <AppText style={styles.cardTitle}>Student Images ({groupImages.length})</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: Theme.spacing.md }}>
                {groupImages.map((img: string, idx: number) => (
                  <View key={idx} style={styles.thumbWrapper}>
                    <Image source={{ uri: img }} style={styles.thumbImg} />
                  </View>
                ))}
              </ScrollView>
            </AppCard>
          )}

          <AppButton title="✓ Done - Start New Attendance" onPress={resetFlow} style={StyleSheet.flatten([styles.primaryButton, { marginHorizontal: Theme.spacing.md, marginBottom: 30 }])} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Resolve camera device via a separate component to avoid null native module crash */}
      {isCameraAvailable && <SafeCameraDeviceResolver position={cameraPosition} onDevice={setResolvedDevice} />}

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
        {/* Navy Header */}
        <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : (navigation as any).navigate('TeacherDashboard')}
            >
              <ChevronLeft size={24} color={Theme.colors.card} />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>{isClassTeacher ? 'Class Teacher' : 'Teacher Attendance'}</AppText>
            <TouchableOpacity style={styles.notificationBtn} onPress={() => (navigation as any).navigate('Notifications')}>
              <Bell size={22} color={Theme.colors.card} />
            </TouchableOpacity>
          </View>

          {isClassTeacher && (
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tab, step <= 2 && styles.activeTab]}
                onPress={() => step > 2 && setStep(2)}
              >
                <AppText style={[styles.tabText, step <= 2 && styles.activeTabText]}>Verification</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, step > 2 && styles.activeTab]}
                onPress={() => {
                  if (teacherData) {setStep(3);}
                  else {Alert.alert('Verification Required', 'Please verify your identity first.');}
                }}
              >
                <AppText style={[styles.tabText, step > 2 && styles.activeTabText]}>Attendance</AppText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.heroContent}>
            <AppText style={styles.heroGreeting}>
              {step <= 2 ? 'Identity Verification' : 'Student Attendance'}
            </AppText>
            <AppText style={styles.heroSubtext}>
              {step <= 2
                ? 'Confirm your identity using AI facial recognition'
                : 'Scan student faces to mark attendance automatically'}
            </AppText>
          </View>
        </View>

        {/* Camera View */}
        {cameraActive && hasPermission && device ? (
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={device}
              isActive={cameraActive}
              photo={true}
            />
            <View style={styles.cameraOverlay}>
              <AppText style={styles.cameraStep}>
                {cameraUse === 'teacher' ? 'Teacher Face Verification' : `Image ${studentImages.length + 1} of ${MAX_STUDENT_IMAGES}`}
              </AppText>
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraToggleBtn}
                  onPress={toggleCamera}
                >
                  <RefreshCcw size={24} color={Theme.colors.card} />
                </TouchableOpacity>

                {cameraUse === 'student' && studentImages.length > 0 && (
                  <TouchableOpacity style={styles.cameraDoneBtn} onPress={() => stopCamera()}>
                    <AppText style={styles.cameraDoneText}>✓ DONE ({studentImages.length})</AppText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cameraCaptureBtn}
                  onPress={cameraUse === 'teacher' ? handleTeacherCapture : handleStudentCapture}
                >
                  <CameraIcon size={24} color={Theme.colors.card} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.closeCameraBtn} onPress={stopCamera}>
              <XCircle size={24} color={Theme.colors.card} />
            </TouchableOpacity>
          </View>
        ) : cameraActive && hasPermission ? (
          <View style={styles.cameraContainer}>
            <View style={[styles.camera, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
              <AlertCircle size={48} color={Theme.colors.error} />
              <AppText style={{ color: Theme.colors.card, marginTop: Theme.spacing.md, textAlign: 'center', paddingHorizontal: 20 }}>
                Camera not available. Please check if camera permission is granted.
              </AppText>
            </View>
            <TouchableOpacity style={styles.closeCameraBtn} onPress={stopCamera}>
              <XCircle size={24} color={Theme.colors.card} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Stepper */}
        <Stepper step={step} isClassTeacher={isClassTeacher} />

        {/* Step 1: Teacher Verification */}
        {step === 1 && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <UserCheck size={20} color={Theme.colors.primary} />
              <AppText style={styles.cardTitle}>Teacher Face Verification</AppText>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.field}>
                <AppText style={styles.label}>Employee ID</AppText>
                <TextInput style={styles.input} value={employeeId} editable={false} placeholder="Employee ID" />
              </View>

              {!cameraActive && (
                <View style={styles.buttonGrid}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Theme.colors.primary }]} onPress={() => startCamera('teacher')}>
                    <CameraIcon size={20} color={Theme.colors.card} />
                    <AppText style={styles.actionBtnText}>Start Camera</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Theme.colors.background }]} onPress={handleTeacherUpload}>
                    <Upload size={20} color={Theme.colors.primary} />
                    <AppText style={[styles.actionBtnText, { color: Theme.colors.primary }]}>Upload</AppText>
                  </TouchableOpacity>
                </View>
              )}

              {teacherImage && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: teacherImage }} style={styles.previewImage} />
                  <View style={styles.previewBadge}>
                    <CheckCircle2 size={12} color={Theme.colors.card} />
                    <AppText style={styles.previewBadgeText}>Ready</AppText>
                  </View>
                </View>
              )}

              <AppButton
                title={loading ? 'Verifying...' : 'Verify Identity'}
                onPress={verifyTeacher}
                disabled={loading}
                style={styles.primaryButton}
              />

              {enableManualAttendance && !isTeacherRole && (
                <TouchableOpacity
                  style={styles.manualFallbackBtn}
                  onPress={() => (navigation as any).navigate('MarkAttendance')}
                  activeOpacity={0.8}
                >
                  <View style={styles.manualFallbackIconContainer}>
                    <UserCheck size={20} color={Theme.colors.card} />
                  </View>
                  <View style={styles.manualFallbackTextContainer}>
                    <AppText style={styles.manualFallbackBtnText}>Switch to Manual Attendance</AppText>
                    <AppText style={styles.manualFallbackSubText}>Mark attendance without face verification</AppText>
                  </View>
                  <ChevronRight size={20} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </AppCard>
        )}

        {/* Step 2: Teacher Verified with Image Display */}
        {step === 2 && teacherData && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <CheckCircle2 size={20} color="#10B981" />
              <AppText style={styles.cardTitle}>Teacher Verified</AppText>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.teacherInfo}>
                <View style={styles.infoRow}>
                  <AppText style={styles.infoLabel}>Name</AppText>
                  <AppText style={styles.infoValue}>{teacherData.teacher_full_name}</AppText>
                </View>
                <View style={styles.infoRow}>
                  <AppText style={styles.infoLabel}>Employee ID</AppText>
                  <AppText style={styles.infoValue}>{teacherData.employee_id}</AppText>
                </View>
              </View>

              {/* Display teacher verification image */}
              {teacherImage && (
                <View style={{ marginTop: Theme.spacing.md, marginBottom: Theme.spacing.md, padding: Theme.spacing.md, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1.5, borderColor: '#22C55E' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={16} color={Theme.colors.card} />
                    </View>
                    <View>
                      <AppText style={{ ...Theme.typography.body, fontWeight: '800', color: '#15803D' }}>Teacher Verification Image</AppText>
                      <AppText style={{ ...Theme.typography.caption, color: '#16A34A', marginTop: 2 }}>Captured for {teacherData.teacher_full_name} verification</AppText>
                    </View>
                  </View>
                  <Image source={{ uri: teacherImage }} style={{ width: '100%', height: 200, borderRadius: 8, borderWidth: 2, borderColor: '#22C55E', resizeMode: 'cover' }} />
                </View>
              )}

              {assignedClasses.length > 0 && (
                <View style={styles.field}>
                  <AppText style={styles.label}>Select Assigned Class</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {Array.isArray(assignedClassOptions) && assignedClassOptions.map(opt => (
                        <TouchableOpacity
                          key={opt?.key || Math.random().toString()}
                          style={[styles.chip, selectedClassKey === opt?.key && styles.chipActive]}
                          onPress={() => {
                            if (opt) {
                              setSelectedClassKey(opt.key);
                              setForm(prev => ({ ...prev, class_grade: opt.class_grade, section: opt.section }));
                            }
                          }}
                        >
                          <AppText style={[styles.chipText, selectedClassKey === opt?.key && styles.chipTextActive]}>
                            {opt?.label || 'Unknown'}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.buttonRow}>
                {isClassTeacher ? (
                  <>
                    <AppButton title="Continue →" onPress={() => setStep(3)} style={StyleSheet.flatten([styles.primaryButton, { flex: 1 }])} />
                    <AppButton title="Reset" onPress={resetFlow} type="secondary" style={{ flex: 1 }} />
                  </>
                ) : (
                  <>
                    <AppButton title="Back to Dashboard" onPress={() => (navigation as any).navigate('TeacherDashboard')} style={StyleSheet.flatten([styles.primaryButton, { flex: 2 }])} />
                    <AppButton title="Reset" onPress={resetFlow} type="secondary" style={{ flex: 1 }} />
                  </>
                )}
              </View>
            </View>
          </AppCard>
        )}

        {/* Step 3: Student Attendance */}
        {step === 3 && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <LayoutGrid size={20} color={Theme.colors.primary} />
              <AppText style={styles.cardTitle}>Student Attendance Setup</AppText>
            </View>

            <View style={styles.cardBody}>
              {/* Session already marked warning for class teachers */}
              {isClassTeacher && isCurrentSessionMarked() && (
                <View style={styles.warningBox}>
                  <AlertCircle size={20} color="#D97706" />
                  <AppText style={styles.warningText}>
                    Attendance for {form.attendance_session === '1' ? 'Session 1 (Morning)' : 'Session 2 (Afternoon)'} has already been marked for today. You cannot mark again.
                  </AppText>
                </View>
              )}

              <View style={styles.field}>
                <AppText style={styles.label}>Class</AppText>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setPickerModal({
                    visible: true,
                    title: 'Select Class',
                    options: effectiveClassOptions.map((c: any) => ({ label: `Class ${c.class_name}`, value: c.class_name })),
                    selectedValue: form.class_grade,
                    onValueChange: (v) => handleClassChange(v),
                  })}
                >
                  <AppText style={styles.pickerTriggerText}>
                    {form.class_grade ? `Class ${form.class_grade}` : 'Select Class'}
                  </AppText>
                  <ChevronDown size={20} color={Theme.colors.textSec} />
                </TouchableOpacity>
              </View>

              {form.class_grade && (
                <View style={styles.field}>
                  <AppText style={styles.label}>Section</AppText>
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setPickerModal({
                      visible: true,
                      title: 'Select Section',
                      options: effectiveSectionOptions.map((sec: string) => ({ label: `Section ${sec}`, value: sec })),
                      selectedValue: form.section,
                      onValueChange: (v) => handleSectionChange(v),
                    })}
                  >
                    <AppText style={styles.pickerTriggerText}>
                      {form.section ? `Section ${form.section}` : 'Select Section'}
                    </AppText>
                    <ChevronDown size={20} color={Theme.colors.textSec} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.field}>
                <AppText style={styles.label}>Attendance Date</AppText>
                <View style={[styles.dateSelector, { backgroundColor: Theme.colors.background, opacity: 0.8 }]}>
                  <Calendar size={16} color={Theme.colors.textSec} />
                  <AppText style={styles.dateSelectorText}>{form.attendance_date}</AppText>
                  <View style={{ marginLeft: 'auto', backgroundColor: Theme.colors.border, paddingHorizontal: Theme.spacing.sm, paddingVertical: 2, borderRadius: 6 }}>
                    <AppText style={{ fontSize: 10, color: Theme.colors.textSec, fontWeight: 'bold' }}>TODAY</AppText>
                  </View>
                </View>
                <AppText style={{ ...Theme.typography.label, color: Theme.colors.textMuted, marginTop: Theme.spacing.xs }}>
                  Attendance can only be marked for the current date.
                </AppText>
              </View>

              {dailySessions === 2 && (
                <View style={styles.field}>
                  <AppText style={styles.label}>Attendance Session</AppText>
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setPickerModal({
                      visible: true,
                      title: 'Select Session',
                      options: [
                        { label: `Session 1 (Morning) ${sessionMarked.session1 ? '✓ Marked' : ''}`, value: '1', disabled: sessionMarked.session1 },
                        { label: `Session 2 (Afternoon) ${sessionMarked.session2 ? '✓ Marked' : ''}`, value: '2', disabled: sessionMarked.session2 },
                      ].filter(opt => !opt.disabled),
                      selectedValue: form.attendance_session,
                      onValueChange: (v) => setForm(prev => ({ ...prev, attendance_session: v })),
                    })}
                  >
                    <AppText style={styles.pickerTriggerText}>
                      Session {form.attendance_session} {form.attendance_session === '1' ? '(Morning)' : '(Afternoon)'}
                      {(form.attendance_session === '1' && sessionMarked.session1) || (form.attendance_session === '2' && sessionMarked.session2) ? ' ✓ Marked' : ''}
                    </AppText>
                    <ChevronDown size={20} color={Theme.colors.textSec} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.imageGridHeader}>
                <AppText style={styles.label}>Student Images ({studentImages.length}/{MAX_STUDENT_IMAGES})</AppText>
                <AppText style={styles.imageCount}>{studentImages.length} captured</AppText>
              </View>

              {!cameraActive && (
                <View style={styles.buttonGrid}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Theme.colors.primary }]}
                    onPress={() => startCamera('student')}
                    disabled={studentImages.length >= MAX_STUDENT_IMAGES}
                  >
                    <CameraIcon size={20} color={Theme.colors.card} />
                    <AppText style={styles.actionBtnText}>Capture Students</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Theme.colors.background }]}
                    onPress={handleStudentUpload}
                    disabled={studentImages.length >= MAX_STUDENT_IMAGES}
                  >
                    <Upload size={20} color={Theme.colors.primary} />
                    <AppText style={[styles.actionBtnText, { color: Theme.colors.primary }]}>Upload</AppText>
                  </TouchableOpacity>
                </View>
              )}

              {Array.isArray(studentImages) && studentImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                  {studentImages.map((img, idx) => (
                    img && (
                      <View key={idx} style={styles.thumbWrapper}>
                        <Image source={{ uri: img }} style={styles.thumbImg} />
                        <TouchableOpacity style={styles.thumbRemove} onPress={() => removeStudentImage(idx)}>
                          <XCircle size={18} color="#EF4444" fill={Theme.colors.card} />
                        </TouchableOpacity>
                      </View>
                    )
                  ))}
                </ScrollView>
              )}

              <View style={styles.buttonRow}>
                <AppButton
                  title={loading ? 'Scanning...' : 'Scan / Preview'}
                  onPress={processAttendance}
                  disabled={loading || studentImages.length === 0 || !form.class_grade || !form.section || (isClassTeacher && isCurrentSessionMarked())}
                  style={StyleSheet.flatten([styles.primaryButton, { flex: 2 }])}
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
                <AppText style={styles.miniStatVal}>{result.summary.total_students}</AppText>
                <AppText style={styles.miniStatLabel}>Total</AppText>
              </View>
              <View style={[styles.miniStatCard, { borderLeftColor: '#10B981' }]}>
                <AppText style={styles.miniStatVal}>{result.summary.present_count}</AppText>
                <AppText style={styles.miniStatLabel}>Present</AppText>
              </View>
              <View style={[styles.miniStatCard, { borderLeftColor: '#EF4444' }]}>
                <AppText style={styles.miniStatVal}>{result.summary.absent_count}</AppText>
                <AppText style={styles.miniStatLabel}>Absent</AppText>
              </View>
              <View style={[styles.miniStatCard, { borderLeftColor: '#F59E0B' }]}>
                <AppText style={styles.miniStatVal}>{attendanceRate}%</AppText>
                <AppText style={styles.miniStatLabel}>Rate</AppText>
              </View>
            </View>

            <AppCard style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <AlertCircle size={20} color="#F59E0B" />
                <AppText style={styles.cardTitle}>Attendance Results & Review</AppText>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.manualStrip}>
                  <AppText style={styles.manualStripText}>
                    {manualHasChanges
                      ? `${manualCounts.changed} student(s) changed manually. Save to store the edits.`
                      : 'No manual changes detected. Save to store the scanned attendance.'}
                  </AppText>
                  <View style={styles.miniChipContainer}>
                    <View style={[styles.miniChip, styles.miniChipSuccess]}>
                      <CheckCircle2 size={12} color="#15803D" />
                      <AppText style={[styles.miniChipText, { color: '#15803D' }]}>Present {manualCounts.present}</AppText>
                    </View>
                    <View style={[styles.miniChip, styles.miniChipDanger]}>
                      <XCircle size={12} color="#B91C1C" />
                      <AppText style={[styles.miniChipText, { color: '#B91C1C' }]}>Absent {manualCounts.absent}</AppText>
                    </View>
                    <View style={[styles.miniChip, styles.miniChipWarning]}>
                      <Clock size={12} color="#B45309" />
                      <AppText style={[styles.miniChipText, { color: '#B45309' }]}>Changed {manualCounts.changed}</AppText>
                    </View>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {['review', 'all', 'present', 'absent', 'changed'].map(filter => (
                    <TouchableOpacity
                      key={filter}
                      style={[styles.filterChip, manualFilter === filter && styles.filterChipActive]}
                      onPress={() => setManualFilter(filter)}
                    >
                      <AppText style={[styles.filterChipText, manualFilter === filter && styles.filterChipTextActive]}>
                        {filter.charAt(0).toUpperCase() + filter.slice(1)} ({manualCounts[filter as keyof typeof manualCounts]})
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.buttonRowInline}>
                  <TouchableOpacity
                    style={[styles.resetBtn, !manualHasChanges && styles.resetBtnDisabled]}
                    onPress={resetManualChanges}
                    disabled={!manualHasChanges}
                  >
                    <RefreshCw size={16} color={manualHasChanges ? Theme.colors.primary : Theme.colors.textMuted} />
                    <AppText style={[styles.resetBtnText, !manualHasChanges && { color: Theme.colors.textMuted }]}>
                      Reset to Scan Result
                    </AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.tableWrapper}>
                  <View style={styles.tHeader}>
                    <AppText style={[styles.tHead, { width: 40 }]}>#</AppText>
                    <AppText style={[styles.tHead, { flex: 1 }]}>Student Name</AppText>
                    <AppText style={[styles.tHead, { width: 80, textAlign: 'center' }]}>Status</AppText>
                  </View>

                  {Array.isArray(filteredManualRows) && filteredManualRows.map((item, idx) => (
                    item && (
                      <View
                        key={item.student_id || `row-${idx}`}
                        style={[
                          styles.tRow,
                          item._currentStatus === 'PRESENT' && styles.rowPresent,
                          item._currentStatus === 'ABSENT' && styles.rowAbsent,
                          item._changed && styles.rowChanged,
                        ]}
                      >
                        <AppText style={[styles.tCell, { width: 40, color: Theme.colors.textMuted }]}>{item.roll || idx + 1}</AppText>
                        <View style={{ flex: 1 }}>
                          <AppText style={styles.tCellName}>{item.name || 'Unknown Student'}</AppText>
                          {item._changed && <AppText style={styles.changedText}>• Manually Edited</AppText>}
                        </View>
                        <View style={styles.statusToggle}>
                          <TouchableOpacity
                            style={[styles.toggleBtn, item._currentStatus === 'PRESENT' && styles.toggleBtnP]}
                            onPress={() => setManualStatusById(prev => ({ ...prev, [item.student_id]: 'PRESENT' }))}
                          >
                            <AppText style={[styles.toggleText, item._currentStatus === 'PRESENT' && styles.toggleTextActive]}>P</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.toggleBtn, item._currentStatus === 'ABSENT' && styles.toggleBtnA]}
                            onPress={() => setManualStatusById(prev => ({ ...prev, [item.student_id]: 'ABSENT' }))}
                          >
                            <AppText style={[styles.toggleText, item._currentStatus === 'ABSENT' && styles.toggleTextActive]}>A</AppText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  ))}
                </View>

                <View style={styles.resultNote}>
                  <AppText style={styles.resultNoteText}>
                    Date: <AppText style={{ fontWeight: 'bold' }}>{result?.date || form.attendance_date}</AppText>
                    {' • '}
                    Unknown Faces: <AppText style={{ fontWeight: 'bold' }}>{result?.summary?.unknown_faces_count || 0}</AppText>
                    {' • '}
                    Faces Detected: <AppText style={{ fontWeight: 'bold' }}>{result?.summary?.total_faces_detected || 0}</AppText>
                  </AppText>
                </View>

                <View style={styles.buttonRow}>
                  <AppButton
                    title={manualSaving ? 'Saving...' : 'Save Attendance'}
                    onPress={saveAttendance}
                    disabled={manualSaving || (isClassTeacher && isCurrentSessionMarked())}
                    style={StyleSheet.flatten([styles.primaryButton, { flex: 1 }])}
                  />
                  <TouchableOpacity style={styles.retryBtn} onPress={() => {
                    setResult(null);
                    setManualStatusById({});
                    setStep(3);
                  }}>
                    <RefreshCw size={20} color={Theme.colors.textSec} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.retryBtn} onPress={resetFlow}>
                    <Save size={20} color={Theme.colors.textSec} />
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
              <AppText style={styles.modalTitle}>Confirm Capture</AppText>
              <TouchableOpacity onPress={retakeImage}>
                <XCircle size={24} color={Theme.colors.textSec} />
              </TouchableOpacity>
            </View>
            {previewImage && <Image source={{ uri: previewImage }} style={styles.modalImage} />}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={retakeImage}>
                <AppText style={styles.modalBtnTextSecondary}>Retake</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={confirmStudentImage}>
                <AppText style={styles.modalBtnTextPrimary}>Use Photo</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}

      {errorModal && (
        <Modal
          visible={errorModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setErrorModal(null)}
        >
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalContent}>
              <View style={styles.errorModalIconContainer}>
                <AlertCircle size={40} color="#EF4444" />
              </View>
              <AppText style={styles.errorModalTitle}>{errorModal.title}</AppText>
              <AppText style={styles.errorModalMessage}>{errorModal.message}</AppText>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => setErrorModal(null)}
                activeOpacity={0.8}
              >
                <AppText style={styles.errorModalButtonText}>OK</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: Theme.spacing.xs,
    marginHorizontal: 20,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: Theme.colors.card,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    ...Theme.typography.body,
    fontWeight: '600',
  },
  activeTabText: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  heroContent: {
    paddingHorizontal: 20,
    marginTop: Theme.spacing.lg,
  },
  heroGreeting: {
    color: Theme.colors.card,
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  stepperWrapper: {
    marginTop: -20,
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.card,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 65,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: Theme.colors.border,
  },
  stepActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
    elevation: 3,
    shadowOpacity: 0.2,
  },
  stepDone: {
    backgroundColor: '#10B981',
    borderColor: Theme.colors.success,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  stepNumberActive: {
    color: Theme.colors.card,
  },
  stepLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  stepConnector: {
    width: 18,
    height: 2.5,
    backgroundColor: Theme.colors.border,
    marginTop: -16,
    marginHorizontal: Theme.spacing.xs,
  },
  stepConnectorDone: {
    backgroundColor: '#10B981',
  },
  mainCard: {
    marginHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.xxxl,
    backgroundColor: Theme.colors.card,
    borderWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
  },
  cardBody: {
    padding: 18,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FB',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 13,
  },
  pickerTriggerText: {
    ...Theme.typography.body,
    color: '#1A202C',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F7F9FB',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 13,
    ...Theme.typography.body,
    color: '#1A202C',
    fontWeight: '500',
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  actionBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: '600',
  },
  previewContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    elevation: 2,
    shadowOpacity: 0.08,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    elevation: 3,
    shadowOpacity: 0.3,
  },
  previewBadgeText: {
    color: Theme.colors.card,
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 14,
    height: 52,
    elevation: 3,
    shadowOpacity: 0.2,
  },
  manualFallbackBtn: {
    marginTop: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textSec,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  manualFallbackIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  manualFallbackTextContainer: {
    flex: 1,
  },
  manualFallbackBtnText: {
    color: Theme.colors.text,
    ...Theme.typography.bodyMd,
    marginBottom: 2,
  },
  manualFallbackSubText: {
    color: Theme.colors.textSec,
    ...Theme.typography.caption,
    fontWeight: '500',
  },
  teacherInfo: {
    backgroundColor: '#EFF6FF',
    padding: 18,
    borderRadius: 18,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  infoLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: '#0369A1',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: Theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F7F9FB',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
    elevation: 2,
    shadowOpacity: 0.15,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  buttonRowInline: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F9FB',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateSelectorText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: '#1A202C',
  },
  imageGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textSec,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 8,
  },
  thumbScroll: {
    marginBottom: 18,
    paddingVertical: Theme.spacing.xs,
  },
  thumbWrapper: {
    width: 90,
    height: 90,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    elevation: 2,
    shadowOpacity: 0.06,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    resizeMode: 'cover',
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: Theme.spacing.md,
  },
  miniStatCard: {
    backgroundColor: Theme.colors.card,
    flex: 1,
    marginHorizontal: 6,
    padding: 14,
    borderRadius: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  miniStatVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  miniStatLabel: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
  filterScroll: {
    marginBottom: 12,
    paddingVertical: Theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterChipText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  filterChipTextActive: {
    color: Theme.colors.card,
  },
  tableWrapper: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Theme.spacing.md,
    elevation: 2,
    shadowOpacity: 0.06,
  },
  tHeader: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#ECEFF1',
  },
  tHead: {
    ...Theme.typography.label,
    fontWeight: '700',
    color: Theme.colors.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
    backgroundColor: Theme.colors.card,
  },
  rowPresent: {
    backgroundColor: '#F0FDF4',
  },
  rowAbsent: {
    backgroundColor: '#FEF2F2',
  },
  rowChanged: {
    borderWidth: 2,
    borderColor: '#FDE68A',
    margin: -1,
  },
  tCell: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  tCellName: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: '#1A202C',
  },
  changedText: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 2,
  },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: 10,
    padding: 3,
    width: 90,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  toggleBtn: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleBtnP: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  toggleBtnA: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
  toggleTextActive: {
    color: Theme.colors.text,
  },
  retryBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    elevation: 2,
    shadowOpacity: 0.06,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgeText: {
    ...Theme.typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
    zIndex: 9999,
    borderLeftWidth: 5,
    borderLeftColor: '#6648dc',
  },
  toastIcon: { fontSize: 24, marginRight: 14 },
  toastContent: { flex: 1 },
  toastTitle: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text },
  toastMessage: { ...Theme.typography.caption, color: Theme.colors.textSec, marginTop: 3 },
  toastClose: { color: '#CBD5E1', fontSize: 18, padding: Theme.spacing.xs, fontWeight: '600' },
  cameraContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraStep: {
    backgroundColor: 'rgba(0,31,80,0.9)',
    color: Theme.colors.card,
    paddingHorizontal: 18,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 20,
    ...Theme.typography.caption,
    fontWeight: '600',
    marginBottom: Theme.spacing.lg,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  cameraCaptureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Theme.colors.background,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  cameraDoneBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 3,
  },
  cameraDoneText: { color: Theme.colors.card, fontSize: 13, fontWeight: '600' },
  cameraToggleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.card,
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  modalTitle: { ...Theme.typography.h3, color: Theme.colors.text },
  modalImage: { width: '100%', height: 320, borderRadius: 18, marginBottom: Theme.spacing.lg, resizeMode: 'cover' },
  modalButtons: { flexDirection: 'row', gap: 14, width: '100%' },
  modalBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  modalBtnPrimary: { backgroundColor: Theme.colors.primary },
  modalBtnSecondary: { backgroundColor: Theme.colors.background, borderWidth: 1.5, borderColor: Theme.colors.border },
  modalBtnTextPrimary: { ...Theme.typography.body, color: Theme.colors.card, fontWeight: '600' },
  modalBtnTextSecondary: { ...Theme.typography.body, color: Theme.colors.textSec, fontWeight: '600' },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Theme.colors.background,
    marginRight: 10,
  },
  resetBtnDisabled: {
    opacity: 0.6,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  manualStrip: {
    marginBottom: Theme.spacing.md,
    padding: 14,
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  manualStripText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    fontWeight: '600',
    marginBottom: 10,
  },
  miniChipContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  miniChipSuccess: {
    backgroundColor: '#DCFCE7',
  },
  miniChipDanger: {
    backgroundColor: '#FEE2E2',
  },
  miniChipWarning: {
    backgroundColor: '#FEF3C7',
  },
  miniChipText: {
    ...Theme.typography.label,
    fontWeight: '800',
  },
  resultNote: {
    marginBottom: Theme.spacing.md,
    padding: 12,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  resultNoteText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    fontWeight: '500',
  },
  resultSub: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorModalContent: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  errorModalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorModalTitle: {
    ...Theme.typography.h3,
    color: '#D32F2F',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorModalMessage: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorModalButton: {
    backgroundColor: '#D32F2F',
    height: 48,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  errorModalButtonText: {
    ...Theme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
