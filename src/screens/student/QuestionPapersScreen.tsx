import { Theme, C } from '../../theme/tokens';
import { useScrollTabBar } from '../../hooks/useScrollTabBar';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RefreshCw } from 'lucide-react-native';
import { getQuestionPapers, getExamTypes, downloadQuestionPaper } from '../../services/studentService';
import { resolveApiErrorMessage } from '../../utils/helpers';
import { sharePdfBuffer } from '../../utils/sharePdfBuffer';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import {
  FilterModal,
  QuestionPapersToolbar,
  QuestionPapersContent,
  filterSubjectsBySearch,
  questionPapersStyles,
  type Subject,
  type FilterOptions,
  type SubjectOption,
} from '../../components/student/questionPapers';

export default function QuestionPapersScreen() {
  const navigation = useNavigation<any>();
  const handleScroll = useScrollTabBar();
  const canGoBack = navigation.canGoBack();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterExamType, setFilterExamType] = useState<string>('all');
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchExamTypes = useCallback(async () => {
    try {
      const res = await getExamTypes();
      setExamTypes(res.exam_types || []);
    } catch (err: any) {
      console.error('Failed to fetch exam types:', err);
    }
  }, []);

  const fetchPapers = useCallback(async (isRefresh = false) => {
    const isActuallyRefresh = isRefresh === true;
    if (!isActuallyRefresh) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const params: any = {};
      if (filterSubject !== 'all') {
        params.subject_id = filterSubject;
      }
      if (filterExamType !== 'all') {
        params.exam_type = filterExamType;
      }

      const res = await getQuestionPapers(params);
      const data = res.subjects || res.data?.subjects || [];

      setSubjects(data);

      setSubjectOptions((prev) => {
        const isCleanRefresh = isActuallyRefresh && filterSubject === 'all' && filterExamType === 'all';
        if (prev.length === 0 || isCleanRefresh) {
          const options = [
            ...new Map<string, string>(
              data.map((s: Subject) => [String(s.subject_id), String(s.subject_name)]),
            ).entries(),
          ];
          return options.map(([id, name]) => ({ id, name }));
        }
        return prev;
      });

      if (data.length > 0) {
        setExpandedSubjects((prev) => {
          if (Object.keys(prev).length === 0) {
            return { [data[0].subject_id]: true };
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch question papers:', err);
      setSubjects([]);
      setLoadError(
        resolveApiErrorMessage(err, 'Could not load question papers. Pull down to retry.'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSubject, filterExamType]);

  const filteredSubjects = useMemo(
    () => filterSubjectsBySearch(subjects, searchTerm),
    [subjects, searchTerm],
  );

  const totalFilteredPapers = useMemo(
    () => filteredSubjects.reduce((sum, sub) => sum + sub.papers.length, 0),
    [filteredSubjects],
  );

  useEffect(() => {
    fetchExamTypes();
  }, [fetchExamTypes]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExamTypes();
    fetchPapers(true);
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const processPaperAction = async (paperId: string, title: string, isDownload: boolean) => {
    if (processingId) {
      return;
    }

    try {
      setProcessingId(paperId);

      const paperBuffer = await downloadQuestionPaper(paperId);
      const safeTitle = title.replace(/[^a-zA-Z0-9._-]/g, '_');
      await sharePdfBuffer(
        paperBuffer,
        `${safeTitle}.pdf`,
        isDownload ? 'Save Question Paper' : 'View Question Paper',
      );
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('User did not share') || message.includes('cancel')) {
        // Ignore cancel
      } else {
        console.error(`Failed to ${isDownload ? 'download' : 'view'} paper:`, err);
        Alert.alert(
          isDownload ? 'Download failed' : 'Could not open file',
          resolveApiErrorMessage(err, `Could not ${isDownload ? 'download' : 'open'} the file.`),
        );
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleView = (paperId: string) => {
    const paper = subjects.flatMap((s) => s.papers).find((p) => p.paper_id === paperId);
    processPaperAction(paperId, paper?.title || 'Paper', false);
  };

  const handleDownload = (paperId: string, title: string) => {
    processPaperAction(paperId, title, true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('all');
    setFilterExamType('all');
  };

  const applyFilters = (filters: FilterOptions) => {
    setFilterSubject(filters.subject);
    setFilterExamType(filters.examType);
  };

  const hasActiveFilters =
    searchTerm !== '' || filterSubject !== 'all' || filterExamType !== 'all';

  const headerSubtitle = loading
    ? 'Loading papers...'
    : loadError
      ? 'Unable to load papers'
      : `${totalFilteredPapers} paper${totalFilteredPapers === 1 ? '' : 's'} available`;

  const handleBackPress = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs' as never);
  };

  const toggleExamTypeQuick = (type: string) => {
    setFilterExamType((prev) => (prev === type ? 'all' : type));
  };

  return (
    <View style={questionPapersStyles.container}>
      <ScrollView
        style={[questionPapersStyles.listContainer, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.colors.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Question Papers"
          subtitle={headerSubtitle}
          onBackPress={handleBackPress}
          showBack={canGoBack}
          rightActions={
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh papers"
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          }
        />

        <View style={questionPapersStyles.pageBody}>
          <QuestionPapersToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            hasActiveFilters={hasActiveFilters}
            onOpenFilterModal={() => setShowFilterModal(true)}
            examTypes={examTypes}
            filterExamType={filterExamType}
            onSetExamTypeAll={() => setFilterExamType('all')}
            onToggleExamType={toggleExamTypeQuick}
            filterSubject={filterSubject}
            subjectOptions={subjectOptions}
            onClearSearch={() => setSearchTerm('')}
            onClearSubjectFilter={() => setFilterSubject('all')}
            onClearExamTypeFilter={() => setFilterExamType('all')}
            onResetFilters={resetFilters}
            showStats={!loading && filteredSubjects.length > 0}
            subjectCount={filteredSubjects.length}
            paperCount={totalFilteredPapers}
          />

          <QuestionPapersContent
            loading={loading}
            loadError={loadError}
            filteredSubjects={filteredSubjects}
            hasActiveFilters={hasActiveFilters}
            searchTerm={searchTerm}
            expandedSubjects={expandedSubjects}
            processingId={processingId}
            onRetry={() => fetchPapers()}
            onResetFilters={resetFilters}
            onToggleSubject={toggleSubject}
            onView={handleView}
            onDownload={handleDownload}
          />
        </View>
      </ScrollView>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={applyFilters}
        subjects={subjectOptions}
        examTypes={examTypes}
        currentFilterSubject={filterSubject}
        currentFilterExamType={filterExamType}
      />
    </View>
  );
}
