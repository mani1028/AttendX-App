import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import ExportFilterDropdowns from './ExportFilterDropdowns';
import { dataExportStyles as styles } from './dataExportStyles';
import type { AttendancePeriod } from './types';

export interface AttendanceExportTabProps {
  attendancePeriod: AttendancePeriod;
  setAttendancePeriod: React.Dispatch<React.SetStateAction<AttendancePeriod>>;
  attendanceStartDate: string;
  setAttendanceStartDate: (v: string) => void;
  attendanceEndDate: string;
  setAttendanceEndDate: (v: string) => void;
  attendanceAnchorDate: string;
  setAttendanceAnchorDate: (v: string) => void;
  classGrade: string;
  setClassGrade: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  classOptions: string[];
  sectionOptions: string[];
  exporting: boolean;
  onExportAttendance: () => void;
  resetFilters: () => void;
  renderDatePicker: (mode: 'start' | 'end' | 'anchor', currentDate: string, onChange: (date: string) => void) => React.ReactNode;
}

export default function AttendanceExportTab({
  attendancePeriod,
  setAttendancePeriod,
  attendanceStartDate,
  setAttendanceStartDate,
  attendanceEndDate,
  setAttendanceEndDate,
  attendanceAnchorDate,
  setAttendanceAnchorDate,
  classGrade,
  setClassGrade,
  section,
  setSection,
  classOptions,
  sectionOptions,
  exporting,
  onExportAttendance,
  resetFilters,
  renderDatePicker,
}: AttendanceExportTabProps) {
  return (
    <>
      <View style={styles.grid}>
        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Period</AppText>
          <View style={styles.selectWrapper}>
            {(['weekly', 'monthly', '3months', '6months', 'year', 'custom'] as const).map((period) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={period}
                style={[styles.periodOption, attendancePeriod === period && styles.periodOptionSelected]}
                onPress={() => setAttendancePeriod(period)}
              >
                <AppText style={[styles.periodOptionText, attendancePeriod === period && styles.periodOptionTextSelected]} weight="semibold">
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {attendancePeriod !== 'custom' ? (
          <View style={styles.field}>
            <AppText style={styles.label} weight="bold">End Date (Anchor Date)</AppText>
            {renderDatePicker('anchor', attendanceAnchorDate, setAttendanceAnchorDate)}
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">Start Date</AppText>
              {renderDatePicker('start', attendanceStartDate, setAttendanceStartDate)}
            </View>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">End Date</AppText>
              {renderDatePicker('end', attendanceEndDate, setAttendanceEndDate)}
            </View>
          </>
        )}

        <ExportFilterDropdowns
          classGrade={classGrade}
          setClassGrade={setClassGrade}
          section={section}
          setSection={setSection}
          classOptions={classOptions}
          sectionOptions={sectionOptions}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" style={styles.exportButton} onPress={onExportAttendance} disabled={exporting}>
          <AppText style={styles.exportButtonText} weight="bold">
            {exporting ? 'Preparing Excel...' : 'Download Attendance Excel'}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <AppText style={styles.secondaryButtonText} weight="semibold">Reset Filters</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.hint}>
        Export includes attendance data with attendance percentage column for each student.
        Percentage calculated as: (Present Days / Total Days) × 100
      </AppText>
    </>
  );
}
