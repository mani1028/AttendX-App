import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import API from '../../services/api';
import AppCard from '../../components/common/AppCard';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';
import {
  teacherRegistrationStyles as styles,
  STEPS,
  INITIAL_FORM,
  InvalidInviteView,
  RegistrationToast,
  RegistrationStepper,
  TeacherRegistrationFormSteps,
  RegistrationNavButtons,
  RegistrationFooter,
  safeTrim,
  isValidEmail,
  isValidAadhaar,
  calculateAge,
  validateTeacherRegistrationStep,
  type FormData,
} from '../../components/public/teacherRegister';

export default function TeacherRegisterPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const params = route.params as { school_code?: string; branch_id?: string };
  const schoolCode = params?.school_code || '';
  const branchId = params?.branch_id || '';
  const isValidPublicLink = Boolean(schoolCode && branchId);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [showJoiningPicker, setShowJoiningPicker] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    ...INITIAL_FORM,
    branch_id: branchId || '',
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, branch_id: branchId || '' }));
  }, [branchId]);

  const handleChange = (name: keyof FormData, value: string) => {
    setServerError('');
    setServerSuccess('');

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === 'date_of_birth') {
      setFormData((prev) => ({
        ...prev,
        date_of_birth: value,
        age: calculateAge(value),
      }));
      return;
    }

    if (name === 'email_id') {
      const normalizedEmail = String(value || '').trim().toLowerCase();
      setFormData((prev) => ({ ...prev, email_id: normalizedEmail }));
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      return;
    }

    if (name === 'designation' && value === 'Accountant') {
      setFormData((prev) => ({ ...prev, designation: value, department_subject: 'Others' }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyPhoto = (asset: any) => {
    setPhotoFile(asset);
    setPhotoPreview(asset.uri || null);
    setFormData((prev) => ({ ...prev, teacher_photograph: asset }));
  };

  const handleImagePick = () => {
    Alert.alert('Select Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (response) => {
            if (response.assets?.[0]) { applyPhoto(response.assets[0]); }
          }),
      },
      {
        text: 'Choose from Gallery',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (response) => {
            if (response.assets?.[0]) { applyPhoto(response.assets[0]); }
          }),
      },
    ]);
  };

  const sendOtp = async () => {
    const email = safeTrim(formData.email_id).toLowerCase();

    if (!email) {
      setServerError('Please enter teacher email first.');
      return;
    }
    if (!isValidEmail(email)) {
      setServerError('Please enter a valid email address.');
      return;
    }
    if (!schoolCode || !branchId) {
      setServerError('Invalid registration link.');
      return;
    }

    setOtpSending(true);
    try {
      const res = await API.post(
        '/teacher/register/send-otp',
        { email_id: email },
        { headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId } },
      );
      setOtp('');
      setOtpSent(true);
      setEmailVerified(false);
      setServerSuccess(res?.data?.message || 'OTP sent successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP';
      if (err?.response?.status === 409) {
        setFieldErrors((prev) => ({ ...prev, email_id: 'Email already exists' }));
        setServerError('Email already exists');
      } else {
        setServerError(msg);
      }
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    const email = safeTrim(formData.email_id).toLowerCase();
    const enteredOtp = safeTrim(otp);

    if (!email) {
      setServerError('Please enter teacher email.');
      return;
    }
    if (!enteredOtp) {
      setServerError('Please enter OTP.');
      return;
    }

    setOtpVerifying(true);
    try {
      const res = await API.post(
        '/teacher/register/verify-otp',
        { email_id: email, otp: enteredOtp },
        { headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId } },
      );
      setOtpSent(true);
      setEmailVerified(true);
      setServerSuccess(res?.data?.message || 'Teacher email verified successfully.');
    } catch (err: any) {
      setEmailVerified(false);
      setServerError(err?.response?.data?.detail || 'OTP verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const validateStep = () =>
    validateTeacherRegistrationStep(step, formData, {
      hasPhoto: Boolean(photoFile),
      emailVerified,
    });

  const nextStep = () => {
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setFieldErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setPhotoFile(null);
    setPhotoPreview(null);
    setOtp('');
    setOtpSent(false);
    setEmailVerified(false);
    setFormData({ ...INITIAL_FORM, branch_id: branchId || '' });
  };

  const submitTeacher = async () => {
    if (!isValidPublicLink) {
      setServerError('Invalid registration link.');
      return;
    }
    if (!photoFile && !formData.teacher_photograph) {
      setServerError('Teacher photograph is required.');
      return;
    }
    if (!isValidEmail(formData.email_id)) {
      setServerError('Please enter a valid email address.');
      return;
    }
    if (!isValidAadhaar(formData.aadhaar_number)) {
      setServerError('Aadhaar must be exactly 12 digits.');
      return;
    }
    if (!formData.password || String(formData.password).length < 6) {
      setServerError('Password must be at least 6 characters.');
      return;
    }
    if (!emailVerified) {
      setServerError('Please verify teacher email with OTP before submitting.');
      return;
    }

    setLoading(true);
    try {
      const imageSource = photoFile || formData.teacher_photograph;
      const data = new FormData();

      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'teacher_photograph') {
          if (imageSource && (imageSource as any).uri) {
            data.append('teacher_photograph', {
              uri: (imageSource as any).uri,
              type: (imageSource as any).type || 'image/jpeg',
              name: (imageSource as any).fileName || 'teacher.jpg',
            } as any);
          }
        } else if (v !== null && v !== '') {
          data.append(k, v as string);
        }
      });

      const res = await API.post('/teacher/register', data, {
        headers: {
          'X-School-Code': schoolCode,
          'X-Branch-Id': branchId,
          'Content-Type': 'multipart/form-data',
        },
      });

      const createdTeacherId = String(res?.data?.teacher_id || '').trim();
      const createdEmployeeId = String(res?.data?.employee_id || formData.employee_id || '').trim();

      setServerSuccess(
        createdTeacherId
          ? `Teacher Registered Successfully! Teacher ID: ${createdTeacherId}${createdEmployeeId ? ` | Employee ID: ${createdEmployeeId}` : ''}`
          : 'Teacher Registered Successfully!',
      );

      resetForm();
    } catch (err: any) {
      setServerError(err?.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidPublicLink) {
    return <InvalidInviteView />;
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.contentContainer}>
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed} title="Teacher Registration" onBackPress={() => navigation.goBack()} />

      <RegistrationToast
        visible={!!serverError}
        message={serverError}
        type="error"
        onClose={() => setServerError('')}
      />
      <RegistrationToast
        visible={!!serverSuccess}
        message={serverSuccess}
        type="success"
        onClose={() => setServerSuccess('')}
      />

        <View style={styles.header}>
          <Text style={styles.title}>👨‍🏫 Teacher Registration</Text>
          <Text style={styles.subtitle}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </Text>
        </View>

        <RegistrationStepper step={step} onStepPress={setStep} />

        <AppCard style={styles.formCard}>
          <TeacherRegistrationFormSteps
            step={step}
            formData={formData}
            fieldErrors={fieldErrors}
            photoPreview={photoPreview}
            showDOBPicker={showDOBPicker}
            showJoiningPicker={showJoiningPicker}
            otp={otp}
            otpSent={otpSent}
            emailVerified={emailVerified}
            otpSending={otpSending}
            otpVerifying={otpVerifying}
            onChange={handleChange}
            onOtpChange={setOtp}
            onSendOtp={sendOtp}
            onVerifyOtp={verifyOtp}
            onImagePick={handleImagePick}
            onShowDOBPicker={setShowDOBPicker}
            onShowJoiningPicker={setShowJoiningPicker}
          />

          <RegistrationNavButtons
            step={step}
            isLastStep={isLastStep}
            loading={loading}
            onBack={prevStep}
            onNext={nextStep}
            onSubmit={submitTeacher}
          />
        </AppCard>

        <RegistrationFooter schoolCode={schoolCode} branchId={branchId} />
      </ScrollView>
    </View>
  );
}
