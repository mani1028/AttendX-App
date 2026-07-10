import React from 'react';
import { View, Modal, TextInput } from 'react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { studentPromotionStyles as styles } from './studentPromotionStyles';

export interface AddYearModalProps {
  visible: boolean;
  creatingYear: boolean;
  newYearData: { label: string; start: string; end: string };
  onChange: (patch: Partial<{ label: string; start: string; end: string }>) => void;
  onClose: () => void;
  onCreate: () => void;
}

export default function AddYearModal({ visible, creatingYear, newYearData, onChange, onClose, onCreate }: AddYearModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText style={styles.cardTitle} weight="bold">Add academic year</AppText>
            <AppText style={styles.fieldLabel}>Year label</AppText>
            <TextInput style={styles.input} placeholder="2026-27" value={newYearData.label} onChangeText={v => onChange({ label: v })} />
            <AppText style={styles.fieldLabel}>Start date (YYYY-MM-DD)</AppText>
            <TextInput style={styles.input} placeholder="2026-04-01" value={newYearData.start} onChangeText={v => onChange({ start: v })} />
            <AppText style={styles.fieldLabel}>End date (YYYY-MM-DD)</AppText>
            <TextInput style={styles.input} placeholder="2027-03-31" value={newYearData.end} onChangeText={v => onChange({ end: v })} />
            <View style={styles.confirmActions}>
              <AppButton title="Cancel" type="secondary" onPress={onClose} />
              <View style={{ width: 10 }} />
              <AppButton title={creatingYear ? 'Creating…' : 'Create'} onPress={onCreate} disabled={creatingYear} />
            </View>
          </View>
        </View>
      </Modal>
  );
}
