import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  branchDetailsStyles,
  BranchInfoHeader,
  BranchTabBar,
  BranchTeachersTab,
  BranchStudentsTab,
  BranchAttendanceTab,
  BranchLeavesTab,
  BranchMarksTab,
  StudentAttendanceModal,
  StudentDetailsModal,
} from '../../components/director/branchDetails';
import { useBranchDetails } from './useBranchDetails';

export default function BranchDetailsScreen() {
  const navigation = useNavigation();
  const handleScroll = useScrollTabBar();
  const bd = useBranchDetails();

  return (
    <View style={branchDetailsStyles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={branchDetailsStyles.contentContainer}
        refreshControl={<RefreshControl refreshing={bd.refreshing} onRefresh={bd.onRefresh} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <StandardPageHeader
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          title="Branch Details"
          onBackPress={() => navigation.goBack()}
        />

        <BranchInfoHeader
          branchId={bd.branchId}
          branchStatus={bd.branchStatus}
          teachersCount={bd.teachers.length}
          studentsCount={bd.students.length}
          classSections={bd.classSections}
          leaveRequests={bd.leaveRequests}
        />

        <BranchTabBar activeTab={bd.activeTab} onTabChange={bd.setActiveTab} />

        {bd.activeTab === 'teachers' && (
          <BranchTeachersTab
            searchTerm={bd.searchTerm}
            onSearchChange={bd.setSearchTerm}
            teachers={bd.filteredTeachers}
          />
        )}

        {bd.activeTab === 'students' && (
          <BranchStudentsTab
            searchTerm={bd.searchTerm}
            onSearchChange={bd.setSearchTerm}
            selectedClass={bd.selectedClass}
            classLabel={bd.classLabel}
            sectionLabel={bd.sectionLabel}
            onOpenClassPicker={() => bd.openClassPicker(false)}
            onOpenSectionPicker={() => bd.openSectionPicker(false)}
            students={bd.filteredStudents}
            onStudentPress={bd.handleStudentClick}
          />
        )}

        {bd.activeTab === 'attendance' && (
          <BranchAttendanceTab
            attendanceType={bd.attendanceType}
            onAttendanceTypeChange={bd.setAttendanceType}
            attendanceDate={bd.attendanceDate}
            showDatePicker={bd.showDatePicker}
            onShowDatePicker={bd.setShowDatePicker}
            onAttendanceDateChange={bd.handleAttendanceDateChange}
            onFetchTeacherAttendance={bd.handleFetchTeacherAttendance}
            classSections={bd.classSections}
            studentCounts={bd.studentCounts}
            onSelectSection={bd.handleViewStudentAttendance}
            teacherAttendanceLoading={bd.teacherAttendanceLoading}
            teacherAttendanceData={bd.teacherAttendanceData}
            teacherAttendanceSummary={bd.teacherAttendanceSummary}
            teacherAttendanceFilter={bd.teacherAttendanceFilter}
            onTeacherAttendanceFilterChange={bd.setTeacherAttendanceFilter}
            filteredTeacherAttendance={bd.filteredTeacherAttendance}
          />
        )}

        {bd.activeTab === 'leaves' && (
          <BranchLeavesTab
            loading={bd.loading}
            leaveRequests={bd.leaveRequests}
            showAllLeaves={bd.showAllLeaves}
            onViewAll={() => {
              bd.setShowAllLeaves(true);
              bd.fetchLeaveRequests(50);
            }}
            onShowLess={() => {
              bd.setShowAllLeaves(false);
              bd.fetchLeaveRequests();
            }}
          />
        )}

        {bd.activeTab === 'marks' && (
          <BranchMarksTab
            loading={bd.loading}
            selectedClass={bd.selectedClass}
            selectedSection={bd.selectedSection}
            selectedExam={bd.selectedExam}
            classLabel={bd.classLabel}
            sectionLabel={bd.sectionLabel}
            examLabel={bd.examLabel}
            onOpenClassPicker={() => bd.openClassPicker(true)}
            onOpenSectionPicker={() => bd.openSectionPicker(true)}
            onOpenExamPicker={bd.openExamPicker}
            overallStats={bd.overallStats}
            examTitle={bd.currentExam?.exam_name || 'Exam'}
            resultFilter={bd.resultFilter}
            onResultFilterChange={bd.setResultFilter}
            sortBy={bd.sortBy}
            sortOrder={bd.sortOrder}
            onSort={bd.handleSort}
            students={bd.filteredAndSortedStudents}
            onStudentPress={bd.handleStudentClick}
            hasProcessedData={bd.processedStudentData.length > 0}
          />
        )}
      </ScrollView>

      <StudentAttendanceModal
        visible={bd.showAttendanceModal && bd.attendanceType === 'student'}
        className={bd.selectedClassForAttendance}
        sectionName={bd.selectedSectionForAttendance}
        attendanceFilter={bd.attendanceFilter}
        onFilterChange={bd.setAttendanceFilter}
        records={bd.filteredAttendance}
        onClose={() => bd.setShowAttendanceModal(false)}
      />

      <StudentDetailsModal
        student={bd.selectedStudent}
        loadingExamsData={bd.loadingExamsData}
        studentExamsData={bd.studentExamsData}
        showAllExamsChart={bd.showAllExamsChart}
        onToggleChart={bd.setShowAllExamsChart}
        currentSelectedExamId={bd.currentSelectedExamId}
        currentSelectedExamName={bd.currentSelectedExamName}
        barChartData={bd.barChartData}
        lineChartData={bd.lineChartData}
        allSubjects={bd.allSubjects}
        onClose={() => bd.setSelectedStudent(null)}
      />

      {bd.filterPicker && (
        <CustomPickerModal
          visible={bd.filterPicker.visible}
          title={bd.filterPicker.title}
          options={bd.filterPicker.options}
          selectedValue={bd.filterPicker.selectedValue}
          onValueChange={bd.filterPicker.onValueChange}
          onClose={() => bd.setFilterPicker(null)}
        />
      )}
    </View>
  );
}
