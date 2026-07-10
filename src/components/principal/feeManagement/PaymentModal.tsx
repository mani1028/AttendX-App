import React from 'react';
import { View, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { X, ChevronLeft } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { formatAmount, formatDate } from './helpers';
import type { Fee, PaymentRecord } from './types';

export interface PaymentModalProps {
  visible: boolean;
  selectedFee: Fee | null;
  paymentAmount: string;
  processingPayment: boolean;
  paymentHistory: PaymentRecord[];
  loadingHistory: boolean;
  onClose: () => void;
  onPaymentAmountChange: (amount: string) => void;
  onPay: () => void;
  onHistoryItemPress: (payment: PaymentRecord) => void;
}

export default function PaymentModal({
  visible,
  selectedFee,
  paymentAmount,
  processingPayment,
  paymentHistory,
  loadingHistory,
  onClose,
  onPaymentAmountChange,
  onPay,
  onHistoryItemPress,
}: PaymentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">Record Payment</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <X size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {selectedFee && (
            <>
              <View style={styles.modalInfo}>
                <AppText style={styles.modalLabel} weight="semibold">Student</AppText>
                <AppText style={styles.modalValue} weight="bold">{selectedFee.student_name || 'N/A'}</AppText>
                <View style={styles.modalInfoRow}>
                  <View style={styles.modalInfoCol}>
                    <AppText style={styles.modalLabel} weight="semibold">Total Fee</AppText>
                    <AppText style={styles.modalValue} weight="semibold">{formatAmount(selectedFee.total_fee)}</AppText>
                  </View>
                  <View style={styles.modalInfoCol}>
                    <AppText style={styles.modalLabel} weight="semibold">Amount Paid</AppText>
                    <AppText style={[styles.modalValue, { color: C.success }]} weight="semibold">{formatAmount(selectedFee.paid_amount)}</AppText>
                  </View>
                  <View style={styles.modalInfoCol}>
                    <AppText style={styles.modalLabel} weight="semibold">Due Amount</AppText>
                    <AppText style={[styles.modalValue, styles.dueAmountValue]} weight="bold">{formatAmount(selectedFee.due_amount)}</AppText>
                  </View>
                </View>
              </View>

              <View style={styles.historySection}>
                <AppText style={styles.historyTitle} weight="bold">Payment History</AppText>
                {loadingHistory ? (
                  <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 10 }} />
                ) : paymentHistory.length > 0 ? (
                  <View style={styles.historyList}>
                    {paymentHistory.map((payment, idx) => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        key={payment.id || idx}
                        style={styles.historyItem}
                        onPress={() => onHistoryItemPress(payment)}
                      >
                        <View>
                          <AppText style={styles.historyAmount} weight="bold">{formatAmount(payment.amount)}</AppText>
                          <AppText style={styles.historyDate}>{formatDate(payment.paid_at || payment.created_at || '')}</AppText>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
                          <View style={styles.historyMethodBadge}>
                            <AppText style={styles.historyMethodText} weight="bold">{payment.method.toUpperCase()}</AppText>
                          </View>
                          <ChevronLeft size={16} color={C.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <AppText style={styles.noHistoryText}>No payments recorded yet</AppText>
                )}
              </View>

              {selectedFee.status !== 'paid' && (
                <View style={styles.modalForm}>
                  <AppText style={styles.label} weight="semibold">New Payment (₹)</AppText>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    value={paymentAmount}
                    onChangeText={onPaymentAmountChange}
                  />
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
                  <AppText style={styles.cancelButtonText} weight="semibold">Close</AppText>
                </TouchableOpacity>
                {selectedFee.status !== 'paid' && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.modalButton, styles.payButton]}
                    onPress={onPay}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <ActivityIndicator size="small" color={Theme.colors.card} />
                    ) : (
                      <AppText style={styles.payButtonText} weight="bold">Pay Now</AppText>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
