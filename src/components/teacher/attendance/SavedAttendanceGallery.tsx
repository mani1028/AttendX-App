import React from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { Camera as CameraIcon, ChevronLeft } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';
import { AttendanceForm, TeacherData } from './types';
import { attendanceStyles as styles } from './styles';

interface SavedAttendanceGalleryProps {
  insets: EdgeInsets;
  tabBarScrollPadding: number;
  savedAttendanceData: any;
  teacherImage: string | null;
  teacherData: TeacherData | null;
  form: AttendanceForm;
  onReset: () => void;
}

export default function SavedAttendanceGallery({
  insets,
  tabBarScrollPadding,
  savedAttendanceData,
  teacherImage,
  teacherData,
  form,
  onReset,
}: SavedAttendanceGalleryProps) {
  const groupImages = savedAttendanceData?.image_urls || [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarScrollPadding }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={onReset}>
              <ChevronLeft size={24} color={Theme.colors.card} />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>Attendance Saved</AppText>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.heroContent}>
            <AppText style={styles.heroGreeting}>Success! ✅</AppText>
            <AppText style={styles.heroSubtext}>Attendance has been recorded</AppText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.miniStatCard, { borderLeftColor: Theme.colors.primaryLight }]}>
            <AppText style={styles.miniStatVal}>{savedAttendanceData?.summary?.total_students || 0}</AppText>
            <AppText style={styles.miniStatLabel}>Total</AppText>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: Theme.colors.success }]}>
            <AppText style={styles.miniStatVal}>{savedAttendanceData?.summary?.present_count || 0}</AppText>
            <AppText style={styles.miniStatLabel}>Present</AppText>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: Theme.colors.error }]}>
            <AppText style={styles.miniStatVal}>{savedAttendanceData?.summary?.absent_count || 0}</AppText>
            <AppText style={styles.miniStatLabel}>Absent</AppText>
          </View>
        </View>

        {teacherImage && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <View style={{ width: 40, height: 40, borderRadius: Theme.radius.xl, backgroundColor: Theme.colors.amberLight, alignItems: 'center', justifyContent: 'center' }}>
                <AppText style={{ fontSize: Theme.typography.h3.fontSize }}>👨‍🏫</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.cardTitle}>Teacher Verification Image</AppText>
                <AppText style={styles.resultSub}>{teacherData?.teacher_full_name || 'Teacher'} - {form.attendance_date}</AppText>
              </View>
            </View>
            <View style={{ padding: Theme.spacing.lg, alignItems: 'center' }}>
              <Image source={{ uri: teacherImage }} style={{ width: '100%', height: 200, borderRadius: Theme.radius.md, resizeMode: 'cover' }} />
            </View>
          </AppCard>
        )}

        {groupImages.length > 0 && (
          <AppCard style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <CameraIcon size={20} color={Theme.colors.primary} />
              <AppText style={styles.cardTitle}>Student Images ({groupImages.length})</AppText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: Theme.spacing.md }}>
              {groupImages.map((img: string, idx: number) => (
                <View key={idx} style={styles.thumbWrapper}>
                  <Image source={{ uri: img }} style={styles.thumbImg} />
                </View>
              ))}
            </ScrollView>
          </AppCard>
        )}

        <AppButton
          title="✓ Done - Start New Attendance"
          onPress={onReset}
          style={StyleSheet.flatten([styles.primaryButton, { marginHorizontal: Theme.spacing.md, marginBottom: 30 }])}
        />
      </ScrollView>
    </View>
  );
}
