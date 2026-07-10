import React from 'react';
import { View, Modal, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { Theme, colors } from '../../../theme/tokens';
import { visitorDashboardStyles as styles } from './visitorDashboardStyles';
import type { QRData } from './types';

interface QRModalProps {
  visible: boolean;
  qrData: QRData | null;
  onClose: () => void;
}

export default function QRModal({ visible, qrData, onClose }: QRModalProps) {
  if (!qrData) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <AppText style={styles.modalTitle}>Visitor QR Code</AppText>

          {qrData.qrImage ? (
            <Image source={{ uri: qrData.qrImage }} style={styles.qrImage} />
          ) : qrData.url ? (
            <View style={styles.qrCodeContainer}>
              <QRCode value={qrData.url} size={200} backgroundColor={colors.surface} color={colors.textPrimary} />
            </View>
          ) : null}

          {qrData.url && (
            <View style={styles.qrUrlContainer}>
              <AppText style={styles.qrUrlLabel}>Registration Link:</AppText>
              <AppText style={styles.qrUrlText} selectable>{qrData.url}</AppText>
            </View>
          )}

          <AppText style={styles.modalMessage}>
            Scan this QR code for visitors to register and check-in
          </AppText>

          <AppButton title="Close" onPress={onClose} style={{ marginTop: Theme.spacing.xl, width: '100%' }} />
        </View>
      </View>
    </Modal>
  );
}
