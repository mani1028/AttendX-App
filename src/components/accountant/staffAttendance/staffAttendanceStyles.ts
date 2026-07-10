import { StyleSheet } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';
import { HEADER_CONSTANTS } from '../../../constants/headerConstants';

export const staffAttendanceStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  contentOverlap: {
    flex: 1,
      },

  header: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HEADER_CONSTANTS.PADDING_HORIZONTAL,
    paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM,
    gap: 10,
  },
  backBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE, height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: Theme.colors.card, fontSize: Theme.typography.h4.fontSize, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', ...Theme.typography.caption, marginTop: 1 },
  refreshBtn: {
    width: HEADER_CONSTANTS.ICON_BUTTON_SIZE, height: HEADER_CONSTANTS.ICON_BUTTON_SIZE,
    borderRadius: HEADER_CONSTANTS.ICON_BUTTON_BORDER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Theme.spacing.md, paddingBottom: 40 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md, marginBottom: Theme.spacing.md },
  dateLabel: { ...Theme.typography.body, fontWeight: '600', color: Theme.colors.text },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.card, borderRadius: Theme.radius.md, borderWidth: 1,
    borderColor: Theme.colors.border, paddingVertical: Theme.spacing.sm, paddingHorizontal: 14,
  },
  dateText: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '500' },
  dateDoneBtn: {
    marginLeft: 'auto',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  dateDoneText: { color: Theme.colors.primary, fontWeight: '700', fontSize: Theme.typography.body.fontSize },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.errorBg, borderRadius: Theme.radius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md,
  },
  errorBoxText: { flex: 1, color: Theme.colors.error, fontSize: Theme.typography.caption.fontSize },

  card: {
    backgroundColor: Theme.colors.card, borderRadius: Theme.radius.lg,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  cardHeaderText: { gap: 2 },
  cardTitle: { ...Theme.typography.bodyMd, fontWeight: '800', color: Theme.colors.text },
  cardSubtitle: { ...Theme.typography.caption, color: Theme.colors.textMuted },

  saveBar: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.backgroundAlt,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    minHeight: 48,
    paddingHorizontal: Theme.spacing.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: Theme.colors.card, fontSize: Theme.typography.bodyMd.fontSize, fontWeight: '700' },

  centered: { alignItems: 'center', paddingVertical: Theme.spacing.xl },
  loadingText: { color: Theme.colors.textMuted, fontSize: Theme.typography.caption.fontSize, marginTop: Theme.spacing.sm },
  emptyText: { color: Theme.colors.textMuted, ...Theme.typography.body },

  staffList: { padding: Theme.spacing.md, gap: 0 },

  staffRow: {
    paddingVertical: 14,
    paddingHorizontal: Theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: `${Theme.colors.border}88`,
    gap: Theme.spacing.md,
  },
  staffInfo: { width: '100%' },
  staffName: { ...Theme.typography.body, fontWeight: '700', color: Theme.colors.text },
  staffMeta: { ...Theme.typography.caption, color: Theme.colors.textMuted, marginTop: 2 },
  staffControls: { width: '100%', gap: Theme.spacing.sm },

  sessionBlock: { gap: 6 },
  sessionLabel: { fontSize: Theme.typography.label.fontSize, fontWeight: '700', color: Theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  statusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  statusDropdownText: { ...Theme.typography.body, fontWeight: '700' },

  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Theme.spacing.md,
    paddingBottom: 28,
    gap: 10,
  },
  pickerTitle: {
    ...Theme.typography.bodyMd,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
  },
  pickerOptionSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerOptionText: { ...Theme.typography.body, fontWeight: '700' },

  calBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs, marginTop: Theme.spacing.sm,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: Theme.radius.sm,
    borderWidth: 1, borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}10`, alignSelf: 'flex-start',
  },
  calBtnText: { color: Theme.colors.primary, ...Theme.typography.caption, fontWeight: '600' },
});
