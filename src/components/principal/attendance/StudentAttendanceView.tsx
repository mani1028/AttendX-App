import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { BookOpen, Users2 } from 'lucide-react-native';
import API from '../../../services/api';
import AppText from '../../common/AppText';
import Loader from '../../common/Loader';
import { C, Theme } from '../../../theme/tokens';
import AttendanceFiltersBar from './AttendanceFiltersBar';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import {
  classColor,
  formatPersonName,
  groupClassItems,
  iso,
} from './helpers';
import { attendanceStyles as styles } from './styles';
import type { ClassItem, SectionGroup, Student } from './types';

export interface StudentAttendanceViewProps {
  classItems: ClassItem[];
  selectedSection: SectionGroup | null;
  onSelectedSectionChange: (section: SectionGroup | null) => void;
  date: Date;
  preselectedSection: { class_grade: string; section: string } | null;
  onPreselectedApplied: () => void;
}

export default function StudentAttendanceView({
  classItems,
  selectedSection,
  onSelectedSectionChange,
  date,
  preselectedSection,
  onPreselectedApplied,
}: StudentAttendanceViewProps) {
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 768;

  const groups = useMemo(() => groupClassItems(classItems), [classItems]);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadStudents = useCallback(async (sec: SectionGroup) => {
    if (!sec) { return; }
    setLoading(true);
    try {
      const res = await API.get('principal/students', {
        params: {
          class_grade: sec.class_grade,
          section: sec.section,
          on_date: iso(date),
        },
      });
      if (isMounted.current) {
        setStudents(res.data?.items || []);
      }
    } catch (error: any) {
      if (!isMounted.current) { return; }
      if (error?.response?.status === 401) { return; }
      Alert.alert('Error', 'Failed to load students');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [date]);

  useEffect(() => {
    if (preselectedSection && groups.length) {
      const targetGrade = String(preselectedSection.class_grade).trim();
      const targetSection = String(preselectedSection.section).trim();
      const groupMatch = groups.find(([grade]) => grade === targetGrade);
      if (groupMatch) {
        const [, secs] = groupMatch;
        const secMatch = secs.find(sec => sec.section === targetSection);
        if (secMatch) { onSelectedSectionChange(secMatch); }
      }
      onPreselectedApplied();
    }
  }, [preselectedSection, groups, onSelectedSectionChange, onPreselectedApplied]);

  useEffect(() => {
    if (groups.length && !selectedSection) {
      const [, secs] = groups[0];
      if (secs.length) { onSelectedSectionChange(secs[0]); }
    }
  }, [groups, selectedSection, onSelectedSectionChange]);

  useEffect(() => {
    if (selectedSection) { loadStudents(selectedSection); }
  }, [selectedSection, loadStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter(s => {
      const nameMatch = !searchQuery || (s.student_full_name || '').toLowerCase().includes(q);
      const rollMatch = !searchQuery || String(s.roll_number || '').includes(q);
      const admissionMatch = !searchQuery || String(s.admission_number || '').includes(q);
      const statusMatch = !statusFilter || s.status === statusFilter;
      return (nameMatch || rollMatch || admissionMatch) && statusMatch;
    });
  }, [students, searchQuery, statusFilter]);

  const presentCount = students.filter(s => s.status === 'PRESENT').length;
  const halfDayCount = students.filter(s => s.status === 'HALF_DAY' || s.status === 'LATE').length;
  const absentCount = students.filter(s => s.status === 'ABSENT').length;
  const attendancePct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  if (!selectedSection) {
    return (
      <View style={styles.emptyPanel}>
        <BookOpen size={48} color={C.muted} style={{ marginBottom: Theme.spacing.md }} />
        <AppText style={styles.emptyTitle} weight="bold">Select a class section</AppText>
        <AppText style={styles.emptyText}>Choose from the left panel</AppText>
      </View>
    );
  }

  if (isCompactScreen) {
    return (
      <View style={styles.compactStack}>
        <View style={styles.classStatsBar}>
          <View style={styles.classStatsTop}>
            <View style={styles.classStatsTitle}>
              <AppText style={styles.classStatsName} weight="semibold">
                Class {selectedSection.class_grade} · Section {selectedSection.section}
              </AppText>
              <AppText style={styles.classStatsDate}>{iso(date)}</AppText>
            </View>
            <View style={[styles.ratePill, attendancePct >= 75 ? styles.ratePillGood : styles.ratePillLow]}>
              <AppText style={[styles.ratePillText, { color: attendancePct >= 75 ? C.success : C.error }]} weight="semibold">
                {attendancePct}%
              </AppText>
            </View>
          </View>
          <View style={styles.inlineStatsRow}>
            <AppText style={styles.inlineStat}>{students.length} total</AppText>
            <AppText style={styles.inlineStatDot}>·</AppText>
            <AppText style={[styles.inlineStat, { color: C.success }]}>{presentCount} present</AppText>
            <AppText style={styles.inlineStatDot}>·</AppText>
            <AppText style={[styles.inlineStat, { color: C.warning }]}>{halfDayCount} half</AppText>
            <AppText style={styles.inlineStatDot}>·</AppText>
            <AppText style={[styles.inlineStat, { color: C.error }]}>{absentCount} absent</AppText>
          </View>
        </View>

        <View style={styles.pagePad}>
          <AttendanceFiltersBar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            placeholder="Search by name, roll no..."
          />
        </View>

        {loading ? (
          <Loader />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Users2 size={48} color={C.muted} style={{ marginBottom: Theme.spacing.md }} />
            <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your search</AppText>
          </View>
        ) : (
          <View style={styles.mobileStudentList}>
            {filteredStudents.map((student, idx) => (
              <View key={student.student_id || student.roll_number || `mobile-student-${idx}`} style={styles.mobileStudentCard}>
                <View style={[styles.studentAvatar, { backgroundColor: classColor(selectedSection.class_grade) }]}>
                  <AppText style={styles.studentAvatarText} weight="semibold">
                    {(student.student_full_name || '?').charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.mobileStudentInfo}>
                  <AppText style={styles.studentNameText} weight="semibold" numberOfLines={1}>
                    {formatPersonName(student.student_full_name)}
                  </AppText>
                  <AppText style={styles.studentMetaLine} numberOfLines={1}>
                    Roll {student.roll_number || '—'} · {student.admission_number || '—'}
                  </AppText>
                </View>
                <AttendanceStatusBadge status={student.status || 'ABSENT'} />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.splitLayout}>
      <View style={styles.sidebar}>
        <AppText style={styles.sidebarTitle} weight="bold">Classes & Sections</AppText>
        <ScrollView>
          {groups.map(([grade, sections]) => {
            const color = classColor(grade);
            const total = sections.reduce((sum, s) => sum + (s.students_total || 0), 0);
            return (
              <View key={grade} style={styles.classGroup}>
                <View style={[styles.classHeader, { backgroundColor: color + '15' }]}>
                  <View style={[styles.classDot, { backgroundColor: color }]}>
                    <AppText style={styles.classDotText} weight="bold">{grade}</AppText>
                  </View>
                  <View>
                    <AppText style={styles.classTitle} weight="bold">Class {grade}</AppText>
                    <AppText style={styles.classSubtitle}>
                      {total} students · {sections.length} section{sections.length !== 1 ? 's' : ''}
                    </AppText>
                  </View>
                </View>
                {sections.map(sec => {
                  const isSelected = selectedSection?.class_grade === sec.class_grade && selectedSection?.section === sec.section;
                  const presentPct = sec.students_total ? Math.round(((sec.present || 0) / sec.students_total) * 100) : 0;
                  return (
                    <TouchableOpacity
                      accessibilityRole="button"
                      key={`${sec.class_grade}-${sec.section}`}
                      style={[styles.sectionItem, isSelected && styles.sectionItemSelected]}
                      onPress={() => onSelectedSectionChange(sec)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]} />
                      <View style={styles.sectionInfo}>
                        <AppText style={[styles.sectionName, isSelected && styles.sectionNameSelected]} weight={isSelected ? 'bold' : 'regular'}>
                          Section {sec.section}
                        </AppText>
                        <AppText style={styles.sectionSubtitle}>{sec.students_total || 0} students</AppText>
                      </View>
                      <View style={[styles.sectionPct, presentPct > 75 ? styles.sectionPctHigh : styles.sectionPctLow]}>
                        <AppText style={styles.sectionPctText} weight="bold">{presentPct}%</AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.mainPanel}>
        <View style={styles.panelHeader}>
          <View>
            <AppText style={styles.panelTitle} weight="bold">
              Class {selectedSection.class_grade} — Section {selectedSection.section}
            </AppText>
            <AppText style={styles.panelSubtitle}>{iso(date)}</AppText>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statChip, styles.statTotal]}>
              <AppText style={styles.statValue} weight="bold">{students.length}</AppText>
              <AppText style={styles.statLabel}>Total</AppText>
            </View>
            <View style={[styles.statChip, styles.statPresent]}>
              <AppText style={styles.statValue} weight="bold">{presentCount}</AppText>
              <AppText style={styles.statLabel}>Present</AppText>
            </View>
            <View style={[styles.statChip, styles.statHalf]}>
              <AppText style={styles.statValue} weight="bold">{halfDayCount}</AppText>
              <AppText style={styles.statLabel}>Half Day</AppText>
            </View>
            <View style={[styles.statChip, styles.statAbsent]}>
              <AppText style={styles.statValue} weight="bold">{absentCount}</AppText>
              <AppText style={styles.statLabel}>Absent</AppText>
            </View>
            <View style={[styles.statChip, attendancePct > 75 ? styles.statSuccess : styles.statDanger]}>
              <AppText style={styles.statValue} weight="bold">{attendancePct}%</AppText>
              <AppText style={styles.statLabel}>Rate</AppText>
            </View>
          </View>
        </View>

        <AttendanceFiltersBar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          placeholder="Search by name, roll no..."
          variant="bar"
          searchIconSize={18}
          clearIconSize={14}
        />

        {loading ? (
          <Loader />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Users2 size={48} color={C.muted} style={{ marginBottom: Theme.spacing.md }} />
            <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
            <AppText style={styles.emptyText}>Try adjusting your search</AppText>
          </View>
        ) : (
          <ScrollView horizontal>
            <View>
              <View style={styles.tableHeader}>
                <AppText style={[styles.tableHeaderText, styles.colNumber]} weight="bold">#</AppText>
                <AppText style={[styles.tableHeaderText, styles.colName]} weight="bold">Student</AppText>
                <AppText style={[styles.tableHeaderText, styles.colRoll]} weight="bold">Roll No</AppText>
                <AppText style={[styles.tableHeaderText, styles.colAdmission]} weight="bold">Admission No</AppText>
                <AppText style={[styles.tableHeaderText, styles.colStatus]} weight="bold">Status</AppText>
              </View>
              {filteredStudents.map((student, idx) => (
                <View key={student.student_id || student.roll_number || `desktop-student-${idx}`} style={styles.tableRow}>
                  <AppText style={[styles.tableCell, styles.colNumber, styles.cellNumber]}>{idx + 1}</AppText>
                  <View style={[styles.tableCell, styles.colName, styles.cellName]}>
                    <View style={[styles.studentAvatar, { backgroundColor: classColor(selectedSection.class_grade) }]}>
                      <AppText style={styles.studentAvatarText} weight="bold">
                        {(student.student_full_name || '?').charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                    <AppText style={styles.studentNameText} weight="semibold">{student.student_full_name || '—'}</AppText>
                  </View>
                  <AppText style={[styles.tableCell, styles.colRoll, styles.cellMono]}>{student.roll_number || '—'}</AppText>
                  <AppText style={[styles.tableCell, styles.colAdmission, styles.cellMono]}>{student.admission_number || '—'}</AppText>
                  <View style={[styles.tableCell, styles.colStatus]}>
                    <AttendanceStatusBadge status={student.status || 'ABSENT'} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.attendanceBar}>
          <AppText style={styles.attendanceLabel} weight="bold">Attendance</AppText>
          <View style={styles.attendanceTrack}>
            <View style={[styles.attendanceFill, { width: `${attendancePct}%` }]} />
          </View>
          <AppText style={[styles.attendancePct, attendancePct > 75 ? styles.attendancePctHigh : styles.attendancePctLow]} weight="bold">
            {attendancePct}%
          </AppText>
        </View>
      </View>
    </View>
  );
}
