import { StyleSheet , Platform} from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';

export const announcementsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: HEADER_CONSTANTS.BACKGROUND_COLOR,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    borderBottomLeftRadius: HEADER_CONSTANTS.BORDER_RADIUS,
    borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS,
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
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: `rgba(255,255,255,${HEADER_CONSTANTS.BUTTON_BACKGROUND_OPACITY})`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: HEADER_CONSTANTS.TITLE_FONT_SIZE,
    fontWeight: HEADER_CONSTANTS.TITLE_FONT_WEIGHT,
    textAlign: 'center',
  },
  headerContent: {
    marginTop: Theme.spacing.lg,
  },
  headerGreeting: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    fontSize: Theme.typography.h1.fontSize,
    letterSpacing: -0.5,
  },
  headerSubtext: {
    color: HEADER_CONSTANTS.TEXT_COLOR,
    opacity: HEADER_CONSTANTS.SUBTITLE_OPACITY,
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  contentOverlap: {
    flex: 1,
    backgroundColor: C.bg,
  },
  pageBody: {
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Theme.spacing.md,
    paddingBottom: 40,
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
  },
  contentPadding: {
    paddingTop: 14,
    paddingBottom: Theme.spacing.lg,
  },

  card: {
    backgroundColor: C.card,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },

  sectionHeader: {
    marginBottom: Theme.spacing.xl,
  },

  sectionTitle: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.text,
  },

  label: {
    marginBottom: Theme.spacing.sm,
    marginTop: 10,
    color: C.text,
    fontSize: Theme.typography.caption.fontSize,
    opacity: 0.8,
  },

  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Theme.radius.md,
    padding: 14,
    backgroundColor: C.bg,
    color: C.text,
    ...Theme.typography.bodyMd,
    marginBottom: Theme.spacing.sm,
  },

  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  typeRow: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.xs,
  },

  typeButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.xl,
    backgroundColor: C.bg,
    marginRight: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  activeType: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  typeText: {
    color: C.textMuted,
    fontSize: Theme.typography.caption.fontSize,
  },

  activeTypeText: {
    color: Theme.colors.card,
  },

  submitButton: {
    backgroundColor: C.primary,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  submitText: {
    color: Theme.colors.card,
    fontSize: Theme.typography.h4.fontSize,
  },

  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },

  announcementCard: {
    backgroundColor: C.bg,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  postedDate: {
    ...Theme.typography.label,
    color: C.textMuted,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
    fontSize: Theme.typography.label.fontSize,
  },

  title: {
    fontSize: Theme.typography.h4.fontSize,
    color: C.text,
    marginBottom: 6,
  },

  description: {
    marginBottom: Theme.spacing.md,
    color: C.textMuted,
    ...Theme.typography.body,
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Theme.spacing.xs,
  },

  meta: {
    ...Theme.typography.caption,
    color: C.textMuted,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  resendButton: {
    flex: 1,
    backgroundColor: C.primary,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  deleteButton: {
    flex: 1,
    backgroundColor: C.errorSoft,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  buttonText: {
    color: Theme.colors.card,
    fontSize: Theme.typography.caption.fontSize,
  },

  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },

  emptyText: {
    color: C.textMuted,
    textAlign: 'center',
    ...Theme.typography.bodyMd,
  },
});
