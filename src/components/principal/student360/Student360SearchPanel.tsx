import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search, ChevronRight, X } from 'lucide-react-native';
import { Theme } from '../../../theme/tokens';
import type { PrincipalStudentSearchResult } from '../../../services/principalService';
import AvatarBubble from '../../common/AvatarBubble';
import AppText from '../../common/AppText';
import { pickText } from './helpers';
import { student360Styles as styles } from './student360Styles';

export interface Student360SearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  searching: boolean;
  searchError: string;
  searchResults: PrincipalStudentSearchResult[];
  onSelectStudent: (student: PrincipalStudentSearchResult) => void;
}

export default function Student360SearchPanel({
  query,
  onQueryChange,
  searching,
  searchError,
  searchResults,
  onSelectStudent,
}: Student360SearchPanelProps) {
  return (
    <View style={styles.searchCard}>
      <AppText style={styles.searchTitle} weight="bold">Find a Student</AppText>
      <AppText style={styles.searchSub}>Search by student name, roll number, or student ID.</AppText>

      <View style={styles.searchInputWrap}>
        <Search size={18} color={Theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Name or student ID..."
          placeholderTextColor={Theme.colors.textMuted}
          value={query}
          onChangeText={onQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity accessibilityRole="button" onPress={() => onQueryChange('')}>
            <X size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        <View style={styles.searchLoading}>
          <ActivityIndicator size="small" color={Theme.colors.primary} />
          <AppText style={styles.searchLoadingText}>Searching...</AppText>
        </View>
      ) : null}

      {searchError ? <AppText style={styles.searchError}>{searchError}</AppText> : null}

      {!searching && query.trim().length >= 2 && searchResults.length === 0 && !searchError ? (
        <AppText style={styles.emptySearchText}>No students matched your search.</AppText>
      ) : null}

      {searchResults.map((student) => {
        const name = pickText(student.student_full_name, student.name, 'Unknown');
        const id = pickText(student.roll_number, student.roll_no, student.student_id);
        const classLabel = `Class ${pickText(student.class_grade)} - ${pickText(student.section)}`;
        return (
          <TouchableOpacity
            key={`${id}-${name}`}
            accessibilityRole="button"
            style={styles.resultRow}
            onPress={() => onSelectStudent(student)}
          >
            <AvatarBubble displayName={name} size={42} textSize={16} primaryColor={Theme.colors.primary} />
            <View style={styles.resultCopy}>
              <AppText style={styles.resultName} weight="bold">{name}</AppText>
              <AppText style={styles.resultMeta}>ID: {id} • {classLabel}</AppText>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
