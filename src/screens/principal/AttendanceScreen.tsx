import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RefreshCw, BookOpen } from 'lucide-react-native';
import AppText from '../../components/common/AppText';
import Loader from '../../components/common/Loader';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme, C } from '../../theme/tokens';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import {
  AttendanceControlsRow,
  AttendanceDatePicker,
  AttendanceExportModal,
  AttendanceFiltersBar,
  AttendanceStatementCard,
  AttendanceToast,
  AttendanceViewTabs,
  ClassSectionPickerModals,
  StudentAttendanceView,
  StudentClassSectionPickers,
  TeacherAttendanceList,
  attendanceStyles as styles,
  iso,
} from '../../components/principal/attendance';
import { usePrincipalAttendance } from './usePrincipalAttendance';

export default function PrincipalAttendanceScreen() {
  const navigation = useNavigation();
  const handleScroll = useScrollTabBar();

  const {
    view,
    setView,
    date,
    setDate,
    showDatePicker,
    setShowDatePicker,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    refreshing,
    loadingTeachers,
    loadingClasses,
    classItems,
    preselectedSection,
    selectedSection,
    setSelectedSection,
    showClassDropdown,
    setShowClassDropdown,
    showSectionDropdown,
    setShowSectionDropdown,
    stmtScope,
    setStmtScope,
    statement,
    loadingStatement,
    showExport,
    setShowExport,
    showTeacherExport,
    setShowTeacherExport,
    toast,
    showToast,
    schoolCode,
    branchId,
    studentGroups,
    availableSections,
    filteredTeachers,
    paginatedTeachers,
    totalPages,
    headers,
    selectedClassLabel,
    selectedSectionLabel,
    handlePreselectedApplied,
    onRefresh,
    handleExportPress,
    handleSelectClass,
    handleSelectSection,
  } = usePrincipalAttendance();

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Attendance Management"
          subtitle={
            view === 'teachers'
              ? `${filteredTeachers.length} Staff • Monitor daily presence`
              : `${classItems.length} Classes • Monitor daily presence`
          }
          onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
          rightActions={(
            <TouchableOpacity
              accessibilityRole="button"
              style={heroHeaderStyles.iconBtn}
              onPress={onRefresh}
              accessibilityLabel="Refresh"
            >
              <RefreshCw size={20} color={Theme.colors.card} />
            </TouchableOpacity>
          )}
        />

        <View style={innerPageLayoutStyles.contentFront}>
          <View style={styles.pagePad}>
            <AttendanceViewTabs view={view} onViewChange={setView} />

            {view === 'students' && (
              <StudentClassSectionPickers
                selectedClassLabel={selectedClassLabel}
                selectedSectionLabel={selectedSectionLabel}
                hasSelectedSection={!!selectedSection}
                onClassPress={() => setShowClassDropdown(true)}
                onSectionPress={() => setShowSectionDropdown(true)}
              />
            )}

            <AttendanceControlsRow
              date={date}
              onDatePress={() => setShowDatePicker(true)}
              stmtScope={stmtScope}
              onStmtScopeChange={setStmtScope}
              view={view}
              onExportPress={handleExportPress}
            />

            <AttendanceDatePicker
              visible={showDatePicker}
              value={date}
              onChange={setDate}
              onDismiss={() => setShowDatePicker(false)}
            />

            <AttendanceStatementCard
              stmtScope={stmtScope}
              statement={statement}
              loading={loadingStatement}
            />

            {view === 'teachers' && (
              <AttendanceFiltersBar
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                placeholder="Search by name or employee ID..."
              />
            )}
          </View>

          {view === 'teachers' && (
            <TeacherAttendanceList
              loading={loadingTeachers}
              teachers={paginatedTeachers}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}

          {view === 'students' && (
            loadingClasses ? (
              <View style={styles.pagePad}><Loader /></View>
            ) : classItems.length === 0 ? (
              <View style={styles.pagePad}>
                <View style={styles.emptyStateCard}>
                  <BookOpen size={40} color={C.muted} style={{ marginBottom: Theme.spacing.sm }} />
                  <AppText style={styles.emptyTitle} weight="semibold">No classes available</AppText>
                  <AppText style={styles.emptyText}>No class data found for this date</AppText>
                </View>
              </View>
            ) : (
              <StudentAttendanceView
                classItems={classItems}
                selectedSection={selectedSection}
                onSelectedSectionChange={setSelectedSection}
                date={date}
                preselectedSection={preselectedSection}
                onPreselectedApplied={handlePreselectedApplied}
              />
            )
          )}

          <View style={[styles.footer, styles.pagePad]}>
            <AppText style={styles.footerText}>{schoolCode || '—'} · {branchId || '—'}</AppText>
            <AppText style={styles.footerText}>{iso(date)}</AppText>
          </View>
        </View>
      </ScrollView>

      <AttendanceToast visible={toast.visible} message={toast.message} type={toast.type} />

      <AttendanceExportModal
        visible={showExport}
        type="students"
        classItems={classItems}
        onClose={() => setShowExport(false)}
        showToast={showToast}
        headers={headers}
      />
      <AttendanceExportModal
        visible={showTeacherExport}
        type="teachers"
        onClose={() => setShowTeacherExport(false)}
        showToast={showToast}
        headers={headers}
      />

      <ClassSectionPickerModals
        showClassDropdown={showClassDropdown}
        showSectionDropdown={showSectionDropdown}
        studentGroups={studentGroups}
        availableSections={availableSections}
        onCloseClass={() => setShowClassDropdown(false)}
        onCloseSection={() => setShowSectionDropdown(false)}
        onSelectClass={handleSelectClass}
        onSelectSection={handleSelectSection}
      />
    </View>
  );
}
