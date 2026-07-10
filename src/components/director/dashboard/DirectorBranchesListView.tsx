import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { colors, Theme } from '../../../theme/tokens';
import DirectorBranchManagementCard from './DirectorBranchManagementCard';
import type { DirectorBranch } from './types';

export interface DirectorBranchesListViewProps {
  selectedBranchId: string;
  filteredBranches: DirectorBranch[];
  paginatedBranches: DirectorBranch[];
  branchViewSearchTerm: string;
  branchSlotsAvailable: boolean;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  onSearchChange: (text: string) => void;
  onAddBranch: () => void;
  onEditBranch: (branch: DirectorBranch) => void;
  onViewBranch: (branch: DirectorBranch) => void;
  onPageChange: (page: number) => void;
}

export default function DirectorBranchesListView({
  selectedBranchId,
  filteredBranches,
  paginatedBranches,
  branchViewSearchTerm,
  branchSlotsAvailable,
  currentPage,
  totalPages,
  rowsPerPage,
  onSearchChange,
  onAddBranch,
  onEditBranch,
  onViewBranch,
  onPageChange,
}: DirectorBranchesListViewProps) {
  return (
    <AppCard style={styles.branchesViewCard}>
      <View style={styles.branchesViewHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.cardTitle}>
            {selectedBranchId === 'ALL' ? 'Registered Branches' : `Branch Filter: ${selectedBranchId}`}
          </AppText>
          <AppText style={styles.overviewSubtitle}>
            {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} registered
          </AppText>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.addBranchBtn} onPress={onAddBranch}>
          <AppText style={styles.addBranchBtnText}>
            {branchSlotsAvailable ? '+ Add Branch' : 'Upgrade'}
          </AppText>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.branchSearchInput}
        placeholder="Search by branch name, ID, or Principal name..."
        placeholderTextColor={colors.textMuted}
        value={branchViewSearchTerm}
        onChangeText={onSearchChange}
      />

      {paginatedBranches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>No branches found</AppText>
        </View>
      ) : (
        <View style={{ gap: Theme.spacing.md }}>
          {paginatedBranches.map((branch) => (
            <DirectorBranchManagementCard
              key={branch.branch_id}
              branch={branch}
              onEdit={() => onEditBranch(branch)}
              onView={() => onViewBranch(branch)}
            />
          ))}
        </View>
      )}

      {filteredBranches.length > rowsPerPage && (
        <View style={styles.pagination}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} color={currentPage === 1 ? colors.border : colors.textMuted} />
          </TouchableOpacity>
          <AppText style={styles.pageInfo}>Page {currentPage} of {totalPages}</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight size={18} color={currentPage === totalPages ? colors.border : colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  branchesViewCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  branchesViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  cardTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  overviewSubtitle: {
    fontSize: Theme.typography.caption.fontSize,
    color: colors.textMuted,
    marginTop: Theme.spacing.sm,
    lineHeight: 20,
  },
  addBranchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
  },
  addBranchBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: '700',
  },
  branchSearchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    ...Theme.typography.body,
    marginBottom: Theme.spacing.xl,
    color: colors.textPrimary,
    backgroundColor: Theme.colors.background,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    ...Theme.typography.body,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xl,
  },
  pageBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageInfo: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
    marginHorizontal: Theme.spacing.md,
  },
});
