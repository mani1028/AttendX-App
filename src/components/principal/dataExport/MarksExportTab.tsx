import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../../common/AppText';
import ExportFilterDropdowns from './ExportFilterDropdowns';
import { dataExportStyles as styles } from './dataExportStyles';
import type { Exam } from './types';

export interface MarksExportTabProps {
  selectedExam: string;
  setSelectedExam: (v: string) => void;
  examsList: Exam[];
  classGrade: string;
  setClassGrade: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  classOptions: string[];
  sectionOptions: string[];
  exporting: boolean;
  onExportMarks: () => void;
  resetFilters: () => void;
}

export default function MarksExportTab({
  selectedExam,
  setSelectedExam,
  examsList,
  classGrade,
  setClassGrade,
  section,
  setSection,
  classOptions,
  sectionOptions,
  exporting,
  onExportMarks,
  resetFilters,
}: MarksExportTabProps) {
  return (
    <>
      <View style={styles.marksGrid}>
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
      </View>

      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" style={styles.exportButton} onPress={onExportMarks} disabled={exporting || !selectedExam}>
          <AppText style={styles.exportButtonText} weight="bold">
            {exporting ? 'Preparing Excel...' : 'Download Marks Excel'}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={resetFilters} disabled={exporting}>
          <AppText style={styles.secondaryButtonText} weight="semibold">Reset Filters</AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.hint}>Export includes subject-wise marks with overall grade and percentage.</AppText>
    </>
  );
}
