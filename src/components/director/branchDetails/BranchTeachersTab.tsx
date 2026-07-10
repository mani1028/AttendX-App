import React from 'react';
import { View, TextInput } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { TeacherCard } from './BranchCards';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { Teacher } from './types';

interface BranchTeachersTabProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  teachers: Teacher[];
}

const BranchTeachersTab: React.FC<BranchTeachersTabProps> = ({ searchTerm, onSearchChange, teachers }) => (
  <>
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, employee ID, subject..."
        placeholderTextColor={Theme.colors.textMuted}
        value={searchTerm}
        onChangeText={onSearchChange}
      />
    </View>
    {teachers.length === 0 ? (
      <AppCard style={styles.emptyCard}>
        <AppText style={styles.emptyIcon}>👨‍🏫</AppText>
        <AppText style={styles.emptyTitle}>No teachers found</AppText>
      </AppCard>
    ) : (
      teachers.map(teacher => <TeacherCard key={teacher.teacher_id} teacher={teacher} />)
    )}
  </>
);

export default BranchTeachersTab;
