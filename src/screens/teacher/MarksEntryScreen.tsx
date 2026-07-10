import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../../theme/tokens';
import Loader from '../../components/common/Loader';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import { useCanNavigateBack } from '../../hooks/useCanNavigateBack';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  marksEntryStyles as styles,
  MarksClassSelector,
  ExamRulesCard,
  MarksActionBar,
  MarksEmptyState,
  MarksStudentList,
  ExamConfigModal,
  useMarksEntry,
} from '../../components/teacher/marksEntry';

export default function MarksEntryScreen() {
  const navigation = useNavigation();
  const canGoBack = useCanNavigateBack();
  const handleScroll = useScrollTabBar();
  const m = useMarksEntry();

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.scrollContent]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={m.refreshing} onRefresh={m.onRefresh} tintColor={Theme.colors.primary} />}
      >
        <StandardPageHeader
          title="Marks Entry"
          subtitle="Select class, exam and subject then search"
          showBack={canGoBack}
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
          <MarksClassSelector
            classId={m.classId}
            sectionId={m.sectionId}
            examId={m.examId}
            subjectId={m.subjectId}
            classes={m.classes}
            sections={m.sections}
            exams={m.exams}
            subjects={m.subjects}
            loadingClasses={m.loadingClasses}
            loadingExams={m.loadingExams}
            loadingStudents={m.loadingStudents}
            onOpenPicker={m.openInlinePicker}
            onSearch={() => m.loadStudents()}
          />

          {m.examId && m.subjectId ? (
            <ExamRulesCard
              examSubjectId={m.examSubjectId}
              isEditMode={m.isEditMode}
              inputMaxMarks={m.inputMaxMarks}
              inputPassMarks={m.inputPassMarks}
              savingExamConfig={m.savingExamConfig}
              onMaxMarksChange={m.handleMaxMarksChange}
              onPassMarksChange={m.handlePassMarksChange}
              onSave={m.saveExamConfig}
              onEdit={() => m.setIsEditMode(true)}
            />
          ) : null}

          {m.students.length > 0 ? (
            <MarksActionBar
              totalSaved={m.totalSaved}
              totalPending={m.totalPending}
              totalAbsent={m.totalAbsent}
              savingMarks={m.savingMarks}
              autoSave={m.autoSave}
              onSave={() => m.saveMarks(false)}
              onToggleAutoSave={() => m.setAutoSave(!m.autoSave)}
              onRefresh={() => m.loadStudents(true)}
              onExport={m.exportToCSV}
            />
          ) : null}

          {m.loadingStudents ? (
            <View style={{ marginTop: 40 }}><Loader /></View>
          ) : m.students.length === 0 ? (
            <MarksEmptyState onSelectFilters={() => m.openInlinePicker('class')} />
          ) : (
            <MarksStudentList
              students={m.students}
              maxMarks={parseFloat(m.inputMaxMarks) || 0}
              onAbsentToggle={m.handleAbsentToggle}
              onMarksChange={m.handleMarksChange}
            />
          )}
        </View>
      </ScrollView>

      {m.inlinePickerModal ? (
        <CustomPickerModal {...m.inlinePickerModal} onClose={() => m.setInlinePickerModal(null)} />
      ) : null}

      <ExamConfigModal
        visible={m.showConfigModal}
        maxMarks={m.inputMaxMarks}
        passMarks={m.inputPassMarks}
        onMaxMarksChange={m.handleMaxMarksChange}
        onPassMarksChange={m.handlePassMarksChange}
        onSave={m.saveExamConfig}
        onClose={() => m.setShowConfigModal(false)}
        saving={m.savingExamConfig}
      />
    </View>
  );
}
