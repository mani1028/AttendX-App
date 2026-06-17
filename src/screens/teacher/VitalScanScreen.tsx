import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import API from '../../services/api';
import { Theme } from '../../theme/theme';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

// Types
interface ImageItem {
  uri: string;
  type?: string;
  name?: string;
}

interface ScanResult {
  health_status: 'Good' | 'Bad';
  prediction: string;
  recommendation: string;
}

interface FeverResult {
  status: string;
  rec: string;
  color: string;
  temp: number;
}

// Toast Component
const Toast: React.FC<{
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
  onHide: () => void;
}> = ({ visible, title, message, icon = 'ℹ️', color = '#6648dc', onHide }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.toast, { borderLeftColor: color }]}>
      <Text style={styles.toastIcon}>{icon}</Text>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{title}</Text>
        {message && <Text style={styles.toastMessage}>{message}</Text>}
      </View>
    </View>
  );
};

export default function VitalScanScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const isMounted = useRef(true);
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

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

  // Form state
  const [studentName, setStudentName] = useState<string>('');
  const [checkupNote, setCheckupNote] = useState<string>('');
  const [scanType, setScanType] = useState<'teeth' | 'eye'>('teeth');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');

  // Fever modal
  const [showFeverModal, setShowFeverModal] = useState<boolean>(false);
  const [tempInput, setTempInput] = useState<string>('');
  const [feverResult, setFeverResult] = useState<FeverResult | null>(null);

  // Toast
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

  // Load cached state on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const schoolCode = await AsyncStorage.getItem('school_code') || '';
        const employeeId = await AsyncStorage.getItem('employee_id') || '';
        const id = `${schoolCode}_${employeeId}`;
        if (!isMounted.current) return;
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

  // Persist state when it changes
  useEffect(() => {
    const persistState = async () => {
      if (!userId) return;
      try {
        const state = {
          studentName,
          checkupNote,
          scanType,
          images,
          result,
        };
        await AsyncStorage.setItem(`last_vital_scan_state_${userId}`, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist vital scan state', e);
      }
    };

    // Use a small delay to avoid excessive writes while typing
    const timer = setTimeout(persistState, 1000);
    return () => clearTimeout(timer);
  }, [studentName, checkupNote, scanType, images, result, userId]);

  const teethSteps = ['Center View', 'Left View', 'Right View'];
  const maxImages = scanType === 'eye' ? 1 : 3;
  const canAddMore = !cameraActive && images.length < maxImages;

  // Request camera permission
  useEffect(() => {
    Camera.requestCameraPermission().then(permission => {
      setHasPermission(permission === 'granted');
    });
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
    showToast('Ready for new scan', 'All fields cleared', '✨', '#6648dc');
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
      color = '#3b82f6';
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
      color = '#EF4444';
    } else {
      status = 'EMERGENCY';
      rec = 'SEEK IMMEDIATE MEDICAL HELP!';
      color = '#7F1D1D';
    }
    setFeverResult({ status, rec, color, temp });
  };

  const handleImageCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });
      if (!isMounted.current) return;
      const newImage = { uri: `file://${photo.path}` };
      
      if (scanType === 'eye') {
        setImages([newImage]);
        setCameraActive(false);
      } else if (images.length < 3) {
        const newImages = [...images, newImage];
        setImages(newImages);
        if (newImages.length === 3) setCameraActive(false);
      }
      setResult(null);
      showToast('Image captured', `${images.length + 1}/${maxImages} captured`, '📸', '#22C55E');
    } catch (err) {
      if (isMounted.current) {
        showToast('Capture failed', 'Please try again', '❌', '#EF4444');
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
          const newImages = [...images, newImage];
          setImages(newImages);
        }
        setResult(null);
        showToast('Image uploaded', `${images.length + 1}/${maxImages} added`, '📁', '#6648dc');
      }
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
      // Parse medical history for recommendation
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
        const blob = await convertImageToBlob(images[i].uri);
        const formData = new FormData();
        formData.append('image', {
          uri: images[i].uri,
          type: 'image/jpeg',
          name: `scan_${i}.jpg`,
        } as any);

        const res = await API.post(`/vitalscan/predict/${endpoint}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (!isMounted.current) return;
        resultsData.push(res.data);
      }

      if (!isMounted.current) return;

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
      if (!isMounted.current) return;
      if (err?.response?.status === 401) return;
      const message = err?.response?.data?.detail || err?.response?.data?.message || 'Check backend connection';
      showToast('Analysis failed', message, '❌', '#EF4444');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const isGood = result?.health_status === 'Good';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Toast */}
      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        icon={toast.icon}
        color={toast.color}
        onHide={() => setToast({ visible: false, title: '' })}
      />

      {/* Fever Modal */}
      <Modal visible={showFeverModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => {
              setShowFeverModal(false);
              setFeverResult(null);
            }}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalIcon}>🌡️</Text>
            <Text style={styles.modalTitle}>Fever Diagnosis</Text>
            <Text style={styles.modalSubtitle}>Enter body temperature in °C</Text>
            
            <View style={styles.tempRow}>
              <TextInput
                style={styles.tempInput}
                placeholder="e.g. 38.5 °C"
                placeholderTextColor="#000000"
                keyboardType="numeric"
                value={tempInput}
                onChangeText={setTempInput}
              />
              <TouchableOpacity style={styles.checkBtn} onPress={diagnoseFever}>
                <Text style={styles.checkBtnText}>CHECK</Text>
              </TouchableOpacity>
            </View>

            {feverResult && (
              <View style={[styles.feverResult, { backgroundColor: feverResult.color + '12' }]}>
                <View style={[styles.feverResultBorder, { backgroundColor: feverResult.color }]} />
                <Text style={[styles.feverStatus, { color: feverResult.color }]}>{feverResult.status}</Text>
                <Text style={styles.feverTemp}>{feverResult.temp}°C</Text>
                <Text style={styles.feverRec}>{feverResult.rec}</Text>
              </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
              {[
                ['#3b82f6', '<36.1'],
                ['#22C55E', '36–37.2'],
                ['#F59E0B', '37.3–38'],
                ['#F97316', '38–39.4'],
                ['#EF4444', '39.5–40'],
                ['#7F1D1D', '>40'],
              ].map(([color, label]) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color as string }]} />
                  <Text style={styles.legendLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

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
              {scanType === 'eye' ? 'Vision Scan' : teethSteps[images.length] || 'Done'}
            </Text>
            <View style={styles.cameraControls}>
              {images.length > 0 && (
                <TouchableOpacity style={styles.cameraDoneBtn} onPress={() => setCameraActive(false)}>
                  <Text style={styles.cameraDoneText}>✓ DONE ({images.length})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cameraCaptureBtn} onPress={handleImageCapture}>
                <Text style={styles.cameraCaptureText}>📸</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.cameraCloseBtn} onPress={() => setCameraActive(false)}>
            <Text style={styles.cameraCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Navy Hero Header */}
        <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)}
            >
              <ChevronLeft size={24} color={HEADER_CONSTANTS.TEXT_COLOR} />
            </TouchableOpacity>
            <AppText weight="bold" style={styles.headerTitle}>VitalScan AI</AppText>
            <View style={{ width: HEADER_CONSTANTS.ICON_BUTTON_SIZE }} />
          </View>

          <View style={styles.heroContent}>
            <AppText weight="bold" style={styles.heroGreeting}>Health Diagnostics</AppText>
            <AppText weight="semibold" style={styles.heroSubtext}>AI-powered vital scanning for student wellness</AppText>
          </View>
        </View>

        {/* Header Actions Row */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity style={styles.newBtn} onPress={startNewStudent}>
            <Text style={styles.newBtnText}>👤 New</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.feverBtn} onPress={() => setShowFeverModal(true)}>
            <Text style={styles.feverBtnText}>🌡️ Fever</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skinBtn}
            onPress={() => navigation.navigate('SkinDisease' as never)}
          >
            <Text style={styles.skinBtnText}>🔍 Skin</Text>
          </TouchableOpacity>
        </View>

        {/* Identity Card */}
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>👤</Text>
            <Text style={styles.cardHeaderTitle}>01 — Identity</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.label}>Student Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Student full name"
              placeholderTextColor="#8898aa"
              value={studentName}
              onChangeText={setStudentName}
            />
          </View>
        </AppCard>

        {/* Medical History Card */}
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📋</Text>
            <Text style={styles.cardHeaderTitle}>02 — Medical History</Text>
          </View>
          <View style={styles.cardBody}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Last checkup notes (e.g. 2 months ago)..."
              placeholderTextColor="#8898aa"
              multiline
              numberOfLines={3}
              value={checkupNote}
              onChangeText={setCheckupNote}
            />
          </View>
        </AppCard>

        {/* Select Target Card */}
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>🎯</Text>
            <Text style={styles.cardHeaderTitle}>03 — Select Target</Text>
            <Text style={styles.cardHeaderBadge}>
              {scanType === 'eye' ? '👁 Vision' : '🦷 Dental'}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.pillContainer}>
              <TouchableOpacity
                style={[styles.pill, scanType === 'teeth' && styles.pillActive]}
                onPress={() => {
                  if (!cameraActive) {
                    setScanType('teeth');
                    setImages([]);
                  }
                }}
              >
                <Text style={[styles.pillText, scanType === 'teeth' && styles.pillTextActive]}>
                  🦷 TEETH
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, scanType === 'eye' && styles.pillActive]}
                onPress={() => {
                  if (!cameraActive) {
                    setScanType('eye');
                    setImages([]);
                  }
                }}
              >
                <Text style={[styles.pillText, scanType === 'eye' && styles.pillTextActive]}>
                  👁 VISION
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </AppCard>

        {/* Capture Card */}
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📷</Text>
            <Text style={styles.cardHeaderTitle}>04 — Capture</Text>
            <Text style={styles.cardHeaderBadge}>{images.length}/{maxImages} captured</Text>
          </View>
          <View style={styles.cardBody}>
            {/* Preview Frame */}
            <View style={styles.camFrame}>
              {images.length > 0 ? (
                <Image source={{ uri: images[images.length - 1].uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderFrame}>
                  <Text style={styles.placeholderIcon}>📷</Text>
                  <Text style={styles.placeholderText}>Ready for Input</Text>
                </View>
              )}
            </View>

            {/* Thumbnails */}
            <View style={styles.thumbContainer}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.thumb}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImage} />
                  <TouchableOpacity style={styles.thumbRemove} onPress={() => removeImage(idx)}>
                    <Text style={styles.thumbRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {Array.from({ length: maxImages - images.length }).map((_, i) => (
                <View key={`slot-${i}`} style={styles.thumbSlot}>
                  <Text style={styles.thumbSlotNum}>{images.length + i + 1}</Text>
                </View>
              ))}
            </View>

            {/* Source Buttons */}
            {canAddMore && (
              <View style={styles.sourceRow}>
                <TouchableOpacity style={styles.sourceBtn} onPress={() => setCameraActive(true)}>
                  <Text style={styles.sourceBtnText}>📷 {images.length > 0 ? 'Add Photo' : 'Camera'}</Text>
                </TouchableOpacity>
                {images.length === 0 && (
                  <TouchableOpacity style={styles.sourceBtn} onPress={handleImageUpload}>
                    <Text style={styles.sourceBtnText}>📁 Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Run Button */}
            {!cameraActive && images.length > 0 && (
              <TouchableOpacity style={styles.runBtn} onPress={runScan} disabled={loading}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.runBtnText}> ANALYZING...</Text>
                  </>
                ) : (
                  <Text style={styles.runBtnText}>🔬 RUN AI DIAGNOSTICS</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </AppCard>

        {/* Results Card */}
        <AppCard style={styles.resultsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>📊</Text>
            <Text style={styles.cardHeaderTitle}>Diagnostic Results</Text>
            {result && (
              <View style={[styles.resultBadge, isGood ? styles.resultBadgeGood : styles.resultBadgeBad]}>
                <Text style={[styles.resultBadgeText, isGood ? styles.resultBadgeTextGood : styles.resultBadgeTextBad]}>
                  {isGood ? '✅ HEALTHY' : '⚠️ CONCERN'}
                </Text>
              </View>
            )}
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.scanningContainer}>
              <View style={styles.scanBox}>
                <View style={styles.scanLine} />
                {images.length > 0 && (
                  <Image source={{ uri: images[images.length - 1].uri }} style={styles.scanImage} />
                )}
              </View>
              <ActivityIndicator size="large" color="#6648dc" />
              <Text style={styles.scanningText}>AI ANALYZING DATA</Text>
              <View style={styles.tagRow}>
                {['Pattern Recognition', 'Anomaly Detection', 'Generating Report'].map((s, i) => (
                  <View key={s} style={styles.tag}>
                    <Text style={styles.tagText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Result State */}
          {!loading && result && (
            <View style={styles.resultContainer}>
              <View style={[styles.resultTopBar, isGood ? styles.resultTopBarGood : styles.resultTopBarBad]} />
              <View style={styles.resultBody}>
                <View style={styles.patientCard}>
                  <Text style={styles.patientLabel}>PATIENT</Text>
                  <Text style={styles.patientName}>{studentName.toUpperCase() || 'N/A'}</Text>
                  {checkupNote && <Text style={styles.patientNote}>Note: {checkupNote}</Text>}
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaKey}>SCAN TYPE</Text>
                    <Text style={styles.metaVal}>{scanType === 'eye' ? '👁️ Vision' : '🦷 Teeth'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaKey}>IMAGES</Text>
                    <Text style={styles.metaVal}>{images.length} captured</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaKey}>STATUS</Text>
                    <Text style={styles.metaVal}>{isGood ? 'Healthy' : 'Needs Attention'}</Text>
                  </View>
                </View>

                <Text style={styles.findingsLabel}>🔍 AI Findings</Text>
                <Text style={styles.findingsText}>{result.prediction}</Text>

                <View style={[styles.recCard, isGood ? styles.recCardGood : styles.recCardBad]}>
                  <Text style={[styles.recLabel, isGood ? styles.recLabelGood : styles.recLabelBad]}>
                    📋 Recommendation
                  </Text>
                  <Text style={styles.recText}>{result.recommendation}</Text>
                </View>

                <TouchableOpacity style={styles.clearBtn} onPress={startNewStudent}>
                  <Text style={styles.clearBtnText}>CLOSE & START NEW SCAN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Empty State */}
          {!loading && !result && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyTitle}>Awaiting Visual Data Stream</Text>
              <Text style={styles.emptyText}>
                Capture images and run diagnostics to see results here.
              </Text>
            </View>
          )}
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerStandard: {
    backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    elevation: 8,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
    fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
    color: HEADER_CONSTANTS.TEXT_COLOR,
  },
  heroContent: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  heroSubtext: {
    color: `rgba(255,255,255,${HEADER_CONSTANTS.SUBTITLE_OPACITY})`,
    fontSize: HEADER_CONSTANTS.SUBTITLE_FONT_SIZE,
    marginTop: 6,
    lineHeight: 18,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    marginTop: -20, // Negative margin to overlap with header
    marginHorizontal: 16,
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
  },
  toastIcon: {
    fontSize: 20,
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
  // Removed duplicate header style
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#6648dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  newBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
  },
  newBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  feverBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
  },
  feverBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  skinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Theme.colors.violet,
    borderRadius: 10,
  },
  skinBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  cardHeaderIcon: {
    fontSize: 14,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  cardHeaderBadge: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#8898aa',
    fontWeight: '500',
  },
  cardBody: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0d1b2a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  pillActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '10',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a5568',
  },
  pillTextActive: {
    color: Theme.colors.primary,
  },
  camFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#0d1b2a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.4,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8898aa',
  },
  thumbContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 17,
    height: 17,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  thumbSlot: {
    width: 60,
    height: 60,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSlotNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8898aa',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sourceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  sourceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  runBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  runBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  resultsCard: {
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  resultBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  resultBadgeGood: {
    backgroundColor: '#dcfce7',
  },
  resultBadgeBad: {
    backgroundColor: '#fee2e2',
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultBadgeTextGood: {
    color: '#166534',
  },
  resultBadgeTextBad: {
    color: '#991b1b',
  },
  scanningContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  scanBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Theme.colors.primary,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Theme.colors.primary,
    zIndex: 10,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  scanImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.5,
  },
  scanningText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
    letterSpacing: 2,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  tagText: {
    fontSize: 10,
    color: '#8898aa',
  },
  resultContainer: {
    overflow: 'hidden',
  },
  resultTopBar: {
    height: 5,
  },
  resultTopBarGood: {
    backgroundColor: '#22C55E',
  },
  resultTopBarBad: {
    backgroundColor: '#EF4444',
  },
  resultBody: {
    padding: 20,
  },
  patientCard: {
    backgroundColor: '#f0f2f7',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  patientLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8898aa',
    letterSpacing: 1,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  patientNote: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#f0f2f7',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 10,
  },
  metaKey: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8898aa',
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d1b2a',
  },
  findingsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4a5568',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  findingsText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 14,
  },
  recCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  recCardGood: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 5,
    borderLeftColor: '#22C55E',
  },
  recCardBad: {
    backgroundColor: '#fff1f2',
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
  },
  recLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  recLabelGood: {
    color: '#166534',
  },
  recLabelBad: {
    color: '#991b1b',
  },
  recText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#0d1b2a',
    lineHeight: 20,
  },
  clearBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a5568',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 44,
    opacity: 0.35,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4a5568',
  },
  emptyText: {
    fontSize: 12,
    color: '#8898aa',
    textAlign: 'center',
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
    backgroundColor: Theme.colors.primary,
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
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCaptureText: {
    fontSize: 24,
  },
  cameraCloseBtn: {
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
  cameraCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#4a5568',
  },
  modalIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d1b2a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 20,
  },
  tempRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tempInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  checkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
  },
  checkBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  feverResult: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  feverResultBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  feverStatus: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  feverTemp: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d1b2a',
    marginBottom: 8,
  },
  feverRec: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  legendItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: '100%',
    height: 5,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 8,
    color: '#8898aa',
    textAlign: 'center',
  },
});