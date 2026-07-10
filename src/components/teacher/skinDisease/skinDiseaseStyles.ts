import { StyleSheet } from 'react-native';
import {Theme, colors} from '../../../theme/tokens';

export const skinDiseaseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  card: {
        padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  imageSelector: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    backgroundColor: Theme.colors.background,
    minHeight: 200,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },
  placeholderText: {
    fontSize: Theme.typography.h4.fontSize,
    color: Theme.colors.textSec,
    fontWeight: '500',
  },
  placeholderSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: Theme.radius.md,
    resizeMode: 'cover',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  changeBtn: {
    flex: 1,
  },
  analyzeBtn: {
    flex: 2,
    backgroundColor: Theme.colors.primary,
  },
  loadingCard: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    marginBottom: Theme.spacing.xl,
  },
  loadingText: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginTop: Theme.spacing.md,
  },
  loadingSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
  },
  resultCard: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.card,
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: Theme.radius.xxl,
    marginBottom: Theme.spacing.xl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  resultIcon: {
    fontSize: Theme.typography.h1.fontSize,
  },
  resultTitle: {
    ...Theme.typography.h3,
    color: '#10B981',
  },
  resultSection: {
    marginBottom: Theme.spacing.md,
  },
  resultLabel: {
    ...Theme.typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  diseaseName: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  confidenceContainer: {
    gap: Theme.spacing.sm,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: Theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    ...Theme.typography.body,
    fontWeight: '600',
  },
  descriptionText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  precautionBullet: {
    ...Theme.typography.body,
    color: '#10B981',
    marginRight: Theme.spacing.sm,
  },
  precautionText: {
    flex: 1,
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    gap: 10,
  },
  disclaimerIcon: {
    fontSize: Theme.typography.h4.fontSize,
  },
  disclaimerText: {
    flex: 1,
    ...Theme.typography.caption,
    color: '#92400E',
    lineHeight: 16,
  },
  resetBtn: {
    marginTop: Theme.spacing.sm,
  },
  infoGrid: {
    gap: Theme.spacing.md,
  },
  infoCard: {
    padding: Theme.spacing.md,
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoIcon: {
    fontSize: Theme.typography.h1.fontSize,
    marginBottom: Theme.spacing.sm,
  },
  infoTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  infoText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
});
