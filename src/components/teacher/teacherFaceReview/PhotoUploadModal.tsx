import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { UploadCloud, Camera, AlertTriangle, User } from 'lucide-react-native';
import API from '../../../services/api';
import { Theme } from '../../../theme/tokens';
import { launchCameraWithPermission as launchCamera } from '../../../utils/cameraUtils';
import { teacherFaceReviewStyles as styles } from './teacherFaceReviewStyles';
import { getHeaders } from './helpers';

export interface PhotoUploadModalProps {
  target: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export default function PhotoUploadModal({ target, onClose, onSuccess }: PhotoUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (res) => {
      if (res.didCancel) {return;}
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setPreview(asset.uri);
        setFileName(asset.fileName || 'photo.jpg');
        setError('');
      }
    });
  };

  const captureImage = () => {
    launchCamera({ mediaType: 'photo', quality: 0.9, cameraType: 'front' }, (res) => {
      if (res.didCancel) {return;}
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setPreview(asset.uri);
        setFileName(asset.fileName || `capture_${target?.id}.jpg`);
        setError('');
      }
    });
  };

  const handleUpload = async () => {
    if (!preview || !target) {return;}
    setUploading(true);
    setError('');
    try {
      const headers = await getHeaders();
      const fd = new FormData();
      fd.append('photo', {
        uri: preview,
        type: 'image/jpeg',
        name: fileName || 'photo.jpg',
      } as any);
      const res = await API.post(
        `/profile-photo/upload/student/${encodeURIComponent(target.id)}`,
        fd,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } },
      );
      if (res.data?.ok) {
        onSuccess(target.id);
        onClose();
      } else {
        setError(res.data?.detail || 'Upload failed');
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
              <UploadCloud size={18} color={Theme.colors.primary} />
              <Text style={styles.modalTitle}>Update Photo — {target?.name}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} disabled={uploading}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.modalBody}>
            {error ? (
              <View style={styles.errorRow}>
                <AlertTriangle size={14} color={Theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Preview area */}
            {preview ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: preview }} style={styles.previewImg} />
                <Text style={styles.previewName} numberOfLines={1}>{fileName}</Text>
                <Text style={styles.previewHint}>Tap buttons below to change</Text>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <User size={40} color={Theme.colors.textMuted} style={{ opacity: 0.35 }} />
                <Text style={styles.emptyPreviewText}>No photo selected</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.pickRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.pickBtn} onPress={pickImage} disabled={uploading}>
                <UploadCloud size={16} color={Theme.colors.card} />
                <Text style={styles.pickBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.pickBtn, { backgroundColor: Theme.colors.text }]} onPress={captureImage} disabled={uploading}>
                <Camera size={16} color={Theme.colors.card} />
                <Text style={styles.pickBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity accessibilityRole="button" style={styles.outlineBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.primaryBtn, (!preview || uploading) && { opacity: 0.45 }]}
              onPress={handleUpload}
              disabled={!preview || uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={Theme.colors.card} />
              ) : (
                <>
                  <UploadCloud size={14} color={Theme.colors.card} />
                  <Text style={styles.primaryBtnText}>Save Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}