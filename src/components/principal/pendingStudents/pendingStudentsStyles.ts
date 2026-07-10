import { StyleSheet } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';

export const pendingStudentsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Theme.spacing.xl,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  unpaidCard: {
    borderTopColor: Theme.colors.error,
    borderTopWidth: 3,
  },
  partialCard: {
    borderTopColor: Theme.colors.warning,
    borderTopWidth: 3,
  },
  pendingCard: {
    borderTopColor: Theme.colors.success,
    borderTopWidth: 3,
  },
  summaryNumber: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
    marginTop: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  alertBanner: {
    backgroundColor: Theme.colors.redLight,
    marginBottom: Theme.spacing.md,
    marginTop: 0,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.error,
  },
  alertText: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    color: '#7f1d1d',
  },
  collectionCard: {
    backgroundColor: Theme.colors.card,
    marginBottom: Theme.spacing.md,
    marginTop: 0,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  collectionTitle: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Theme.colors.success,
    borderRadius: 4,
  },
  collectionRate: {
    fontSize: Theme.typography.h2.fontSize,
    color: Theme.colors.success,
    marginTop: Theme.spacing.sm,
  },
  collectionDetails: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  studentsList: {
    marginBottom: Theme.spacing.md,
    marginTop: 0,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  listTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  studentCount: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  studentName: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: Theme.colors.redLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.error,
  },
  studentClass: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  feeDetails: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  feeText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  paidText: {
    ...Theme.typography.caption,
    color: Theme.colors.success,
  },
  dueText: {
    ...Theme.typography.caption,
  },
  dueDate: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.md,
  },
  statusText: {
    ...Theme.typography.label,
  },
  loadingContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.textMuted,
  },
  emptyContainer: {
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  emptyTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.success,
    marginTop: Theme.spacing.md,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  modalBody: {
    padding: Theme.spacing.md,
  },
  detailSection: {
    marginBottom: Theme.spacing.md,
  },
  detailLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  detailValue: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  paidDetail: {
    color: Theme.colors.success,
  },
  dueDetail: {
    // moved to weight="bold"
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.radius.lg,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: Theme.typography.caption.fontSize,
  },
  actionButtons: {
    marginTop: Theme.spacing.md,
  },
  reminderButton: {
    backgroundColor: Theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
  },
  reminderButtonText: {
    color: Theme.colors.card,
  },
  modalFooter: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  closeModalButton: {
    backgroundColor: '#f3f4f6',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: Theme.colors.textSec,
  },
});
