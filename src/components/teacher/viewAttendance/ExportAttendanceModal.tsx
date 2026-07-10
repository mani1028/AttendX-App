import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';
import { fmtDate } from './helpers';

// Export Modal Component
const ExportAttendanceModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  selClass: string;
  selSection: string;
  onExport: (format: 'excel' | 'csv') => void;
  exporting: boolean;
}> = ({ visible, onClose, selClass, selSection, onExport, exporting }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [format, setFormat] = useState<'excel' | 'csv'>('excel');
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setStartDate(today);
      setEndDate(today);
      setFormat('excel');
    }
  }, [visible, today]);

  const handleExport = () => {
    if (startDate > endDate) {
      Alert.alert('Invalid Range', 'Start date must be ≤ end date');
      return;
    }
    onExport(format);
  };

  const days = (() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.modalTitle}>Export Attendance</AppText>
              <AppText style={styles.modalSubtitle}>
                Class {selClass}–{selSection}
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <XCircle size={24} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.modalField}>
              <AppText style={styles.modalLabel}>Start Date</AppText>
              <TouchableOpacity
                style={styles.modalDateBtn}
                onPress={() => setShowStartPicker(true)}
              >
                <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
                <AppText style={styles.modalDateText}>{fmtDate(startDate)}</AppText>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={new Date(startDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onValueChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) {setStartDate(date.toISOString().split('T')[0]);}
                  }}
                  onDismiss={() => setShowStartPicker(false)}
                />
              )}
            </View>

            <View style={styles.modalField}>
              <AppText style={styles.modalLabel}>End Date</AppText>
              <TouchableOpacity
                style={styles.modalDateBtn}
                onPress={() => setShowEndPicker(true)}
              >
                <Calendar size={18} color={Theme.colors.textSec} style={{ marginRight: 10 }} />
                <AppText style={styles.modalDateText}>{fmtDate(endDate)}</AppText>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={new Date(endDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onValueChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) {setEndDate(date.toISOString().split('T')[0]);}
                  }}
                  onDismiss={() => setShowEndPicker(false)}
                />
              )}
            </View>

            <View style={styles.modalField}>
              <AppText style={styles.modalLabel}>Format</AppText>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'excel' && styles.formatBtnActive]}
                  onPress={() => setFormat('excel')}
                >
                  <AppText style={[styles.formatBtnText, format === 'excel' && styles.formatBtnTextActive]}>
                    Excel (.xlsx)
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'csv' && styles.formatBtnActive]}
                  onPress={() => setFormat('csv')}
                >
                  <AppText style={[styles.formatBtnText, format === 'csv' && styles.formatBtnTextActive]}>
                    CSV (.csv)
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalPreview}>
              <AppText style={styles.modalPreviewText}>
                Exporting {days} day{days !== 1 ? 's' : ''} · {format.toUpperCase()}
              </AppText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmExportBtn}
              onPress={handleExport}
              disabled={exporting}
            >
              <AppText style={styles.confirmExportBtnText}>
                {exporting ? 'Exporting...' : 'Export Now'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};



export default ExportAttendanceModal;
