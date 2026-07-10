import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { marksEntryStyles as styles } from './marksEntryStyles';

interface MarksEmptyStateProps {
  onSelectFilters: () => void;
}

export default function MarksEmptyState({ onSelectFilters }: MarksEmptyStateProps) {
  return (
    <AppCard style={styles.emptyCard} elevated={false}>
      <Search size={80} color={Theme.colors.border} strokeWidth={1.5} />
      <AppText weight="bold" style={styles.emptyTitle}>Ready to grade?</AppText>
      <AppText weight="regular" style={styles.emptyText}>
        Configure filters and exam rules above to load the student list.
      </AppText>
      <TouchableOpacity accessibilityRole="button" style={styles.emptyButton} onPress={onSelectFilters}>
        <AppText weight="bold" style={styles.emptyButtonText}>Select Filters</AppText>
      </TouchableOpacity>
    </AppCard>
  );
}
