import { StyleSheet } from 'react-native';
import { HEADER_CONSTANTS } from '../../constants/headerConstants';

export const adminScreenStyles = StyleSheet.create({
  body: {
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
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
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
});
