import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import { teacherLeaveStyles as styles } from './teacherLeaveStyles';
import type { TeacherLeaveFilter } from './types';

const FILTER_TABS: TeacherLeaveFilter[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

export interface TeacherLeaveFilterTabsProps {
  filter: TeacherLeaveFilter;
  onFilterChange: (filter: TeacherLeaveFilter) => void;
}

export default function TeacherLeaveFilterTabs({ filter, onFilterChange }: TeacherLeaveFilterTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
      {FILTER_TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onFilterChange(tab)}
          style={[styles.filterTab, filter === tab && styles.filterTabActive]}
        >
          <AppText style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]} weight="semibold">
            {tab === 'ALL' ? 'All Requests' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </AppText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
