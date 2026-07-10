import React from 'react';
import { View, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Users, LayoutGrid, ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';
import { fmtDate } from './helpers';

export interface AttendanceSelectionCardProps {
  selClass: string;
  selSection: string;
  selSectionOptions: string[];
  loadingClasses: boolean;
  viewDate: string;
  showDatePicker: boolean;
  loading: boolean;
  onOpenClassPicker: () => void;
  onOpenSectionPicker: () => void;
  onViewDateChange: (date: string) => void;
  onShowDatePicker: (show: boolean) => void;
  onSearch: () => void;
}

export default function AttendanceSelectionCard({
  selClass,
  selSection,
  selSectionOptions,
  loadingClasses,
  viewDate,
  showDatePicker,
  loading,
  onOpenClassPicker,
  onOpenSectionPicker,
  onViewDateChange,
  onShowDatePicker,
  onSearch,
}: AttendanceSelectionCardProps) {
  return (
    <View style={styles.selectionCard}>
      <View style={styles.fieldRow}>
        <View style={[styles.field, { flex: 1, marginRight: 10 }]}>
          <AppText style={styles.label}>Class</AppText>
          <TouchableOpacity style={styles.dropdown} onPress={onOpenClassPicker}>
            <Users size={18} color={Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
            <AppText style={styles.dropdownText} aria-label="Select Class">
              {selClass ? `Class ${selClass}` : 'Select Class'}
            </AppText>
            <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <AppText style={styles.helperText}>
            {loadingClasses ? 'Loading classes…' : 'Tap to choose a class'}
          </AppText>
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <AppText style={styles.label}>Section</AppText>
          <TouchableOpacity
            style={[styles.dropdown, !selClass && styles.dropdownDisabled]}
            onPress={() => selClass ? onOpenSectionPicker() : Alert.alert('Select class first', 'Choose a class before selecting a section.')}
            disabled={!selClass}
            aria-label="Select Section"
          >
            <LayoutGrid size={18} color={Theme.colors.textSec} style={{ marginRight: Theme.spacing.sm }} />
            <AppText style={styles.dropdownText} aria-label="Select Section">
              {selSection ? `Section ${selSection}` : 'Select Section'}
            </AppText>
            <ChevronRight size={16} color={Theme.colors.textSec} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <AppText style={styles.helperText}>
            {selClass ? `${selSectionOptions.length} section${selSectionOptions.length === 1 ? '' : 's'} available` : 'Pick a class first'}
          </AppText>
        </View>
      </View>

      <View style={styles.field}>
        <AppText style={styles.label}>Date</AppText>
        <TouchableOpacity style={styles.dateInput} onPress={() => onShowDatePicker(true)}>
          <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
          <AppText style={styles.dateInputText}>{fmtDate(viewDate)}</AppText>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(viewDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onValueChange={(_event, date) => {
              onShowDatePicker(false);
              if (date) { onViewDateChange(date.toISOString().split('T')[0]); }
            }}
            onDismiss={() => onShowDatePicker(false)}
          />
        )}
      </View>

      <AppButton
        title={loading ? 'Searching...' : 'Search Attendance'}
        onPress={onSearch}
        disabled={loading || !selClass || !selSection}
        style={styles.searchBtn}
      />
    </View>
  );
}
