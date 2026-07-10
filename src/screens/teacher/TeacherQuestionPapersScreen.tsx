import React from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Plus, RefreshCw } from 'lucide-react-native';
import { Theme } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import {
  questionPaperStyles as styles,
  useQuestionPapers,
  QuestionPaperToolbar,
  QuestionPaperListSection,
  QuestionPaperUploadModal,
} from '../../components/teacher/questionPapers';

export default function TeacherQuestionPapersScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const qp = useQuestionPapers();

  return (
    <View style={styles.container}>
      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollPageContent}
        refreshControl={
          <RefreshControl refreshing={qp.refreshing} onRefresh={qp.onRefresh} tintColor={Theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          title="Question Papers"
          subtitle={qp.headerSubtitle}
          onBackPress={() =>
            navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TeacherDashboard' as never)
          }
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
          rightActions={(
            <View style={styles.headerActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={heroHeaderStyles.iconBtn}
                onPress={qp.openUploadModal}
                accessibilityLabel="Upload question paper"
              >
                <Plus size={20} color={Theme.colors.card} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={heroHeaderStyles.iconBtn}
                onPress={qp.onRefresh}
                accessibilityLabel="Refresh question papers"
              >
                <RefreshCw size={20} color={Theme.colors.card} />
              </TouchableOpacity>
            </View>
          )}
        />
        <View style={[innerPageLayoutStyles.scrollBody, styles.pageBody]}>
          <QuestionPaperToolbar
            searchTerm={qp.searchTerm}
            onSearchChange={qp.setSearchTerm}
            subjectFilters={qp.subjectFilters}
            activeSubject={qp.activeSubject}
            onSubjectChange={qp.setActiveSubject}
          />
          <QuestionPaperListSection
            loadError={qp.loadError}
            loading={qp.loading}
            papers={qp.filteredPapers}
            searchTerm={qp.searchTerm}
            activeSubject={qp.activeSubject}
            processingId={qp.processingId}
            onRetry={() => qp.fetchPapers()}
            onClearFilters={qp.clearFilters}
            onUpload={qp.openUploadModal}
            onView={(id, title) => qp.processPaperAction(id, title, false)}
            onDownload={(id, title) => qp.processPaperAction(id, title, true)}
            onEdit={qp.openEditModal}
            onDelete={qp.confirmDeletePaper}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.fab}
        onPress={qp.openUploadModal}
        accessibilityLabel="Upload question paper"
      >
        <Plus size={24} color={Theme.colors.card} />
      </TouchableOpacity>

      <QuestionPaperUploadModal
        visible={qp.showUploadModal}
        editingPaper={qp.editingPaper}
        form={qp.form}
        formErrors={qp.formErrors}
        paperFile={qp.paperFile}
        markingFile={qp.markingFile}
        submitting={qp.submitting}
        metaLoading={qp.metaLoading}
        assignments={qp.assignments}
        examTypes={qp.examTypes}
        selectedClass={qp.selectedClass}
        selectedSection={qp.selectedSection}
        subjectOptions={qp.subjectOptions}
        classPickerOpen={qp.classPickerOpen}
        sectionPickerOpen={qp.sectionPickerOpen}
        subjectPickerOpen={qp.subjectPickerOpen}
        examTypePickerOpen={qp.examTypePickerOpen}
        classPickerOptions={qp.classPickerOptions}
        sectionPickerOptions={qp.sectionPickerOptions}
        subjectPickerOptions={qp.subjectPickerOptions}
        examTypePickerOptions={qp.examTypePickerOptions}
        onClose={qp.closeUploadModal}
        onSubmit={qp.handleSubmitUpload}
        onFormChange={qp.setForm}
        onPickPaperFile={qp.handlePickPaperFile}
        onPickMarkingFile={qp.handlePickMarkingFile}
        onClassChange={qp.handleClassChange}
        onSectionChange={qp.handleSectionChange}
        setClassPickerOpen={qp.setClassPickerOpen}
        setSectionPickerOpen={qp.setSectionPickerOpen}
        setSubjectPickerOpen={qp.setSubjectPickerOpen}
        setExamTypePickerOpen={qp.setExamTypePickerOpen}
      />
    </View>
  );
}
