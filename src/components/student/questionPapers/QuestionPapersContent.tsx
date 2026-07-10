import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { C } from '../../../theme/tokens';
import SubjectSection from './SubjectSection';
import { questionPapersStyles as styles } from './questionPapersStyles';
import type { Subject } from './types';

interface QuestionPapersContentProps {
  loading: boolean;
  loadError: string | null;
  filteredSubjects: Subject[];
  hasActiveFilters: boolean;
  searchTerm: string;
  expandedSubjects: Record<string, boolean>;
  processingId: string | null;
  onRetry: () => void;
  onResetFilters: () => void;
  onToggleSubject: (subjectId: string) => void;
  onView: (paperId: string) => void;
  onDownload: (paperId: string, title: string) => void;
}

export default function QuestionPapersContent({
  loading,
  loadError,
  filteredSubjects,
  hasActiveFilters,
  searchTerm,
  expandedSubjects,
  processingId,
  onRetry,
  onResetFilters,
  onToggleSubject,
  onView,
  onDownload,
}: QuestionPapersContentProps) {
  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={40} color={C.colors.error} />
        <Text style={styles.errorTitle}>Could not load papers</Text>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenSkeleton variant="list" />
        <Text style={styles.loadingText}>Loading question papers...</Text>
      </View>
    );
  }

  if (filteredSubjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="file" size={48} color={C.colors.border} />
        </View>
        <Text style={styles.emptyTitle}>No question papers available</Text>
        <Text style={styles.emptyText}>
          {hasActiveFilters
            ? 'Try adjusting your search or filters'
            : 'Check back later for new study materials'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.resetEmptyBtn} onPress={onResetFilters}>
            <Text style={styles.resetEmptyBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      {filteredSubjects.map((subject) => (
        <SubjectSection
          key={subject.subject_id}
          subject={subject}
          isExpanded={searchTerm.trim() !== '' || !!expandedSubjects[subject.subject_id]}
          onToggle={() => onToggleSubject(subject.subject_id)}
          onView={onView}
          onDownload={onDownload}
          processingId={processingId}
        />
      ))}
    </>
  );
}
