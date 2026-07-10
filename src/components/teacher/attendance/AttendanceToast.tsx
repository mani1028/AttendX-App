import React, { useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { attendanceStyles as styles } from './styles';

interface AttendanceToastProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
  onClose: () => void;
}

export default function AttendanceToast({
  visible,
  title,
  message,
  icon = 'ℹ️',
  color = Theme.colors.violet,
  onClose,
}: AttendanceToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) { return null; }

  return (
    <View style={[styles.toast, { borderLeftColor: color }]}>
      <AppText style={styles.toastIcon}>{icon}</AppText>
      <View style={styles.toastContent}>
        <AppText style={styles.toastTitle}>{title}</AppText>
        {message && <AppText style={styles.toastMessage}>{message}</AppText>}
      </View>
      <TouchableOpacity onPress={onClose}>
        <AppText style={styles.toastClose}>✕</AppText>
      </TouchableOpacity>
    </View>
  );
}
