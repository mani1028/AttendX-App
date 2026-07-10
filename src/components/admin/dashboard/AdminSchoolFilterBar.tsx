import React from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, X } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { colors, Theme } from '../../../theme/tokens';
import { dashboardStyles as styles } from './dashboardStyles';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Schools' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'trial_active', label: 'Trial' },
  { value: 'active_paid', label: 'Paid' },
  { value: 'payment_due', label: 'Due' },
];

interface AdminSchoolFilterBarProps {
  statusFilter: string;
  searchTerm: string;
  onStatusFilterChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
}

export default function AdminSchoolFilterBar({
  statusFilter,
  searchTerm,
  onStatusFilterChange,
  onSearchTermChange,
}: AdminSchoolFilterBarProps) {
  return (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            accessibilityRole="button"
            key={opt.value}
            style={[styles.filterChip, statusFilter === opt.value && styles.filterChipActive]}
            onPress={() => onStatusFilterChange(opt.value)}
          >
            <AppText style={[styles.filterChipText, statusFilter === opt.value && styles.filterChipTextActive]}>
              {opt.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchContainer}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: Theme.spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search schools..."
          placeholderTextColor={colors.textMuted}
          value={searchTerm}
          onChangeText={onSearchTermChange}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity accessibilityRole="button" onPress={() => onSearchTermChange('')} style={styles.clearBtn}>
            <X size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
