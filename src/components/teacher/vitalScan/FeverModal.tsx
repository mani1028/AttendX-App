import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Theme } from '../../../theme/tokens';
import { FeverResult } from './types';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface FeverModalProps {
  visible: boolean;
  tempInput: string;
  feverResult: FeverResult | null;
  onClose: () => void;
  onTempInputChange: (value: string) => void;
  onDiagnose: () => void;
}

export default function FeverModal({
  visible,
  tempInput,
  feverResult,
  onClose,
  onTempInputChange,
  onDiagnose,
}: FeverModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity accessibilityRole="button" style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalIcon}>🌡️</Text>
          <Text style={styles.modalTitle}>Fever Diagnosis</Text>
          <Text style={styles.modalSubtitle}>Enter body temperature in °C</Text>

          <View style={styles.tempRow}>
            <TextInput
              style={styles.tempInput}
              placeholder="e.g. 38.5 °C"
              placeholderTextColor="#000000"
              keyboardType="numeric"
              value={tempInput}
              onChangeText={onTempInputChange}
            />
            <TouchableOpacity accessibilityRole="button" style={styles.checkBtn} onPress={onDiagnose}>
              <Text style={styles.checkBtnText}>CHECK</Text>
            </TouchableOpacity>
          </View>

          {feverResult && (
            <View style={[styles.feverResult, { backgroundColor: feverResult.color + '12' }]}>
              <View style={[styles.feverResultBorder, { backgroundColor: feverResult.color }]} />
              <Text style={[styles.feverStatus, { color: feverResult.color }]}>{feverResult.status}</Text>
              <Text style={styles.feverTemp}>{feverResult.temp}°C</Text>
              <Text style={styles.feverRec}>{feverResult.rec}</Text>
            </View>
          )}

          <View style={styles.legend}>
            {([
              [Theme.colors.blue, '<36.1'],
              ['#22C55E', '36–37.2'],
              ['#F59E0B', '37.3–38'],
              ['#F97316', '38–39.4'],
              [Theme.colors.error, '39.5–40'],
              ['#7F1D1D', '>40'],
            ] as const).map(([color, label]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
