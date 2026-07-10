import { StyleSheet } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';

export const publicPrincipalRegistrationStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
  errorDescription: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.xl,
    textAlign: 'center',
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
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.xl,
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
    ...Theme.typography.body,
    fontWeight: 'bold',
  },
  stepNumber: {
    fontSize: Theme.typography.h4.fontSize,
  },
  stepLabel: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.textSec,
    marginTop: 6,
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
    overflow: 'hidden',
  },
  cardHeader: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.violet,
  },
  cardTitle: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.sm,
  },
  cardBadgeText: {
    fontSize: Theme.typography.label.fontSize,
    color: Theme.colors.card,
    fontWeight: '600',
  },
  publicBanner: {
    backgroundColor: '#ecfdf5',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  publicBannerText: {
    ...Theme.typography.caption,
    color: '#166534',
    fontWeight: '600',
  },
  formBody: {
    padding: Theme.spacing.xl,
  },
  hintBox: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: '#eff6ff',
    borderRadius: Theme.radius.md,
    alignItems: 'center',
  },
  hintText: {
    ...Theme.typography.caption,
    color: '#0369a1',
    textAlign: 'center',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.xl,
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
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    fontWeight: '600',
  },
});
