import React from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { X, GraduationCap, User, Calendar, Search, Phone } from 'lucide-react-native';
import BottomSheetModal from '../../common/BottomSheetModal';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import BloodGroupPicker from '../../common/BloodGroupPicker';
import { Theme } from '../../../theme/tokens';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { getStudentPhotoUri, initials } from './helpers';
import { studentListStyles as styles } from './studentListStyles';
import type { Student } from './types';

export interface StudentDetailSheetProps {
  student: Student | null;
  isEditing: boolean;
  editStudent: Partial<Student>;
  saving: boolean;
  isClassTeacher: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
  onEditChange: (patch: Partial<Student>) => void;
  onSave: () => void;
}

export default function StudentDetailSheet({
  student: viewStudent,
  isEditing: isEditingStudent,
  editStudent,
  saving: savingStudent,
  isClassTeacher,
  onClose,
  onToggleEdit,
  onEditChange,
  onSave: handleSaveStudent,
}: StudentDetailSheetProps) {
      return (
    <BottomSheetModal visible={!!viewStudent} onClose={onClose} sheetStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHandle} />
          <TouchableOpacity onPress={() => onClose()} style={styles.modalClose}>
            <X size={24} color={Theme.colors.textSec} />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.modalProfileHeader}>
            <View style={styles.modalAvatarContainer}>
              {getStudentPhotoUri(viewStudent?.student_photograph) ? (
                <Image
                  source={{ uri: getStudentPhotoUri(viewStudent?.student_photograph)! }}
                  style={styles.modalLargeAvatar}
                />
              ) : (
                <View style={styles.modalLargePlaceholder}>
                  <AppText weight="bold" style={styles.modalLargeAvatarText}>{initials(viewStudent?.student_full_name || '')}</AppText>
                </View>
              )}
              <View style={[styles.modalStatusBadge, { backgroundColor: viewStudent?.student_status === 'ACTIVE' ? Theme.colors.success : Theme.colors.error }]}>
                <AppText weight="bold" style={styles.modalStatusText}>{viewStudent?.student_status}</AppText>
              </View>
            </View>
            <AppText weight="bold" style={styles.modalName}>{viewStudent?.student_full_name}</AppText>
            <AppText weight="semibold" style={styles.modalSub}>{viewStudent?.student_id} • Roll {viewStudent?.roll_number}</AppText>
          </View>

          <View style={styles.modalActionRow}>
            {isClassTeacher && (
              <AppButton
                title={isEditingStudent ? 'Cancel Edit' : 'Edit Profile'}
                type="secondary"
                onPress={() => onToggleEdit()}
                style={styles.modalActionBtn}
              />
            )}
          </View>

          {/* Info Sections */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#eef2ff' }]}>
                  <GraduationCap size={18} color="#6366f1" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Class & Section</AppText>
                  <AppText weight="bold" style={styles.infoValue}>{viewStudent?.class_grade} - {viewStudent?.section}</AppText>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#fdf2f8' }]}>
                  <User size={18} color="#ec4899" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Gender</AppText>
                  {isEditingStudent ? (
                    <TextInput
                      style={styles.editInput}
                      value={String(editStudent.gender || '')}
                      onChangeText={(value) => onEditChange({ gender: value })}
                      placeholder="Gender"
                    />
                  ) : (
                    <AppText weight="bold" style={styles.infoValue}>{viewStudent?.gender || '—'}</AppText>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#fff7ed' }]}>
                  <Calendar size={18} color="#f97316" />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Date of Birth</AppText>
                  {isEditingStudent ? (
                    <TextInput
                      style={styles.editInput}
                      value={String(editStudent.date_of_birth || '')}
                      onChangeText={(value) => onEditChange({ date_of_birth: value })}
                      placeholder="YYYY-MM-DD"
                    />
                  ) : (
                    <AppText weight="bold" style={styles.infoValue}>{viewStudent?.date_of_birth || '—'}</AppText>
                  )}
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Search size={18} color={Theme.colors.success} />
                </View>
                <View>
                  <AppText weight="bold" style={styles.infoLabel}>Blood Group</AppText>
                  {isEditingStudent ? (
                    <BloodGroupPicker
                      value={String(editStudent.blood_group || '')}
                      onChange={(value) => onEditChange({ blood_group: value })}
                      style={styles.editInput}
                    />
                  ) : (
                    <AppText weight="bold" style={styles.infoValue}>{viewStudent?.blood_group || '—'}</AppText>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Parents Info */}
          <AppText weight="bold" style={styles.sectionTitle}>Parent / Guardian Details</AppText>
          <View style={styles.parentCard}>
            <View style={styles.parentItem}>
              <View style={styles.parentHeader}>
                <AppText weight="bold" style={styles.parentRole}>Father / Guardian</AppText>
                <TouchableOpacity style={styles.callBtn}>
                  <Phone size={16} color={Theme.colors.violet} />
                </TouchableOpacity>
              </View>
              {isEditingStudent ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.father_guardian_name || '')}
                    onChangeText={(value) => onEditChange({ father_guardian_name: value })}
                    placeholder="Father / Guardian Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.father_guardian_mobile || '')}
                    onChangeText={(value) => onEditChange({ father_guardian_mobile: value })}
                    placeholder="Father / Guardian Mobile"
                    keyboardType="phone-pad"
                  />
                </>
              ) : (
                <>
                  <AppText weight="bold" style={styles.parentName}>{viewStudent?.father_guardian_name || '—'}</AppText>
                  <AppText weight="semibold" style={styles.parentPhone}>{viewStudent?.father_guardian_mobile || '—'}</AppText>
                </>
              )}
            </View>

            <View style={styles.parentDivider} />

            <View style={styles.parentItem}>
              <View style={styles.parentHeader}>
                <AppText weight="bold" style={styles.parentRole}>Mother / Guardian</AppText>
                <TouchableOpacity style={styles.callBtn}>
                  <Phone size={16} color={Theme.colors.violet} />
                </TouchableOpacity>
              </View>
              {isEditingStudent ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.mother_guardian_name || '')}
                    onChangeText={(value) => onEditChange({ mother_guardian_name: value })}
                    placeholder="Mother / Guardian Name"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={String(editStudent.mother_guardian_mobile || '')}
                    onChangeText={(value) => onEditChange({ mother_guardian_mobile: value })}
                    placeholder="Mother / Guardian Mobile"
                    keyboardType="phone-pad"
                  />
                </>
              ) : (
                <>
                  <AppText weight="bold" style={styles.parentName}>{viewStudent?.mother_guardian_name || '—'}</AppText>
                  <AppText weight="semibold" style={styles.parentPhone}>{viewStudent?.mother_guardian_mobile || '—'}</AppText>
                </>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          {isEditingStudent ? (
            <AppButton
              title={savingStudent ? 'Saving...' : 'Save Changes'}
              onPress={handleSaveStudent}
              disabled={savingStudent}
              style={styles.doneBtn}
            />
          ) : (
            <AppButton
              title="Done"
              onPress={() => onClose()}
              style={styles.doneBtn}
            />
          )}
        </View>
      </BottomSheetModal>
  );
}
