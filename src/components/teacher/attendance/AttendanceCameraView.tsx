import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Camera, useCameraFormat } from 'react-native-vision-camera';
import { AlertCircle, Camera as CameraIcon, RefreshCcw, XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { MAX_STUDENT_IMAGES } from './helpers';
import { attendanceStyles as styles } from './styles';

interface AttendanceCameraViewProps {
  cameraActive: boolean;
  hasPermission: boolean;
  device: any;
  cameraRef: React.RefObject<Camera | null>;
  cameraUse: 'teacher' | 'student';
  studentImageCount: number;
  onToggleCamera: () => void;
  onStopCamera: () => void;
  onCapture: () => void;
}

export default function AttendanceCameraView({
  cameraActive,
  hasPermission,
  device,
  cameraRef,
  cameraUse,
  studentImageCount,
  onToggleCamera,
  onStopCamera,
  onCapture,
}: AttendanceCameraViewProps) {
  const format = useCameraFormat(device, [
    cameraUse === 'teacher'
      ? { photoResolution: { width: 720, height: 720 } }
      : { photoResolution: 'max' },
  ]);

  if (!cameraActive || !hasPermission) { return null; }

  if (!device) {
    return (
      <View style={styles.cameraContainer}>
        <View style={[styles.camera, { backgroundColor: Theme.colors.text, justifyContent: 'center', alignItems: 'center' }]}>
          <AlertCircle size={48} color={Theme.colors.error} />
          <AppText style={{ color: Theme.colors.card, marginTop: Theme.spacing.md, textAlign: 'center', paddingHorizontal: Theme.spacing.xl }}>
            Camera not available. Please check if camera permission is granted.
          </AppText>
        </View>
        <TouchableOpacity style={styles.closeCameraBtn} onPress={onStopCamera}>
          <XCircle size={24} color={Theme.colors.card} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        format={format}
        isActive={cameraActive}
        photo={true}
      />
      <View style={styles.cameraOverlay}>
        <AppText style={styles.cameraStep}>
          {cameraUse === 'teacher'
            ? 'Teacher Face Verification'
            : `Image ${studentImageCount + 1} of ${MAX_STUDENT_IMAGES}`}
        </AppText>
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraToggleBtn} onPress={onToggleCamera}>
            <RefreshCcw size={24} color={Theme.colors.card} />
          </TouchableOpacity>

          {cameraUse === 'student' && studentImageCount > 0 && (
            <TouchableOpacity style={styles.cameraDoneBtn} onPress={onStopCamera}>
              <AppText style={styles.cameraDoneText}>✓ DONE ({studentImageCount})</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cameraCaptureBtn} onPress={onCapture}>
            <CameraIcon size={24} color={Theme.colors.card} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.closeCameraBtn} onPress={onStopCamera}>
        <XCircle size={24} color={Theme.colors.card} />
      </TouchableOpacity>
    </View>
  );
}
