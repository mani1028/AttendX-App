import React from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { Search, X, RefreshCw, Download } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { studentManagementStyles as styles } from './styles';
import type { SelectedClass, SummaryStats } from './types';

export interface StudentDirectoryFiltersProps {
  selected: SelectedClass | null;
  summaryStats: SummaryStats;
  visibleStart: number;
  visibleEnd: number;
  filteredCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  isCompactScreen: boolean;
}

export default function StudentDirectoryFilters({
  selected,
  summaryStats,
  visibleStart,
  visibleEnd,
  filteredCount,
  query,
  onQueryChange,
  onRefresh,
  onExport,
  isCompactScreen,
}: StudentDirectoryFiltersProps) {
  return (
    <View style={styles.filterBar}>
      <View style={styles.filterHeader}>
        <View>
          <AppText style={styles.filterTitle} weight="bold">Directory Filters</AppText>
          <AppText style={styles.filterSubtitle}>
            {selected ? `Class ${selected.label} • Showing ${summaryStats.visible} students` : 'Select a class to view directory'}
          </AppText>
        </View>
        {selected && (
          <View style={styles.filterBadge}>
            <AppText style={styles.filterBadgeText} weight="semibold">
              {visibleStart === 0 ? '0' : `${visibleStart}-${visibleEnd}`}/{filteredCount}
            </AppText>
          </View>
        )}
      </View>

      {selected && (
        <>
          <View style={styles.searchInput}>
            <Search size={14} color={C.t3} />
            <TextInput
              style={styles.searchField}
              placeholder="Search by name, roll no., or admission no."
              value={query}
              onChangeText={onQueryChange}
              placeholderTextColor={C.t4}
            />
            {query ? (
              <TouchableOpacity accessibilityRole="button" onPress={() => onQueryChange('')}>
                <X size={14} color={C.t3} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.filterGroup}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.filterBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]}
              onPress={onRefresh}
            >
              <RefreshCw size={14} color={C.t2} />
              <AppText style={styles.filterBtnText} weight="semibold">Refresh</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.exportBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]}
              onPress={onExport}
            >
              <Download size={14} color={Theme.colors.card} />
              <AppText style={styles.exportBtnText} weight="semibold">Export XLS</AppText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
