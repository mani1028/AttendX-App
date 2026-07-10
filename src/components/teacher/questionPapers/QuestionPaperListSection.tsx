import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FileText, Upload, AlertCircle } from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import QuestionPaperCard from './QuestionPaperCard';
import { questionPaperStyles as styles } from './questionPaperStyles';
import type { TeacherPaper } from './types';

interface QuestionPaperListSectionProps {
  loadError: string | null;
  loading: boolean;
  papers: TeacherPaper[];
  searchTerm: string;
  activeSubject: string;
  processingId: string | null;
  onRetry: () => void;
  onClearFilters: () => void;
  onUpload: () => void;
  onView: (paperId: string, title: string) => void;
  onDownload: (paperId: string, title: string) => void;
  onEdit: (paper: TeacherPaper) => void;
  onDelete: (paper: TeacherPaper) => void;
}

export default function QuestionPaperListSection({
  loadError,
  loading,
  papers,
  searchTerm,
  activeSubject,
  processingId,
  onRetry,
  onClearFilters,
  onUpload,
  onView,
  onDownload,
  onEdit,
  onDelete,
}: QuestionPaperListSectionProps) {
  if (loadError) {
    return (
      <AppCard style={styles.errorCard}>
        <AlertCircle size={32} color={Theme.colors.error} />
        <AppText weight="semibold" style={styles.errorTitle}>Could not load papers</AppText>
        <AppText style={styles.errorText}>{loadError}</AppText>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <AppText weight="semibold" style={styles.retryBtnText}>Try again</AppText>
        </TouchableOpacity>
      </AppCard>
    );
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ScreenSkeleton variant="list" />
        <AppText style={styles.loaderText}>Loading question papers...</AppText>
      </View>
    );
  }

  if (papers.length === 0) {
    const hasFilters = Boolean(searchTerm || activeSubject !== 'all');
    return (
      <AppCard style={styles.emptyCard}>
        <FileText size={40} color={Theme.colors.textSec} />
        <AppText weight="semibold" style={styles.emptyTitle}>No question papers found</AppText>
        <AppText style={styles.emptyText}>
          {hasFilters
            ? 'Try adjusting your search or subject filter.'
            : 'Upload question papers for your classes and they will appear here for students.'}
        </AppText>
        {hasFilters ? (
          <TouchableOpacity style={styles.retryBtn} onPress={onClearFilters}>
            <AppText weight="semibold" style={styles.retryBtnText}>Clear filters</AppText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.uploadEmptyBtn} onPress={onUpload}>
            <Upload size={18} color={Theme.colors.card} />
            <AppText weight="semibold" style={styles.uploadEmptyBtnText}>Upload Paper</AppText>
          </TouchableOpacity>
        )}
      </AppCard>
    );
  }

  return (
    <>
      {papers.map(paper => (
        <QuestionPaperCard
          key={paper.paper_id}
          paper={paper}
          processingId={processingId}
          onView={onView}
          onDownload={onDownload}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
