import React from 'react';
import { View, Text } from 'react-native';
import { salariesStyles as styles } from './salariesStyles';

export default function SalaryStatusBadge({ text }: { text: string }) {
  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusBadgeText}>{text}</Text>
    </View>
  );
}
