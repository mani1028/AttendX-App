import { StyleSheet } from 'react-native';
import {Theme, C, colors} from '../../../theme/tokens';

export const dataExportStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  panel: {
    backgroundColor: C.card,
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 40,
  },
  header: {
    padding: Theme.spacing.xl,
    backgroundColor: C.primarySoft,
  },
  title: {
    fontSize: Theme.typography.h3.fontSize,
    color: C.primary,
  },
  subtitle: {
    ...Theme.typography.body,
    color: C.textMuted,
    marginTop: Theme.spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: Theme.spacing.md,
  },
  tab: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomColor: C.primary,
  },
  tabText: {
    ...Theme.typography.body,
    color: C.textMuted,
  },
  activeTabText: {
    color: C.primary,
  },
  body: {
    padding: Theme.spacing.xl,
  },
  grid: {
    gap: Theme.spacing.md,
  },
  marksGrid: {
    gap: Theme.spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: Theme.typography.caption.fontSize,
    color: C.text,
  },
  selectWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  periodOption: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  periodOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  periodOptionText: {
    ...Theme.typography.body,
    color: C.text,
  },
  periodOptionTextSelected: {
    color: Theme.colors.card,
  },
  classOption: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  classOptionSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  classOptionText: {
    ...Theme.typography.body,
    color: C.text,
  },
  classOptionTextSelected: {
    color: Theme.colors.card,
  },
  dateInput: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateInputText: {
    ...Theme.typography.body,
    color: C.text,
  },
  actions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  exportButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Theme.radius.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.card,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Theme.radius.md,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Theme.typography.body,
    color: C.text,
  },
  hint: {
    ...Theme.typography.caption,
    color: C.textMuted,
    marginTop: Theme.spacing.md,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  messageContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: C.success,
  },
  messageText: {
    color: C.success,
    fontSize: Theme.typography.caption.fontSize,
  },
  errorContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.sm,
    backgroundColor: C.errorSoft,
    borderWidth: 1,
    borderColor: C.error,
  },
  errorText: {
    color: C.error,
    fontSize: Theme.typography.caption.fontSize,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.card,
  },
});
