import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import { calendarStyles as styles } from './calendarStyles';

export interface CalendarErrorBannerProps {
  error: string;
  onRetry: () => void;
}

export default function CalendarErrorBanner({ error, onRetry }: CalendarErrorBannerProps) {
  if (!error) { return null; }

  return (
    <View style={styles.errorContainer}>
      <AppText style={styles.errorText}>{error}</AppText>
      <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={onRetry}>
        <AppText style={styles.retryButtonText} weight="bold">Retry</AppText>
      </TouchableOpacity>
    </View>
  );
}
