import { StyleSheet } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';

export const paymentEntryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    backgroundColor: C.card,
    padding: Theme.spacing.xl,
    borderRadius: Theme.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: C.success,
    marginBottom: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.text,
  },
  formGroup: {
    gap: Theme.spacing.md,
  },
  label: {
    color: C.textMuted,
    ...Theme.typography.body,
    marginBottom: 6,
  },
  feeScroll: {
    flexDirection: 'row',
  },
  feeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  feeOption: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  feeOptionSelected: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  feeOptionText: {
    ...Theme.typography.body,
    color: C.text,
  },
  feeOptionTextSelected: {
    color: Theme.colors.card,
  },
  feeDetails: {
    backgroundColor: C.bg,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  detailLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.textMuted,
  },
  detailValue: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.text,
  },
  paidValue: {
    color: C.success,
  },
  input: {
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Theme.radius.sm,
    ...Theme.typography.body,
    backgroundColor: C.bg,
    color: C.text,
  },
  methodContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  methodOptionSelected: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  methodOptionText: {
    ...Theme.typography.body,
    color: C.textMuted,
  },
  methodOptionTextSelected: {
    color: Theme.colors.card,
  },
  submitButton: {
    backgroundColor: C.success,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  submitButtonText: {
    color: Theme.colors.card,
    fontSize: Theme.typography.h4.fontSize,
  },
  historySection: {
    marginTop: Theme.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  historyHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  viewAllHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}10`,
  },
  viewAllHistoryText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.caption.fontSize,
  },
  historyTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.text,
  },
  historySubtitle: {
    ...Theme.typography.body,
    color: C.textMuted,
    marginTop: Theme.spacing.xs,
  },
  paymentsList: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  paymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentsHeaderText: {
    ...Theme.typography.body,
    color: C.text,
  },
  totalPaymentsText: {
    ...Theme.typography.body,
    color: C.success,
  },
  paymentRow: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  paymentAmount: {
    fontSize: Theme.typography.h4.fontSize,
    color: C.text,
  },
  methodBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 4,
  },
  cashBadge: {
    backgroundColor: colors.primary + '30',
  },
  onlineBadge: {
    backgroundColor: C.successSoft,
  },
  methodText: {
    ...Theme.typography.label,
    color: C.text,
  },
  paymentDate: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  receiptNumber: {
    ...Theme.typography.label,
    color: C.textMuted,
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyText: {
    ...Theme.typography.body,
    color: C.textMuted,
    marginTop: Theme.spacing.md,
  },
  emptySubtext: {
    ...Theme.typography.caption,
    color: C.border,
    marginTop: Theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.text,
  },
  receiptContent: {
    padding: Theme.spacing.md,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  receiptSchoolName: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.text,
  },
  receiptDate: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginTop: Theme.spacing.xs,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: Theme.spacing.md,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  receiptLabel: {
    ...Theme.typography.body,
    color: C.textMuted,
  },
  receiptValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  receiptAmount: {
    fontSize: Theme.typography.h4.fontSize,
    color: C.success,
  },
  receiptFooter: {
    textAlign: 'center',
    ...Theme.typography.caption,
    color: C.textMuted,
    marginTop: Theme.spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
  },
  printButton: {
    backgroundColor: C.success,
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    justifyContent: 'center',
  },
  printButtonText: {
    color: Theme.colors.card,
  },
  closeButton: {
    backgroundColor: C.bg,
  },
  closeButtonText: {
    color: C.text,
  },
  selectedFeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    marginTop: Theme.spacing.xs,
  },
  selectedFeeBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  selectedFeeText: {
    color: C.success,
    ...Theme.typography.body,
    flexShrink: 1,
  },
  clearSelectedFeeBtn: {
    padding: Theme.spacing.xs,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 10,
  },
  suggestionsContainer: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Theme.radius.sm,
    marginTop: Theme.spacing.xs,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionItemText: {
    ...Theme.typography.body,
    color: C.text,
  },
  suggestionItemSubtext: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },
  noSuggestionItem: {
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  noSuggestionText: {
    ...Theme.typography.caption,
    color: C.textMuted,
    fontStyle: 'italic',
  },
});
