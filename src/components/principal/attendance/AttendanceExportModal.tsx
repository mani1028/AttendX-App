import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Calendar, ArrowRight, X, CheckCircle2 } from 'lucide-react-native';
import API from '../../../services/api';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { classColor, groupClassItems, iso } from './helpers';
import { attendanceStyles as styles } from './styles';
import type { ClassItem, ExportType, SectionGroup } from './types';

export interface AttendanceExportModalProps {
  visible: boolean;
  type: ExportType;
  classItems?: ClassItem[];
  onClose: () => void;
  showToast: (msg: string, type?: string) => void;
  headers: Record<string, string>;
}

export default function AttendanceExportModal({
  visible,
  type,
  classItems,
  onClose,
  showToast,
  headers,
}: AttendanceExportModalProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const groups = useMemo(() => {
    if (type !== 'students' || !classItems) { return [] as [string, SectionGroup[]][]; }
    return groupClassItems(classItems);
  }, [classItems, type]);

  const toggleSection = (grade: string, section: string) => {
    const key = `${grade}:${section}`;
    const newSet = new Set(selectedSections);
    if (newSet.has(key)) { newSet.delete(key); } else { newSet.add(key); }
    setSelectedSections(newSet);
  };

  const toggleClass = (grade: string, sections: SectionGroup[]) => {
    const allSelected = sections.every(s => selectedSections.has(`${grade}:${s.section}`));
    const newSet = new Set(selectedSections);
    sections.forEach(s => {
      const key = `${grade}:${s.section}`;
      if (allSelected) { newSet.delete(key); } else { newSet.add(key); }
    });
    setSelectedSections(newSet);
  };

  const selectAll = () => {
    const newSet = new Set<string>();
    groups.forEach(([grade, sections]) => {
      sections.forEach(s => newSet.add(`${grade}:${s.section}`));
    });
    setSelectedSections(newSet);
  };

  const clearAll = () => setSelectedSections(new Set());
  const selectedCount = selectedSections.size;

  const runExport = async () => {
    if (type === 'students' && selectedCount === 0) {
      showToast('Select at least one class/section', 'error');
      return;
    }
    if (startDate > endDate) {
      showToast('Start date must be ≤ end date', 'error');
      return;
    }

    setExporting(true);
    setProgress('Preparing export...');

    try {
      const from = iso(startDate);
      const to = iso(endDate);
      const fileName = type === 'teachers'
        ? `teachers_attendance_${from}_to_${to}.csv`
        : `students_attendance_${from}_to_${to}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      let response;
      if (type === 'teachers') {
        response = await API.get('principal/teachers/export', {
          headers,
          params: { start_date: from, end_date: to, file_format: 'csv' },
        });
      } else {
        const tasks: { class_grade: string; section: string }[] = [];
        groups.forEach(([grade, sections]) => {
          sections.forEach(sec => {
            if (selectedSections.has(`${grade}:${sec.section}`)) {
              tasks.push({ class_grade: grade, section: sec.section });
            }
          });
        });
        response = await API.get('principal/students/export', {
          headers,
          params: {
            start_date: from,
            end_date: to,
            class_sections: JSON.stringify(tasks),
            file_format: 'csv',
          },
        });
      }

      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      await RNFS.writeFile(filePath, content, 'utf8');

      const fileUri = Platform.OS === 'android'
        ? `content://com.visys.attendx.fileprovider/internal_files/${fileName}`
        : `file://${filePath}`;

      await Share.open({
        url: fileUri,
        type: 'text/csv',
        filename: fileName,
        title: 'Export Attendance',
      });

      if (!isMounted.current) { return; }
      showToast(`${type === 'teachers' ? 'Teachers' : 'Students'} export completed`);
      onClose();
    } catch (error: any) {
      if (!isMounted.current) { return; }
      if (error?.response?.status === 401) { return; }
      console.error('Export Error:', error);
      if (error.message !== 'User did not share') {
        showToast('Export failed', 'error');
      }
    } finally {
      if (isMounted.current) {
        setExporting(false);
        setProgress('');
      }
    }
  };

  const dateRangeLength = (() => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} weight="bold">
              Export {type === 'teachers' ? 'Teacher' : 'Student'} Attendance
            </AppText>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.modalClose}>
              <X size={20} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <AppText style={styles.modalLabel} weight="semibold">Date Range</AppText>
            <View style={styles.dateRangeRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Calendar size={14} color={C.primary} style={{ marginRight: 6 }} />
                <AppText style={styles.dateText}>{iso(startDate)}</AppText>
              </TouchableOpacity>
              <ArrowRight size={16} color={C.muted} />
              <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Calendar size={14} color={C.primary} style={{ marginRight: 6 }} />
                <AppText style={styles.dateText}>{iso(endDate)}</AppText>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) {
                    setStartDate(date);
                    if (date > endDate) { setEndDate(date); }
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) { setEndDate(date); }
                }}
              />
            )}
            <AppText style={styles.modalHint}>{dateRangeLength} day{dateRangeLength !== 1 ? 's' : ''} selected</AppText>

            {type === 'students' && groups.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <AppText style={styles.modalLabel} weight="semibold">Classes & Sections</AppText>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity accessibilityRole="button" style={styles.selectAllBtn} onPress={selectAll}>
                      <AppText style={styles.selectAllText} weight="semibold">Select All</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" style={styles.clearAllBtn} onPress={clearAll}>
                      <AppText style={styles.clearAllText} weight="semibold">Clear All</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {groups.map(([grade, sections]) => {
                  const allSelected = sections.every(s => selectedSections.has(`${grade}:${s.section}`));
                  const someSelected = sections.some(s => selectedSections.has(`${grade}:${s.section}`));
                  const color = classColor(grade);
                  return (
                    <View key={grade} style={styles.classGroup}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.classHeader}
                        onPress={() => toggleClass(grade, sections)}
                      >
                        <View style={[styles.classDot, { backgroundColor: color }]}>
                          <AppText style={styles.classDotText} weight="bold">{grade}</AppText>
                        </View>
                        <AppText style={styles.classTitle} weight="bold">Class {grade}</AppText>
                        <View style={[styles.checkbox, allSelected && styles.checkboxChecked, someSelected && !allSelected && styles.checkboxIndeterminate]} />
                      </TouchableOpacity>

                      {sections.map(sec => {
                        const key = `${grade}:${sec.section}`;
                        const isSelected = selectedSections.has(key);
                        return (
                          <TouchableOpacity
                            accessibilityRole="button"
                            key={key}
                            style={[styles.sectionRow, isSelected && styles.sectionRowSelected]}
                            onPress={() => toggleSection(grade, sec.section)}
                          >
                            <View style={[styles.checkboxSmall, isSelected && styles.checkboxSmallChecked]}>
                              {isSelected && <CheckCircle2 size={12} color={Theme.colors.card} />}
                            </View>
                            <AppText style={styles.sectionText}>Section {sec.section}</AppText>
                            <AppText style={styles.sectionCount}>{sec.students_total || 0} students</AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                <AppText style={styles.selectedCount} weight="semibold">
                  {selectedCount === 0 ? 'No sections selected' : `${selectedCount} section${selectedCount !== 1 ? 's' : ''} selected`}
                </AppText>
              </>
            )}

            {exporting && (
              <View style={styles.progressWrap}>
                <ActivityIndicator size="small" color={C.primary} />
                <AppText style={styles.progressText} weight="semibold">{progress || 'Preparing export...'}</AppText>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AppButton title="Cancel" onPress={onClose} type="secondary" />
            <AppButton title={exporting ? 'Exporting...' : 'Export'} onPress={runExport} disabled={exporting} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
