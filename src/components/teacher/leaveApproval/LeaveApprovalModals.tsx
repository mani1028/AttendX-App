import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { XCircle, User, BookOpen, Calendar, CheckCircle2 } from 'lucide-react-native';
import BottomSheetModal from '../../common/BottomSheetModal';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import LeaveApprovalStatusBadge from './LeaveApprovalStatusBadge';
import { formatDate } from './helpers';
import { leaveApprovalStyles as styles } from './leaveApprovalStyles';
import type { LeaveRequest, ClassItem, SectionItem } from './types';

export interface LeaveApprovalModalsProps {
  showFilterModal: boolean;
  onCloseFilter: () => void;
  classes: ClassItem[];
  sections: SectionItem[];
  classId: string;
  sectionId: string;
  onClassIdChange: (id: string) => void;
  onSectionIdChange: (id: string) => void;
  onApplyFilters: () => void;
  selectedRequest: LeaveRequest | null;
  onCloseDetail: () => void;
  onActOnLeave: (id: string, action: 'APPROVE' | 'REJECTED') => void;
}

export default function LeaveApprovalModals(props: LeaveApprovalModalsProps) {
  const {
    showFilterModal, onCloseFilter, classes, sections, classId, sectionId,
    onClassIdChange, onSectionIdChange, onApplyFilters,
    selectedRequest, onCloseDetail, onActOnLeave,
  } = props;
  return (
    <>
      <BottomSheetModal visible={showFilterModal} onClose={() => onCloseFilter()} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <AppText weight="bold" style={styles.modalTitle}>Select Class & Section</AppText>
          <TouchableOpacity accessibilityRole="button" onPress={() => onCloseFilter()} style={styles.modalClose}>
            <XCircle size={24} color={Theme.colors.textSec} />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
          <AppText weight="bold" style={styles.modalLabel}>Class</AppText>
          <View style={styles.chipContainer}>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.chip, !classId && styles.chipActive]}
              onPress={() => onClassIdChange('')}
            >
              <AppText weight="semibold" style={[styles.chipText, !classId && styles.chipTextActive]}>All Classes</AppText>
            </TouchableOpacity>
            {classes.map((cls) => (
              <TouchableOpacity accessibilityRole="button"
                key={cls.id}
                style={[styles.chip, classId === cls.id && styles.chipActive]}
                onPress={() => onClassIdChange(cls.id)}
              >
                <AppText weight="semibold" style={[styles.chipText, classId === cls.id && styles.chipTextActive]}>
                  {cls.name || cls.class_grade}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText weight="bold" style={styles.modalLabelSection}>Section</AppText>
          <View style={styles.chipContainer}>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.chip, !sectionId && styles.chipActive]}
              onPress={() => onSectionIdChange('')}
            >
              <AppText weight="semibold" style={[styles.chipText, !sectionId && styles.chipTextActive]}>All Sections</AppText>
            </TouchableOpacity>
            {sections.map((sec) => (
              <TouchableOpacity accessibilityRole="button"
                key={sec.id}
                style={[styles.chip, sectionId === sec.id && styles.chipActive]}
                onPress={() => onSectionIdChange(sec.id)}
              >
                <AppText weight="semibold" style={[styles.chipText, sectionId === sec.id && styles.chipTextActive]}>
                  {sec.name || sec.section}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <AppButton
            title="Apply Filters"
            onPress={() => onCloseFilter()}
            style={styles.modalApplyBtn}
          />
        </View>
      </BottomSheetModal>

      <Modal
        visible={selectedRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => onCloseDetail()}
      >
        <View style={styles.detailOverlay}>
          <TouchableOpacity
            style={styles.detailBackdrop}
            activeOpacity={1}
            onPress={() => onCloseDetail()}
          />
          {selectedRequest ? (
            <View style={styles.detailSheet}>
              <View style={styles.modalHeader}>
                <AppText weight="bold" style={styles.modalTitle}>Leave Application Details</AppText>
                <TouchableOpacity accessibilityRole="button" onPress={() => onCloseDetail()} style={styles.modalClose}>
                  <XCircle size={24} color={Theme.colors.textSec} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailsModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailsStudentSection}>
                  <View style={styles.avatarPlaceholderLarge}>
                    <User size={32} color={Theme.colors.textSec} />
                  </View>
                  <View style={styles.detailsStudentMeta}>
                    <AppText weight="bold" style={styles.detailsStudentName}>
                      {selectedRequest.student_full_name}
                    </AppText>
                    <AppText style={styles.detailsRollNumber}>
                      Roll No: {selectedRequest.roll_number}
                    </AppText>
                  </View>
                  <LeaveApprovalStatusBadge status={selectedRequest.status} />
                </View>

                <View style={styles.detailsDivider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailsGridRow}>
                    <View style={styles.detailsGridItem}>
                      <AppText style={styles.detailsGridLabel}>Class & Section</AppText>
                      <View style={styles.detailsGridValContainer}>
                        <BookOpen size={16} color={Theme.colors.primary} />
                        <AppText weight="bold" style={styles.detailsGridValue}>
                          {selectedRequest.class_grade} - {selectedRequest.section}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.detailsGridItem}>
                      <AppText style={styles.detailsGridLabel}>Duration</AppText>
                      <View style={styles.detailsGridValContainer}>
                        <Calendar size={16} color={Theme.colors.primary} />
                        <AppText weight="bold" style={styles.detailsGridValue}>
                          {(() => {
                            const diffTime = Math.abs(new Date(selectedRequest.to_date).getTime() - new Date(selectedRequest.from_date).getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                          })()}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSingleItem}>
                    <AppText style={styles.detailsGridLabel}>Leave Dates</AppText>
                    <AppText weight="semibold" style={styles.detailsDateRange}>
                      {formatDate(selectedRequest.from_date)}{selectedRequest.from_date !== selectedRequest.to_date ? ` to ${formatDate(selectedRequest.to_date)}` : ''}
                    </AppText>
                  </View>
                </View>

                <View style={styles.detailsDivider} />

                <AppText style={styles.detailsGridLabel}>Reason for Leave</AppText>
                <View style={styles.detailsReasonContainer}>
                  <AppText style={styles.detailsReasonText} selectable>
                    {selectedRequest.reason || 'No reason provided.'}
                  </AppText>
                </View>
              </ScrollView>

              {selectedRequest.status === 'PENDING' ? (
                <View style={styles.detailsActionButtons}>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.detailsActionBtn, styles.detailsRejectBtn]}
                    onPress={() => onActOnLeave(selectedRequest.leave_id, 'REJECTED')}
                  >
                    <XCircle size={18} color="#B91C1C" />
                    <AppText weight="bold" style={styles.detailsRejectBtnText}>Reject</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.detailsActionBtn, styles.detailsApproveBtn]}
                    onPress={() => onActOnLeave(selectedRequest.leave_id, 'APPROVE')}
                  >
                    <CheckCircle2 size={18} color={Theme.colors.card} />
                    <AppText weight="bold" style={styles.detailsApproveBtnText}>Approve</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.detailsCloseFooter}>
                  <AppButton title="Close" onPress={() => onCloseDetail()} />
                </View>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
