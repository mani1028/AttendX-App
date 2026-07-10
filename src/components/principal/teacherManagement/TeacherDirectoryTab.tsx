import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react-native';
import AppText from '../../common/AppText';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import AppCard from '../../common/AppCard';
import { C } from '../../../theme/tokens';
import TeacherStatCards from './TeacherStatCards';
import TeacherDirectoryFilters from './TeacherDirectoryFilters';
import TeacherListRow from './TeacherListRow';
import { teacherManagementStyles as styles } from './styles';
import type { SummaryStats, Teacher } from './types';

export interface TeacherDirectoryTabProps {
  isCompactScreen: boolean;
  summaryStats: SummaryStats;
  query: string;
  statusFilter: string;
  deptFilter: string;
  departments: string[];
  listLoading: boolean;
  listErr: string;
  paginated: Teacher[];
  filteredCount: number;
  visibleStart: number;
  visibleEnd: number;
  currentPage: number;
  totalPages: number;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onDeptFilterChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onViewProfile: (teacher: Teacher) => void;
  onEdit: (teacher: Teacher) => void;
  onPageChange: (page: number) => void;
}

export default function TeacherDirectoryTab({
  isCompactScreen,
  summaryStats,
  query,
  statusFilter,
  deptFilter,
  departments,
  listLoading,
  listErr,
  paginated,
  filteredCount,
  visibleStart,
  visibleEnd,
  currentPage,
  totalPages,
  onQueryChange,
  onStatusFilterChange,
  onDeptFilterChange,
  onRefresh,
  onExport,
  onViewProfile,
  onEdit,
  onPageChange,
}: TeacherDirectoryTabProps) {
  const emptyState = (
    <View style={styles.emptyState}>
      <Users size={48} color={C.muted} />
      <AppText style={styles.emptyTitle} weight="bold">No teachers found</AppText>
      <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
    </View>
  );

  const loadingState = (
    <View style={styles.loadingContainer}>
      <ScreenSkeleton variant="list" />
      <AppText style={styles.loadingText}>Loading teachers...</AppText>
    </View>
  );

  return (
    <>
      <TeacherStatCards stats={summaryStats} />

      <AppCard style={styles.tableContainer} padded={false} variant="bordered">
        <TeacherDirectoryFilters
          summaryStats={summaryStats}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          filteredCount={filteredCount}
          query={query}
          statusFilter={statusFilter}
          deptFilter={deptFilter}
          departments={departments}
          isCompactScreen={isCompactScreen}
          onQueryChange={onQueryChange}
          onStatusFilterChange={onStatusFilterChange}
          onDeptFilterChange={onDeptFilterChange}
          onRefresh={onRefresh}
          onExport={onExport}
        />

        {listErr ? (
          <View style={styles.errorBox}>
            <AppText style={styles.errorBoxText}>{listErr}</AppText>
          </View>
        ) : null}

        {isCompactScreen ? (
          <View style={styles.mobileList}>
            {listLoading ? loadingState : paginated.length > 0 ? (
              paginated.map((teacher, idx) => (
                <TeacherListRow
                  key={teacher.teacher_id || idx}
                  teacher={teacher}
                  index={idx}
                  variant="card"
                  onViewProfile={onViewProfile}
                  onEdit={onEdit}
                />
              ))
            ) : emptyState}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <AppText style={[styles.headerCell, styles.cellName]} weight="bold">Teacher</AppText>
                <AppText style={[styles.headerCell, styles.cellEmpId]} weight="bold">Emp ID</AppText>
                <AppText style={[styles.headerCell, styles.cellContact]} weight="bold">Contact</AppText>
                <AppText style={[styles.headerCell, styles.cellDesignation]} weight="bold">Designation</AppText>
                <AppText style={[styles.headerCell, styles.cellDept]} weight="bold">Department</AppText>
                <AppText style={[styles.headerCell, styles.cellStatus]} weight="bold">Status</AppText>
                <AppText style={[styles.headerCell, styles.cellActions]} weight="bold">Actions</AppText>
              </View>

              {listLoading ? loadingState : paginated.length > 0 ? (
                paginated.map((teacher, idx) => (
                  <TeacherListRow
                    key={teacher.teacher_id || idx}
                    teacher={teacher}
                    index={idx}
                    variant="table"
                    onViewProfile={onViewProfile}
                    onEdit={onEdit}
                  />
                ))
              ) : emptyState}
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
              <ChevronLeft size={14} color={currentPage === 1 ? C.muted : C.text} />
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
              <ChevronRight size={14} color={currentPage === totalPages ? C.muted : C.text} />
            </TouchableOpacity>
          </View>
        </View>
      </AppCard>
    </>
  );
}
