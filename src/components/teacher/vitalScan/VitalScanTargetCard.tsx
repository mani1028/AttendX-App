import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AppCard from '../../common/AppCard';
import { ScanType } from './types';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanTargetCardProps {
  scanType: ScanType;
  cameraActive: boolean;
  onSelectScanType: (type: ScanType) => void;
}

export default function VitalScanTargetCard({
  scanType,
  cameraActive,
  onSelectScanType,
}: VitalScanTargetCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>🎯</Text>
        <Text style={styles.cardHeaderTitle}>03 — Select Target</Text>
        <Text style={styles.cardHeaderBadge}>
          {scanType === 'eye' ? '👁 Vision' : '🦷 Dental'}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.pillContainer}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.pill, scanType === 'teeth' && styles.pillActive]}
            onPress={() => { if (!cameraActive) { onSelectScanType('teeth'); } }}
          >
            <Text style={[styles.pillText, scanType === 'teeth' && styles.pillTextActive]}>
              🦷 TEETH
            </Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.pill, scanType === 'eye' && styles.pillActive]}
            onPress={() => { if (!cameraActive) { onSelectScanType('eye'); } }}
          >
            <Text style={[styles.pillText, scanType === 'eye' && styles.pillTextActive]}>
              👁 VISION
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppCard>
  );
}
