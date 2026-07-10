import React from 'react';
import { View, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { X, CheckCircle2, FileText } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { formatAmount, formatPaymentDateTime, receiptLabel, txnLabel } from './helpers';
import type { PaymentRecord } from './types';

export interface PaymentDetailModalProps {
  visible: boolean;
  payment: PaymentRecord | null;
  downloading: boolean;
  onClose: () => void;
  onDownloadReceipt: () => void;
}

export default function PaymentDetailModal({
  visible,
  payment,
  downloading,
  onClose,
  onDownloadReceipt,
}: PaymentDetailModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.detailModalContent]}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">Receipt Details</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {payment && (
            <ScrollView style={styles.detailScroll}>
              <View style={styles.detailHero}>
                <View style={styles.detailHeroIcon}>
                  <CheckCircle2 size={32} color={C.success} />
                </View>
                <AppText style={styles.detailHeroAmount} weight="bold">{formatAmount(payment.amount)}</AppText>
                <AppText style={styles.detailHeroStatus} weight="semibold">Payment Successful</AppText>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Receipt No</AppText>
                  <AppText style={styles.detailValue} weight="bold">{receiptLabel(payment)}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Transaction ID</AppText>
                  <AppText style={styles.detailValue} weight="bold">{txnLabel(payment)}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Date & Time</AppText>
                  <AppText style={styles.detailValue} weight="bold">
                    {formatPaymentDateTime(payment.paid_at || payment.created_at || '')}
                  </AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Method</AppText>
                  <AppText style={styles.detailValue} weight="bold">{payment.method.toUpperCase()}</AppText>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.downloadReceiptBtn}
                onPress={onDownloadReceipt}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <FileText size={18} color={C.primary} />
                )}
                <AppText style={styles.downloadReceiptText} weight="bold">
                  {downloading ? 'Downloading...' : 'Download Receipt'}
                </AppText>
              </TouchableOpacity>
            </ScrollView>
          )}

          <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.cancelButton, styles.detailBackBtn]} onPress={onClose}>
            <AppText style={styles.cancelButtonText} weight="semibold">Back</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
