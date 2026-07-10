import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { User, Mail, Layers, Users, GraduationCap, Eye, Edit2 } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { colors, Theme } from '../../../theme/tokens';
import { DirectorHealthBadge, DirectorStatusBadge } from './DirectorStatusBadges';
import type { DirectorBranch } from './types';

export interface DirectorBranchManagementCardProps {
  branch: DirectorBranch;
  onEdit: () => void;
  onView: () => void;
}

export default function DirectorBranchManagementCard({
  branch,
  onEdit,
  onView,
}: DirectorBranchManagementCardProps) {
  return (
    <View style={styles.branchManagementCard}>
      <View style={styles.branchManagementHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.branchManagementName} weight="bold">{branch.branch_name}</AppText>
          <AppText style={styles.branchManagementId}>Branch ID: {branch.branch_id}</AppText>
        </View>
        <View style={{ gap: Theme.spacing.xs, alignItems: 'flex-end' }}>
          <DirectorStatusBadge status={branch.branch_status} />
          <DirectorHealthBadge status={branch.health_status} />
        </View>
      </View>

      <View style={styles.branchManagementDetails}>
        <View style={styles.managementDetailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <User size={12} color={colors.textMuted} />
            <AppText style={styles.managementDetailLabel} weight="bold">Principal</AppText>
          </View>
          <AppText style={styles.managementDetailVal}>{branch.principal_name || 'Not assigned'}</AppText>
        </View>
        <View style={styles.managementDetailRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Mail size={12} color={colors.textMuted} />
            <AppText style={styles.managementDetailLabel} weight="bold">Email</AppText>
          </View>
          <AppText style={styles.managementDetailVal} numberOfLines={1}>
            {branch.principal_email || 'Not assigned'}
          </AppText>
        </View>

        <View style={styles.managementStatsRow}>
          <View style={styles.managementStatItem}>
            <Layers size={12} color={Theme.colors.primary} />
            <AppText style={styles.managementStatsText}>{branch.classes_count || 0} Classes</AppText>
          </View>
          <View style={styles.managementStatDivider} />
          <View style={styles.managementStatItem}>
            <Users size={12} color={Theme.colors.success} />
            <AppText style={styles.managementStatsText}>{branch.teachers_count || 0} Staff</AppText>
          </View>
          <View style={styles.managementStatDivider} />
          <View style={styles.managementStatItem}>
            <GraduationCap size={12} color={Theme.colors.warning} />
            <AppText style={styles.managementStatsText}>{branch.students_count || 0} Students</AppText>
          </View>
        </View>
      </View>

      <View style={styles.branchManagementActions}>
        <TouchableOpacity accessibilityRole="button" style={styles.managementBtnView} onPress={onView}>
          <Eye size={13} color={Theme.colors.card} />
          <AppText style={styles.managementBtnViewText} weight="bold">View Details</AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.managementBtnEdit} onPress={onEdit}>
          <Edit2 size={13} color={Theme.colors.primaryLight} />
          <AppText style={styles.managementBtnEditText} weight="bold">Edit</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  branchManagementCard: {
    backgroundColor: colors.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: Theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.primary,
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  branchManagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: 6,
  },
  branchManagementName: {
    ...Theme.typography.bodyMd,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  branchManagementId: {
    fontSize: Theme.typography.label.fontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchManagementDetails: {
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  managementDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  managementDetailLabel: {
    ...Theme.typography.label,
    color: colors.textMuted,
  },
  managementDetailVal: {
    ...Theme.typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  managementStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.sm,
    marginTop: Theme.spacing.xs,
  },
  managementStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
  },
  managementStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  managementStatsText: {
    ...Theme.typography.label,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  branchManagementActions: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  managementBtnView: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    height: 28,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primary,
  },
  managementBtnViewText: {
    ...Theme.typography.caption,
    color: Theme.colors.card,
  },
  managementBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    height: 28,
    borderRadius: Theme.radius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  managementBtnEditText: {
    ...Theme.typography.caption,
    color: Theme.colors.primaryLight,
  },
});
