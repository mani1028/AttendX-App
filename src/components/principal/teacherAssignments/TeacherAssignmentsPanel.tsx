/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  BookOpen, Plus, User, ChevronDown, CheckCircle2, Home,
} from 'lucide-react-native';
import AppButton from '../../common/AppButton';
import AppText from '../../common/AppText';
import { Theme, C } from '../../../theme/tokens';
import { teacherAssignmentsStyles as styles } from './teacherAssignmentsStyles';
import { teacherLabel } from './helpers';

export default function TeacherAssignmentsPanel(p: any) {
  const {
    classNames, classesMap, selectedClass, setSelectedClass, selectedSection, setSelectedSection,
    detailsLoading, classTeacherId, openTeacherPicker, isBusy, getTeacherName, currentClassTeacher,
    saveClassTeacher, classTeacherSaving, setSubjectModalMode, setSubjectModalNewSubject,
    setSubjectModalError, setSubjectModalOpen, subjects, subjectTeacherMap, saveSubjectTeachers,
    subjectTeacherSaving,
  } = p;
  return (
    <>
{/* Class Selection */}
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <AppText style={styles.panelTitle} weight="bold">Classes & Sections</AppText>
              <AppText style={styles.panelSub}>Select class first, then choose section</AppText>
            </View>
            <View style={styles.panelBody}>
              {classNames.length === 0 ? (
                <AppText style={{ color: C.text3, textAlign: 'center', padding: 20 }}>No classes found</AppText>
              ) : (
                <>
                  <AppText style={styles.sectionTitleSmall} weight="bold">Classes</AppText>
                  <View style={styles.classGrid}>
                    {classNames.map((cls: any) => (
                      <TouchableOpacity accessibilityRole="button"
                        key={cls}
                        style={[styles.classCard, selectedClass === cls && styles.classCardActive]}
                        onPress={() => {
                          setSelectedClass(cls);
                          const secs = classesMap[cls] || [];
                          setSelectedSection(secs[0] || '');
                        }}
                      >
                        <AppText style={[styles.className, selectedClass === cls && { color: C.primary }]} weight="bold">
                          Class {cls}
                        </AppText>
                        <AppText style={styles.classMeta}>
                          {(classesMap[cls] || []).length} section(s)
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Section Selection */}
              {selectedClass && classesMap[selectedClass]?.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <AppText style={styles.sectionTitleSmall} weight="bold">Section</AppText>
                  <View style={styles.sectionList}>
                    {(classesMap[selectedClass] || []).map((sec: any) => (
                      <TouchableOpacity accessibilityRole="button"
                        key={sec}
                        style={[styles.sectionBtn, selectedSection === sec && styles.sectionBtnActive]}
                        onPress={() => setSelectedSection(sec)}
                      >
                        <AppText style={[styles.sectionBtnText, selectedSection === sec && { color: C.white }]} weight="bold">
                          {sec}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Right Panel — Assignments */}
          {selectedClass && selectedSection ? (
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <AppText style={styles.panelTitle} weight="bold">Assignment Workspace</AppText>
                <AppText style={styles.panelSub}>Class {selectedClass} — Section {selectedSection}</AppText>
              </View>
              <View style={styles.panelBody}>

                {detailsLoading ? (
                  <ActivityIndicator color={C.primary} style={{ margin: 20 }} />
                ) : (
                  <>
                    {/* Class Staff Card */}
                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <View>
                          <View style={styles.cardTitleRow}>
                            <User size={18} color={C.text} />
                            <AppText style={styles.cardTitle} weight="bold">Class Staff</AppText>
                          </View>
                          <AppText style={styles.cardSub}>Assign the class staff for this section</AppText>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <AppText style={styles.label} weight="bold">Select Staff</AppText>
                        <TouchableOpacity accessibilityRole="button"
                          style={styles.picker}
                          onPress={() => openTeacherPicker('class')}
                          disabled={isBusy}
                        >
                          <AppText style={{ color: classTeacherId ? C.text : C.text3, ...Theme.typography.body }}>
                            {classTeacherId ? getTeacherName(classTeacherId) : 'Select Staff'}
                          </AppText>
                          <ChevronDown size={16} color={C.text3} />
                        </TouchableOpacity>

                        {currentClassTeacher ? (
                          <View style={styles.currentBadge}>
                            <CheckCircle2 size={14} color={C.success} />
                            <AppText style={styles.currentBadgeText} weight="bold">
                              Current: {teacherLabel(currentClassTeacher)}
                            </AppText>
                          </View>
                        ) : null}

                        <View style={styles.noteBox}>
                          <AppText style={styles.noteText} weight="bold">
                            The same staff can be assigned as class staff for multiple sections.
                          </AppText>
                        </View>

                        <AppButton
                          title="Save Class Staff"
                          type="primary"
                          onPress={() => saveClassTeacher('normal')}
                          loading={classTeacherSaving}
                          disabled={isBusy}
                        />
                      </View>
                    </View>

                    {/* Subject Staff Card */}
                    <View style={[styles.card]}>
                      <View style={styles.cardHead}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.cardTitleRow}>
                            <BookOpen size={18} color={C.text} />
                            <AppText style={styles.cardTitle} weight="bold">Subject Staff</AppText>
                          </View>
                          <AppText style={styles.cardSub}>Save subject-staff mappings</AppText>
                        </View>
                        <AppButton
                          title="Add"
                          type="outline"
                          size="sm"
                          leftIcon={<Plus size={14} color={C.primary} />}
                          onPress={() => {
                            setSubjectModalMode('create');
                            setSubjectModalNewSubject('');
                            setSubjectModalError('');
                            setSubjectModalOpen(true);
                          }}
                          disabled={isBusy}
                        />
                      </View>
                      <View style={styles.cardBody}>
                        {subjects.length === 0 ? (
                          <AppText style={{ color: C.text2, ...Theme.typography.body }}>
                            No subjects found. Use "Global Pool" to import subjects first.
                          </AppText>
                        ) : (
                          <>
                            {subjects.map((subject: any, idx: number) => (
                              <View key={subject || `subject-${idx}`} style={styles.subjectRow}>
                                <AppText style={styles.subjectName} weight="bold">{subject}</AppText>
                                <TouchableOpacity accessibilityRole="button"
                                  style={styles.picker}
                                  onPress={() => openTeacherPicker(subject)}
                                  disabled={isBusy}
                                >
                                  <AppText style={{ color: subjectTeacherMap[subject] ? C.text : C.text3, fontSize: 13, flex: 1 }}>
                                    {subjectTeacherMap[subject] ? getTeacherName(subjectTeacherMap[subject]) : 'Select Staff'}
                                  </AppText>
                                  <ChevronDown size={16} color={C.text3} />
                                </TouchableOpacity>
                              </View>
                            ))}
                            <AppButton
                              title="Save Subject Staff"
                              type="primary"
                              style={{ marginTop: Theme.spacing.md }}
                              onPress={saveSubjectTeachers}
                              loading={subjectTeacherSaving}
                              disabled={isBusy}
                            />
                          </>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          ) : null}
    </>
  );
}
