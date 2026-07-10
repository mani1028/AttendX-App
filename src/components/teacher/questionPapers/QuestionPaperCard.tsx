import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FileText, Download, Clock, BookOpen, Eye, Edit2, Trash2 } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { formatDate, formatFileSize } from './helpers';
import { questionPaperStyles as styles } from './questionPaperStyles';
import type { TeacherPaper } from './types';

interface QuestionPaperCardProps {
  paper: TeacherPaper;
  processingId: string | null;
  onView: (paperId: string, title: string) => void;
  onDownload: (paperId: string, title: string) => void;
  onEdit: (paper: TeacherPaper) => void;
  onDelete: (paper: TeacherPaper) => void;
}

export default function QuestionPaperCard({
  paper,
  processingId,
  onView,
  onDownload,
  onEdit,
  onDelete,
}: QuestionPaperCardProps) {
  const isProcessing = processingId === paper.paper_id;

  return (
    <AppCard style={styles.paperCard}>
      <View style={styles.paperTop}>
        <View style={styles.paperIconWrap}>
          <FileText size={20} color={Theme.colors.primary} />
        </View>
        {paper.exam_type ? (
          <View style={styles.typeBadge}>
            <AppText weight="semibold" style={styles.typeBadgeText}>
              {paper.exam_type.toUpperCase()}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText weight="bold" style={styles.paperTitle}>{paper.title}</AppText>

      <View style={styles.paperMeta}>
        {paper.subject_name ? (
          <View style={styles.metaItem}>
            <BookOpen size={14} color={Theme.colors.textMuted} />
            <AppText style={styles.metaText}>{paper.subject_name}</AppText>
          </View>
        ) : null}
        {(paper.class_name || paper.section_name) ? (
          <AppText style={styles.metaText}>
            Class {paper.class_name || '—'}{paper.section_name ? ` · ${paper.section_name}` : ''}
          </AppText>
        ) : null}
      </View>

      <View style={styles.paperDetails}>
        <View style={styles.detailItem}>
          <Clock size={14} color={Theme.colors.textMuted} />
          <AppText style={styles.detailText}>{formatDate(paper.created_at)}</AppText>
        </View>
        <AppText style={styles.detailText}>{formatFileSize(paper.file_size)}</AppText>
      </View>

      <View style={styles.paperActions}>
        {isProcessing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={Theme.colors.primary} />
            <AppText style={styles.processingText}>Preparing file...</AppText>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onView(paper.paper_id, paper.title)}>
              <Eye size={16} color={Theme.colors.primary} />
              <AppText weight="medium" style={styles.actionText}>View</AppText>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionBtn} onPress={() => onDownload(paper.paper_id, paper.title)}>
              <Download size={16} color={Theme.colors.primary} />
              <AppText weight="medium" style={styles.actionText}>Download</AppText>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(paper)}>
              <Edit2 size={16} color={Theme.colors.primary} />
              <AppText weight="medium" style={styles.actionText}>Edit</AppText>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(paper)}>
              <Trash2 size={16} color={Theme.colors.error} />
              <AppText weight="medium" style={styles.actionTextDanger}>Delete</AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </AppCard>
  );
}
