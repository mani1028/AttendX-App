import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  FileText,
  Download,
  Share2,
  MoreVertical,
  Filter,
  Clock,
  BookOpen,
  CheckCircle,
} from 'lucide-react-native';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type FilterType = 'all' | 'maths' | 'science' | 'english';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'maths', label: 'Maths' },
  { key: 'science', label: 'Science' },
  { key: 'english', label: 'English' },
];

interface QuestionPaper {
  id: string;
  title: string;
  subject: string;
  class: string;
  date: string;
  totalMarks: number;
  status: 'draft' | 'published' | 'archived';
  questions: number;
  type: string;
}

const MOCK_PAPERS: QuestionPaper[] = [
  {
    id: '1',
    title: 'Mid-Term Examination - Maths',
    subject: 'Maths',
    class: '10-A',
    date: '2026-06-15',
    totalMarks: 100,
    status: 'published',
    questions: 35,
    type: 'Written',
  },
  {
    id: '2',
    title: 'Weekly Quiz - Algebra',
    subject: 'Maths',
    class: '10-B',
    date: '2026-06-18',
    totalMarks: 25,
    status: 'published',
    questions: 10,
    type: 'MCQ',
  },
  {
    id: '3',
    title: 'Science Lab Practical',
    subject: 'Science',
    class: '10-A',
    date: '2026-06-20',
    totalMarks: 50,
    status: 'draft',
    questions: 15,
    type: 'Practical',
  },
  {
    id: '4',
    title: 'English Comprehension Test',
    subject: 'English',
    class: '10-C',
    date: '2026-06-12',
    totalMarks: 40,
    status: 'published',
    questions: 20,
    type: 'Written',
  },
  {
    id: '5',
    title: 'Unit Test - Trigonometry',
    subject: 'Maths',
    class: '10-A',
    date: '2026-06-08',
    totalMarks: 30,
    status: 'archived',
    questions: 12,
    type: 'Written',
  },
  {
    id: '6',
    title: 'Physics Mid-Term Paper',
    subject: 'Science',
    class: '10-B',
    date: '2026-06-10',
    totalMarks: 80,
    status: 'archived',
    questions: 30,
    type: 'Written',
  },
];

export default function TeacherQuestionPapersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const filteredPapers = activeFilter === 'all'
    ? MOCK_PAPERS
    : MOCK_PAPERS.filter(p => p.subject.toLowerCase() === activeFilter);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published': return { color: Theme.colors.success, bg: '#f0fdf4', label: 'Published' };
      case 'draft': return { color: Theme.colors.warning, bg: '#fff7ed', label: 'Draft' };
      case 'archived': return { color: Theme.colors.textMuted, bg: '#f5f5f5', label: 'Archived' };
      default: return { color: Theme.colors.textMuted, bg: '#f5f5f5', label: status };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <AppText weight="bold" style={styles.headerTitle}>Question Papers</AppText>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={20} color={Theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <AppText weight={activeFilter === f.key ? 'bold' : 'regular'} style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.papersHeader}>
          <AppText weight="semibold" style={styles.papersCount}>{filteredPapers.length} papers found</AppText>
        </View>

        <View style={styles.papersContainer}>
          {filteredPapers.map((paper) => {
            const statusConfig = getStatusConfig(paper.status);
            return (
              <AppCard key={paper.id} style={styles.paperCard}>
                <View style={styles.paperTop}>
                  <View style={styles.paperIconWrap}>
                    <FileText size={20} color={Theme.colors.primary} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <AppText weight="semibold" style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </AppText>
                  </View>
                  <TouchableOpacity style={styles.moreBtn}>
                    <MoreVertical size={18} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <AppText weight="bold" style={styles.paperTitle}>{paper.title}</AppText>

                <View style={styles.paperMeta}>
                  <View style={styles.metaItem}>
                    <BookOpen size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.metaText}>{paper.subject}</AppText>
                  </View>
                  <View style={styles.metaDot} />
                  <AppText style={styles.metaText}>Class {paper.class}</AppText>
                  <View style={styles.metaDot} />
                  <AppText style={styles.metaText}>{paper.type}</AppText>
                </View>

                <View style={styles.paperDetails}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.detailText}>{paper.date}</AppText>
                  </View>
                  <View style={styles.detailItem}>
                    <CheckCircle size={14} color={Theme.colors.textMuted} />
                    <AppText style={styles.detailText}>{paper.questions} questions</AppText>
                  </View>
                  <View style={styles.detailItem}>
                    <AppText weight="semibold" style={styles.marksText}>{paper.totalMarks} marks</AppText>
                  </View>
                </View>

                <View style={styles.paperActions}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Download size={16} color={Theme.colors.primary} />
                    <AppText weight="medium" style={styles.actionText}>Download</AppText>
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity style={styles.actionBtn}>
                    <Share2 size={16} color={Theme.colors.primary} />
                    <AppText weight="medium" style={styles.actionText}>Share</AppText>
                  </TouchableOpacity>
                </View>
              </AppCard>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: Theme.colors.text,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  filterScroll: {
    marginBottom: Theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Theme.colors.text,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  papersHeader: {
    marginBottom: Theme.spacing.md,
  },
  papersCount: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  papersContainer: {
    gap: Theme.spacing.md,
  },
  paperCard: {
    padding: 20,
  },
  paperTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  paperIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    marginRight: Theme.spacing.sm,
  },
  statusText: {
    fontSize: 12,
  },
  moreBtn: {
    padding: 4,
  },
  paperTitle: {
    fontSize: 16,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  paperMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Theme.colors.textMuted,
  },
  paperDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
  },
  marksText: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
  },
  paperActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    color: Theme.colors.primary,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: Theme.colors.border,
  },
});
