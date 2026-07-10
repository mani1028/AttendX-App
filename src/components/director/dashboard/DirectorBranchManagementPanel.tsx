import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { School, ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import AppCard from '../../common/AppCard';
import { colors, Theme } from '../../../theme/tokens';
import { dashboardCardStyles } from './dashboardCardStyles';
import DirectorBranchPreviewCard from './DirectorBranchPreviewCard';
import type { DirectorBranch } from './types';

export interface DirectorBranchManagementPanelProps {
  filteredBranchCount: number;
  dashboardBranchPreview: DirectorBranch[];
  dashboardBranchLimit: number;
  onViewAll: () => void;
  onBranchPress: () => void;
}

export default function DirectorBranchManagementPanel({
  filteredBranchCount,
  dashboardBranchPreview,
  dashboardBranchLimit,
  onViewAll,
  onBranchPress,
}: DirectorBranchManagementPanelProps) {
  return (
    <AppCard style={styles.branchManagementPanel}>
      <View style={dashboardCardStyles.chartHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={dashboardCardStyles.cardTitle}>Branch Management</AppText>
          <AppText style={dashboardCardStyles.branchPanelSubtitle}>
            {filteredBranchCount} branch{filteredBranchCount === 1 ? '' : 'es'} registered
          </AppText>
        </View>
        {filteredBranchCount > dashboardBranchLimit && (
          <TouchableOpacity accessibilityRole="button" style={dashboardCardStyles.viewAllBtn} onPress={onViewAll}>
            <AppText style={dashboardCardStyles.viewAllBtnText}>View All</AppText>
            <ChevronRight size={14} color={Theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {dashboardBranchPreview.length === 0 ? (
        <View style={dashboardCardStyles.branchEmptyState}>
          <School size={28} color={colors.textMuted} />
          <AppText style={dashboardCardStyles.branchEmptyTitle} weight="semibold">No branches yet</AppText>
          <AppText style={dashboardCardStyles.branchEmptyText}>Add your first branch to get started.</AppText>
        </View>
      ) : (
        <View style={styles.branchCardsGrid}>
          {dashboardBranchPreview.map((branch) => (
            <DirectorBranchPreviewCard
              key={branch.branch_id}
              branch={branch}
              onPress={onBranchPress}
            />
          ))}
        </View>
      )}

      {filteredBranchCount > dashboardBranchLimit && (
        <TouchableOpacity accessibilityRole="button" style={dashboardCardStyles.viewAllFooterBtn} onPress={onViewAll}>
          <AppText style={dashboardCardStyles.viewAllFooterText}>
            View all {filteredBranchCount} branches
          </AppText>
          <ChevronRight size={16} color={Theme.colors.primary} />
        </TouchableOpacity>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  branchManagementPanel: {
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Theme.radius.lg,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  branchCardsGrid: {
    gap: Theme.spacing.md,
  },
});
