import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { Bell, ChevronLeft } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';
import { attendanceStyles as styles } from './styles';

interface AttendanceScreenHeaderProps {
  insets: EdgeInsets;
  isClassTeacher: boolean;
  step: number;
  teacherVerified: boolean;
  onBack: () => void;
  onNotifications: () => void;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
}

export default function AttendanceScreenHeader({
  insets,
  isClassTeacher,
  step,
  teacherVerified,
  onBack,
  onNotifications,
  onStepChange,
}: AttendanceScreenHeaderProps) {
  return (
    <View style={[styles.headerStandard, { paddingTop: HEADER_CONSTANTS.PADDING_TOP_WITH_INSETS(insets) }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={Theme.colors.card} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{isClassTeacher ? 'Class Teacher' : 'Teacher Attendance'}</AppText>
        <TouchableOpacity style={styles.notificationBtn} onPress={onNotifications}>
          <Bell size={22} color={Theme.colors.card} />
        </TouchableOpacity>
      </View>

      {isClassTeacher && (
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tab, step <= 2 && styles.activeTab]}
            onPress={() => step > 2 && onStepChange(2)}
          >
            <AppText style={[styles.tabText, step <= 2 && styles.activeTabText]}>Verification</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, step > 2 && styles.activeTab]}
            onPress={() => {
              if (teacherVerified) { onStepChange(3); }
              else { Alert.alert('Verification Required', 'Please verify your identity first.'); }
            }}
          >
            <AppText style={[styles.tabText, step > 2 && styles.activeTabText]}>Attendance</AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.heroContent}>
        <AppText style={styles.heroGreeting}>
          {step <= 2 ? 'Identity Verification' : 'Student Attendance'}
        </AppText>
        <AppText style={styles.heroSubtext}>
          {step <= 2
            ? 'Confirm your identity using AI facial recognition'
            : 'Scan student faces to mark attendance automatically'}
        </AppText>
      </View>
    </View>
  );
}
