import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Linking } from 'react-native';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import { useTabBarScrollPadding } from '../../hooks/useTabBarScrollPadding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import * as teacherService from '../../services/teacherService';
import { Theme } from '../../theme/tokens';
import { formatHttpErrorMessage } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import {
  MAX_STUDENT_IMAGES,
  MAX_UPLOAD_IMAGE_BYTES,
  getTodayDateString,
  getSchoolCode,
  getBranchId,
  getEmployeeId,
  cleanBase64,
  readImageBase64ForUpload,
  type TeacherData,
  type AssignedClass,
  type Student,
  type AttendanceResult,
  type AttendanceForm,
  type ManualFilter,
} from '../../components/teacher/attendance';

export const isCameraAvailable = typeof Camera !== 'undefined' && Camera !== null;

export function useTeacherAttendance() {
  const insets = useSafeAreaInsets();
  const tabBarScrollPadding = useTabBarScrollPadding();
  const navigation = useNavigation();
  const { setTabBarVisible, userRole } = useAuth();
  const isTeacherRole = Boolean(userRole?.toLowerCase().includes('teacher'));
  const isMounted = useRef(true);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [videoAttendanceEnabled, setVideoAttendanceEnabled] = useState<boolean>(false);
  const [attendanceInputMode, setAttendanceInputMode] = useState<'image' | 'video'>('image');

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

  useEffect(() => {
    try {
      setTabBarVisible(!cameraActive);
    } catch (e) {
      // ignore
    }
  }, [cameraActive, setTabBarVisible]);

  const handleScroll = useScrollTabBar();
  const cameraRef = useRef<Camera>(null);
  const [_resolvedDevice, setResolvedDevice] = useState<any>(undefined);
  const device = isCameraAvailable ? _resolvedDevice : undefined;

  const [form, setForm] = useState<AttendanceForm>({
    employee_id: '',
    branch_id: '',
    class_grade: '',
    section: '',
    attendance_date: getTodayDateString(),
    attendance_session: '1',
  });
  const [dailySessions, setDailySessions] = useState<number>(1);
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; options: { label: string; value: any }[]; selectedValue: any; onValueChange: (value: any) => void } | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string } | null>(null);
  const [classOptions, setClassOptions] = useState<any[]>([]);

  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState<string>('');
  const [enableManualAttendance, setEnableManualAttendance] = useState<boolean>(false);

  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [manualStatusById, setManualStatusById] = useState<Record<string, string>>({});
  const [manualFilter, setManualFilter] = useState<ManualFilter>('review');
  const [manualSaving, setManualSaving] = useState<boolean>(false);
  const [sessionMarked, setSessionMarked] = useState({ session1: false, session2: false });
  const [viewingGallery, setViewingGallery] = useState<boolean>(false);
  const [savedAttendanceData, setSavedAttendanceData] = useState<any>(null);

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

  const isCurrentSessionMarked = useCallback(() => {
    const currentSession = parseInt(form.attendance_session || '1', 10);
    return currentSession === 1 ? sessionMarked.session1 : sessionMarked.session2;
  }, [form.attendance_session, sessionMarked]);

  const checkSessionMarkedStatus = useCallback(async () => {
    const activeSchoolCode = schoolCode || (await getSchoolCode());
    const activeEmployeeId = String(teacherData?.employee_id || employeeId || (await getEmployeeId()) || '').trim();
    if (!activeSchoolCode || !activeEmployeeId) { return; }

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

  useEffect(() => {
    const persist = async () => {
      if (!schoolCode || !employeeId) { return; }
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

  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const bid = await getBranchId();
        const eid = await getEmployeeId();
        const classTeacherFlag = await AsyncStorage.getItem('is_class_teacher');
        if (!isMounted.current) { return; }
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
        if (!isMounted.current) { return; }

        if (cachedSession) {
          const sessionData = JSON.parse(cachedSession);
          setTeacherData(sessionData?.teacher_data || null);
          setAssignedClasses(Array.isArray(sessionData?.assigned_classes) ? sessionData.assigned_classes.filter(Boolean) : []);
        }
        if (cachedAttendance) {
          const state = JSON.parse(cachedAttendance);
          if (state?.form) {
            setForm(prev => ({ ...prev, ...state.form, attendance_date: getTodayDateString() }));
          }
          if (Array.isArray(state?.studentImages)) { setStudentImages(state.studentImages.filter(Boolean)); }
          if (state?.result) { setResult(state.result); }
          if (state?.step) { setStep(state.step); }
          if (state?.teacherData) { setTeacherData(state.teacherData); }
          if (Array.isArray(state?.assignedClasses)) { setAssignedClasses(state.assignedClasses); }
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

  const loadClasses = useCallback(async () => {
    if (!branchId || !schoolCode) { return; }
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
    if (!cameraRef.current) { return null; }
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
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
          ],
        );
        return;
      }

      setCameraPosition(desiredPosition);
      setTimeout(() => {
        if (isMounted.current && device) {
          setCameraActive(true);
        } else if (isMounted.current) {
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
    setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const handleTeacherCapture = async () => {
    const img = await captureImage();
    if (!img || !isMounted.current) { return; }
    try {
      const stat = await RNFS.stat(img.replace('file://', ''));
      if (stat.size > MAX_UPLOAD_IMAGE_BYTES) {
        showToast(
          'Photo too large',
          'Use Upload from Gallery or retake with better lighting',
          '⚠️',
          '#F59E0B',
        );
        return;
      }
    } catch {
      // ponytail: stat failure is rare; verify step still enforces size on upload
    }
    setTeacherImage(img);
    setCameraActive(false);
    showToast('Photo captured', 'Teacher image is ready', '✅', '#22C55E');
  };

  const handleTeacherUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 720, maxHeight: 720 }, (response) => {
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
    if (cameraUse === 'student' && !cameraActive && studentImages.length < MAX_STUDENT_IMAGES) {
      startCamera('student');
    }
  };

  const removeStudentImage = (index: number) => {
    setStudentImages(prev => prev.filter((_, i) => i !== index));
    showToast('Image removed', `${studentImages.length - 1} image(s) remaining`, '🗑️', Theme.colors.error);
  };

  const verifyTeacher = async () => {
    if (!teacherImage) {
      showToast('Image Required', 'Please capture or upload your photo first', '📸', Theme.colors.primary);
      startCamera('teacher');
      return;
    }
    setLoading(true);
    try {
      const resolvedEmployeeId = String(employeeId || (await getEmployeeId()) || '').trim();
      if (!resolvedEmployeeId) {
        setErrorModal({
          visible: true,
          title: 'Verification Failed',
          message: 'Employee ID not found. Please log out and sign in again.',
        });
        return;
      }

      const base64Image = await readImageBase64ForUpload(teacherImage);
      const payload: any = {
        school_code: schoolCode || (await getSchoolCode()),
        employee_id: resolvedEmployeeId,
        branch_id: branchId || (await getBranchId()),
        image: base64Image,
        attendance_session: parseInt(form.attendance_session || '1', 10),
      };
      const data = await teacherService.verifyTeacher(payload);
      if (!isMounted.current) { return; }

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

      await checkSessionMarkedStatus();
      if (!isMounted.current) { return; }
      await loadClasses();
      if (!isMounted.current) { return; }

      if (assigned.length === 1) {
        const first = assigned[0];
        setSelectedClassKey(`${first.class_grade}__${first.section}`);
        setForm(prev => ({ ...prev, class_grade: first.class_grade, section: first.section }));
      }

      setCameraActive(false);
      setStep(2);
      showToast('Identity verified!', `Welcome, ${data.teacher_full_name}`, '✅', '#22C55E');
    } catch (err: any) {
      if (!isMounted.current) { return; }
      const status = err?.response?.status;
      const errorMsg = formatHttpErrorMessage(err, 'Face verification failed. Please try again.');
      const isFaceRelated = (msg: string) =>
        msg?.toLowerCase().includes('face')
        || msg?.toLowerCase().includes('recogni')
        || msg?.toLowerCase().includes('match')
        || msg?.toLowerCase().includes('detect')
        || msg?.toLowerCase().includes('embed');

      if (status === 401 || (status === 400 && isFaceRelated(errorMsg))) {
        const verificationError = isFaceRelated(errorMsg)
          ? errorMsg
          : 'Face not recognized. Please try again with a clearer photo.';
        setErrorModal({
          visible: true,
          title: 'Face Verification Failed',
          message: `${verificationError}\n\nDo not log out — stay in the app and try again.`,
        });
        return;
      }
      setErrorModal({ visible: true, title: 'Verification Failed', message: errorMsg });
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
      const base64Images = await Promise.all(
        studentImages.map(async (uri) => {
          const raw = await RNFS.readFile(uri.replace('file://', ''), 'base64');
          return cleanBase64(raw);
        }),
      );
      const payload: any = {
        school_code: activeSchoolCode,
        branch_id: activeBranchId,
        employee_id: activeEmployeeId,
        class_grade: String(form.class_grade).toLowerCase(),
        section: String(form.section).toLowerCase(),
        attendance_date: form.attendance_date,
        preview_only: true,
        images: base64Images,
      };
      if (dailySessions === 1) {
        payload.attendance_session = 1;
      } else {
        payload.attendance_session = parseInt(form.attendance_session || '1', 10);
      }

      const data = await teacherService.processAttendance(payload);
      if (!isMounted.current) { return; }

      setResult((prevResult: AttendanceResult | null) => {
        if (!prevResult) { return data; }
        const prevPresentIds = new Set((prevResult.present || []).map(s => s.student_id));
        const newPresentIds = new Set((data.present || []).map((s: any) => s.student_id));
        const mergedPresentIds = new Set([...prevPresentIds, ...newPresentIds]);
        const mergedPresent: Student[] = [];
        const seenIds = new Set<string>();
        (prevResult.present || []).forEach((student: any) => {
          const id = student.student_id;
          if (id && !seenIds.has(id)) {
            mergedPresent.push(student);
            seenIds.add(id);
          }
        });
        (data.present || []).forEach((student: any) => {
          const id = student.student_id;
          if (id && !seenIds.has(id)) {
            mergedPresent.push(student);
            seenIds.add(id);
          }
        });
        const mergedAbsent = (data.absent || []).filter((student: any) => !mergedPresentIds.has(student.student_id));
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
      if (!isMounted.current) { return; }
      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail || err?.response?.data?.message;
      const errorMsg = backendDetail || err?.message || 'Please try again';
      if (status === 401) {
        Alert.alert('Session Expired', 'Please verify your identity again.');
        setStep(1);
        return;
      }
      if (status === 503 || status === 502 || status === 504) {
        const serviceError = status === 503
          ? 'The face verification service is temporarily unavailable.'
          : 'The server is temporarily unavailable.';
        Alert.alert(
          'Service Unavailable',
          `${serviceError} Please wait a moment and try again.`,
          [
            { text: 'Retry', onPress: () => { if (isMounted.current) { processAttendance(); } } },
            { text: 'Cancel', onPress: () => { if (isMounted.current) { setLoading(false); } } },
          ],
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

  const manualRows = useMemo(() => {
    if (!result) { return []; }
    const presentRows = Array.isArray(result.present)
      ? result.present.filter(s => s !== null).map(s => ({ ...s, _defaultStatus: 'PRESENT' as const }))
      : [];
    const absentRows = Array.isArray(result.absent)
      ? result.absent.filter(s => s !== null).map(s => ({ ...s, _defaultStatus: 'ABSENT' as const }))
      : [];
    return [...presentRows, ...absentRows].filter(s => s && String(s.student_id || '').trim());
  }, [result]);

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
      const base64Images = await Promise.all(
        studentImages.map(async (uri) => {
          const raw = await RNFS.readFile(uri.replace('file://', ''), 'base64');
          return cleanBase64(raw);
        }),
      );
      const payload: any = {
        school_code: activeSchoolCode,
        branch_id: activeBranchId,
        employee_id: activeEmployeeId,
        class_grade: String(form.class_grade).toLowerCase(),
        section: String(form.section).toLowerCase(),
        attendance_date: form.attendance_date,
        preview_only: false,
        images: base64Images,
      };
      if (dailySessions === 1) {
        payload.attendance_session = 1;
      } else {
        payload.attendance_session = parseInt(form.attendance_session || '1', 10);
      }
      if (Object.keys(manualStatusById).length > 0) {
        payload.manual_attendance = manualRows.map(row => ({
          student_id: row.student_id,
          status: manualStatusById[row.student_id] || row._defaultStatus,
        }));
      }

      const data = await teacherService.processAttendance(payload);
      if (isMounted.current) {
        const currentSession = parseInt(form.attendance_session || '1', 10);
        setSessionMarked(prev => ({ ...prev, [`session${currentSession}`]: true }));
        setSavedAttendanceData(data);
        setViewingGallery(true);
        showToast('Attendance saved', `${data?.summary?.present_count || 0} present, ${data?.summary?.absent_count || 0} absent`, '✅', '#22C55E');
      }
    } catch (err: any) {
      if (!isMounted.current) { return; }
      const status = err?.response?.status;
      const backendDetail = err?.response?.data?.detail || err?.response?.data?.message;
      const errorMsg = backendDetail || err?.message || 'Please try again';
      if (status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please verify your identity again.');
        setStep(1);
        return;
      }
      if (status === 503 || status === 502 || status === 504) {
        const serviceError = status === 503
          ? 'The face verification service is temporarily unavailable.'
          : 'The server is temporarily unavailable.';
        Alert.alert(
          'Service Unavailable',
          `${serviceError} Please wait a moment and try again.`,
          [
            { text: 'Retry', onPress: () => { if (isMounted.current) { saveAttendance(); } } },
            { text: 'Cancel', onPress: () => { if (isMounted.current) { setManualSaving(false); } } },
          ],
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
    if (!manualRows.length) { return; }
    const next: Record<string, string> = {};
    for (const row of manualRows) {
      const sid = String(row.student_id || '').trim();
      if (sid) { next[sid] = row._defaultStatus; }
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
    if (!Array.isArray(assignedClasses)) { return []; }
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
      (c: any) => c && String(c.class_name || '').trim() === String(form.class_grade || '').trim(),
    );
    return Array.isArray(currentCls?.sections) ? currentCls.sections.filter(Boolean) : [];
  }, [assignedClasses, classOptions, form.class_grade]);

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
      if (sid) { next[sid] = row._defaultStatus; }
    }
    setManualStatusById(next);
    setManualFilter('review');
  }, [manualRows]);

  const attendanceRate = useMemo(() => {
    if (!result?.summary?.total_students) { return 0; }
    return Math.round((result.summary.present_count / result.summary.total_students) * 100);
  }, [result]);

  const handleClassChange = (className: string) => {
    setForm(prev => ({ ...prev, class_grade: className, section: '' }));
    setSelectedClassKey('');
  };

  const handleSectionChange = (section: string) => {
    setForm(prev => ({ ...prev, section }));
    const selected = assignedClassOptions.find(opt => opt.class_grade === form.class_grade && opt.section === section);
    if (selected) { setSelectedClassKey(selected.key); }
  };

  const openClassPicker = () => {
    setPickerModal({
      visible: true,
      title: 'Select Class',
      options: effectiveClassOptions.map((c: any) => ({ label: `Class ${c.class_name}`, value: c.class_name })),
      selectedValue: form.class_grade,
      onValueChange: handleClassChange,
    });
  };

  const openSectionPicker = () => {
    setPickerModal({
      visible: true,
      title: 'Select Section',
      options: effectiveSectionOptions.map((sec: string) => ({ label: `Section ${sec}`, value: sec })),
      selectedValue: form.section,
      onValueChange: handleSectionChange,
    });
  };

  const openSessionPicker = () => {
    setPickerModal({
      visible: true,
      title: 'Select Session',
      options: [
        { label: `Session 1 (Morning) ${sessionMarked.session1 ? '✓ Marked' : ''}`, value: '1' },
        { label: `Session 2 (Afternoon) ${sessionMarked.session2 ? '✓ Marked' : ''}`, value: '2' },
      ].filter((_, idx) => !(idx === 0 ? sessionMarked.session1 : sessionMarked.session2)),
      selectedValue: form.attendance_session,
      onValueChange: (v) => setForm(prev => ({ ...prev, attendance_session: v })),
    });
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('TeacherDashboard');
    }
  };

  return {
    insets,
    tabBarScrollPadding,
    navigation,
    isTeacherRole,
    step,
    setStep,
    isClassTeacher,
    loading,
    hasPermission,
    cameraActive,
    cameraUse,
    cameraPosition,
    setResolvedDevice,
    handleScroll,
    cameraRef,
    device,
    form,
    setForm,
    dailySessions,
    pickerModal,
    setPickerModal,
    errorModal,
    setErrorModal,
    employeeId,
    teacherImage,
    teacherData,
    assignedClasses,
    assignedClassOptions,
    selectedClassKey,
    setSelectedClassKey,
    enableManualAttendance,
    studentImages,
    previewImage,
    showPreview,
    result,
    setResult,
    manualFilter,
    setManualFilter,
    setManualStatusById,
    manualSaving,
    sessionMarked,
    viewingGallery,
    savedAttendanceData,
    toast,
    hideToast,
    isCurrentSessionMarked,
    toggleCamera,
    stopCamera,
    handleTeacherCapture,
    handleTeacherUpload,
    handleStudentCapture,
    handleStudentUpload,
    confirmStudentImage,
    retakeImage,
    removeStudentImage,
    verifyTeacher,
    processAttendance,
    saveAttendance,
    resetManualChanges,
    resetFlow,
    manualHasChanges,
    manualCounts,
    filteredManualRows,
    attendanceRate,
    openClassPicker,
    openSectionPicker,
    openSessionPicker,
    handleBack,
    startCamera,
  };
}
