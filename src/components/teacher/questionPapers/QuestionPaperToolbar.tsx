import React from 'react';
import { View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { questionPaperStyles as styles } from './questionPaperStyles';
import type { SubjectFilter } from './types';

interface QuestionPaperToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  subjectFilters: SubjectFilter[];
  activeSubject: string;
  onSubjectChange: (key: string) => void;
}

export default function QuestionPaperToolbar({
  searchTerm,
  onSearchChange,
  subjectFilters,
  activeSubject,
  onSubjectChange,
}: QuestionPaperToolbarProps) {
  return (
    <View style={styles.toolbarCard}>
      <View style={styles.searchRow}>
        <Search size={18} color={Theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, type or class..."
          placeholderTextColor={Theme.colors.textMuted}
          value={searchTerm}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
      </View>

      {subjectFilters.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {subjectFilters.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeSubject === f.key && styles.filterChipActive]}
                onPress={() => onSubjectChange(f.key)}
              >
                <AppText
                  weight={activeSubject === f.key ? 'bold' : 'regular'}
                  style={[styles.filterText, activeSubject === f.key && styles.filterTextActive]}
                >
                  {f.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
