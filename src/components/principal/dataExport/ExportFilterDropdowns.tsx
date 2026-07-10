import React from 'react';
import { View } from 'react-native';
import AppText from '../../common/AppText';
import FormSelectPicker from '../../common/FormSelectPicker';
import { dataExportStyles as styles } from './dataExportStyles';
import type { Exam } from './types';

export interface ExportFilterDropdownsProps {
  classGrade: string;
  setClassGrade: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  classOptions: string[];
  sectionOptions: string[];
  selectedExam?: string;
  setSelectedExam?: (v: string) => void;
  examsList?: Exam[];
}

export default function ExportFilterDropdowns({
  classGrade,
  setClassGrade,
  section,
  setSection,
  classOptions,
  sectionOptions,
  selectedExam,
  setSelectedExam,
  examsList,
}: ExportFilterDropdownsProps) {
  const classPickerOptions = [
    { label: 'All Classes', value: '' },
    ...classOptions.map((cls) => ({ label: cls, value: cls })),
  ];

  const sectionPickerOptions = [
    { label: 'All Sections', value: '' },
    ...sectionOptions.map((sec) => ({ label: sec, value: sec })),
  ];

  const showExam = Boolean(setSelectedExam && examsList);
  const examPickerOptions = showExam
    ? [
        { label: '-- Select Exam --', value: '' },
        ...(examsList || []).map((exam) => ({
          label: `${exam.exam_name} (${exam.academic_year})`,
          value: exam.exam_id.toString(),
        })),
      ]
    : [];

  return (
    <>
      {showExam ? (
        <View style={styles.field}>
          <AppText style={styles.label} weight="bold">Select Exam</AppText>
          <FormSelectPicker
            value={selectedExam || ''}
            onChange={setSelectedExam!}
            options={examPickerOptions}
            title="Select Exam"
            placeholder="-- Select Exam --"
          />
        </View>
      ) : null}

      <View style={styles.field}>
        <AppText style={styles.label} weight="bold">Class (Optional)</AppText>
        <FormSelectPicker
          value={classGrade}
          onChange={setClassGrade}
          options={classPickerOptions}
          title="Select Class"
          placeholder="All Classes"
        />
      </View>

      <View style={styles.field}>
        <AppText style={styles.label} weight="bold">Section (Optional)</AppText>
        <FormSelectPicker
          value={section}
          onChange={setSection}
          options={sectionPickerOptions}
          title="Select Section"
          placeholder="All Sections"
        />
      </View>
    </>
  );
}
