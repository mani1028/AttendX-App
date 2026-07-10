import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppCard from '../../common/AppCard';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { formatDate } from './helpers';
import { branchDetailsStyles as styles } from './branchDetailsStyles';
import { AttendanceBadge, LeaveStatusBadge, ResultBadge, StatusBadge } from './BranchBadges';
import type { LeaveRequest, Student, StudentMarkSummary, Teacher } from './types';

export const StatCard: React.FC<{ title: string; value: number; icon: string }> = ({ title, value, icon }) => (
  <View style={styles.statCard}>
    <View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statTitle}>{title}</AppText>
    </View>
    <AppText style={styles.statIcon}>{icon}</AppText>
  </View>
);

export const ClassCard: React.FC<{
  branchClassName: string;
  sections: string[];
  studentCounts: Record<string, number>;
  onSelectSection: (className: string, section: string) => void;
}> = ({ branchClassName, sections, studentCounts, onSelectSection }) => (
  <AppCard style={styles.classCard}>
    <View style={styles.classHeader}>
      <AppText style={styles.classTitle}>Class {branchClassName}</AppText>
    </View>
    <View style={styles.sectionList}>
      {sections.map(section => (
        <TouchableOpacity
          key={section}
          style={styles.sectionBtn}
          onPress={() => onSelectSection(branchClassName, section)}
        >
          <AppText style={styles.sectionName}>Section {section}</AppText>
          <AppText style={styles.sectionCount}>{studentCounts[`${branchClassName}-${section}`] || 0} students →</AppText>
        </TouchableOpacity>
      ))}
    </View>
  </AppCard>
);

export const TeacherCard: React.FC<{ teacher: Teacher }> = ({ teacher }) => (
  <AppCard style={styles.teacherCard}>
    <View style={styles.teacherHeader}>
      <AppText style={styles.teacherName}>{teacher.teacher_full_name}</AppText>
      <StatusBadge status={teacher.teacher_status} />
    </View>
    <AppText style={styles.teacherId}>ID: {teacher.employee_id}</AppText>
    <AppText style={styles.teacherSubject}>📚 {teacher.department_subject || '—'}</AppText>
    <AppText style={styles.teacherContact}>📞 {teacher.mobile_number || '—'}</AppText>
    <AppText style={styles.teacherEmail}>✉️ {teacher.email_id || '—'}</AppText>
  </AppCard>
);

export const StudentCard: React.FC<{
  student: Student;
  onPress: (student: Student) => void;
}> = ({ student, onPress }) => (
  <TouchableOpacity onPress={() => onPress(student)}>
    <AppCard style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <AppText style={styles.studentName}>{student.student_full_name}</AppText>
        <AppText style={styles.studentRoll}>Roll: {student.roll_number}</AppText>
      </View>
      <View style={styles.studentDetails}>
        <AppText style={styles.studentInfo}>📚 Class {student.class_grade} - Section {student.section}</AppText>
        <AppText style={styles.studentInfo}>🎫 Adm: {student.admission_number}</AppText>
        <AppText style={styles.studentInfo}>👨 Father: {student.father_guardian_name}</AppText>
      </View>
    </AppCard>
  </TouchableOpacity>
);

export const LeaveCard: React.FC<{ leave: LeaveRequest }> = ({ leave }) => {
  const isTeacher = leave.leave_type === 'teacher' || (!leave.roll_number && !leave.roll_no);
  const name = isTeacher
    ? (leave.teacher_full_name || leave.teacher_name || leave.name || leave.full_name || 'Staff Member')
    : (leave.student_full_name || leave.student_name || 'Student');

  let detailsText = '';
  if (isTeacher) {
    const empId = leave.employee_id || leave.teacher_id || '—';
    const subj = leave.subject || leave.department_subject || 'Teacher';
    detailsText = `Staff ID: ${empId} | Subject: ${subj}`;
  } else {
    const roll = leave.roll_number || leave.roll_no || '—';
    const cls = leave.class_grade || leave.class_name || leave.class || '—';
    const sec = leave.section || leave.section_name || '—';
    detailsText = `Roll: ${roll} | Class ${cls}-${sec}`;
  }

  return (
    <AppCard style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <View style={{ flex: 1, marginRight: Theme.spacing.sm }}>
          <AppText style={styles.leaveStudent}>{name}</AppText>
          <AppText style={{ fontSize: Theme.typography.label.fontSize, color: isTeacher ? Theme.colors.blue : Theme.colors.success, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 3 }}>
            {isTeacher ? 'Staff Leave Request' : 'Student Leave Request'}
          </AppText>
        </View>
        <LeaveStatusBadge status={leave.status} />
      </View>
      <AppText style={styles.leaveDetails}>{detailsText}</AppText>
      <AppText style={styles.leaveDates}>📅 {formatDate(leave.from_date)} → {formatDate(leave.to_date)}</AppText>
      <AppText style={styles.leaveReason}>📝 {leave.reason}</AppText>
    </AppCard>
  );
};

export const MarksRow: React.FC<{
  student: StudentMarkSummary;
  onPress: (student: StudentMarkSummary) => void;
}> = ({ student, onPress }) => (
  <TouchableOpacity style={styles.marksRow} onPress={() => onPress(student)}>
    <View style={styles.marksRowHeader}>
      <AppText style={styles.marksStudentName}>{student.student_name}</AppText>
      <ResultBadge result={student.result} />
    </View>
    <View style={styles.marksRowDetails}>
      <AppText style={styles.marksInfo}>Roll: {student.roll_number || '-'}</AppText>
      <AppText style={styles.marksInfo}>Class {student.class_grade}-{student.section}</AppText>
      <AppText style={[styles.marksPercentage, { color: student.percentage >= 60 ? Theme.colors.success : student.percentage >= 35 ? '#f97316' : Theme.colors.error }]}>
        {student.percentage.toFixed(1)}%
      </AppText>
    </View>
  </TouchableOpacity>
);
