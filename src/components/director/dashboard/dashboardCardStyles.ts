import { StyleSheet } from 'react-native';
import { colors, Theme } from '../../../theme/tokens';

export const dashboardCardStyles = StyleSheet.create({
  cardTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  branchPanelSubtitle: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  viewAllBtnText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  viewAllFooterBtn: {
    marginTop: Theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: Theme.colors.background,
  },
  viewAllFooterText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  branchEmptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  branchEmptyTitle: {
    fontSize: Theme.typography.bodyMd.fontSize,
    color: colors.textPrimary,
  },
  branchEmptyText: {
    ...Theme.typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
