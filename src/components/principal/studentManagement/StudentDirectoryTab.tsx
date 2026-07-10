import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, User, Users, AlertTriangle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { C, Theme } from '../../../theme/tokens';
import ClassSelectorPanel from './ClassSelectorPanel';
import StudentDirectoryFilters from './StudentDirectoryFilters';
import StudentListRow from './StudentListRow';
import StudentStatCards from './StudentStatCards';
import { studentManagementStyles as styles } from './styles';
import type { ClassItem, SelectedClass, Student, SummaryStats } from './types';

export interface StudentDirectoryTabProps {
  isCompactScreen: boolean;
  classes: ClassItem[];
  selected: SelectedClass | null;
  students: Student[];
  summaryStats: SummaryStats;
  query: string;
  onQueryChange: (value: string) => void;
  sLoading: boolean;
  sErr: string;
  cErr: string;
  paginated: Student[];
  filteredCount: number;
  visibleStart: number;
  visibleEnd: number;
  currentPage: number;
  totalPages: number;
  onRefresh: () => void;
  onExport: () => void;
  onAddClass: () => void;
  onOpenGradePicker: () => void;
  onOpenSectionPicker: () => void;
  onViewProfile: (student: Student) => void;
  onOpenAttendance: (student: Student) => void;
  onPageChange: (page: number) => void;
  onReloadStudents: () => void;
}

function StudentDirectoryHeader({
  isCompactScreen,
  onRefresh,
  onAddClass,
}: {
  isCompactScreen: boolean;
  onRefresh: () => void;
  onAddClass: () => void;
}) {
  if (isCompactScreen) { return null; }

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <AppText style={styles.kicker} weight="semibold">Student & Class Management</AppText>
        <AppText style={styles.title} weight="bold">Student Directory</AppText>
        <AppText style={styles.titleSub} weight="regular">
          Manage student enrollment, track attendance, and organize classes across all branches.
        </AppText>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={onRefresh}>
          <RefreshCw size={14} color={C.text} />
          <AppText style={styles.secondaryBtnText} weight="semibold">Refresh</AppText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={onAddClass}>
          <Plus size={14} color={Theme.colors.card} />
          <AppText style={styles.primaryBtnText} weight="semibold">Add Class</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StudentDirectoryTab({
  isCompactScreen,
  classes,
  selected,
  students,
  summaryStats,
  query,
  onQueryChange,
  sLoading,
  sErr,
  cErr,
  paginated,
  filteredCount,
  visibleStart,
  visibleEnd,
  currentPage,
  totalPages,
  onRefresh,
  onExport,
  onAddClass,
  onOpenGradePicker,
  onOpenSectionPicker,
  onViewProfile,
  onOpenAttendance,
  onPageChange,
  onReloadStudents,
}: StudentDirectoryTabProps) {
  return (
    <>
      <StudentDirectoryHeader
        isCompactScreen={isCompactScreen}
        onRefresh={onRefresh}
        onAddClass={onAddClass}
      />

      <StudentStatCards
        classCount={classes.length}
        studentCount={students.length}
        presentCount={summaryStats.present}
      />

      {cErr ? (
        <View style={styles.errorBanner}>
          <AlertTriangle size={16} color={C.danger} />
          <AppText style={styles.errorBannerText} weight="semibold">{cErr}</AppText>
        </View>
      ) : null}

      <View style={styles.grid}>
        <ClassSelectorPanel
          selected={selected}
          isCompactScreen={isCompactScreen}
          onOpenGradePicker={onOpenGradePicker}
          onOpenSectionPicker={onOpenSectionPicker}
          onAddClass={onAddClass}
        />

        <View style={[styles.tableContainer, isCompactScreen && styles.sectionBleed]}>
          <StudentDirectoryFilters
            selected={selected}
            summaryStats={summaryStats}
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            filteredCount={filteredCount}
            query={query}
            onQueryChange={onQueryChange}
            onRefresh={onReloadStudents}
            onExport={onExport}
            isCompactScreen={isCompactScreen}
          />

          {selected ? (
            <>
              {sErr ? (
                <View style={styles.errorBox}>
                  <AppText style={styles.errorBoxText}>{sErr}</AppText>
                </View>
              ) : null}

              {isCompactScreen ? (
                <View style={styles.mobileList}>
                  {sLoading ? (
                    <View style={styles.loadingContainer}>
                      <ScreenSkeleton variant="list" />
                      <AppText style={styles.loadingText}>Loading students...</AppText>
                    </View>
                  ) : paginated.length > 0 ? (
                    paginated.map((student, idx) => (
                      <StudentListRow
                        key={student.student_id || student.student_full_name || idx}
                        student={student}
                        index={idx}
                        variant="card"
                        onViewProfile={onViewProfile}
                        onOpenAttendance={onOpenAttendance}
                      />
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <User size={48} color={C.t4} />
                      <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
                      <AppText style={styles.emptyText}>Try adjusting your search or select a different class</AppText>
                    </View>
                  )}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <AppText style={[styles.headerCell, styles.cellStudent]} weight="bold">Student</AppText>
                      <AppText style={[styles.headerCell, styles.cellStatus]} weight="bold">Status</AppText>
                      <AppText style={[styles.headerCell, styles.cellActions]} weight="bold">Actions</AppText>
                    </View>

                    {sLoading ? (
                      <View style={styles.loadingContainer}>
                        <ScreenSkeleton variant="list" />
                        <AppText style={styles.loadingText}>Loading students...</AppText>
                      </View>
                    ) : paginated.length > 0 ? (
                      paginated.map((student, idx) => (
                        <StudentListRow
                          key={student.student_id || student.student_full_name || idx}
                          student={student}
                          index={idx}
                          variant="table"
                          onViewProfile={onViewProfile}
                          onOpenAttendance={onOpenAttendance}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <User size={48} color={C.t4} />
                        <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
                        <AppText style={styles.emptyText}>Try adjusting your search or select a different class</AppText>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}

              <View style={styles.tableFooter}>
                <AppText style={styles.footerText}>
                  Showing {visibleStart}–{visibleEnd} of {filteredCount}
                </AppText>
                <View style={styles.pagination}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={14} color={currentPage === 1 ? C.t3 : C.t1} />
                  </TouchableOpacity>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return (
                      <TouchableOpacity
                        accessibilityRole="button"
                        key={p}
                        style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                        onPress={() => onPageChange(p)}
                      >
                        <AppText style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]} weight={currentPage === p ? 'bold' : 'regular'}>{p}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight size={14} color={currentPage === totalPages ? C.t3 : C.t1} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Users size={48} color={C.t4} />
              <AppText style={styles.emptyTitle} weight="bold">No Class Selected</AppText>
              <AppText style={styles.emptyText}>Please select a class from the dropdown above to view student directory.</AppText>
            </View>
          )}
        </View>
      </View>
    </>
  );
}
