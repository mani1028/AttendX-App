import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanTopActionsProps {
  onNewStudent: () => void;
  onOpenFever: () => void;
  onNavigateSkin: () => void;
}

export default function VitalScanTopActions({
  onNewStudent,
  onOpenFever,
  onNavigateSkin,
}: VitalScanTopActionsProps) {
  return (
    <View style={styles.topActionsRow}>
      <TouchableOpacity accessibilityRole="button" style={styles.newBtn} onPress={onNewStudent}>
        <Text style={styles.newBtnText}>👤 New</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.feverBtn} onPress={onOpenFever}>
        <Text style={styles.feverBtnText}>🌡️ Fever</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.skinBtn} onPress={onNavigateSkin}>
        <Text style={styles.skinBtnText}>🔍 Skin</Text>
      </TouchableOpacity>
    </View>
  );
}
