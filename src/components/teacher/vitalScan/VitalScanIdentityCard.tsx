import React from 'react';
import { View, Text, TextInput } from 'react-native';
import AppCard from '../../common/AppCard';
import { Theme } from '../../../theme/tokens';
import { vitalScanStyles as styles } from './vitalScanStyles';

interface VitalScanIdentityCardProps {
  studentName: string;
  onStudentNameChange: (value: string) => void;
}

export default function VitalScanIdentityCard({
  studentName,
  onStudentNameChange,
}: VitalScanIdentityCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderIcon}>👤</Text>
        <Text style={styles.cardHeaderTitle}>01 — Identity</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.label}>Student Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Student full name"
          placeholderTextColor={Theme.colors.textMuted}
          value={studentName}
          onChangeText={onStudentNameChange}
        />
      </View>
    </AppCard>
  );
}
