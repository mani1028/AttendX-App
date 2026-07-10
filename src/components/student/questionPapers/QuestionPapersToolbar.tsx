import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { questionPapersStyles as styles } from './questionPapersStyles';
import type { SubjectOption } from './types';

interface QuestionPapersToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  onOpenFilterModal: () => void;
  examTypes: string[];
  filterExamType: string;
  onSetExamTypeAll: () => void;
  onToggleExamType: (type: string) => void;
  filterSubject: string;
  subjectOptions: SubjectOption[];
  onClearSearch: () => void;
  onClearSubjectFilter: () => void;
  onClearExamTypeFilter: () => void;
  onResetFilters: () => void;
  showStats: boolean;
  subjectCount: number;
  paperCount: number;
}

export default function QuestionPapersToolbar({
  searchTerm,
  onSearchChange,
  hasActiveFilters,
  onOpenFilterModal,
  examTypes,
  filterExamType,
  onSetExamTypeAll,
  onToggleExamType,
  filterSubject,
  subjectOptions,
  onClearSearch,
  onClearSubjectFilter,
  onClearExamTypeFilter,
  onResetFilters,
  showStats,
  subjectCount,
  paperCount,
}: QuestionPapersToolbarProps) {
  return (
    <>
      <View style={styles.toolbarCard}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color={C.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title or teacher..."
              placeholderTextColor={C.colors.textMuted}
              value={searchTerm}
              onChangeText={onSearchChange}
              returnKeyType="search"
            />
            {searchTerm !== '' ? (
              <TouchableOpacity onPress={onClearSearch}>
                <Icon name="x" size={16} color={C.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={onOpenFilterModal}
          >
            <Icon
              name="sliders"
              size={18}
              color={hasActiveFilters ? C.colors.card : C.colors.textSec}
            />
            <Text
              style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}
            >
              Filter
            </Text>
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {examTypes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examTypeRow}>
            <TouchableOpacity
              style={[styles.examTypeChip, filterExamType === 'all' && styles.examTypeChipActive]}
              onPress={onSetExamTypeAll}
            >
              <Text
                style={[
                  styles.examTypeChipText,
                  filterExamType === 'all' && styles.examTypeChipTextActive,
                ]}
              >
                All Types
              </Text>
            </TouchableOpacity>
            {examTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.examTypeChip, filterExamType === type && styles.examTypeChipActive]}
                onPress={() => onToggleExamType(type)}
              >
                <Text
                  style={[
                    styles.examTypeChipText,
                    filterExamType === type && styles.examTypeChipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {hasActiveFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
          <View style={styles.activeFiltersContainer}>
            {searchTerm !== '' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Search: {searchTerm}</Text>
                <TouchableOpacity onPress={onClearSearch}>
                  <Icon name="x" size={12} color={C.colors.textSec} />
                </TouchableOpacity>
              </View>
            )}
            {filterSubject !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Subject: {subjectOptions.find((s) => s.id === filterSubject)?.name}
                </Text>
                <TouchableOpacity onPress={onClearSubjectFilter}>
                  <Icon name="x" size={12} color={C.colors.textSec} />
                </TouchableOpacity>
              </View>
            )}
            {filterExamType !== 'all' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Type: {filterExamType}</Text>
                <TouchableOpacity onPress={onClearExamTypeFilter}>
                  <Icon name="x" size={12} color={C.colors.textSec} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={onResetFilters}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {showStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="folder" size={20} color={C.colors.blue} />
            <Text style={styles.statNumber}>{subjectCount}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Icon name="file-text" size={20} color={C.colors.success} />
            <Text style={styles.statNumber}>{paperCount}</Text>
            <Text style={styles.statLabel}>Papers</Text>
          </View>
        </View>
      )}
    </>
  );
}
