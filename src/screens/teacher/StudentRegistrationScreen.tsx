import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, ScrollView, Alert, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { submitStudentRegistration } from '../../services/teacherService';
import AppCard from '../../components/common/AppCard';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
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
import { formatErrorMessage, formatHttpErrorMessage } from '../../utils/helpers';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import {
  registrationStyles as styles,
  INITIAL_FORM,
  STEPS,
  getSchoolCode,
  getBranchId,
  RegistrationStepper,
  RegistrationStatusBanners,
  RegistrationFormSteps,
  RegistrationNavButtons,
  RegistrationFooter,
  RollNumberModal,
  type ClassOption,
  type FormData,
} from '../../components/teacher/studentRegistration';

export default function StudentRegistrationScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [loggedSchoolCode, setLoggedSchoolCode] = useState('');
  const [defaultBranchId, setDefaultBranchId] = useState('');
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, nationality: 'Indian' });
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

  const fetchRequestCount = async () => {
    try {
      const sc = safeTrim(loggedSchoolCode);
      const bid = safeTrim(defaultBranchId);
      if (!sc || !bid) { return; }
      await API.get('/staff/student-registration-requests', {
        headers: { 'X-School-Code': sc, 'X-Branch-Id': bid },
      });
    } catch (err) {
      console.error('Failed to fetch student requests:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const branch = await getBranchId();
        if (!isMounted.current) { return; }
        if (!code || !branch) {
          setServerError('Session expired. Please login again.');
          return;
        }
        setLoggedSchoolCode(code);
        setDefaultBranchId(branch);
        setForm(prev => ({ ...prev, branch_id: branch }));
        await fetchRequestCount();
      } catch {
        if (isMounted.current) { setServerError('Failed to load session info.'); }
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loggedSchoolCode && defaultBranchId) { fetchRequestCount(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedSchoolCode, defaultBranchId]);

  useEffect(() => {
    isMounted.current = true;
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, [setTabBarVisible]);

  const handleScroll = useScrollTabBar();

  useEffect(() => {
    if (!form.branch_id || !loggedSchoolCode) { return; }
    const loadClasses = async () => {
      try {
        const res = await API.get('/manage/classes-sections', {
          params: { branch_id: form.branch_id, school_code: loggedSchoolCode },
          headers: { 'X-School-Code': loggedSchoolCode, 'X-Branch-Id': form.branch_id },
        });
        if (!isMounted.current) { return; }
        const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
        const formattedItems: ClassOption[] = items.map((item: any) => ({
          class_name: String(item?.class_name || '').trim(),
          sections: Array.isArray(item?.sections) ? item.sections.filter(Boolean).map((s: any) => String(s).trim()) : [],
        }));
        setClassOptions(formattedItems);
        if (formattedItems.length > 0 && safeTrim(form.class_grade)) {
          const cur = formattedItems.find(c => c.class_name.toLowerCase() === safeTrim(form.class_grade).toLowerCase());
          setSectionOptions(cur?.sections || []);
        } else {
          setSectionOptions([]);
        }
      } catch (err: any) {
        if (!isMounted.current) { return; }
        setClassOptions([]);
        setSectionOptions([]);
        if (err?.response?.status !== 401) {
          setServerError('Unable to load class and section options. Please refresh.');
        }
      }
    };
    loadClasses();
  }, [form.branch_id, loggedSchoolCode, form.class_grade]);

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
      { text: 'Take Photo', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.5, maxWidth: 720, maxHeight: 720 }, (r) => {
        if (r.assets?.[0]) { applyPhoto(r.assets[0]); }
      }) },
      { text: 'Choose from Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.5, maxWidth: 720, maxHeight: 720 }, (r) => {
        if (r.assets?.[0]) { applyPhoto(r.assets[0]); }
      }) },
    ]);
  };

  const validateStep = () =>
    validateStudentRegistrationStep(step, form, { hasPhoto: Boolean(photoFile), includePassword: true, requireRollNumber: false });

  const nextStep = () => {
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setServerError('Please fill all required fields marked with *.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setFieldErrors({});
    setServerError('');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setFieldErrors({});
    setStep(s => Math.max(s - 1, 0));
  };

  const resetForm = (branch: string) => {
    setStep(0);
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm({ ...INITIAL_FORM, nationality: 'Indian', branch_id: branch });
    fetchRequestCount();
  };

  const submit = async () => {
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    const code = await getSchoolCode();
    const branch = await getBranchId();
    if (!code || !branch) {
      setServerError('Session expired. Please login again.');
      return;
    }
    if (!photoFile) {
      setServerError('Please provide student photograph.');
      return;
    }

    setLoading(true);
    setServerError('');
    setServerSuccess('');
    try {
      const formData = buildStudentRegistrationFormData(form as unknown as Record<string, unknown>, { schoolCode: code, branchId: branch, photoFile });
      const data = await submitStudentRegistration(code, branch, formData);
      if (!isMounted.current) { return; }

      if (data?.roll_number) {
        setGeneratedRollNumber(data.roll_number || form.roll_number || '—');
        setShowRollNumberModal(true);
        setTimeout(() => {
          if (!isMounted.current) { return; }
          setShowRollNumberModal(false);
          resetForm(branch);
        }, 3000);
      } else {
        setServerSuccess('Registration request submitted and will be reviewed by school admins.');
        setTimeout(() => { if (isMounted.current) { resetForm(branch); } }, 2000);
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
        setServerError(formatHttpErrorMessage(err, 'Could not register student. Please try again.'));
      }
    } finally {
      if (isMounted.current) { setLoading(false); }
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={[innerPageLayoutStyles.scrollPageContent, styles.contentContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
          title="Student Registration"
          onBackPress={() => navigation.goBack()}
          scrollWithContent
          containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
        />
        <View style={innerPageLayoutStyles.scrollBody}>
          <RegistrationStatusBanners error={serverError} success={serverSuccess} />
          <RegistrationStepper step={step} onStepPress={setStep} />

          <AppCard style={styles.formCard}>
            <RegistrationFormSteps
              step={step}
              form={form}
              fieldErrors={fieldErrors}
              styles={styles}
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
              onBack={prevStep}
              onNext={nextStep}
              onSubmit={submit}
            />
          </AppCard>

          <RegistrationFooter schoolCode={loggedSchoolCode} branchId={defaultBranchId} />
        </View>
      </ScrollView>

      <RollNumberModal
        visible={showRollNumberModal}
        rollNumber={generatedRollNumber}
        onClose={() => setShowRollNumberModal(false)}
      />
    </View>
  );
}
