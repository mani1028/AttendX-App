import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { registrationStyles as styles } from './registrationStyles';

export default function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewField}>
      <AppText weight="semibold" style={styles.previewFieldLabel}>{label}</AppText>
      <AppText weight="regular" style={styles.previewFieldValue}>{value || '—'}</AppText>
    </View>
  );
}
