import React, { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Edit2, CheckCircle2, XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { C, Theme } from '../../../theme/tokens';
import { getIconForField } from './helpers';
import { teacherManagementStyles as styles } from './styles';
import type { Teacher } from './types';

export interface TeacherProfileSheetProps {
  teacher: Teacher | null;
  isCompactScreen: boolean;
  windowHeight: number;
  bottomInset: number;
  onClose: () => void;
  onEdit: (teacher: Teacher) => void;
}

export default function TeacherProfileSheet({
  teacher,
  isCompactScreen,
  windowHeight,
  bottomInset,
  onClose,
  onEdit,
}: TeacherProfileSheetProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const columnCount = isCompactScreen ? 1 : 2;

  const handleClose = () => {
    setDetailsExpanded(false);
    onClose();
  };

  const handleEdit = () => {
    if (!teacher) { return; }
    setDetailsExpanded(false);
    onEdit(teacher);
  };

  return (
    <Modal visible={!!teacher} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.sheetBackdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheetCard,
            styles.sheetCardColumn,
            { maxHeight: windowHeight * 0.92, paddingBottom: Math.max(bottomInset, 16) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <AppText style={styles.sheetTitle} weight="bold">Staff Profile</AppText>
            <TouchableOpacity accessibilityRole="button" onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
          >
            {teacher && (
              <View style={styles.profileSheet}>
                <View style={[styles.profileHeaderCardGradient, isCompactScreen && styles.profileHeaderCardGradientCompact]}>
                  <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatarLarge}>
                      <AppText style={styles.profileAvatarText} weight="bold">
                        {teacher.teacher_full_name ? teacher.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                      </AppText>
                    </View>
                  </View>
                  <View style={[styles.profileHeaderMeta, isCompactScreen && styles.profileHeaderMetaCentered]}>
                    <AppText style={[styles.profileName, isCompactScreen && styles.profileTextCentered]} weight="bold" numberOfLines={2}>
                      {teacher.teacher_full_name || '—'}
                    </AppText>
                    <AppText style={[styles.profileRole, isCompactScreen && styles.profileTextCentered]} weight="semibold" numberOfLines={1}>
                      {teacher.designation || 'Staff Member'}
                    </AppText>
                    <AppText style={[styles.profileSubText, isCompactScreen && styles.profileTextCentered]} numberOfLines={2}>
                      {teacher.department_subject || '—'}
                    </AppText>
                    <View style={[
                      styles.statusPill,
                      teacher.teacher_status === 'ACTIVE' ? styles.statusActiveCard : styles.statusInactiveCard,
                    ]}>
                      {teacher.teacher_status === 'ACTIVE' ? (
                        <CheckCircle2 size={10} color={Theme.colors.success} />
                      ) : (
                        <XCircle size={10} color={Theme.colors.error} />
                      )}
                      <AppText style={[
                        styles.statusText,
                        teacher.teacher_status === 'ACTIVE' ? styles.statusActiveCardText : styles.statusInactiveCardText,
                      ]} weight="bold">
                        {teacher.teacher_status || 'INACTIVE'}
                      </AppText>
                    </View>
                  </View>
                </View>

                {(() => {
                  const sections = [
                    {
                      title: 'Profile Overview',
                      fields: [
                        ['Employee ID', teacher.employee_id],
                        ['Teacher ID', teacher.teacher_id],
                        ['Designation', teacher.designation],
                        ['Department', teacher.department_subject],
                        ['Employment Type', teacher.employment_type],
                        ['Qualification', teacher.qualification],
                      ],
                    },
                    {
                      title: 'Contact & Personal',
                      fields: [
                        ['Mobile', teacher.mobile_number],
                        ['Alternate Mobile', teacher.alternate_mobile_number],
                        ['Email', teacher.email_id],
                        ['Gender', teacher.gender],
                        ['Age', teacher.age ? `${teacher.age} years` : '—'],
                        ['Date of Birth', teacher.date_of_birth],
                      ],
                    },
                    {
                      title: 'Address',
                      fields: [
                        ['House No', teacher.house_no],
                        ['Street', teacher.street_locality],
                        ['City', teacher.village_town_city],
                        ['Mandal/Taluk', teacher.mandal_taluk],
                        ['District', teacher.district],
                        ['State', teacher.state],
                        ['Pin Code', teacher.pin_code],
                      ],
                    },
                    {
                      title: 'Emergency Contact',
                      fields: [
                        ['Contact Name', teacher.emergency_contact_name],
                        ['Relationship', teacher.emergency_contact_relationship],
                        ['Contact Number', teacher.emergency_contact_number],
                      ],
                    },
                  ];

                  const visibleSections = sections.filter((_, idx) => detailsExpanded || idx < 2);
                  const hiddenCount = sections.length - visibleSections.length;

                  return (
                    <>
                      {visibleSections.map((section) => {
                        const visible = section.fields.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
                        if (visible.length === 0) { return null; }
                        return (
                          <View key={section.title} style={styles.detailSection}>
                            <AppText style={styles.detailSectionTitle} weight="bold">{section.title}</AppText>
                            <View style={styles.detailGrid}>
                              {visible.map(([label, value]) => (
                                <View key={label} style={[styles.detailItem, { width: columnCount === 1 ? '100%' : '48%' }]}>
                                  <View style={styles.detailIconContainer}>
                                    {getIconForField(label, C.primary, 16)}
                                  </View>
                                  <View style={styles.detailInfoContainer}>
                                    <AppText style={styles.detailLabel} weight="bold">{label}</AppText>
                                    <AppText style={styles.detailValue} weight="semibold" numberOfLines={3}>{value}</AppText>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })}

                      {hiddenCount > 0 && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => setDetailsExpanded(!detailsExpanded)}
                          style={styles.showMoreBtn}
                        >
                          <AppText style={styles.showMoreText} weight="bold">
                            {detailsExpanded ? 'Show less' : `Show more (${hiddenCount})`}
                          </AppText>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.sheetFooterBtn, styles.cardActionSecondary]}
              onPress={handleClose}
            >
              <AppText style={styles.cardActionSecondaryText} weight="semibold">Close</AppText>
            </TouchableOpacity>
            {teacher ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.sheetFooterBtn, styles.cardActionPrimary]}
                onPress={handleEdit}
              >
                <Edit2 size={14} color={Theme.colors.card} />
                <AppText style={styles.cardActionPrimaryText} weight="semibold">Edit Details</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
