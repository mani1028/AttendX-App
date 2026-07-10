import React, { useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { visitorDashboardStyles as styles } from './visitorDashboardStyles';

interface FilterModalProps {
  visible: boolean;
  dateFrom: string;
  dateTo: string;
  onApply: (dateFrom: string, dateTo: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function FilterModal({
  visible,
  dateFrom,
  dateTo,
  onApply,
  onReset,
  onClose,
}: FilterModalProps) {
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    setLocalDateFrom(dateFrom);
    setLocalDateTo(dateTo);
  }, [dateFrom, dateTo, visible]);

  const handleApply = () => {
    onApply(localDateFrom, localDateTo);
    onClose();
  };

  const handleReset = () => {
    setLocalDateFrom('');
    setLocalDateTo('');
    onReset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>Filter Visitors</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <AppText style={styles.modalCloseText}>✕</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.filterBody}>
            <View style={styles.filterField}>
              <AppText style={styles.filterLabel}>From Date</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                <AppText style={styles.dateText}>{localDateFrom || 'Select date'}</AppText>
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={localDateFrom ? new Date(localDateFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_event, date) => {
                    setShowFromPicker(false);
                    if (date) setLocalDateFrom(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>

            <View style={styles.filterField}>
              <AppText style={styles.filterLabel}>To Date</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                <AppText style={styles.dateText}>{localDateTo || 'Select date'}</AppText>
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={localDateTo ? new Date(localDateTo) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_event, date) => {
                    setShowToPicker(false);
                    if (date) setLocalDateTo(date.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.filterFooter}>
            <AppButton title="Reset" onPress={handleReset} type="secondary" style={{ flex: 1 }} />
            <AppButton title="Apply Filters" onPress={handleApply} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
