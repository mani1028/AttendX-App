import { StyleSheet } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';

export const teacherLeaveStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  pageBody: {
    paddingBottom: 100,
  },
  scrollContent: {
    paddingTop: Theme.spacing.md,
    paddingBottom: 100,
    paddingHorizontal: Theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  filterLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    fontWeight: '600',
    marginBottom: 10,
  },
  filterTabs: {
    marginBottom: Theme.spacing.md,
  },
  filterScrollContent: {
    gap: Theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.xl,
    marginRight: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
  },
  filterTabActive: {
    backgroundColor: Theme.colors.primaryLight,
  },
  filterTabText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  filterTabTextActive: {
    color: Theme.colors.card,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leavesList: {
    paddingTop: Theme.spacing.xs,
  },
  leaveCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  avatarText: {
    color: Theme.colors.primaryLight,
    ...Theme.typography.h4,
  },
  teacherName: {
    ...Theme.typography.bodyMd,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  teacherSubject: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.md,
  },
  statusBadgeText: {
    ...Theme.typography.label,
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: Theme.spacing.md,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  dateText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    marginLeft: 6,
    fontWeight: '500',
  },
  reasonText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  appliedOn: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.primaryLight,
    fontWeight: '600',
    marginRight: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: Theme.spacing.md,
    ...Theme.typography.bodyMd,
    color: Theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Theme.spacing.xl,
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
    ...Theme.typography.h3,
    color: '#1E293B',
  },
  modalScroll: {
    padding: Theme.spacing.xl,
  },
  detailTeacherInfo: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  largeAvatarText: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: 'bold',
    color: Theme.colors.primaryLight,
  },
  detailTeacherName: {
    ...Theme.typography.h3,
    color: '#1E293B',
  },
  detailTeacherSubject: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  detailSection: {
    marginBottom: Theme.spacing.xl,
  },
  detailLabel: {
    ...Theme.typography.caption,
    fontWeight: 'bold',
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    ...Theme.typography.bodyMd,
    color: '#1E293B',
    marginLeft: 10,
    fontWeight: '500',
  },
  reasonBox: {
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  detailReasonText: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.textSec,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: Theme.spacing.xl,
  },
  actionBtn: {
    flex: 0.48,
    height: 50,
    borderRadius: Theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: Theme.colors.error,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: Theme.colors.card,
    ...Theme.typography.h4,
  },
});
