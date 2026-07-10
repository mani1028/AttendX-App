import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import { student360Styles as styles } from './student360Styles';

export default function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue} weight="semibold">{value}</AppText>
    </View>
  );
}
