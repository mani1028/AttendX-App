import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { School, X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppButton from '../../common/AppButton';
import { colors, Theme } from '../../../theme/tokens';
import type { DirectorBranch } from './types';

export interface DirectorBranchSelectorModalProps {
  visible: boolean;
  branches: DirectorBranch[];
  selectedBranchId: string;
  onClose: () => void;
  onSelect: (branchId: string) => void;
}

export default function DirectorBranchSelectorModal({
  visible,
  branches,
  selectedBranchId,
  onClose,
  onSelect,
}: DirectorBranchSelectorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">Select Branch Filter</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.branchSelectItem,
                selectedBranchId === 'ALL' && styles.branchSelectItemActive,
              ]}
              onPress={() => onSelect('ALL')}
            >
              <School size={16} color={selectedBranchId === 'ALL' ? Theme.colors.card : colors.textMuted} />
              <AppText
                style={[
                  styles.branchSelectItemText,
                  selectedBranchId === 'ALL' && styles.branchSelectItemTextActive,
                ]}
                weight="bold"
              >
                All Branches
              </AppText>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
              {branches.map((b) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={b.branch_id}
                  style={[
                    styles.branchSelectItem,
                    selectedBranchId === b.branch_id && styles.branchSelectItemActive,
                  ]}
                  onPress={() => onSelect(b.branch_id)}
                >
                  <School size={16} color={selectedBranchId === b.branch_id ? Theme.colors.card : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={[
                        styles.branchSelectItemText,
                        selectedBranchId === b.branch_id && styles.branchSelectItemTextActive,
                      ]}
                      weight="bold"
                    >
                      {b.branch_name}
                    </AppText>
                    <AppText
                      style={[
                        styles.branchSelectItemSub,
                        selectedBranchId === b.branch_id && styles.branchSelectItemSubActive,
                      ]}
                    >
                      ID: {b.branch_id} | Principal: {b.principal_name || 'None'}
                    </AppText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.modalFooter}>
            <AppButton title="Close" onPress={onClose} type="secondary" />
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
  branchSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: Theme.spacing.md,
  },
  branchSelectItemActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  branchSelectItemText: {
    ...Theme.typography.body,
    color: colors.textPrimary,
  },
  branchSelectItemTextActive: {
    color: Theme.colors.card,
  },
  branchSelectItemSub: {
    ...Theme.typography.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchSelectItemSubActive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
});
