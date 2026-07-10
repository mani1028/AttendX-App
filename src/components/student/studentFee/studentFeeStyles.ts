import { StyleSheet } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';

export const studentFeeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.colors.background,
  },
  pageBody: {
  },
  header: {
    backgroundColor: C.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: C.colors.card,
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    backgroundColor: C.colors.card + '1A', // ~0.1 opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: Theme.spacing.xl,
    paddingBottom: 100,
  },
  ledgerCard: {
    backgroundColor: C.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
    ...C.shadow.sm,
    marginTop: 10,
  },
  ledgerTitle: {
    ...Theme.typography.body,
    fontWeight: '800',
    color: C.colors.primary,
    marginBottom: Theme.spacing.md,
  },
  ledgerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  ledgerLabel: {
    ...Theme.typography.caption,
    color: C.colors.textSec,
    width: 100,
  },
  ledgerValue: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: C.colors.primary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
    ...C.shadow.md,
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.md,
    backgroundColor: C.colors.card + '33', // ~0.2 opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.xl,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    ...Theme.typography.body,
    color: C.colors.card + 'CC', // ~0.8 opacity
    marginBottom: Theme.spacing.xs,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: C.colors.card,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: C.colors.card,
    borderRadius: Theme.radius.md,
    padding: 6,
    marginBottom: Theme.spacing.xl,
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: C.colors.blue,
  },
  tabText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: C.colors.textSec,
  },
  activeTabText: {
    color: C.colors.blue,
  },
  detailsCard: {
    backgroundColor: C.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    ...C.shadow.sm,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.xl,
  },
  detailsTitle: {
    ...Theme.typography.body,
    fontWeight: '800',
    color: C.colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  detailLabel: {
    ...Theme.typography.body,
    color: C.colors.textSec,
    fontWeight: '500',
  },
  detailValue: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: C.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: C.colors.borderLight,
  },
  statusBadge: {
    backgroundColor: C.colors.successBg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.radius.xl,
  },
  statusText: {
    ...Theme.typography.label,
    fontWeight: 'bold',
    color: C.colors.success,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  dueDateValue: {
    ...Theme.typography.body,
    color: C.colors.textSec,
    fontWeight: '500',
  },
  historySection: {
    backgroundColor: C.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    ...C.shadow.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllText: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.colors.blue,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.background,
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    backgroundColor: C.colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '800',
    color: C.colors.primary,
  },
  historyMethod: {
    ...Theme.typography.caption,
    color: C.colors.textMuted,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  historyDate: {
    ...Theme.typography.caption,
    color: C.colors.textSec,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: C.colors.blue,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
  },
  downloadButtonText: {
    ...Theme.typography.body,
    color: C.colors.blue,
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.colors.background,
  },
  emptyHistory: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: C.colors.textMuted,
    ...Theme.typography.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: C.colors.card,
    borderRadius: Theme.radius.xl,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.borderLight,
  },
  modalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: C.colors.primary,
  },
  modalBody: {
    padding: Theme.spacing.xl,
  },
  receiptContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: C.colors.primary,
    marginTop: 10,
  },
  receiptStatus: {
    ...Theme.typography.body,
    color: C.colors.success,
    fontWeight: '600',
    marginTop: 5,
  },
  detailList: {
    backgroundColor: C.colors.background,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.colors.border,
  },
  modalDetailLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.colors.textSec,
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.colors.primary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
});
