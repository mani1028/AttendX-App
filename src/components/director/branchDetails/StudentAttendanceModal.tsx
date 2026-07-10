import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { AttendanceBadge } from './BranchBadges';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { AttendanceRecord } from './types';

interface StudentAttendanceModalProps {
  visible: boolean;
  className: string;
  sectionName: string;
  attendanceFilter: 'ALL' | 'PRESENT' | 'ABSENT';
  onFilterChange: (filter: 'ALL' | 'PRESENT' | 'ABSENT') => void;
  records: AttendanceRecord[];
  onClose: () => void;
}

const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  visible,
  className,
  sectionName,
  attendanceFilter,
  onFilterChange,
  records,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <AppText style={styles.modalTitle} weight="bold">
            Attendance - Class {className} Section {sectionName}
          </AppText>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <AppText style={styles.modalCloseText}>✕</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <View style={styles.attendanceFilterRow}>
            {(['ALL', 'PRESENT', 'ABSENT'] as const).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, attendanceFilter === filter && styles.filterChipActive]}
                onPress={() => onFilterChange(filter)}
              >
                <AppText style={[styles.filterChipText, attendanceFilter === filter && styles.filterChipTextActive]}>
                  {filter === 'ALL' ? 'All' : filter === 'PRESENT' ? 'Present' : 'Absent'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView>
            {records.map((item, idx) => (
              <View key={idx} style={styles.attendanceRow}>
                <AppText style={styles.attendanceRoll}>{item.roll_number || '-'}</AppText>
                <AppText style={styles.attendanceName}>{item.student_full_name || item.name || '-'}</AppText>
                <AttendanceBadge status={item.status} />
              </View>
            ))}
            {records.length === 0 && (
              <AppText style={styles.emptyText}>No attendance data found</AppText>
            )}
          </ScrollView>
        </View>

        <View style={styles.modalFooter}>
          <AppButton title="Close" onPress={onClose} />
        </View>
      </View>
    </View>
  </Modal>
);

export default StudentAttendanceModal;
