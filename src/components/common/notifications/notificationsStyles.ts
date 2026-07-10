import { StyleSheet, Platform } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';

export const notificationsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.45,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Theme.spacing.md,
    paddingBottom: 40,
  },
  scrollContentEmpty: {
    flexGrow: 1,
  },
  listWrap: {
    paddingTop: Theme.spacing.xs,
  },

  // States
  centeredState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: Theme.spacing.md,
  },
  loadingText: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: Theme.spacing.md,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Card
  card: {
    backgroundColor: Theme.colors.card,
    marginHorizontal: Theme.spacing.md,
    marginBottom: 10,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  cardUnread: {
    borderColor: 'rgba(59,130,246,0.2)',
    backgroundColor: '#fafcff',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    borderTopLeftRadius: 18,

  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingLeft: 18,
    gap: Theme.spacing.md,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: Theme.spacing.xs },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typePill: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.radius.sm,
  },
  typePillText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  timeText: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  cardTitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
    letterSpacing: -0.1,
  },
  cardTitleUnread: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  cardDesc: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  eventChipText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
  },
  cardActions: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  // Action Menu Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.border,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  sheetTitle: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Theme.spacing.sm,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  sheetItemDisabled: {
    opacity: 0.5,
  },
  sheetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetItemText: { flex: 1 },
  sheetItemLabel: {
    ...Theme.typography.bodyMd,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  sheetItemLabelDisabled: {
    color: Theme.colors.textMuted,
  },
  sheetItemHint: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Theme.colors.background,
    marginVertical: 2,
  },

  // Detail Sheet
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailSheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '88%',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: Theme.spacing.xs,
  },
  detailIconRing: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailActionBtn: {
    width: 38,
    height: 38,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  detailScrollArea: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  detailScrollContent: {
    paddingBottom: Theme.spacing.sm,
  },
  detailTitle: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 14,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: 14,
  },
  detailSectionLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.sm,
  },
  detailBody: {
    ...Theme.typography.bodyMd,
    color: Theme.colors.text,
    lineHeight: 24,
    marginBottom: Theme.spacing.xl,
    fontWeight: '400',
  },
  detailEventBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    marginBottom: Theme.spacing.xl,
  },
  detailEventLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  detailEventValue: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  detailReceivedOn: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
});
