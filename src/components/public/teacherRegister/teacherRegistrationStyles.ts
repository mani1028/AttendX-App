import { StyleSheet } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';

export const teacherRegistrationStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  errorTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '700',
    color: Theme.colors.error,
    marginBottom: Theme.spacing.sm,
  },
  errorText: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    flexWrap: 'wrap',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: Theme.colors.success,
  },
  stepActive: {
    backgroundColor: Theme.colors.violet,
  },
  stepIcon: {
    color: Theme.colors.card,
    ...Theme.typography.caption,
    fontWeight: 'bold',
  },
  stepNumber: {
    color: Theme.colors.textSec,
    ...Theme.typography.caption,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: Theme.colors.violet,
    fontWeight: 'bold',
  },
  stepLabelCompleted: {
    color: Theme.colors.success,
  },
  formCard: {
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  formGroup: {
    marginBottom: Theme.spacing.md,
  },
  formLabel: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 6,
  },
  requiredStar: {
    color: Theme.colors.error,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  inputError: {
    borderColor: Theme.colors.error,
  },
  disabledInput: {
    backgroundColor: Theme.colors.background,
    color: Theme.colors.textMuted,
  },
  fieldError: {
    ...Theme.typography.label,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
  helperText: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
  rowWithButton: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  verifyBtn: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.violet,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: Theme.colors.card,
    fontWeight: '600',
    fontSize: Theme.typography.caption.fontSize,
  },
  verifyOtpBtn: {
    backgroundColor: Theme.colors.success,
  },
  otpRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  verifiedBadge: {
    marginTop: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    ...Theme.typography.caption,
    color: Theme.colors.success,
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: Theme.colors.violet,
    borderColor: Theme.colors.violet,
  },
  genderText: {
    color: Theme.colors.textSec,
    fontWeight: '600',
  },
  genderTextActive: {
    color: Theme.colors.card,
  },
  dateBtn: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
  },
  dateText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
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
  passwordStrength: {
    marginTop: Theme.spacing.sm,
    padding: 10,
    backgroundColor: '#f0f2f7',
    borderRadius: Theme.radius.sm,
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Theme.spacing.xs,
  },
  passwordRuleIcon: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  passwordRuleIconValid: {
    color: Theme.colors.success,
  },
  passwordRuleText: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
  },
  passwordRuleTextValid: {
    color: Theme.colors.success,
    fontWeight: '600',
  },
  photoZone: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: Theme.radius.md,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.sm,
  },
  photoText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  photoSubtext: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
  previewNote: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.md,
  },
  previewCard: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    marginBottom: Theme.spacing.md,
  },
  previewHeader: {
    backgroundColor: Theme.colors.violet,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  previewPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  previewPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPhotoText: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  previewName: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  previewDesignation: {
    ...Theme.typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  previewEmail: {
    ...Theme.typography.label,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  previewStatus: {
    marginTop: 6,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.radius.md,
    alignSelf: 'flex-start',
  },
  previewStatusActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  previewStatusInactive: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  previewStatusText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
    color: Theme.colors.card,
  },
  previewSectionTitle: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Theme.colors.violet,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewField: {
    width: '50%',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  previewFieldLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.xs,
  },
  previewFieldValue: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '500',
    color: Theme.colors.text,
  },
  inlineNote: {
    backgroundColor: Theme.colors.blueLight,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginTop: Theme.spacing.sm,
  },
  inlineNoteText: {
    ...Theme.typography.caption,
    color: '#5b3cc4',
  },
  inlineNoteBold: {
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  navBtn: {
    flex: 1,
  },
  footer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerText: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    gap: 10,
  },
  toastSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.success,
  },
  toastError: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.error,
  },
  toastIcon: {
    fontSize: Theme.typography.h3.fontSize,
  },
  toastMessage: {
    flex: 1,
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.text,
  },
  toastClose: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.textMuted,
    padding: Theme.spacing.xs,
  },
});

export type TeacherRegistrationStyles = typeof teacherRegistrationStyles;
