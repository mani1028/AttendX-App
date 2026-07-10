import React from 'react';
import { View, TouchableOpacity, TextInput, Image } from 'react-native';
import { Camera as CameraIcon, CheckCircle2, ChevronRight, Upload, UserCheck } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

interface TeacherVerificationStepProps {
  employeeId: string;
  cameraActive: boolean;
  teacherImage: string | null;
  loading: boolean;
  enableManualAttendance: boolean;
  isTeacherRole: boolean;
  onStartCamera: () => void;
  onUpload: () => void;
  onVerify: () => void;
  onManualAttendance: () => void;
}

export default function TeacherVerificationStep({
  employeeId,
  cameraActive,
  teacherImage,
  loading,
  enableManualAttendance,
  isTeacherRole,
  onStartCamera,
  onUpload,
  onVerify,
  onManualAttendance,
}: TeacherVerificationStepProps) {
  return (
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
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Theme.colors.primary }]} onPress={onStartCamera}>
              <CameraIcon size={20} color={Theme.colors.card} />
              <AppText style={styles.actionBtnText}>Start Camera</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Theme.colors.background }]} onPress={onUpload}>
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
          onPress={onVerify}
          disabled={loading}
          style={styles.primaryButton}
        />

        {enableManualAttendance && !isTeacherRole && (
          <TouchableOpacity style={styles.manualFallbackBtn} onPress={onManualAttendance} activeOpacity={0.8}>
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
  );
}
