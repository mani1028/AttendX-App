import { StyleSheet, Platform } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';

export const leaveApprovalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  scrollContentEmbedded: {
    paddingBottom: 100,
  },
  embeddedGutter: {
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
  },
  errorCard: {
    marginHorizontal: 0,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  errorTitle: { color: Theme.colors.text, fontSize: Theme.typography.h4.fontSize, marginTop: Theme.spacing.xs },
  errorText: { color: Theme.colors.textMuted, textAlign: 'center', ...Theme.typography.body },
  retryBtn: {
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
  },
  retryBtnText: { color: Theme.colors.card },
  filterSection: {
    paddingVertical: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  filterTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  resetText: {
    ...Theme.typography.body,
    color: Theme.colors.blue,
  },
  filterGrid: {
    gap: Theme.spacing.md,
  },
  filterItem: {
    gap: Theme.spacing.sm,
  },
  filterLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  statusToggle: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.xs,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
  },
  statusBtnActive: {
    backgroundColor: Theme.colors.card,
    ...Platform.select({

      android: { elevation: 2 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusBtnText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  statusBtnTextActive: {
    color: Theme.colors.primary,
  },
  advancedFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    gap: 10,
  },
  advancedFilterText: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.cardAlt,
  },
  sectionHeader: {
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  requestsList: {
    gap: Theme.spacing.md,
  },
  requestCard: {
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  rollNumber: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Theme.colors.background,
    marginVertical: Theme.spacing.md,
  },
  cardDetails: {
    gap: Theme.spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  reasonCopy: {
    flex: 1,
  },
  reasonText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
  },
  reasonTapHint: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.xs,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: Theme.radius.md,
    gap: Theme.spacing.sm,
  },
  approveBtn: {
    backgroundColor: Theme.colors.primary,
  },
  rejectBtn: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  approveBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
  },
  rejectBtnText: {
    color: '#B91C1C',
    ...Theme.typography.body,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
  },
  badgeText: {
    ...Theme.typography.label,
    textTransform: 'uppercase',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    color: Theme.colors.textMuted,
    ...Theme.typography.body,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  modalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  modalClose: {
    padding: Theme.spacing.xs,
  },
  modalBody: {
    padding: Theme.spacing.xl,
  },
  modalLabel: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  modalFooter: {
    padding: Theme.spacing.xl,
    paddingTop: 0,
  },
  modalApplyBtn: {
    backgroundColor: Theme.colors.primary,
    height: 52,
    borderRadius: Theme.radius.md,
  },
  detailsModalBody: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    maxHeight: '70%',
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  detailSheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  detailsCloseFooter: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  detailsStudentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  avatarPlaceholderLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsStudentMeta: {
    flex: 1,
    gap: Theme.spacing.xs,
  },
  detailsStudentName: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  detailsRollNumber: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: Theme.colors.background,
    marginVertical: Theme.spacing.xl,
  },
  detailsGrid: {
    gap: Theme.spacing.md,
  },
  detailsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  detailsGridItem: {
    flex: 1,
    gap: 6,
  },
  detailsGridLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailsGridValContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  detailsGridValue: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
  },
  detailsSingleItem: {
    gap: Theme.spacing.xs,
  },
  detailsDateRange: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
  },
  detailsReasonContainer: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  detailsReasonText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.cardAlt,
    lineHeight: 22,
  },
  detailsActionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    backgroundColor: Theme.colors.card,
  },
  detailsActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: Theme.radius.md,
    gap: Theme.spacing.sm,
  },
  detailsApproveBtn: {
    backgroundColor: Theme.colors.primary,
  },
  detailsRejectBtn: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  detailsApproveBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.bodyMd,
  },
  detailsRejectBtnText: {
    color: '#B91C1C',
    ...Theme.typography.bodyMd,
  },
  modalLabelSection: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Theme.spacing.xl,
  },
  infoIcon: {
    marginTop: 2,
  },
});
