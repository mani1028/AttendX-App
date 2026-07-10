/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { View, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X, BookOpen, Plus, Users, ChevronDown, Trash2, User, ChevronRight, AlertTriangle } from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { innerPageLayoutStyles } from '../../layout/innerPageLayoutStyles';
import { teacherAssignmentsStyles as styles } from './teacherAssignmentsStyles';
import { teacherLabel } from './helpers';

export default function TeacherAssignmentsModals(p: any) {
  const {
    showGlobalPoolManager, setShowGlobalPoolManager, newGlobalSubject, setNewGlobalSubject,
    globalSubjects, addGlobalSubject, deleteGlobalSubject, teacherPickerVisible, setTeacherPickerVisible,
    teachers, onPickTeacher, subjectModalOpen, setSubjectModalOpen, subjectModalNewSubject,
    setSubjectModalNewSubject, subjectModalError, subjectTeacherSaving, addSubjectToClass,
    overrideOpen, setOverrideOpen, overrideConflict, setOverrideConflict, classTeacherSaving, saveClassTeacher,
    selectedClass, selectedSection, selectedGlobalSubjects, setSelectedGlobalSubjects,
    addSubjectToGlobalPool, deleteFromGlobalPool, importToClass,
    teacherSearchText, setTeacherSearchText, filteredTeachers, handleCreateSubject,
  } = p;
  return (
    <>

      {/* ── Global Pool Manager Modal ────────────────────────────────────── */}
      <Modal visible={showGlobalPoolManager} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: '80%' }]}>
            <View style={styles.modalHead}>
              <View style={styles.cardTitleRow}>
                <BookOpen size={20} color={C.text} />
                <AppText style={styles.modalTitle} weight="bold">Global Subject Pool</AppText>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowGlobalPoolManager(false)} style={{ padding: 6 }}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <AppText style={{ fontSize: Theme.typography.caption.fontSize, color: C.text2, marginBottom: Theme.spacing.md }}>
                Add subjects here once, then import them into any class/section.
              </AppText>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: Theme.spacing.xl }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, height: 50 }]}
                  placeholder="New Subject Name"
                  value={newGlobalSubject}
                  onChangeText={setNewGlobalSubject}
                  placeholderTextColor={C.text3}
                />
                <AppButton
                  title=""
                  leftIcon={<Plus size={20} color={Theme.colors.card} />}
                  onPress={addSubjectToGlobalPool}
                  style={{ width: 50, height: 50 }}
                />
              </View>

              <AppText style={[styles.label, { marginBottom: Theme.spacing.md }]} weight="bold">
                Import to Class {selectedClass}-{selectedSection || '?'}
              </AppText>

              <ScrollView style={{ maxHeight: 260, borderWidth: 1, borderColor: C.borderSoft, borderRadius: Theme.radius.md }}>
                {globalSubjects.length === 0 ? (
                  <View style={{ padding: Theme.spacing.xl, alignItems: 'center' }}>
                    <AppText style={{ color: C.text3 }}>No global subjects yet.</AppText>
                  </View>
                ) : (
                  globalSubjects.map((s: any, idx: number) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={s.pool_id || s.subject_name || `pool-${idx}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: Theme.spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: C.borderSoft,
                      }}
                      onPress={() => {
                        if (selectedGlobalSubjects.includes(s.subject_name)) {
                          setSelectedGlobalSubjects((prev: any) => prev.filter((x: any) => x !== s.subject_name));
                        } else {
                          setSelectedGlobalSubjects((prev: any) => [...prev, s.subject_name]);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md, flex: 1 }}>
                        <View style={{
                          width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                          borderColor: selectedGlobalSubjects.includes(s.subject_name) ? C.primary : C.border,
                          backgroundColor: selectedGlobalSubjects.includes(s.subject_name) ? C.primary : 'transparent',
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          {selectedGlobalSubjects.includes(s.subject_name) && <Plus size={14} color={Theme.colors.card} />}
                        </View>
                        <AppText style={{ color: C.text }}>{s.subject_name}</AppText>
                      </View>
                      <TouchableOpacity accessibilityRole="button" onPress={() => deleteFromGlobalPool(s.subject_name)} style={{ padding: Theme.spacing.xs }}>
                        <Trash2 size={16} color={C.danger} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
            <View style={styles.modalFoot}>
              <AppButton
                title="Cancel"
                type="secondary"
                onPress={() => { setShowGlobalPoolManager(false); setSelectedGlobalSubjects([]); }}
                style={{ marginRight: Theme.spacing.sm, flex: 1 }}
              />
              <AppButton
                title={`Import (${selectedGlobalSubjects.length})`}
                type="primary"
                disabled={selectedGlobalSubjects.length === 0 || !selectedClass}
                onPress={importToClass}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Teacher Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={teacherPickerVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.pickerModal]}>
            <View style={styles.modalHead}>
              <AppText style={styles.modalTitle} weight="bold">Select Teacher</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setTeacherPickerVisible(false)} style={{ padding: 6 }}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            {teachers && teachers.length > 5 && (
              <View style={{ paddingHorizontal: Theme.spacing.lg, paddingBottom: Theme.spacing.sm }}>
                <TextInput
                  style={[styles.input, { height: 45, fontSize: Theme.typography.body.fontSize }]}
                  placeholder="Search teacher by name or ID..."
                  placeholderTextColor={C.text3}
                  value={teacherSearchText}
                  onChangeText={setTeacherSearchText}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
              </View>
            )}

            {filteredTeachers && filteredTeachers.length > 0 ? (
              <ScrollView style={[styles.pickerScrollView, innerPageLayoutStyles.scrollViewFront]}>
                {filteredTeachers.map((teacher: any) => (
                  <TouchableOpacity accessibilityRole="button"
                    key={String(teacher.teacher_id)}
                    style={styles.pickerOption}
                    onPress={() => onPickTeacher(teacher)}
                  >
                    <View style={styles.pickerIcon}>
                      <User size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.pickerOptionText} weight="bold">{teacher.teacher_full_name}</AppText>
                      <AppText style={styles.pickerOptionSub}>{teacher.employee_id || teacher.teacher_id}</AppText>
                    </View>
                    <ChevronRight size={18} color={C.text3} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyPickerList}>
                <AppText style={styles.emptyPickerText}>
                  {teachers.length === 0 ? 'No teachers available' : 'No matching teachers'}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Add Subject Modal ─────────────────────────────────────────────── */}
      <Modal visible={subjectModalOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <View style={styles.cardTitleRow}>
                <BookOpen size={20} color={C.text} />
                <AppText style={styles.modalTitle} weight="bold">Add Subject</AppText>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => setSubjectModalOpen(false)} style={{ padding: 6 }}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <AppText style={styles.label} weight="bold">Subject Name</AppText>
              <TextInput
                style={[styles.input, { height: 50 }]}
                value={subjectModalNewSubject}
                onChangeText={setSubjectModalNewSubject}
                placeholder="Enter subject name"
                placeholderTextColor={C.text3}
              />
              {subjectModalError ? (
                <AppText style={{ color: C.danger, fontSize: Theme.typography.caption.fontSize, marginTop: Theme.spacing.sm }}>{subjectModalError}</AppText>
              ) : null}
            </View>
            <View style={styles.modalFoot}>
              <AppButton
                title="Cancel"
                type="secondary"
                onPress={() => setSubjectModalOpen(false)}
                style={{ marginRight: Theme.spacing.sm, flex: 1 }}
              />
              <AppButton
                title="Add Subject"
                type="primary"
                disabled={!subjectModalNewSubject.trim() || subjectTeacherSaving}
                onPress={handleCreateSubject}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Override Conflict Modal ───────────────────────────────────────── */}
      <Modal visible={overrideOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <AlertTriangle size={20} color={C.warning} />
              <AppText style={[styles.modalTitle, { marginLeft: 6 }]} weight="bold">Class Teacher Already Assigned</AppText>
            </View>
            <View style={styles.modalBody}>
              <AppText style={{ color: C.text2, lineHeight: 22 }}>
                <AppText style={{ color: C.text }} weight="bold">{overrideConflict?.teacher_name}</AppText> is already
                assigned as class teacher for{' '}
                <AppText style={{ color: C.text }} weight="bold">
                  Class {overrideConflict?.current_class_grade} — Section {overrideConflict?.current_section}
                </AppText>.{'\n\n'}
                Choose how to continue for{' '}
                <AppText style={{ color: C.text }} weight="bold">
                  Class {selectedClass} — Section {selectedSection}
                </AppText>.
              </AppText>
            </View>
            <View style={styles.modalFoot}>
              <AppButton
                title="Cancel"
                type="secondary"
                onPress={() => { setOverrideOpen(false); setOverrideConflict(null); }}
                style={{ flex: 1, marginRight: 6 }}
              />
              <AppButton
                title="Assign Both"
                type="outline"
                onPress={() => saveClassTeacher('keep_both')}
                disabled={classTeacherSaving}
                style={{ flex: 1, marginRight: 6 }}
              />
              <AppButton
                title="Move"
                type="primary"
                onPress={() => saveClassTeacher('move')}
                disabled={classTeacherSaving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
