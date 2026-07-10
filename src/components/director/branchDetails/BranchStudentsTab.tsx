import React from 'react';
import { View, TextInput } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import BranchFilterDropdown from './BranchFilterDropdown';
import { StudentCard } from './BranchCards';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { Student } from './types';

interface BranchStudentsTabProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedClass: string;
  classLabel: string;
  sectionLabel: string;
  onOpenClassPicker: () => void;
  onOpenSectionPicker: () => void;
  students: Student[];
  onStudentPress: (student: Student) => void;
}

const BranchStudentsTab: React.FC<BranchStudentsTabProps> = ({
  searchTerm,
  onSearchChange,
  selectedClass,
  classLabel,
  sectionLabel,
  onOpenClassPicker,
  onOpenSectionPicker,
  students,
  onStudentPress,
}) => (
  <>
    <View style={styles.filterRow}>
      <BranchFilterDropdown label="Class" displayValue={classLabel} onPress={onOpenClassPicker} />
      {selectedClass && (
        <BranchFilterDropdown label="Section" displayValue={sectionLabel} onPress={onOpenSectionPicker} />
      )}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, roll number..."
          placeholderTextColor={Theme.colors.textMuted}
          value={searchTerm}
          onChangeText={onSearchChange}
        />
      </View>
    </View>
    {students.length === 0 ? (
      <AppCard style={styles.emptyCard}>
        <AppText style={styles.emptyIcon}>👨‍🎓</AppText>
        <AppText style={styles.emptyTitle}>No students found</AppText>
      </AppCard>
    ) : (
      students.map(student => (
        <StudentCard key={student.student_id} student={student} onPress={onStudentPress} />
      ))
    )}
  </>
);

export default BranchStudentsTab;
