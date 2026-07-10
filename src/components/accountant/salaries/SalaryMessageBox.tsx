import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { salariesStyles as styles } from './salariesStyles';

export interface SalaryMessageBoxProps {
  message: string;
  isError?: boolean;
  onClose?: () => void;
}

export default function SalaryMessageBox({ message, isError = false, onClose }: SalaryMessageBoxProps) {
  if (!message) {return null;}

  return (
    <View style={[styles.messageBox, isError ? styles.messageBoxError : styles.messageBoxSuccess]}>
      <Text style={[styles.messageText, isError ? styles.messageTextError : styles.messageTextSuccess]}>
        {message}
      </Text>
      {onClose && (
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.messageClose}>
          <Text style={styles.messageCloseText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

