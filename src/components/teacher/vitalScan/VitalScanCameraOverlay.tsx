import React, { RefObject } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { ScanType, TEETH_STEPS } from './types';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanCameraOverlayProps {
  cameraRef: RefObject<Camera | null>;
  device: any;
  cameraActive: boolean;
  scanType: ScanType;
  imageCount: number;
  onCapture: () => void;
  onClose: () => void;
}

export default function VitalScanCameraOverlay({
  cameraRef,
  device,
  cameraActive,
  scanType,
  imageCount,
  onCapture,
  onClose,
}: VitalScanCameraOverlayProps) {
  const stepLabel = scanType === 'eye' ? 'Vision Scan' : TEETH_STEPS[imageCount] || 'Done';

  return (
    <View style={styles.cameraContainer}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={cameraActive}
        photo={true}
      />
      <View style={styles.cameraOverlay}>
        <Text style={styles.cameraStep}>{stepLabel}</Text>
        <View style={styles.cameraControls}>
          {imageCount > 0 && (
            <TouchableOpacity accessibilityRole="button" style={styles.cameraDoneBtn} onPress={onClose}>
              <Text style={styles.cameraDoneText}>✓ DONE ({imageCount})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityRole="button" style={styles.cameraCaptureBtn} onPress={onCapture}>
            <Text style={styles.cameraCaptureText}>📸</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity accessibilityRole="button" style={styles.cameraCloseBtn} onPress={onClose}>
        <Text style={styles.cameraCloseText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
