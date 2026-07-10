import React from 'react';
import { View, Text } from 'react-native';
import { teacherRegistrationStyles as styles } from './teacherRegistrationStyles';

export default function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewField}>
      <Text style={styles.previewFieldLabel}>{label}</Text>
      <Text style={styles.previewFieldValue}>{value || '—'}</Text>
    </View>
  );
}
