import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import ExportFilterDropdowns from './ExportFilterDropdowns';
import { dataExportStyles as styles } from './dataExportStyles';
import type { Exam, CombinedPeriod } from './types';

export interface CombinedExportTabProps {
  selectedExam: string;
  setSelectedExam: (v: string) => void;
  examsList: Exam[];
  combinedPeriod: CombinedPeriod;
  setCombinedPeriod: React.Dispatch<React.SetStateAction<CombinedPeriod>>;
  combinedStartDate: string;
  combinedEndDate: string;
  combinedAnchorDate: string;
  setDatePickerMode: (mode: 'start' | 'end' | 'anchor') => void;
  setShowCombinedDatePicker: (v: boolean) => void;
  classGrade: string;
  setClassGrade: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  classOptions: string[];
  sectionOptions: string[];
  exporting: boolean;
  onExportCombined: () => void;
  resetFilters: () => void;
}

export default function CombinedExportTab({
  selectedExam,
  setSelectedExam,
  examsList,
  combinedPeriod,
  setCombinedPeriod,
  combinedStartDate,
  combinedEndDate,
  combinedAnchorDate,
  setDatePickerMode,
  setShowCombinedDatePicker,
  classGrade,
  setClassGrade,
  section,
  setSection,
  classOptions,
  sectionOptions,
  exporting,
  onExportCombined,
  resetFilters,
}: CombinedExportTabProps) {
  return (
    <>
      <View style={styles.grid}>
        <ExportFilterDropdowns
          selectedExam={selectedExam}
          setSelectedExam={setSelectedExam}
          examsList={examsList}
          classGrade={classGrade}
          setClassGrade={setClassGrade}
          section={section}
          setSection={setSection}
          classOptions={classOptions}
          sectionOptions={sectionOptions}
        />

        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Attendance Period</AppText>
          <View style={styles.selectWrapper}>
            {(['weekly', 'monthly', 'custom'] as const).map((period) => (
              <TouchableOpacity accessibilityRole="button" key={period} style={[styles.periodOption, combinedPeriod === period && styles.periodOptionSelected]} onPress={() => setCombinedPeriod(period)}>
                <AppText style={[styles.periodOptionText, combinedPeriod === period && styles.periodOptionTextSelected]} weight="semibold">
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {combinedPeriod !== 'custom' ? (
          <View style={styles.field}>
            <AppText style={styles.label} weight="bold">End Date (Anchor Date)</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.dateInput} onPress={() => { setDatePickerMode('anchor'); setShowCombinedDatePicker(true); }}>
              <AppText style={styles.dateInputText}>{combinedAnchorDate || 'Select Date'}</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">Start Date</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.dateInput} onPress={() => { setDatePickerMode('start'); setShowCombinedDatePicker(true); }}>
                <AppText style={styles.dateInputText}>{combinedStartDate || 'Select Date'}</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.field}>
              <AppText style={styles.label} weight="bold">End Date</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.dateInput} onPress={() => { setDatePickerMode('end'); setShowCombinedDatePicker(true); }}>
                <AppText style={styles.dateInputText}>{combinedEndDate || 'Select Date'}</AppText>
              </TouchableOpacity>
            </View>
          </>
        )}

      </View>

      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" style={styles.exportButton} onPress={onExportCombined} disabled={exporting || !selectedExam}>
          <AppText style={styles.exportButtonText} weight="bold">
            {exporting ? 'Preparing Excel...' : 'Download Combined Excel'}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <AppText style={styles.secondaryButtonText} weight="semibold">Reset Filters</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.hint}>
        Export includes marks data with subject-wise scores, overall grade, percentage, AND attendance percentage for the selected date range.
      </AppText>
    </>
  );
}
