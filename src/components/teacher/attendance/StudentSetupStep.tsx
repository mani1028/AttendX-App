import React from 'react';
import { View, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { AlertCircle, Calendar, Camera as CameraIcon, ChevronDown, LayoutGrid, Upload, XCircle } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { AttendanceForm } from './types';
import { MAX_STUDENT_IMAGES } from './helpers';
import { attendanceStyles as styles } from './styles';

interface StudentSetupStepProps {
  form: AttendanceForm;
  cameraActive: boolean;
  studentImages: string[];
  loading: boolean;
  dailySessions: number;
  sessionMarked: { session1: boolean; session2: boolean };
  isClassTeacher: boolean;
  isCurrentSessionMarked: boolean;
  onClassPress: () => void;
  onSectionPress: () => void;
  onSessionPress: () => void;
  onStartCamera: () => void;
  onUpload: () => void;
  onRemoveImage: (index: number) => void;
  onProcessAttendance: () => void;
  onBack: () => void;
}

export default function StudentSetupStep({
  form,
  cameraActive,
  studentImages,
  loading,
  dailySessions,
  sessionMarked,
  isClassTeacher,
  isCurrentSessionMarked,
  onClassPress,
  onSectionPress,
  onSessionPress,
  onStartCamera,
  onUpload,
  onRemoveImage,
  onProcessAttendance,
  onBack,
}: StudentSetupStepProps) {
  return (
    <AppCard style={styles.mainCard}>
      <View style={styles.cardHeader}>
        <LayoutGrid size={20} color={Theme.colors.primary} />
        <AppText style={styles.cardTitle}>Student Attendance Setup</AppText>
      </View>

      <View style={styles.cardBody}>
        {isClassTeacher && isCurrentSessionMarked && (
          <View style={styles.warningBox}>
            <AlertCircle size={20} color={Theme.colors.warning} />
            <AppText style={styles.warningText}>
              Attendance for {form.attendance_session === '1' ? 'Session 1 (Morning)' : 'Session 2 (Afternoon)'} has already been marked for today. You cannot mark again.
            </AppText>
          </View>
        )}

        <View style={styles.field}>
          <AppText style={styles.label}>Class</AppText>
          <TouchableOpacity style={styles.pickerTrigger} onPress={onClassPress}>
            <AppText style={styles.pickerTriggerText}>
              {form.class_grade ? `Class ${form.class_grade}` : 'Select Class'}
            </AppText>
            <ChevronDown size={20} color={Theme.colors.textSec} />
          </TouchableOpacity>
        </View>

        {form.class_grade && (
          <View style={styles.field}>
            <AppText style={styles.label}>Section</AppText>
            <TouchableOpacity style={styles.pickerTrigger} onPress={onSectionPress}>
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
            <View style={{ marginLeft: 'auto', backgroundColor: Theme.colors.border, paddingHorizontal: Theme.spacing.sm, paddingVertical: 2, borderRadius: Theme.radius.sm }}>
              <AppText style={{ fontSize: Theme.typography.label.fontSize, color: Theme.colors.textSec, fontWeight: 'bold' }}>TODAY</AppText>
            </View>
          </View>
          <AppText style={{ ...Theme.typography.label, color: Theme.colors.textMuted, marginTop: Theme.spacing.xs }}>
            Attendance can only be marked for the current date.
          </AppText>
        </View>

        {dailySessions === 2 && (
          <View style={styles.field}>
            <AppText style={styles.label}>Attendance Session</AppText>
            <TouchableOpacity style={styles.pickerTrigger} onPress={onSessionPress}>
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
              onPress={onStartCamera}
              disabled={studentImages.length >= MAX_STUDENT_IMAGES}
            >
              <CameraIcon size={20} color={Theme.colors.card} />
              <AppText style={styles.actionBtnText}>Capture Students</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Theme.colors.background }]}
              onPress={onUpload}
              disabled={studentImages.length >= MAX_STUDENT_IMAGES}
            >
              <Upload size={20} color={Theme.colors.primary} />
              <AppText style={[styles.actionBtnText, { color: Theme.colors.primary }]}>Upload</AppText>
            </TouchableOpacity>
          </View>
        )}

        {studentImages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
            {studentImages.map((img, idx) => (
              img && (
                <View key={idx} style={styles.thumbWrapper}>
                  <Image source={{ uri: img }} style={styles.thumbImg} />
                  <TouchableOpacity style={styles.thumbRemove} onPress={() => onRemoveImage(idx)}>
                    <XCircle size={18} color={Theme.colors.error} fill={Theme.colors.card} />
                  </TouchableOpacity>
                </View>
              )
            ))}
          </ScrollView>
        )}

        <View style={styles.buttonRow}>
          <AppButton
            title={loading ? 'Scanning...' : 'Scan / Preview'}
            onPress={onProcessAttendance}
            disabled={loading || studentImages.length === 0 || !form.class_grade || !form.section || (isClassTeacher && isCurrentSessionMarked)}
            style={StyleSheet.flatten([styles.primaryButton, { flex: 2 }])}
          />
          <AppButton title="Back" onPress={onBack} type="secondary" style={{ flex: 1 }} />
        </View>
      </View>
    </AppCard>
  );
}
