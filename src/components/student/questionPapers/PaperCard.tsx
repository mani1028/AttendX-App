import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { formatDate, formatFileSize } from './helpers';
import { questionPapersStyles as styles } from './questionPapersStyles';
import type { Paper } from './types';

interface PaperCardProps {
  paper: Paper;
  onView: (paperId: string) => void;
  onDownload: (paperId: string, title: string) => void;
  isProcessing: boolean;
}

export default function PaperCard({
  paper,
  onView,
  onDownload,
  isProcessing,
}: PaperCardProps) {
  return (
    <View style={styles.paperCard}>
      <View style={styles.paperCardHeader}>
        <View style={styles.paperTypeBadge}>
          <Icon name="file-text" size={12} color={C.colors.blue} />
          <Text style={styles.paperTypeText}>{String(paper.exam_type ?? '').toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.paperTitle}>{String(paper.title ?? '')}</Text>

      <View style={styles.paperMeta}>
        <View style={styles.metaItem}>
          <Icon name="user" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>{String(paper.teacher_name || 'Unknown Teacher')}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>{String(formatDate(paper.created_at))}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="file" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>{formatFileSize(paper.file_size)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="bookmark" size={13} color={C.colors.textMuted} />
          <Text style={styles.metaText}>
            {String(
              `${paper.class_name || ''}${paper.class_name && paper.section_name ? ' ' : ''}${paper.section_name || ''}`,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.paperActions}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color={C.colors.blue} />
            <Text style={styles.processingText}>Preparing file...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onView(paper.paper_id)}>
              <View style={styles.viewBtnContent}>
                <Icon name="eye" size={16} color={C.colors.card} />
                <Text style={styles.actionBtnText}>View</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => onDownload(paper.paper_id, paper.title)}
            >
              <Icon name="download" size={16} color={C.colors.blue} />
              <Text style={styles.actionBtnOutlineText}>Download</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
