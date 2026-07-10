import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export interface AttendanceDatePickerProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onDismiss: () => void;
  maximumDate?: Date;
}

export default function AttendanceDatePicker({
  visible,
  value,
  onChange,
  onDismiss,
  maximumDate = new Date(),
}: AttendanceDatePickerProps) {
  if (!visible) { return null; }

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      maximumDate={maximumDate}
      onChange={(event, selectedDate) => {
        onDismiss();
        if (selectedDate) { onChange(selectedDate); }
      }}
    />
  );
}
