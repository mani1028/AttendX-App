import React from 'react';
import { View, Modal, TouchableOpacity, Alert } from 'react-native';
import { X, Printer, ReceiptText } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { formatAmount, formatDate } from './helpers';
import { paymentEntryStyles as styles } from './paymentEntryStyles';
import type { Fee, Payment } from './types';

interface PaymentReceiptModalProps {
  visible: boolean;
  lastPayment: Payment | null;
  selectedFee: Fee | null;
  onClose: () => void;
}

export default function PaymentReceiptModal({
  visible,
  lastPayment,
  selectedFee,
  onClose,
}: PaymentReceiptModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.sectionHeaderRow}>
              <ReceiptText size={20} color={C.text} />
              <AppText style={styles.modalTitle} weight="bold">Payment Receipt</AppText>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {lastPayment && selectedFee ? (
            <View style={styles.receiptContent}>
              <View style={styles.receiptHeader}>
                <AppText style={styles.receiptSchoolName} weight="bold">School Fee Receipt</AppText>
                <AppText style={styles.receiptDate}>{formatDate(lastPayment.date)}</AppText>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <AppText style={styles.receiptLabel} weight="semibold">Student Name:</AppText>
                <AppText style={styles.receiptValue} weight="semibold">{selectedFee.student_name}</AppText>
              </View>
              <View style={styles.receiptRow}>
                <AppText style={styles.receiptLabel} weight="semibold">Amount Paid:</AppText>
                <AppText style={[styles.receiptValue, styles.receiptAmount]} weight="bold">
                  {formatAmount(lastPayment.amount)}
                </AppText>
              </View>
              <View style={styles.receiptRow}>
                <AppText style={styles.receiptLabel} weight="semibold">Payment Method:</AppText>
                <AppText style={styles.receiptValue} weight="semibold">{lastPayment.method.toUpperCase()}</AppText>
              </View>
              <View style={styles.receiptRow}>
                <AppText style={styles.receiptLabel} weight="semibold">Total Fee:</AppText>
                <AppText style={styles.receiptValue} weight="semibold">{formatAmount(selectedFee.total_fee)}</AppText>
              </View>
              <View style={styles.receiptRow}>
                <AppText style={styles.receiptLabel} weight="semibold">Total Paid:</AppText>
                <AppText style={styles.receiptValue} weight="semibold">
                  {formatAmount(selectedFee.paid_amount + lastPayment.amount)}
                </AppText>
              </View>
              <View style={styles.receiptRow}>
                <AppText style={styles.receiptLabel} weight="semibold">Remaining Due:</AppText>
                <AppText
                  style={[styles.receiptValue, { color: selectedFee.due_amount - lastPayment.amount > 0 ? C.warning : C.success }]}
                  weight="semibold"
                >
                  {formatAmount(selectedFee.due_amount - lastPayment.amount)}
                </AppText>
              </View>
              {lastPayment.receipt_number ? (
                <View style={styles.receiptRow}>
                  <AppText style={styles.receiptLabel} weight="semibold">Receipt No:</AppText>
                  <AppText style={styles.receiptValue} weight="semibold">{lastPayment.receipt_number}</AppText>
                </View>
              ) : null}

              <View style={styles.receiptDivider} />
              <AppText style={styles.receiptFooter}>Thank you for your payment!</AppText>
            </View>
          ) : null}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.modalButton, styles.printButton]}
              onPress={() => Alert.alert('Print', 'Print functionality would be implemented here')}
            >
              <Printer size={16} color={Theme.colors.card} />
              <AppText style={styles.printButtonText} weight="semibold">Print Receipt</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.closeButton]} onPress={onClose}>
              <AppText style={styles.closeButtonText} weight="semibold">Close</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
