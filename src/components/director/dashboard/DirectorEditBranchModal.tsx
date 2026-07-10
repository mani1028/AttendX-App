import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { colors, Theme } from '../../../theme/tokens';
import type { DirectorBranch, DirectorBranchEditData } from './types';

export interface DirectorEditBranchModalProps {
  visible: boolean;
  editData: DirectorBranchEditData;
  onClose: () => void;
  onSave: () => void;
  onFieldChange: (field: keyof DirectorBranch, value: string) => void;
}

export default function DirectorEditBranchModal({
  visible,
  editData,
  onClose,
  onSave,
  onFieldChange,
}: DirectorEditBranchModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">Edit Branch Details</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={{ gap: 14 }}>
              <View>
                <AppText style={styles.fieldLabel} weight="bold">Branch Name</AppText>
                <TextInput
                  style={styles.searchInput}
                  value={editData.branch_name}
                  onChangeText={(text) => onFieldChange('branch_name', text)}
                />
              </View>
              <View>
                <AppText style={styles.fieldLabel} weight="bold">Principal ID</AppText>
                <TextInput
                  style={styles.searchInput}
                  value={editData.principal_employee_id}
                  onChangeText={(text) => onFieldChange('principal_employee_id', text)}
                />
              </View>
              <View>
                <AppText style={styles.fieldLabel} weight="bold">Principal Name</AppText>
                <TextInput
                  style={styles.searchInput}
                  value={editData.principal_name}
                  onChangeText={(text) => onFieldChange('principal_name', text)}
                />
              </View>
              <View>
                <AppText style={styles.fieldLabel} weight="bold">Principal Email</AppText>
                <TextInput
                  style={styles.searchInput}
                  value={editData.principal_email}
                  onChangeText={(text) => onFieldChange('principal_email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View>
                <AppText style={styles.fieldLabel} weight="bold">Status</AppText>
                <View style={styles.editStatusContainer}>
                  {['ACTIVE', 'INACTIVE'].map((opt) => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={opt}
                      style={[
                        styles.editStatusBtn,
                        editData.branch_status === opt && styles.editStatusBtnActive,
                        { flex: 1, height: 44, justifyContent: 'center' },
                      ]}
                      onPress={() => onFieldChange('branch_status', opt)}
                    >
                      <AppText
                        style={[
                          styles.editStatusText,
                          editData.branch_status === opt && styles.editStatusTextActive,
                          { textAlign: 'center' },
                        ]}
                        weight="bold"
                      >
                        {opt}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { flexDirection: 'row', gap: Theme.spacing.md }]}>
            <View style={{ flex: 1 }}>
              <AppButton title="Cancel" onPress={onClose} type="secondary" />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title="Save Changes" onPress={onSave} type="primary" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.xl,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: Theme.spacing.xl,
  },
  modalFooter: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldLabel: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    ...Theme.typography.body,
    width: '100%',
    height: 44,
    color: colors.textPrimary,
    backgroundColor: Theme.colors.background,
    fontWeight: '600',
  },
  editStatusContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  editStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editStatusBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  editStatusText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
  },
  editStatusTextActive: {
    color: Theme.colors.card,
  },
});
