import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import PaperCard from './PaperCard';
import { questionPapersStyles as styles } from './questionPapersStyles';
import type { Subject } from './types';

interface SubjectSectionProps {
  subject: Subject;
  isExpanded: boolean;
  onToggle: () => void;
  onView: (paperId: string) => void;
  onDownload: (paperId: string, title: string) => void;
  processingId: string | null;
}

export default function SubjectSection({
  subject,
  isExpanded,
  onToggle,
  onView,
  onDownload,
  processingId,
}: SubjectSectionProps) {
  return (
    <View style={styles.subjectSection}>
      <TouchableOpacity style={styles.subjectHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.subjectIcon}>
          <Text style={styles.subjectIconText}>{(subject.subject_name || '').charAt(0)}</Text>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectTitle}>{String(subject.subject_name ?? '')}</Text>
          <View style={styles.paperCountBadge}>
            <Text style={styles.paperCountBadgeText}>{String(subject.papers.length ?? 0)}</Text>
          </View>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={C.colors.textMuted}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.papersList}>
          {subject.papers.length === 0 ? (
            <View style={styles.noPapersContainer}>
              <Icon name="file" size={32} color={C.colors.border} />
              <Text style={styles.noPapersText}>No papers available</Text>
            </View>
          ) : (
            subject.papers.map((paper) => (
              <PaperCard
                key={paper.paper_id}
                paper={paper}
                onView={onView}
                onDownload={onDownload}
                isProcessing={processingId === paper.paper_id}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}
