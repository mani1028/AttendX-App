import React from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { X, Clock } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { getIconForField, resolveStudentId } from './helpers';
import { attendanceStatusLabel } from '../../../utils/helpers';
import { studentManagementStyles as styles } from './styles';
import type { SelectedClass, Student } from './types';

export interface StudentProfileSheetProps {
  student: Student | null;
  selectedClass: SelectedClass | null;
  columnCount: number;
  windowHeight: number;
  bottomInset: number;
  onClose: () => void;
  onOpenAttendance: (student: Student) => void;
}

export default function StudentProfileSheet({
  student,
  selectedClass,
  columnCount,
  windowHeight,
  bottomInset,
  onClose,
  onOpenAttendance,
}: StudentProfileSheetProps) {
  return (
    <Modal visible={!!student} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetCard,
            { maxHeight: windowHeight * 0.92, paddingBottom: Math.max(bottomInset, 16) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <AppText style={styles.sheetTitle} weight="semibold">Student Profile</AppText>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              style={styles.sheetCloseBtn}
              accessibilityLabel="Close"
            >
              <X size={20} color={C.t2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.studentSheetScroll}
            contentContainerStyle={styles.studentSheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {student && (
              <View style={styles.profileSheet}>
                <View style={styles.profileHeaderCardGradient}>
                  <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatarLarge}>
                      <AppText style={styles.profileAvatarText} weight="bold">
                        {student.student_full_name ? student.student_full_name.charAt(0).toUpperCase() : 'S'}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.profileHeaderMeta}>
                    <AppText style={styles.profileName} weight="semibold" numberOfLines={2}>
                      {student.student_full_name || '—'}
                    </AppText>
                    <AppText style={styles.profileRole} numberOfLines={1}>
                      Class {selectedClass?.label || '—'}
                    </AppText>
                    <AppText style={styles.profileSubText} numberOfLines={1}>
                      {student.student_id || student.studentId || (student as any).id || '—'} · Roll {student.roll_number || '—'}
                    </AppText>
                    <View style={[
                      styles.statusPill,
                      student.status === 'PRESENT' ? styles.statusActiveCard : styles.statusInactiveCard,
                    ]}>
                      <View style={[
                        styles.statusDot,
                        student.status === 'PRESENT' ? styles.statusDotPresent : styles.statusDotAbsent,
                      ]} />
                      <AppText style={[
                        styles.statusText,
                        student.status === 'PRESENT' ? styles.statusActiveCardText : styles.statusInactiveCardText,
                      ]} weight="semibold">
                        {attendanceStatusLabel(student.status)}
                      </AppText>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <AppText style={styles.detailSectionTitle} weight="semibold">Enrollment</AppText>
                  <View style={styles.detailGrid}>
                    {([
                      ['Student ID', student.student_id],
                      ['Roll number', student.roll_number],
                      ['Admission no.', student.admission_number],
                      ['Status', attendanceStatusLabel(student.status)],
                      ['Class', selectedClass?.label],
                    ] as const).map(([label, value]) => (
                      <View key={label} style={[styles.detailItem, { width: columnCount === 1 ? '100%' : '48%' }]}>
                        <View style={styles.detailIconContainer}>
                          {getIconForField(label, C.primary, 16)}
                        </View>
                        <View style={styles.detailInfoContainer}>
                          <AppText style={styles.detailLabel}>{label}</AppText>
                          <AppText style={styles.detailValue} weight="medium" numberOfLines={2}>{value || '—'}</AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <AppText style={styles.detailSectionTitle} weight="semibold">Personal & contact</AppText>
                  <View style={styles.detailGrid}>
                    {([
                      ['Parent', student.parent_name],
                      ['Phone', student.phone],
                      ['Emergency', student.emergency_contact],
                      ['Gender', student.gender],
                      ['Date of birth', student.dob],
                      ['Email', typeof student.email === 'string' ? student.email.toLowerCase() : student.email],
                      ['Address', student.address],
                    ] as const).map(([label, value]) => (
                      <View key={label} style={[styles.detailItem, { width: columnCount === 1 ? '100%' : '48%' }]}>
                        <View style={styles.detailIconContainer}>
                          {getIconForField(label, C.primary, 16)}
                        </View>
                        <View style={styles.detailInfoContainer}>
                          <AppText style={styles.detailLabel}>{label}</AppText>
                          <AppText style={styles.detailValue} weight="medium" numberOfLines={3}>{value || '—'}</AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {student ? (
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.sheetFooterBtn, styles.cardActionSecondary]}
                onPress={onClose}
              >
                <AppText style={styles.cardActionSecondaryText} weight="semibold">Close</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.sheetFooterBtn, styles.cardActionPrimary]}
                onPress={() => {
                  const studentId = resolveStudentId(student);
                  onClose();
                  onOpenAttendance(student);
                }}
              >
                <Clock size={14} color={Theme.colors.card} />
                <AppText style={styles.cardActionPrimaryText} weight="semibold">Attendance</AppText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
