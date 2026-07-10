import { StyleSheet } from 'react-native';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';
import {Theme, colors} from '../../theme/tokens';

export const adminScreenStyles = StyleSheet.create({
  body: {
    paddingTop: Theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: Theme.typography.h4.fontSize,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeletonCard: {
    width: '48%',
    flexGrow: 1,
    height: 96,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.border,
  },
});
