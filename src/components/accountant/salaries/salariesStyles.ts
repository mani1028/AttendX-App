import { StyleSheet, Platform } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';

export const salariesStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentOverlap: {
    flex: 1,
        backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    backgroundColor: '#f8fbff',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6f5',
  },
  headerTitle: {
    ...Theme.typography.h4,
    color: '#123358',
    marginBottom: Theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: Theme.typography.caption.fontSize,
    color: '#666',
  },
  searchSection: {
    padding: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
    backgroundColor: '#f3f4f6',
  },
  employeesList: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  employeeCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  employeeName: {
    ...Theme.typography.h4,
    color: '#111827',
  },
  employeeId: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  employeeDetails: {
    marginBottom: Theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 90,
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textMuted,
  },
  detailValue: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    color: '#374151',
  },
  salaryValue: {
    fontWeight: '600',
    color: Theme.colors.success,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Theme.colors.violet,
  },
  historyButton: {
    backgroundColor: '#0284c7',
  },
  actionButtonText: {
    color: Theme.colors.card,
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: Theme.colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.xl,
  },
  statusBadgeText: {
    ...Theme.typography.label,
    fontWeight: '600',
    color: '#065f46',
  },
  messageBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    margin: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
  },
  messageBoxSuccess: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  messageBoxError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fccacb',
  },
  messageText: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
  },
  messageTextSuccess: {
    color: Theme.colors.violet,
  },
  messageTextError: {
    color: '#b91c1c',
  },
  messageClose: {
    padding: Theme.spacing.xs,
  },
  messageCloseText: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
  },
  emptyStateContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },
  emptyStateTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: Theme.colors.background,
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: Theme.spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    ...Theme.typography.h3,
    color: '#111827',
  },
  modalCloseButton: {
    padding: Theme.spacing.xs,
  },
  modalCloseText: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.textMuted,
  },
  modalBodyContent: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  modalSubtitle: {
    ...Theme.typography.h4,
    color: '#111827',
    marginBottom: Theme.spacing.xs,
  },
  employeeIdText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.md,
  },
  inputGroup: {
    marginBottom: Theme.spacing.md,
  },
  inputLabel: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
  },
  currentSalaryContainer: {
    backgroundColor: '#f3f4f6',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentSalaryText: {
    ...Theme.typography.body,
    fontWeight: '500',
    color: '#374151',
  },
  currentSalaryLabel: {
    ...Theme.typography.body,
    fontWeight: '500',
    color: '#374151',
    marginBottom: Theme.spacing.xs,
  },
  currentSalaryValue: {
    ...Theme.typography.h3,
    color: Theme.colors.success,
  },
  reasonTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    minHeight: 48,
    backgroundColor: Theme.colors.background,
  },
  reasonTriggerText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: Theme.spacing.sm,
  },
  infoText: {
    ...Theme.typography.caption,
    color: Theme.colors.violet,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: Theme.colors.violet,
  },
  updateButtonText: {
    color: Theme.colors.card,
    fontWeight: '500',
  },
  closeButtonFull: {
    backgroundColor: Theme.colors.violet,
    flex: 1,
  },
  closeButtonText: {
    color: Theme.colors.card,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loader: {
    marginTop: Theme.spacing.xl,
  },
  historyContainer: {
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Theme.radius.sm,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyHeaderText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: '#374151',
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemText: {
    ...Theme.typography.caption,
    color: '#4b5563',
  },
  historyReason: {
    color: Theme.colors.textMuted,
  },
  emptyState: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
  },
  searchContainer: {
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: '#cfdbeb',
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    ...Theme.typography.body,
  },
});
