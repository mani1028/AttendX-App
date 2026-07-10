import React from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { Search, X, RefreshCw, Download } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { teacherManagementStyles as styles } from './styles';
import type { SummaryStats } from './types';

export interface TeacherDirectoryFiltersProps {
  summaryStats: SummaryStats;
  visibleStart: number;
  visibleEnd: number;
  filteredCount: number;
  query: string;
  statusFilter: string;
  deptFilter: string;
  departments: string[];
  isCompactScreen: boolean;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onDeptFilterChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function TeacherDirectoryFilters({
  summaryStats,
  visibleStart,
  visibleEnd,
  filteredCount,
  query,
  statusFilter,
  deptFilter,
  departments,
  isCompactScreen,
  onQueryChange,
  onStatusFilterChange,
  onDeptFilterChange,
  onRefresh,
  onExport,
}: TeacherDirectoryFiltersProps) {
  return (
    <View style={styles.filterBar}>
      <View style={styles.filterHeader}>
        <View>
          <AppText style={styles.filterTitle} weight="bold">Directory Filters</AppText>
          <AppText style={styles.filterSubtitle}>Showing {summaryStats.visible} matching profiles</AppText>
        </View>
        <View style={styles.filterBadge}>
          <AppText style={styles.filterBadgeText} weight="semibold">
            {visibleStart === 0 ? '0' : `${visibleStart}-${visibleEnd}`}/{filteredCount}
          </AppText>
        </View>
      </View>
      <View style={styles.searchInput}>
        <Search size={14} color={C.muted} />
        <TextInput
          style={styles.searchField}
          placeholder="Search name, ID, email, mobile..."
          value={query}
          onChangeText={onQueryChange}
          placeholderTextColor={C.muted}
        />
        {query ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => onQueryChange('')}>
            <X size={14} color={C.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={[styles.filterGroup, isCompactScreen && styles.filterGroupStack]}>
        <View style={styles.pickerSmall}>
          <Picker
            selectedValue={statusFilter}
            onValueChange={onStatusFilterChange}
            style={styles.picker}
            dropdownIconColor={C.muted}
          >
            <Picker.Item label="All Status" value="all" color={C.text} />
            <Picker.Item label="Active" value="active" color={C.text} />
            <Picker.Item label="Inactive" value="inactive" color={C.text} />
          </Picker>
        </View>
        <View style={styles.pickerSmall}>
          <Picker
            selectedValue={deptFilter}
            onValueChange={onDeptFilterChange}
            style={styles.picker}
            dropdownIconColor={C.muted}
          >
            {departments.map((d) => (
              <Picker.Item key={d} label={d === 'all' ? 'All Departments' : d} value={d} color={C.text} />
            ))}
          </Picker>
        </View>
        <View style={isCompactScreen ? styles.filterRowMobile : styles.filterRowDesktop}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.filterBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]}
            onPress={onRefresh}
          >
            <RefreshCw size={14} color={C.text} />
            <AppText style={styles.filterBtnText} weight="semibold">Refresh</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.exportBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]}
            onPress={onExport}
          >
            <Download size={14} color={Theme.colors.card} />
            <AppText style={styles.exportBtnText} weight="semibold">Export</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
