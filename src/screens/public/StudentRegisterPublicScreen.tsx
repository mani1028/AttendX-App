import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import API from '../../services/api';
import { submitStudentRegistration } from '../../services/teacherService';
import AppCard from '../../components/common/AppCard';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { Theme } from '../../theme/tokens';
import {
  buildStudentRegistrationFormData,
  calcAgeFromDOB,
  getAcademicYearOptions,
  isValidDateOfBirth,
  safeTrim,
  validateStudentRegistrationStep,
  toClassPickerOptions,
  toSectionPickerOptions,
} from '../../utils/studentRegistrationValidation';
import { formatErrorMessage } from '../../utils/helpers';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import {
  publicRegistrationStyles as styles,
  INITIAL_FORM,
  STEPS,
  InvalidInviteView,
  RegistrationStepper,
  RegistrationStatusBanners,
  RegistrationFormSteps,
  RegistrationNavButtons,
  RegistrationFooter,
  RollNumberModal,
  type ClassOption,
  type FormData,
} from '../../components/public/studentRegister';

export default function StudentRegisterPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { school_code?: string; branch_id?: string };
  const publicSchoolCode = params?.school_code || '';
  const publicBranchId = params?.branch_id || '';
  const isPublicInvite = Boolean(publicSchoolCode && publicBranchId);

  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, nationality: 'Indian', branch_id: publicBranchId });
  const [showRollNumberModal, setShowRollNumberModal] = useState(false);
  const [generatedRollNumber, setGeneratedRollNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState(false);

  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const classPickerOptions = useMemo(() => toClassPickerOptions(classOptions), [classOptions]);
  const sectionPickerOptions = useMemo(() => toSectionPickerOptions(sectionOptions), [sectionOptions]);

  const isMounted = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isPublicInvite || !form.branch_id || !publicSchoolCode) { return; }
    const loadClasses = async () => {
      try {
        const res = await API.get('/director/public/classes-sections', {
          params: { branch_id: form.branch_id, school_code: publicSchoolCode },
          headers: { 'X-School-Code': publicSchoolCode },
        });
        if (!isMounted.current) { return; }
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const formattedItems: ClassOption[] = items.map((item: any) => ({
          class_name: String(item.class_name).trim(),
          sections: Array.isArray(item.sections) ? item.sections.map((s: any) => String(s).trim()) : [],
        }));
        setClassOptions(formattedItems);
        if (formattedItems.length > 0 && safeTrim(form.class_grade)) {
          const cur = formattedItems.find(c => c.class_name.toLowerCase() === safeTrim(form.class_grade).toLowerCase());
          setSectionOptions(cur?.sections || []);
        } else {
          setSectionOptions([]);
        }
      } catch (err: any) {
        console.error('Load class/section failed:', err);
        if (!isMounted.current) { return; }
        setClassOptions([]);
        setSectionOptions([]);
        setServerError('Unable to load class and section options. Please refresh.');
      }
    };
    loadClasses();
  }, [isPublicInvite, form.branch_id, publicSchoolCode, form.class_grade]);

  const handleChange = (name: keyof FormData, value: string) => {
    setServerError('');
    setServerSuccess('');
    if (fieldErrors[name] || name === 'father_guardian_name' || name === 'mother_guardian_name') {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        if (name === 'father_guardian_name' || name === 'mother_guardian_name') {
          delete next.father_guardian_name;
          delete next.mother_guardian_name;
        }
        return next;
      });
    }
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'first_name' || name === 'last_name') {
        const first = name === 'first_name' ? value : prev.first_name;
        const last = name === 'last_name' ? value : prev.last_name;
        updated.student_full_name = `${first} ${last}`.trim();
      }
      return updated;
    });
  };

  const handleSectionChange = (text: string) => handleChange('section', text.replace(/[^A-Z]/g, ''));

  const handleDOBChange = (date: Date) => {
    const dob = date.toISOString().split('T')[0];
    const dobValidation = isValidDateOfBirth(dob);
    if (!dobValidation.valid) {
      setFieldErrors(prev => ({ ...prev, date_of_birth: dobValidation.error! }));
      setShowDOBPicker(false);
      return;
    }
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next.date_of_birth;
      return next;
    });
    setForm(prev => ({ ...prev, date_of_birth: dob, age: calcAgeFromDOB(dob) }));
    setShowDOBPicker(false);
  };

  const handleClassChange = (className: string) => {
    const cls = classOptions.find(c => c.class_name.toLowerCase() === className.toLowerCase());
    setSectionOptions(cls?.sections || []);
    setForm(prev => ({ ...prev, class_grade: className, section: '', roll_number: '' }));
  };

  const applyPhoto = (asset: any) => {
    setPhotoFile(asset);
    setPhotoPreview(asset.uri || null);
    setFieldErrors(prev => {
      if (!prev.photo) { return prev; }
      const next = { ...prev };
      delete next.photo;
      return next;
    });
  };

  const handleImagePick = () => {
    Alert.alert('Select Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (r) => {
        if (r.assets?.[0]) { applyPhoto(r.assets[0]); }
      }) },
      { text: 'Choose from Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (r) => {
        if (r.assets?.[0]) { applyPhoto(r.assets[0]); }
      }) },
    ]);
  };

  const validateStep = () =>
    validateStudentRegistrationStep(step, form, { hasPhoto: Boolean(photoFile), includePassword: true, requireRollNumber: false });

  const nextStep = () => {
    if (!isPublicInvite) {
      setServerError('Invalid invite link. Missing school code or branch ID.');
      return;
    }
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setServerError('Please fill all required fields marked with *.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setServerError('');
    setFieldErrors({});
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setFieldErrors({});
    setStep(s => Math.max(s - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm({ ...INITIAL_FORM, nationality: 'Indian', branch_id: publicBranchId });
  };

  const submit = async () => {
    if (!isPublicInvite) {
      setServerError('Invalid invite link.');
      return;
    }
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setServerError('');
    setServerSuccess('');
    try {
      const formData = buildStudentRegistrationFormData(form as unknown as Record<string, unknown>, {
        schoolCode: publicSchoolCode,
        branchId: publicBranchId,
        photoFile,
      });
      const data = await submitStudentRegistration(publicSchoolCode, publicBranchId, formData);
      if (!isMounted.current) { return; }

      if (data?.roll_number) {
        setGeneratedRollNumber(data.roll_number || form.roll_number || '—');
        setShowRollNumberModal(true);
        setTimeout(() => {
          if (!isMounted.current) { return; }
          setShowRollNumberModal(false);
          resetForm();
        }, 3000);
      } else {
        setServerSuccess('Registration request submitted. School admin will review and approve.');
        setTimeout(() => { if (isMounted.current) { resetForm(); } }, 2500);
      }
    } catch (err: any) {
      if (!isMounted.current) { return; }
      const data = err.response?.data;
      if (data?.detail) {
        if (typeof data.detail === 'object' && !Array.isArray(data.detail)) {
          setFieldErrors(prev => ({ ...prev, ...data.detail }));
          setServerError(Object.entries(data.detail).map(([f, msg]) => `${f}: ${msg}`).join('\n'));
        } else if (Array.isArray(data.detail)) {
          setServerError(data.detail.map((e: any) => `${(e.loc || []).slice(1).join('.')}: ${e.msg}`).join('\n'));
        } else {
          setServerError(data.detail);
        }
      } else {
        setServerError(formatErrorMessage(data?.detail) || `Submission Error: ${err.message}`);
      }
    } finally {
      if (isMounted.current) { setLoading(false); }
    }
  };

  if (!isPublicInvite) {
    return <InvalidInviteView />;
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.contentContainer]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StandardPageHeader
          scrollWithContent
          title="Student Registration"
          onBackPress={() => navigation.goBack()}
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
          <RegistrationStatusBanners error={serverError} success={serverSuccess} styles={styles} />
          <RegistrationStepper step={step} onStepPress={setStep} styles={styles} />

          <AppCard style={styles.formCard}>
            <RegistrationFormSteps
              step={step}
              form={form}
              fieldErrors={fieldErrors}
              styles={styles}
              iconColor={Theme.colors.violet}
              photoPreview={photoPreview}
              photoFile={photoFile}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              showDOBPicker={showDOBPicker}
              showAdmissionDatePicker={showAdmissionDatePicker}
              classPickerOptions={classPickerOptions}
              sectionPickerOptions={sectionPickerOptions}
              academicYearOptions={academicYearOptions}
              onChange={handleChange}
              onSectionChange={handleSectionChange}
              onClassChange={handleClassChange}
              onDOBChange={handleDOBChange}
              onImagePick={handleImagePick}
              onTogglePassword={() => setShowPassword(v => !v)}
              onToggleConfirmPassword={() => setShowConfirmPassword(v => !v)}
              onShowDOBPicker={setShowDOBPicker}
              onShowAdmissionDatePicker={setShowAdmissionDatePicker}
            />
            <RegistrationNavButtons
              step={step}
              isLastStep={isLastStep}
              loading={loading}
              backType="secondary"
              styles={styles}
              onBack={prevStep}
              onNext={nextStep}
              onSubmit={submit}
            />
          </AppCard>

          <RegistrationFooter schoolCode={publicSchoolCode} branchId={publicBranchId} styles={styles} />
        </View>
      </ScrollView>

      <RollNumberModal
        visible={showRollNumberModal}
        rollNumber={generatedRollNumber}
        onClose={() => setShowRollNumberModal(false)}
        styles={styles}
      />
    </View>
  );
}
