import { StyleSheet, Platform } from 'react-native';
import { Theme, C } from '../../../theme/tokens';
import { HEADER_CONSTANTS } from "../../../constants/headerConstants";
import { PAGE_PAD } from "./helpers";

export const attendanceHubStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  contentOverlap: {
    flex: 1,
        backgroundColor: C.bg,
    borderTopLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 110,
  },
  pageHeader: {
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 26,
    color: C.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: C.primary,
    ...Theme.typography.caption,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 18,
    backgroundColor: C.white,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  statCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  statAccent: {
    height: 4,
    width: '100%',
    backgroundColor: 'transparent',
    marginBottom: 12,
    borderRadius: 999,
  },
  statAccentActive: {
    backgroundColor: C.primary,
  },
  statLabel: {
    fontSize: 13,
    color: C.text2,
    marginBottom: Theme.spacing.sm,
  },
  statLabelActive: {
    color: C.primary,
  },
  statValue: {
    fontSize: 30,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  statValueActive: {
    color: C.primary,
  },
  statMeta: {
    gap: 4,
  },
  statMetaText: {
    ...Theme.typography.label,
    color: C.text2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 18,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: 'rgba(31, 111, 235, 0.05)',
  },
  tabText: {
    ...Theme.typography.bodyMd,
    color: C.text2,
  },
  tabTextActive: {
    color: C.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 18,
    right: 18,
    height: 2.5,
    backgroundColor: C.primary,
    borderRadius: 999,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Theme.spacing.md,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  filterChip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 111, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    ...Theme.typography.caption,
    color: C.text2,
  },
  filterChipTextActive: {
    color: Theme.colors.card,
  },
  searchSection: {
    marginBottom: Theme.spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  searchInput: {
    flex: 1,
    marginHorizontal: Theme.spacing.sm,
    ...Theme.typography.body,
    color: C.text,
  },
  controlsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Theme.spacing.md,
  },
  dateControl: {
    flex: 1,
  },
  typeControl: {
    flex: 1,
  },
  controlLabel: {
    ...Theme.typography.caption,
    color: C.text2,
    marginBottom: 6,
  },
  controlInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  dropdownControl: {
    justifyContent: 'space-between',
  },
  controlValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  classSelector: {
    marginBottom: Theme.spacing.md,
  },
  classSelectorLabel: {
    fontSize: 13,
    color: C.text,
    marginBottom: Theme.spacing.sm,
  },
  classScroll: {
    flexGrow: 0,
  },
  classOption: {
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: Theme.spacing.sm,
  },
  classOptionActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  classOptionText: {
    ...Theme.typography.caption,
    color: C.text,
  },
  classOptionTextActive: {
    color: Theme.colors.card,
  },
  listContainer: {
    gap: 12,
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Theme.spacing.md,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: C.primary,
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  itemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    color: Theme.colors.card,
    fontSize: 16,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemId: {
    ...Theme.typography.label,
    color: C.text2,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 16,
    color: C.text,
    marginBottom: Theme.spacing.xs,
  },
  statusChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusChipText: {
    ...Theme.typography.caption,
    fontWeight: '700',
  },
  classSelectorRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  pickerControl: {
    flex: 1,
  },
  controlLabelSmall: {
    ...Theme.typography.caption,
    color: C.text2,
    marginBottom: 6,
  },
  pickerInput: {
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    justifyContent: 'center',
  },
  pickerValue: {
    ...Theme.typography.body,
    color: C.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    padding: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 12,
    color: C.text,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalItemActive: {
    backgroundColor: C.primarySoft,
  },
  modalItemText: {
    ...Theme.typography.body,
    color: C.text,
  },
  modalClose: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: C.primary,
    ...Theme.typography.bodyMd,
    fontWeight: '600',
  },
  itemSubtitle: {
    ...Theme.typography.caption,
    color: C.text2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusPillText: {
    ...Theme.typography.label,
    fontWeight: '600',
  },
  statusBadgeActive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  statusBadgeActiveText: {
    ...Theme.typography.label,
    color: '#065F46',
  },
  statusBadgeInactive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  statusBadgeInactiveText: {
    ...Theme.typography.label,
    color: '#991B1B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.text,
  },
  emptyText: {
    fontSize: 13,
    color: C.text2,
  },
  footerTabs: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: '#050d1a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
    }),
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  footerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  footerIconWrapActive: {
    backgroundColor: 'rgba(11,76,246,0.14)',
  },
  footerTabText: {
    fontSize: 9,
    color: '#8a96a6',
  },
  footerTabTextActive: {
    color: '#6648dc',
    fontSize: 10,
  },
  footerCenterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 2,
  },
  footerFab: {
    position: 'absolute',
    top: -26,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0b2750',
    borderWidth: 2,
    borderColor: 'rgba(30,58,138,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 14 },
    }),
  },
  footerFabInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6648dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCenterLabel: {
    fontSize: 9,
    color: '#8a96a6',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 11,
  },
});
