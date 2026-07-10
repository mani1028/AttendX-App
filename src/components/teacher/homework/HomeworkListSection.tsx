import React from 'react';
import { View } from 'react-native';
import Loader from '../../common/Loader';
import AppText from '../../common/AppText';
import HomeworkCard from './HomeworkCard';
import { homeworkStyles as styles } from './homeworkStyles';
import type { HomeworkItem } from './types';

interface HomeworkListSectionProps {
  loading: boolean;
  items: HomeworkItem[];
  editingId: string | null;
  onEdit: (item: HomeworkItem) => void;
  onDelete: (id: string) => void;
}

export default function HomeworkListSection({
  loading,
  items,
  editingId,
  onEdit,
  onDelete,
}: HomeworkListSectionProps) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <AppText weight="bold" style={styles.sectionTitle}>Homework List</AppText>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <Loader />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <AppText style={styles.emptyStateText}>No homework found for selected criteria.</AppText>
        </View>
      ) : (
        <View style={styles.homeworkList}>
          {items.map((item, idx) => (
            item && (
              <HomeworkCard
                key={item.homework_id || `hw-${idx}`}
                item={item}
                isEditing={editingId === item.homework_id}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )
          ))}
        </View>
      )}
    </>
  );
}
