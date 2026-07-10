import React from 'react';
import { View, Modal, TouchableOpacity, Switch } from 'react-native';
import { X } from 'lucide-react-native';
import AppButton from '../common/AppButton';
import AppText from '../common/AppText';
import { Theme } from '../../theme/tokens';
import type { AppSettings } from './types';
import { profileStyles as styles } from './profileStyles';

interface ProfileSettingsModalProps {
  visible: boolean;
  settings: AppSettings;
  onClose: () => void;
  onToggleNotifications: (value: boolean) => void;
}

export default function ProfileSettingsModal({
  visible,
  settings,
  onClose,
  onToggleNotifications,
}: ProfileSettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle}>App Settings</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.settingRow}>
              <AppText style={styles.settingLabel}>Push Notifications</AppText>
              <Switch value={settings.notifications} onValueChange={onToggleNotifications} />
            </View>
          </View>
          <View style={styles.modalFooter}>
            <AppButton title="Close" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
