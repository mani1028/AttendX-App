import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import AppCard from '../../common/AppCard';
import { Theme } from '../../../theme/tokens';
import { ImageItem } from './types';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanCaptureCardProps {
  images: ImageItem[];
  maxImages: number;
  canAddMore: boolean;
  cameraActive: boolean;
  loading: boolean;
  onRemoveImage: (index: number) => void;
  onOpenCamera: () => void;
  onUpload: () => void;
  onRunScan: () => void;
}

export default function VitalScanCaptureCard({
  images,
  maxImages,
  canAddMore,
  cameraActive,
  loading,
  onRemoveImage,
  onOpenCamera,
  onUpload,
  onRunScan,
}: VitalScanCaptureCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>📷</Text>
        <Text style={styles.cardHeaderTitle}>04 — Capture</Text>
        <Text style={styles.cardHeaderBadge}>{images.length}/{maxImages} captured</Text>
      </View>
      <View style={styles.cardBody}>
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

        <View style={styles.thumbContainer}>
          {images.map((img, idx) => (
            <View key={idx} style={styles.thumb}>
              <Image source={{ uri: img.uri }} style={styles.thumbImage} />
              <TouchableOpacity accessibilityRole="button" style={styles.thumbRemove} onPress={() => onRemoveImage(idx)}>
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

        {canAddMore && (
          <View style={styles.sourceRow}>
            <TouchableOpacity accessibilityRole="button" style={styles.sourceBtn} onPress={onOpenCamera}>
              <Text style={styles.sourceBtnText}>📷 {images.length > 0 ? 'Add Photo' : 'Camera'}</Text>
            </TouchableOpacity>
            {images.length === 0 && (
              <TouchableOpacity accessibilityRole="button" style={styles.sourceBtn} onPress={onUpload}>
                <Text style={styles.sourceBtnText}>📁 Upload</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!cameraActive && images.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={styles.runBtn} onPress={onRunScan} disabled={loading}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color={Theme.colors.card} />
                <Text style={styles.runBtnText}> ANALYZING...</Text>
              </>
            ) : (
              <Text style={styles.runBtnText}>🔬 RUN AI DIAGNOSTICS</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </AppCard>
  );
}
