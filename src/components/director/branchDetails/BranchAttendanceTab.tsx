import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppButton from '../../common/AppButton';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import { AttendanceBadge } from './BranchBadges';
import { ClassCard } from './BranchCards';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import type { ClassSection, TeacherAttendance } from './types';

interface BranchAttendanceTabProps {
  attendanceType: 'student' | 'teacher';
  onAttendanceTypeChange: (type: 'student' | 'teacher') => void;
  attendanceDate: string;
  showDatePicker: boolean;
  onShowDatePicker: (show: boolean) => void;
  onAttendanceDateChange: (date: Date) => void;
  onFetchTeacherAttendance: () => void;
  classSections: ClassSection[];
  studentCounts: Record<string, number>;
  onSelectSection: (className: string, section: string) => void;
  teacherAttendanceLoading: boolean;
  teacherAttendanceData: TeacherAttendance[];
  teacherAttendanceSummary: { total: number; present: number; absent: number; attendance_pct: number };
  teacherAttendanceFilter: 'ALL' | 'PRESENT' | 'ABSENT';
  onTeacherAttendanceFilterChange: (filter: 'ALL' | 'PRESENT' | 'ABSENT') => void;
  filteredTeacherAttendance: TeacherAttendance[];
}

const BranchAttendanceTab: React.FC<BranchAttendanceTabProps> = ({
  attendanceType,
  onAttendanceTypeChange,
  attendanceDate,
  showDatePicker,
  onShowDatePicker,
  onAttendanceDateChange,
  onFetchTeacherAttendance,
  classSections,
  studentCounts,
  onSelectSection,
  teacherAttendanceLoading,
  teacherAttendanceData,
  teacherAttendanceSummary,
  teacherAttendanceFilter,
  onTeacherAttendanceFilterChange,
  filteredTeacherAttendance,
}) => (
  <>
    <View style={styles.attendanceControls}>
      <View style={styles.attendanceTypeRow}>
        <TouchableOpacity
          style={[styles.attendanceTypeBtn, attendanceType === 'student' && styles.attendanceTypeBtnActive]}
          onPress={() => onAttendanceTypeChange('student')}
        >
          <AppText style={[styles.attendanceTypeText, attendanceType === 'student' && styles.attendanceTypeTextActive]}>
            📚 Student
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attendanceTypeBtn, attendanceType === 'teacher' && styles.attendanceTypeBtnActive]}
          onPress={() => onAttendanceTypeChange('teacher')}
        >
          <AppText style={[styles.attendanceTypeText, attendanceType === 'teacher' && styles.attendanceTypeTextActive]}>
            👩‍🏫 Teacher
          </AppText>
        </TouchableOpacity>
      </View>
      <View style={styles.attendanceDateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => onShowDatePicker(true)}>
          <AppText style={styles.dateText}>📅 {attendanceDate}</AppText>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(attendanceDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_event, date) => {
              onShowDatePicker(false);
              if (date) { onAttendanceDateChange(date); }
            }}
          />
        )}
        {attendanceType === 'teacher' && (
          <AppButton title="Fetch Attendance" onPress={onFetchTeacherAttendance} />
        )}
      </View>
    </View>

    {attendanceType === 'student' ? (
      <View>
        {classSections.map((cls, index) => (
          <ClassCard
            key={`${cls.class_name}-${index}`}
            branchClassName={cls.class_name}
            sections={cls.sections}
            studentCounts={studentCounts}
            onSelectSection={onSelectSection}
          />
        ))}
      </View>
    ) : teacherAttendanceLoading ? (
      <Loader />
    ) : teacherAttendanceData.length === 0 ? (
      <AppCard style={styles.emptyCard}>
        <AppText style={styles.emptyIcon}>👩‍🏫</AppText>
        <AppText style={styles.emptyTitle}>No teacher attendance data</AppText>
        <AppText style={styles.emptyText}>Select a date and click "Fetch Attendance"</AppText>
      </AppCard>
    ) : (
      <>
        <View style={styles.attendanceSummary}>
          <AppText style={styles.attendanceSummaryText}>
            Present: {teacherAttendanceSummary.present} / {teacherAttendanceSummary.total} ({teacherAttendanceSummary.attendance_pct}%)
          </AppText>
          <View style={styles.attendanceFilterRow}>
            {(['ALL', 'PRESENT', 'ABSENT'] as const).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, teacherAttendanceFilter === filter && styles.filterChipActive]}
                onPress={() => onTeacherAttendanceFilterChange(filter)}
              >
                <AppText style={[styles.filterChipText, teacherAttendanceFilter === filter && styles.filterChipTextActive]}>
                  {filter === 'ALL' ? 'All' : filter === 'PRESENT' ? 'Present' : 'Absent'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {filteredTeacherAttendance.map(teacher => (
          <AppCard key={teacher.employee_id} style={styles.teacherAttendanceCard}>
            <AppText style={styles.teacherAttendanceName}>{teacher.teacher_full_name}</AppText>
            <AppText style={styles.teacherAttendanceId}>ID: {teacher.employee_id}</AppText>
            <AttendanceBadge status={teacher.status} />
          </AppCard>
        ))}
      </>
    )}
  </>
);

export default BranchAttendanceTab;
