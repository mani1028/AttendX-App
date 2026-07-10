import React from 'react';
import { View, ScrollView } from 'react-native';
import CustomPickerModal from '../../components/common/CustomPickerModal';
import {
  AttendanceToast,
  AttendanceStepper,
  SafeCameraDeviceResolver,
  AttendanceCameraView,
  AttendanceScreenHeader,
  SavedAttendanceGallery,
  TeacherVerificationStep,
  TeacherVerifiedStep,
  StudentSetupStep,
  AttendanceResultsStep,
  ImagePreviewModal,
  AttendanceErrorModal,
  attendanceStyles as styles,
} from '../../components/teacher/attendance';
import { useTeacherAttendance, isCameraAvailable } from './useTeacherAttendance';

export default function TeacherAttendanceScreen() {
  const {
    insets,
    tabBarScrollPadding,
    navigation,
    isTeacherRole,
    step,
    setStep,
    isClassTeacher,
    loading,
    hasPermission,
    cameraActive,
    cameraUse,
    cameraPosition,
    setResolvedDevice,
    handleScroll,
    cameraRef,
    device,
    form,
    setForm,
    dailySessions,
    pickerModal,
    setPickerModal,
    errorModal,
    setErrorModal,
    employeeId,
    teacherImage,
    teacherData,
    assignedClasses,
    assignedClassOptions,
    selectedClassKey,
    setSelectedClassKey,
    enableManualAttendance,
    studentImages,
    previewImage,
    showPreview,
    result,
    setResult,
    manualFilter,
    setManualFilter,
    setManualStatusById,
    manualSaving,
    sessionMarked,
    viewingGallery,
    savedAttendanceData,
    toast,
    hideToast,
    isCurrentSessionMarked,
    toggleCamera,
    stopCamera,
    handleTeacherCapture,
    handleTeacherUpload,
    handleStudentCapture,
    handleStudentUpload,
    confirmStudentImage,
    retakeImage,
    removeStudentImage,
    verifyTeacher,
    processAttendance,
    saveAttendance,
    resetManualChanges,
    resetFlow,
    manualHasChanges,
    manualCounts,
    filteredManualRows,
    attendanceRate,
    openClassPicker,
    openSectionPicker,
    openSessionPicker,
    handleBack,
    startCamera,
  } = useTeacherAttendance();

  if (viewingGallery && savedAttendanceData) {
    return (
      <SavedAttendanceGallery
        insets={insets}
        tabBarScrollPadding={tabBarScrollPadding}
        savedAttendanceData={savedAttendanceData}
        teacherImage={teacherImage}
        teacherData={teacherData}
        form={form}
        onReset={resetFlow}
      />
    );
  }

  return (
    <View style={styles.container}>
      {isCameraAvailable && <SafeCameraDeviceResolver position={cameraPosition} onDevice={setResolvedDevice} />}

      <AttendanceToast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        icon={toast.icon}
        color={toast.color}
        onClose={hideToast}
      />

      <AttendanceCameraView
        cameraActive={cameraActive}
        hasPermission={hasPermission}
        device={device}
        cameraRef={cameraRef}
        cameraUse={cameraUse}
        studentImageCount={studentImages.length}
        onToggleCamera={toggleCamera}
        onStopCamera={stopCamera}
        onCapture={cameraUse === 'teacher' ? handleTeacherCapture : handleStudentCapture}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarScrollPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <AttendanceScreenHeader
          insets={insets}
          isClassTeacher={isClassTeacher}
          step={step}
          teacherVerified={!!teacherData}
          onBack={handleBack}
          onNotifications={() => (navigation as any).navigate('Notifications')}
          onStepChange={setStep}
        />

        <AttendanceStepper step={step} isClassTeacher={isClassTeacher} />

        {step === 1 && (
          <TeacherVerificationStep
            employeeId={employeeId}
            cameraActive={cameraActive}
            teacherImage={teacherImage}
            loading={loading}
            enableManualAttendance={enableManualAttendance}
            isTeacherRole={isTeacherRole}
            onStartCamera={() => startCamera('teacher')}
            onUpload={handleTeacherUpload}
            onVerify={verifyTeacher}
            onManualAttendance={() => (navigation as any).navigate('MarkAttendance')}
          />
        )}

        {step === 2 && teacherData && (
          <TeacherVerifiedStep
            teacherData={teacherData}
            teacherImage={teacherImage}
            assignedClasses={assignedClasses}
            assignedClassOptions={assignedClassOptions}
            selectedClassKey={selectedClassKey}
            isClassTeacher={isClassTeacher}
            onSelectClass={(opt) => {
              setSelectedClassKey(opt.key);
              setForm(prev => ({ ...prev, class_grade: opt.class_grade, section: opt.section }));
            }}
            onContinue={() => setStep(3)}
            onDashboard={() => (navigation as any).navigate('TeacherDashboard')}
            onReset={resetFlow}
          />
        )}

        {step === 3 && (
          <StudentSetupStep
            form={form}
            cameraActive={cameraActive}
            studentImages={studentImages}
            loading={loading}
            dailySessions={dailySessions}
            sessionMarked={sessionMarked}
            isClassTeacher={isClassTeacher}
            isCurrentSessionMarked={isCurrentSessionMarked()}
            onClassPress={openClassPicker}
            onSectionPress={openSectionPicker}
            onSessionPress={openSessionPicker}
            onStartCamera={() => startCamera('student')}
            onUpload={handleStudentUpload}
            onRemoveImage={removeStudentImage}
            onProcessAttendance={processAttendance}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && result && (
          <AttendanceResultsStep
            result={result}
            form={form}
            attendanceRate={attendanceRate}
            manualFilter={manualFilter}
            manualCounts={manualCounts}
            manualHasChanges={manualHasChanges}
            manualSaving={manualSaving}
            isClassTeacher={isClassTeacher}
            isCurrentSessionMarked={isCurrentSessionMarked()}
            filteredRows={filteredManualRows}
            onFilterChange={setManualFilter}
            onStatusChange={(studentId, status) => setManualStatusById(prev => ({ ...prev, [studentId]: status }))}
            onResetChanges={resetManualChanges}
            onSave={saveAttendance}
            onRescan={() => {
              setResult(null);
              setManualStatusById({});
              setStep(3);
            }}
            onResetFlow={resetFlow}
          />
        )}
      </ScrollView>

      <ImagePreviewModal
        visible={showPreview}
        previewImage={previewImage}
        onRetake={retakeImage}
        onConfirm={confirmStudentImage}
      />

      {pickerModal && <CustomPickerModal {...pickerModal} onClose={() => setPickerModal(null)} />}

      {errorModal && (
        <AttendanceErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal(null)}
        />
      )}
    </View>
  );
}
