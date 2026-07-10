import { StyleSheet, Platform } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';

export const viewAttendanceStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 30,
    ...Platform.select({

      android: { elevation: 10 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Theme.spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: Theme.colors.card,
    ...Theme.typography.h3,
  },
  headerContent: {
    marginTop: Theme.spacing.lg,
  },
  headerGreeting: {
    color: Theme.colors.card,
    ...Theme.typography.h1,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  tabWrapper: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.xl,
        paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: 'transparent',
    gap: Theme.spacing.md,
    marginBottom: 10,
    zIndex: 50,
    ...Platform.select({

      android: { elevation: 50 },

      ios: {},

    }),
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
  },
  activeTab: {
    backgroundColor: Theme.colors.card,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.card,
  },
  activeTabText: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    paddingBottom: 120,
  },
  selectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    padding: Theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
    marginBottom: Theme.spacing.xl,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  field: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: Theme.spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  dropdownDisabled: {
    opacity: 0.55,
  },
  dropdownText: {
    flex: 1,
    ...Theme.typography.body,
    color: '#1E293B',
    fontWeight: '500',
  },
  helperText: {
    marginTop: Theme.spacing.sm,
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
  },
  dateInputText: {
    ...Theme.typography.body,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchBtn: {
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    marginTop: Theme.spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  summaryTile: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: 28,
    alignItems: 'center',
    ...Platform.select({

      android: { elevation: 3 },

      ios: {},

    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryValue: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: Theme.spacing.sm,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  listActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.sm,
  },
  actionIconButton: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    ...Platform.select({

      android: { elevation: 1 },

      ios: {},

    }),
  },
  actionIconLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: Theme.colors.primary,
    marginTop: 6,
  },
  listContainer: {
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    padding: Theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    ...Platform.select({

      android: { elevation: 4 },

      ios: {},

    }),
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xs,
  },
  listHeaderText: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '800',
    color: '#1E293B',
  },
  listHeaderCount: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
  },
  studentDetails: {
    marginLeft: Theme.spacing.md,
  },
  studentName: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentRoll: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
  },
  statusPresent: {
    backgroundColor: '#ecfdf5',
  },
  statusAbsent: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  statusTextPresent: {
    color: Theme.colors.success,
  },
  statusTextAbsent: {
    color: Theme.colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: Theme.spacing.md,
  },
  emptyStateSub: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Theme.spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  modalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSubtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  modalClose: {
    padding: Theme.spacing.xs,
  },
  modalBody: {
    marginBottom: Theme.spacing.lg,
  },
  modalField: {
    marginBottom: Theme.spacing.xl,
  },
  modalLabel: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: Theme.spacing.sm,
  },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    height: 48,
  },
  modalDateText: {
    ...Theme.typography.body,
    color: '#1E293B',
    fontWeight: '500',
  },
  formatRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  formatBtn: {
    flex: 1,
    height: 48,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  formatBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  formatBtnText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  formatBtnTextActive: {
    color: Theme.colors.card,
  },
  modalPreview: {
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
  },
  modalPreviewText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  cancelBtnText: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Theme.colors.textSec,
  },
  confirmExportBtn: {
    flex: 2,
    height: 52,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
  },
  confirmExportBtnText: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  imageModalTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: '#1E293B',
  },
  imageModalClose: {
    padding: Theme.spacing.xs,
  },
  imageModalBody: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  imageModalMain: {
    width: '100%',
    height: 300,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.background,
  },
  imageModalThumbs: {
    flexDirection: 'row',
    marginTop: Theme.spacing.md,
  },
  imageModalThumb: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.md,
    marginRight: 10,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  imageModalThumbActive: {
    borderColor: Theme.colors.primary,
  },
  imageModalThumbImg: {
    width: '100%',
    height: '100%',
  },
  imageModalCounter: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  imageModalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  imageModalEmptyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.md,
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  pickerCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  pickerTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: '#1E293B',
  },
  pickerSubtitle: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  pickerCloseBtn: {
    padding: Theme.spacing.xs,
  },
  pickerShell: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  pickerOptionActive: {
    backgroundColor: Theme.colors.background,
  },
  pickerOptionText: {
    ...Theme.typography.bodyMd,
    color: '#1E293B',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: 18,
  },
  pickerCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCancelText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.textSec,
  },
  pickerDoneBtn: {
    flex: 1,
    height: 48,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerDoneText: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  overviewContainer: {
    paddingTop: 40,
  },
});
