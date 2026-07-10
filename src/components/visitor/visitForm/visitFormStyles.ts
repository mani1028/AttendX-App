import { StyleSheet } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';

export const visitFormStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  scrollContent: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: '#fef2f2',
  },
  errorCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },
  errorTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '700',
    color: Theme.colors.error,
    marginBottom: Theme.spacing.sm,
  },
  errorMessage: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: '#f0fdf4',
  },
  successCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },
  successTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '700',
    color: Theme.colors.success,
    marginBottom: Theme.spacing.sm,
  },
  successMessage: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  visitorNo: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  visitorNoValue: {
    fontWeight: '700',
    color: Theme.colors.violet,
  },
  redirectText: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  headerCard: {
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  schoolName: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  formTitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  branchInfo: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
  },
  branchValue: {
    fontWeight: '600',
    color: Theme.colors.violet,
  },
  formCard: {
    padding: Theme.spacing.xl,
  },
  errorBanner: {
    backgroundColor: Theme.colors.redLight,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.md,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: Theme.typography.caption.fontSize,
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  field: {
    flex: 1,
  },
  label: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 6,
  },
  required: {
    color: Theme.colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  pickerOption: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  pickerOptionActive: {
    backgroundColor: Theme.colors.violet,
    borderColor: Theme.colors.violet,
  },
  pickerText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  pickerTextActive: {
    color: Theme.colors.card,
  },
  section: {
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  sectionTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  chip: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.violet,
    borderColor: Theme.colors.violet,
  },
  chipText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  submitBtn: {
    flex: 2,
  },
  cancelBtn: {
    flex: 1,
  },
});
