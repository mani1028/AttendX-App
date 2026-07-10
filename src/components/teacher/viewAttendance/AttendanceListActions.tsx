import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Camera, Users, Download } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';

export interface AttendanceListActionsProps {
  onTeacherPhoto: () => void;
  onStudentPhotos: () => void;
  onExport: () => void;
}

export default function AttendanceListActions({
  onTeacherPhoto,
  onStudentPhotos,
  onExport,
}: AttendanceListActionsProps) {
  return (
    <View style={styles.listActions}>
      <TouchableOpacity style={styles.actionIconButton} onPress={onTeacherPhoto}>
        <Camera size={20} color={Theme.colors.primary} />
        <AppText style={styles.actionIconLabel}>Teacher Photo</AppText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionIconButton} onPress={onStudentPhotos}>
        <Users size={20} color={Theme.colors.primary} />
        <AppText style={styles.actionIconLabel}>Student Photos</AppText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionIconButton} onPress={onExport}>
        <Download size={20} color={Theme.colors.primary} />
        <AppText style={styles.actionIconLabel}>Export</AppText>
      </TouchableOpacity>
    </View>
  );
}
