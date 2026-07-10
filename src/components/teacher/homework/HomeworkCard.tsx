import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpen, Calendar, Layout, Edit3, Trash2 } from 'lucide-react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { formatDisplayDate } from './helpers';
import { homeworkStyles as styles } from './homeworkStyles';
import type { HomeworkItem } from './types';

interface HomeworkCardProps {
  item: HomeworkItem;
  isEditing: boolean;
  onEdit: (item: HomeworkItem) => void;
  onDelete: (id: string) => void;
}

export default function HomeworkCard({ item, isEditing, onEdit, onDelete }: HomeworkCardProps) {
  return (
    <AppCard style={StyleSheet.flatten([styles.homeworkCard, isEditing && styles.homeworkCardEditing])}>
      <View style={styles.cardHeader}>
        <View style={styles.subjectContainer}>
          <View style={styles.subjectIcon}>
            <BookOpen size={16} color={Theme.colors.blue} />
          </View>
          <AppText weight="bold" style={styles.subjectText}>{item.subject_name}</AppText>
        </View>
        <View style={styles.actionIcons}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
            <Edit3 size={18} color={Theme.colors.textSec} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.homework_id)} style={styles.iconBtn}>
            <Trash2 size={18} color={Theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <AppText weight="bold" style={styles.homeworkTitle}>{item.title}</AppText>
      <AppText style={styles.homeworkDesc} numberOfLines={2}>
        {item.description || 'No description provided.'}
      </AppText>

      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Layout size={14} color={Theme.colors.textMuted} />
          <AppText weight="semibold" style={styles.metaText}>{item.class_name} - {item.section_name}</AppText>
        </View>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Theme.colors.textMuted} />
          <AppText weight="semibold" style={styles.metaText}>Due: {formatDisplayDate(item.due_date)}</AppText>
        </View>
      </View>
    </AppCard>
  );
}
