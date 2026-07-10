import React from 'react';
import { View, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { LayoutDashboard } from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppText from '../../common/AppText';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { C } from '../../../theme/tokens';
import { feeManagementStyles as styles } from './feeManagementStyles';
import { filterFees } from './helpers';
import FeeListRow from './FeeListRow';
import type { Fee, FeeStatusFilter } from './types';

export interface FeeListSectionProps {
  fees: Fee[];
  loading: boolean;
  feeSearchQuery: string;
  feeStatusFilter: FeeStatusFilter;
  onSearchChange: (text: string) => void;
  onStatusFilterChange: (status: FeeStatusFilter) => void;
  onFeePress: (fee: Fee) => void;
  onPayPress: (fee: Fee) => void;
}

const STATUS_OPTIONS: FeeStatusFilter[] = ['all', 'pending', 'partial', 'paid'];

export default function FeeListSection({
  fees,
  loading,
  feeSearchQuery,
  feeStatusFilter,
  onSearchChange,
  onStatusFilterChange,
  onFeePress,
  onPayPress,
}: FeeListSectionProps) {
  const filteredFees = filterFees(fees, feeSearchQuery, feeStatusFilter);

  return (
    <View style={styles.listSection}>
      <View style={styles.listHeader}>
        <View style={styles.sectionHeaderRow}>
          <LayoutDashboard size={20} color={C.text} />
          <AppText style={styles.listTitle} weight="bold">All Fees</AppText>
        </View>
        <View style={styles.countBadge}>
          <AppText style={styles.feeCount} weight="bold">{filteredFees.length} Records</AppText>
        </View>
      </View>

      <View style={styles.filterSection}>
        <TextInput
          style={styles.filterSearchInput}
          placeholder="Search by student name or roll no..."
          placeholderTextColor={C.textMuted}
          value={feeSearchQuery}
          onChangeText={onSearchChange}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.statusFilterScroll, innerPageLayoutStyles.scrollViewFront]}>
          <View style={styles.statusFilterContainer}>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={status}
                style={[styles.statusFilterOption, feeStatusFilter === status && styles.statusFilterOptionSelected]}
                onPress={() => onStatusFilterChange(status)}
              >
                <AppText
                  style={[styles.statusFilterOptionText, feeStatusFilter === status && styles.statusFilterOptionTextSelected]}
                  weight="semibold"
                >
                  {status.toUpperCase()}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading && fees.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ScreenSkeleton variant="list" />
          <AppText style={styles.loadingText}>Loading fees...</AppText>
        </View>
      ) : filteredFees.length > 0 ? (
        <View style={styles.feesList}>
          {filteredFees.map((fee, index) => (
            <FeeListRow
              key={fee.id || `fee-${index}`}
              fee={fee}
              onPress={() => onFeePress(fee)}
              onPayPress={() => onPayPress(fee)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>
            {fees.length === 0 ? 'No fees found.' : 'No matching records found.'}
          </AppText>
          <AppText style={styles.emptySubtext}>
            {fees.length === 0 ? 'Assign fees to students to get started' : 'Try adjusting your search or status filter'}
          </AppText>
        </View>
      )}
    </View>
  );
}
