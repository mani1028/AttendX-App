import { StyleSheet , Platform} from 'react-native';
import {Theme, colors} from '../../../theme/tokens';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';

export const leaveRequestStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  containerEmbedded: {
    backgroundColor: Theme.colors.background,
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    position: 'relative',
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: Theme.colors.card,
    fontSize: Theme.typography.h3.fontSize,
  },
  heroContent: {
    marginBottom: 0,
  },
  heroGreeting: {
    color: Theme.colors.card,
    fontSize: Theme.typography.h2.fontSize,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  scrollContentEmbedded: {
    paddingBottom: 100,
  },
  mainCard: {
    marginTop: Theme.spacing.sm,
    marginHorizontal: 0,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    marginBottom: Theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  mainCardEmbedded: {
    marginTop: Theme.spacing.xs,
    marginHorizontal: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Theme.spacing.xl,
  },
  cardTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.xs,
    marginBottom: Theme.spacing.xl,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
  },
  typeBtnActive: {
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
  typeBtnText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  typeBtnTextActive: {
    color: Theme.colors.primary,
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
  chipDisabled: {
    opacity: 0.45,
  },
  balanceHint: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginBottom: 6,
  },
  chipText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  chipTextDisabled: {
    color: Theme.colors.textMuted,
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap',
  },
  inputGroup: {
    flex: 1,
    marginBottom: Theme.spacing.md,
    minWidth: Platform.OS === 'ios' ? 150 : 140,
  },
  inputLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    height: 52,
    minHeight: 52,
  },
  dateValue: {
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  datePlaceholder: {
    ...Theme.typography.body,
    color: Theme.colors.textMuted,
  },
  reasonInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    height: 80,
    textAlignVertical: 'top',
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  submitButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    height: 52,
    marginTop: 10,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Theme.spacing.lg,
  },
  pickerDone: {
    alignItems: 'flex-end',
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
  },
  pickerDoneText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.h4.fontSize,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
  },
  embeddedGutter: {
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
  },
  sectionTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.text,
  },
  refreshText: {
    ...Theme.typography.body,
    color: Theme.colors.blue,
  },
  historyList: {
    gap: Theme.spacing.md,
  },
  historyCard: {
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.background,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Theme.typography.body,
    color: Theme.colors.cardAlt,
  },
  dateArrow: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  reasonContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  reasonText: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.background,
    paddingTop: 10,
  },
  appliedDate: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.xl,
  },
  badgeText: {
    ...Theme.typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyState: {
    padding: 60,
    paddingHorizontal: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  emptyStateTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: Theme.colors.cardAlt,
    marginBottom: Theme.spacing.sm,
  },
  emptyStateSubtext: {
    color: Theme.colors.textMuted,
    ...Theme.typography.body,
    textAlign: 'center',
  },
});
