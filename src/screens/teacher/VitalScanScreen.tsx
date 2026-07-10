import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  vitalScanStyles as styles,
  VitalScanToast,
  SafeCameraDeviceResolver,
  FeverModal,
  VitalScanCameraOverlay,
  VitalScanTopActions,
  VitalScanIdentityCard,
  VitalScanMedicalHistoryCard,
  VitalScanTargetCard,
  VitalScanCaptureCard,
  VitalScanResultsCard,
  type ImageItem,
  type ScanResult,
  type FeverResult,
  type ScanType,
} from '../../components/teacher/vitalScan';

const isCameraAvailable = typeof Camera !== 'undefined' && Camera !== null;

export default function VitalScanScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const cameraRef = useRef<Camera>(null);
  const [resolvedDevice, setResolvedDevice] = useState<any>(undefined);
  const device = isCameraAvailable ? resolvedDevice : undefined;
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

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

  const handleScroll = useScrollTabBar();

  const [studentName, setStudentName] = useState<string>('');
  const [checkupNote, setCheckupNote] = useState<string>('');
  const [scanType, setScanType] = useState<ScanType>('teeth');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');

  const [showFeverModal, setShowFeverModal] = useState<boolean>(false);
  const [tempInput, setTempInput] = useState<string>('');
  const [feverResult, setFeverResult] = useState<FeverResult | null>(null);

  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    icon?: string;
    color?: string;
  }>({ visible: false, title: '' });

  const showToast = (title: string, message?: string, icon?: string, color?: string) => {
    setToast({ visible: true, title, message, icon, color });
  };

  const hideToast = () => setToast({ visible: false, title: '' });

  useEffect(() => {
    const loadCache = async () => {
      try {
        const schoolCode = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
        const employeeId = await storage.getString(StorageKeys.EMPLOYEE_ID) || '';
        const id = `${schoolCode}_${employeeId}`;
        if (!isMounted.current) { return; }
        setUserId(id);

        const cachedState = await AsyncStorage.getItem(`last_vital_scan_state_${id}`);
        if (cachedState && isMounted.current) {
          const state = JSON.parse(cachedState);
          setStudentName(state.studentName || '');
          setCheckupNote(state.checkupNote || '');
          setScanType(state.scanType || 'teeth');
          setImages(state.images || []);
          setResult(state.result || null);
        }
      } catch (e) {
        console.warn('Failed to load vital scan cache', e);
      }
    };
    loadCache();
  }, []);

  useEffect(() => {
    const persistState = async () => {
      if (!userId) { return; }
      try {
        const state = { studentName, checkupNote, scanType, images, result };
        await AsyncStorage.setItem(`last_vital_scan_state_${userId}`, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist vital scan state', e);
      }
    };

    const timer = setTimeout(persistState, 1000);
    return () => clearTimeout(timer);
  }, [studentName, checkupNote, scanType, images, result, userId]);

  const maxImages = scanType === 'eye' ? 1 : 3;
  const canAddMore = !cameraActive && images.length < maxImages;

  useEffect(() => {
    if (isCameraAvailable) {
      try {
        Camera.requestCameraPermission().then(permission => {
          setHasPermission(permission === 'granted');
        });
      } catch (e) {
        console.warn('Camera permission request failed (native module not linked):', e);
      }
    }
  }, []);

  const startNewStudent = async () => {
    setStudentName('');
    setCheckupNote('');
    setImages([]);
    setResult(null);
    setFeverResult(null);
    setTempInput('');
    setCameraActive(false);
    try {
      if (userId) {
        await AsyncStorage.removeItem(`last_vital_scan_state_${userId}`);
      }
    } catch (e) {
      console.warn('Failed to clear vital scan cache', e);
    }
    showToast('Ready for new scan', 'All fields cleared', '✨', Theme.colors.violet);
  };

  const closeFeverModal = () => {
    setShowFeverModal(false);
    setFeverResult(null);
  };

  const diagnoseFever = () => {
    const temp = parseFloat(tempInput);
    if (isNaN(temp)) {
      showToast('Invalid input', 'Enter a valid temperature', '⚠️', '#F59E0B');
      return;
    }

    let status: string, rec: string, color: string;
    if (temp < 36.1) {
      status = 'Low Temp';
      rec = 'Keep warm and monitor.';
      color = Theme.colors.blue;
    } else if (temp <= 37.2) {
      status = 'Normal';
      rec = 'Temperature is healthy.';
      color = '#22C55E';
    } else if (temp <= 38.0) {
      status = 'Low Grade Fever';
      rec = 'Rest and stay hydrated.';
      color = '#F59E0B';
    } else if (temp <= 39.4) {
      status = 'Fever';
      rec = 'Take rest. Consider paracetamol.';
      color = '#F97316';
    } else if (temp <= 40.0) {
      status = 'High Fever';
      rec = 'Consult a doctor immediately.';
      color = Theme.colors.error;
    } else {
      status = 'EMERGENCY';
      rec = 'SEEK IMMEDIATE MEDICAL HELP!';
      color = '#7F1D1D';
    }
    setFeverResult({ status, rec, color, temp });
  };

  const handleImageCapture = async () => {
    if (!cameraRef.current) { return; }
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      if (!isMounted.current) { return; }
      const newImage = { uri: `file://${photo.path}` };

      if (scanType === 'eye') {
        setImages([newImage]);
        setCameraActive(false);
      } else if (images.length < 3) {
        const newImages = [...images, newImage];
        setImages(newImages);
        if (newImages.length === 3) { setCameraActive(false); }
      }
      setResult(null);
      showToast('Image captured', `${images.length + 1}/${maxImages} captured`, '📸', '#22C55E');
    } catch (err) {
      if (isMounted.current) {
        showToast('Capture failed', 'Please try again', '❌', Theme.colors.error);
      }
    }
  };

  const handleImageUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0]) {
        const newImage = { uri: response.assets[0].uri! };

        if (scanType === 'eye') {
          setImages([newImage]);
        } else if (images.length < 3) {
          setImages([...images, newImage]);
        }
        setResult(null);
        showToast('Image uploaded', `${images.length + 1}/${maxImages} added`, '📁', Theme.colors.violet);
      }
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSelectScanType = (type: ScanType) => {
    setScanType(type);
    setImages([]);
  };

  const convertImageToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    return await response.blob();
  };

  const runScan = async () => {
    if (!studentName.trim()) {
      showToast('Name required', 'Enter student name', '👤', '#F59E0B');
      return;
    }
    if (images.length === 0) {
      showToast('No images', 'Capture or upload at least one image', '📷', '#F59E0B');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let autoMessage = '';
      const note = checkupNote.toLowerCase();
      const yearsMatch = note.match(/(\d+)\s*year/);
      const monthsMatch = note.match(/(\d+)\s*month/);

      if (!note) {
        autoMessage = 'Consult the doctor (No history). ';
      } else if (yearsMatch && parseInt(yearsMatch[1]) >= 1) {
        autoMessage = 'Consult the doctor (Last checkup > 1yr). ';
      } else if (monthsMatch && parseInt(monthsMatch[1]) >= 3) {
        autoMessage = 'Consult the doctor (Last checkup > 3mo). ';
      }

      const endpoint = scanType === 'eye' ? 'eye' : 'teeth';
      const resultsData: any[] = [];

      for (let i = 0; i < images.length; i++) {
        await convertImageToBlob(images[i].uri);
        const formData = new FormData();
        formData.append('image', {
          uri: images[i].uri,
          type: 'image/jpeg',
          name: `scan_${i}.jpg`,
        } as any);

        const res = await API.post(`/vitalscan/predict/${endpoint}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (!isMounted.current) { return; }
        resultsData.push(res.data);
      }

      if (!isMounted.current) { return; }

      const hasConcern = resultsData.some(r => r.health_status?.toLowerCase() !== 'good');
      const predictions = [...new Set(resultsData.map(r => r.prediction))].join(' | ');
      const recommendations = [...new Set(resultsData.map(r => r.recommendation))].join(' ');

      setResult({
        health_status: hasConcern ? 'Bad' : 'Good',
        prediction: predictions,
        recommendation: autoMessage + recommendations,
      });

      showToast('Analysis complete', `Report ready for ${studentName}`, '✅', '#22C55E');
    } catch (err: any) {
      if (!isMounted.current) { return; }
      if (err?.response?.status === 401) { return; }
      const message = err?.response?.data?.detail || err?.response?.data?.message || 'Check backend connection';
      showToast('Analysis failed', message, '❌', Theme.colors.error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      {isCameraAvailable && <SafeCameraDeviceResolver onDevice={setResolvedDevice} />}

      <VitalScanToast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        icon={toast.icon}
        color={toast.color}
        onHide={hideToast}
      />

      <FeverModal
        visible={showFeverModal}
        tempInput={tempInput}
        feverResult={feverResult}
        onClose={closeFeverModal}
        onTempInputChange={setTempInput}
        onDiagnose={diagnoseFever}
      />

      {cameraActive && hasPermission && device && (
        <VitalScanCameraOverlay
          cameraRef={cameraRef}
          device={device}
          cameraActive={cameraActive}
          scanType={scanType}
          imageCount={images.length}
          onCapture={handleImageCapture}
          onClose={() => setCameraActive(false)}
        />
      )}

      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.contentContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          title="VitalScan AI"
          subtitle="AI-powered student health screening"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
          <VitalScanTopActions
            onNewStudent={startNewStudent}
            onOpenFever={() => setShowFeverModal(true)}
            onNavigateSkin={() => navigation.navigate('TeacherSkinDisease' as never)}
          />
          <VitalScanIdentityCard
            studentName={studentName}
            onStudentNameChange={setStudentName}
          />
          <VitalScanMedicalHistoryCard
            checkupNote={checkupNote}
            onCheckupNoteChange={setCheckupNote}
          />
          <VitalScanTargetCard
            scanType={scanType}
            cameraActive={cameraActive}
            onSelectScanType={handleSelectScanType}
          />
          <VitalScanCaptureCard
            images={images}
            maxImages={maxImages}
            canAddMore={canAddMore}
            cameraActive={cameraActive}
            loading={loading}
            onRemoveImage={removeImage}
            onOpenCamera={() => setCameraActive(true)}
            onUpload={handleImageUpload}
            onRunScan={runScan}
          />
          <VitalScanResultsCard
            loading={loading}
            result={result}
            studentName={studentName}
            checkupNote={checkupNote}
            scanType={scanType}
            images={images}
            onStartNew={startNewStudent}
          />
        </View>
      </ScrollView>
    </View>
  );
}
