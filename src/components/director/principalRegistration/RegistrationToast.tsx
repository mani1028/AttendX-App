import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { ToastType } from './types';
import { principalRegistrationStyles as styles } from './principalRegistrationStyles';

interface RegistrationToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function RegistrationToast({
  visible,
  message,
  type,
  onClose,
}: RegistrationToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.toast, type === 'success' ? styles.toastSuccess : styles.toastError]}>
      <Text style={styles.toastIcon}>{type === 'success' ? '✅' : '❌'}</Text>
      <Text style={styles.toastMessage}>{message}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onClose}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
