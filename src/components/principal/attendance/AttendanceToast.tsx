import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { attendanceStyles as styles } from './styles';

export interface AttendanceToastProps {
  visible: boolean;
  message: string;
  type?: string;
}

export default function AttendanceToast({ visible, message, type = 'success' }: AttendanceToastProps) {
  if (!visible) { return null; }

  return (
    <View style={[styles.toast, type === 'error' ? styles.toastError : styles.toastSuccess]}>
      <AppText style={styles.toastText} weight="bold">{message}</AppText>
    </View>
  );
}
