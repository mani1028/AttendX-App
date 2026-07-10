import React from 'react';
import { View, Text, TextInput } from 'react-native';
import AppCard from '../../common/AppCard';
import { Theme } from '../../../theme/tokens';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanMedicalHistoryCardProps {
  checkupNote: string;
  onCheckupNoteChange: (value: string) => void;
}

export default function VitalScanMedicalHistoryCard({
  checkupNote,
  onCheckupNoteChange,
}: VitalScanMedicalHistoryCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>📋</Text>
        <Text style={styles.cardHeaderTitle}>02 — Medical History</Text>
      </View>
      <View style={styles.cardBody}>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Last checkup notes (e.g. 2 months ago)..."
          placeholderTextColor={Theme.colors.textMuted}
          multiline
          numberOfLines={3}
          value={checkupNote}
          onChangeText={onCheckupNoteChange}
        />
      </View>
    </AppCard>
  );
}
