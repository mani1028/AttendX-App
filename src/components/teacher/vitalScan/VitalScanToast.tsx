import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanToastProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
  onHide: () => void;
}

export default function VitalScanToast({
  visible,
  title,
  message,
  icon = 'ℹ️',
  color = Theme.colors.violet,
  onHide,
}: VitalScanToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) { return null; }

  return (
    <View style={[styles.toast, { borderLeftColor: color }]}>
      <Text style={styles.toastIcon}>{icon}</Text>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{title}</Text>
        {message && <Text style={styles.toastMessage}>{message}</Text>}
      </View>
    </View>
  );
}
