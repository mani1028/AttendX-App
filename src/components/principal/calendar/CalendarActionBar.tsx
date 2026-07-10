import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { CalendarDays, Plus } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { calendarStyles as styles } from './calendarStyles';

export interface CalendarActionBarProps {
  canEdit: boolean;
  isCompactActions: boolean;
  onPublicHolidays: () => void;
  onAddEvent: () => void;
}

export default function CalendarActionBar({
  canEdit,
  isCompactActions,
  onPublicHolidays,
  onAddEvent,
}: CalendarActionBarProps) {
  if (!canEdit) {
    return (
      <View style={styles.readOnlyNotice}>
        <AppText style={styles.readOnlyNoticeTitle} weight="bold">Student Access</AppText>
        <AppText style={styles.readOnlyNoticeText}>This calendar is view-only for students.</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.actionRowContainer, isCompactActions && styles.actionRowContainerStacked]}>
      <TouchableOpacity accessibilityRole="button" style={styles.actionRowButton} onPress={onPublicHolidays}>
        <CalendarDays size={18} color={C.primary} />
        <AppText style={styles.actionRowButtonText} weight="bold">Public Holidays</AppText>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={[styles.actionRowButton, styles.actionRowButtonPrimary]} onPress={onAddEvent}>
        <Plus size={18} color={Theme.colors.card} />
        <AppText style={[styles.actionRowButtonText, styles.actionRowButtonTextPrimary]} weight="bold">Add Event</AppText>
      </TouchableOpacity>
    </View>
  );
}
