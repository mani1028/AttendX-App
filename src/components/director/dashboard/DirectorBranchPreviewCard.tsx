import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { School, User, Layers, Users, GraduationCap, ChevronRight } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { colors, Theme } from '../../../theme/tokens';
import { DirectorHealthBadge, DirectorStatusBadge } from './DirectorStatusBadges';
import type { DirectorBranch } from './types';

export interface DirectorBranchPreviewCardProps {
  branch: DirectorBranch;
  onPress: () => void;
}

export default function DirectorBranchPreviewCard({ branch, onPress }: DirectorBranchPreviewCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.dashboardBranchCard}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.dashboardBranchTop}>
        <View style={styles.dashboardBranchIconWrap}>
          <School size={18} color={Theme.colors.primary} />
        </View>
        <View style={styles.dashboardBranchMeta}>
          <AppText style={styles.dashboardBranchName} weight="bold" numberOfLines={1}>
            {branch.branch_name}
          </AppText>
          <AppText style={styles.dashboardBranchId}>Branch ID · {branch.branch_id}</AppText>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>

      <View style={styles.dashboardBranchBadges}>
        <DirectorStatusBadge status={branch.branch_status} />
        <DirectorHealthBadge status={branch.health_status} />
      </View>

      <View style={styles.dashboardBranchPrincipalRow}>
        <User size={13} color={colors.textMuted} />
        <AppText style={styles.dashboardBranchPrincipal} numberOfLines={1}>
          {branch.principal_name || 'No principal assigned'}
        </AppText>
      </View>

      <View style={styles.dashboardBranchStats}>
        <View style={styles.dashboardBranchStat}>
          <Layers size={12} color={Theme.colors.primary} />
          <AppText style={styles.dashboardBranchStatText}>{branch.classes_count || 0} Classes</AppText>
        </View>
        <View style={styles.dashboardBranchStat}>
          <Users size={12} color={Theme.colors.success} />
          <AppText style={styles.dashboardBranchStatText}>{branch.teachers_count || 0} Staff</AppText>
        </View>
        <View style={styles.dashboardBranchStat}>
          <GraduationCap size={12} color={Theme.colors.warning} />
          <AppText style={styles.dashboardBranchStatText}>{branch.students_count || 0} Students</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dashboardBranchCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  dashboardBranchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashboardBranchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBranchMeta: {
    flex: 1,
    minWidth: 0,
  },
  dashboardBranchName: {
    fontSize: Theme.typography.h4.fontSize,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  dashboardBranchId: {
    fontSize: Theme.typography.caption.fontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
  dashboardBranchBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  dashboardBranchPrincipalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dashboardBranchPrincipal: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dashboardBranchStats: {
    flexDirection: 'row',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: Theme.spacing.sm,
  },
  dashboardBranchStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.sm,
  },
  dashboardBranchStatText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
