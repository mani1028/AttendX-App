import React from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Search, X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { attendanceLabel } from './helpers';
import { attendanceStyles as styles } from './styles';

const STATUS_OPTIONS = ['', 'PRESENT', 'HALF_DAY', 'ABSENT'] as const;

export interface AttendanceFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  placeholder?: string;
  variant?: 'container' | 'bar';
  searchIconSize?: number;
  clearIconSize?: number;
}

export default function AttendanceFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  placeholder = 'Search by name or employee ID...',
  variant = 'container',
  searchIconSize = 16,
  clearIconSize = 16,
}: AttendanceFiltersBarProps) {
  const wrapperStyle = variant === 'bar' ? styles.searchFilterBar : styles.searchFilterContainer;

  return (
    <View style={wrapperStyle}>
      <View style={styles.searchBoxWrapper}>
        <Search size={searchIconSize} color={C.muted} style={{ marginRight: Theme.spacing.sm }} />
        <TextInput
          style={styles.searchInputField}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={onSearchChange}
        />
        {search.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => onSearchChange('')}
            style={styles.searchClearBtn}
          >
            <X size={clearIconSize} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
        {STATUS_OPTIONS.map(status => (
          <TouchableOpacity
            accessibilityRole="button"
            key={status || 'all'}
            style={[styles.filterChipItem, statusFilter === status && styles.filterChipItemActive]}
            onPress={() => onStatusFilterChange(status)}
            activeOpacity={0.8}
          >
            <AppText
              style={[styles.filterChipItemText, statusFilter === status && styles.filterChipItemTextActive]}
              weight="semibold"
            >
              {status === '' ? 'All' : status === 'HALF_DAY' ? 'Half day' : attendanceLabel(status)}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
