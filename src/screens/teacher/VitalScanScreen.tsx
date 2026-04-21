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
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';

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
}> = ({ visible, title, message, icon = 'ℹ️', color = '#2563eb', onHide }) => {
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
  const navigation = useNavigation();
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  // Form state
  const [studentName, setStudentName] = useState<string>('');
  const [checkupNote, setCheckupNote] = useState<string>('');
  const [scanType, setScanType] = useState<'teeth' | 'eye'>('teeth');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

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

  const teethSteps = ['Center View', 'Left View', 'Right View'];
  const maxImages = scanType === 'eye' ? 1 : 3;
  const canAddMore = !cameraActive && images.length < maxImages;

  // Request camera permission
  useEffect(() => {
    Camera.requestCameraPermission().then(permission => {
      setHasPermission(permission === 'authorized');
    });
  }, []);

  const startNewStudent = () => {
    setStudentName('');
    setCheckupNote('');
    setImages([]);
    setResult(null);
    setFeverResult(null);
    setTempInput('');
    setCameraActive(false);
    showToast('Ready for new scan', 'All fields cleared', '✨', '#2563eb');
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
        qualityPrioritization: 'quality',
        flash: 'off',
      });
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
      showToast('Capture failed', 'Please try again', '❌', '#EF4444');
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
        showToast('Image uploaded', `${images.length + 1}/${maxImages} added`, '📁', '#2563eb');
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
        resultsData.push(res.data);
      }

      const hasConcern = resultsData.some(r => r.health_status?.toLowerCase() !== 'good');
      const predictions = [...new Set(resultsData.map(r => r.prediction))].join(' | ');
      const recommendations = [...new Set(resultsData.map(r => r.recommendation))].join(' ');

      setResult({
        health_status: hasConcern ? 'Bad' : 'Good',
        prediction: predictions,
        recommendation: autoMessage + recommendations,
      });
      
      showToast('Analysis complete', `Report ready for ${studentName}`, '✅', '#22C55E');
    } catch (err) {
      showToast('Analysis failed', 'Check backend connection', '❌', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  const isGood = result?.health_status === 'Good';

  return (
    <View style={styles.container}>
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
                placeholderTextColor="#8898aa"
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
      {cameraActive && hasPermission && (
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={useCameraDevices().back}
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

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>🔬</Text>
          </View>
          <View>
            <Text style={styles.title}>VitalScan AI</Text>
            <Text style={styles.subtitle}>AI Health Diagnostics</Text>
          </View>
          <View style={styles.headerActions}>
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
              <ActivityIndicator size="large" color="#2563eb" />
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
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  toast: {
    position: 'absolute',
    top: 60,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
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
    backgroundColor: '#2563eb',
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
    backgroundColor: '#7C3AED',
    borderRadius: 10,
  },
  skinBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    overflow: 'hidden',
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
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a5568',
  },
  pillTextActive: {
    color: '#2563eb',
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
    borderColor: '#2563eb',
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
    backgroundColor: '#2563eb',
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
    marginBottom: 16,
    overflow: 'hidden',
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
    borderColor: '#2563eb',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2563eb',
    zIndex: 10,
    shadowColor: '#2563eb',
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
    color: '#2563eb',
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
    backgroundColor: '#2563eb',
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