import { StyleSheet , Platform} from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';
import { SCROLL_PAGE_GUTTER } from '../../layout/innerPageLayoutStyles';

const CARD_GAP = 12;

export const accountantDashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCROLL_PAGE_GUTTER,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
    marginTop: -30,
    marginBottom: Theme.spacing.md,
    zIndex: 1,
    position: 'relative',
    ...Platform.select({ android: { elevation: 4 } }),
  },
  statCard: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    minHeight: 136,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 3 },
    }),
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: Theme.typography.h2.fontSize,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.6,
  },
  statLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    lineHeight: 18,
  },
  rateRow: {
    marginTop: 10,
  },
  rateTrack: {
    height: 6,
    borderRadius: Theme.radius.full,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.violet,
  },
  rateText: {
    marginTop: 6,
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '600',
    color: Theme.colors.textSec,
    textTransform: 'none',
  },
  quickAccessPanel: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.xl,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 2 },
    }),
  },
  panelHead: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  sectionSub: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  quickGrid: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: 14,
  },
  quickCard: {
    alignItems: 'center',
    width: '100%',
    minHeight: 78,
    paddingHorizontal: 2,
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 13,
    color: Theme.colors.textSec,
    textAlign: 'center',
    textTransform: 'none',
  },
  summaryPanel: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.xl,
    paddingHorizontal: 18,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: Theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Theme.colors.text,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
      },
      android: { elevation: 3 },
    }),
  },
  summaryPanelHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
    paddingTop: 18,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: Theme.spacing.xs,
  },
  summaryPanelTitleWrap: {
    flex: 1,
  },
  summaryPanelTitle: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
  },
  summaryPanelSub: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.full,
    backgroundColor: 'rgba(102, 72, 220, 0.10)',
  },
  syncChipText: {
    ...Theme.typography.label,
    color: Theme.colors.violet,
  },
  snapshotItem: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  snapshotCopy: {
    flex: 1,
  },
  snapshotLabel: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginBottom: 3,
  },
  snapshotHint: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
  },
  snapshotValue: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.md,
  },
  positiveValue: {
    color: '#16a34a',
  },
  negativeValue: {
    color: Theme.colors.error,
  },
});
