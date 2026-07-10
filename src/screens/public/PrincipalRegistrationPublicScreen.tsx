import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  safeTrim,
  isValidEmail,
  normalizeClasses,
  getClassSectionErrors,
  RegistrationToast,
  type FormData,
  type ClassSection,
  type ToastState,
} from '../../components/director/principalRegistration';
import {
  publicPrincipalRegistrationStyles as styles,
  PublicInvalidInviteView,
  PublicPrincipalRegistrationForm,
} from '../../components/public/principalRegister';

export default function PrincipalRegistrationPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const params = route.params as { school_code?: string; branch_id?: string };
  const schoolCode = params?.school_code || '';
  const publicBranchId = params?.branch_id || '';

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    branch_id: publicBranchId,
    branch_name: '',
    principal_employee_id: '',
    principal_name: '',
    principal_email: '',
    password: '',
    status: 'ACTIVE',
  });
  const [classes, setClasses] = useState<ClassSection[]>([{ class_name: '', sections: [''] }]);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    setForm(prev => ({ ...prev, branch_id: publicBranchId }));
  }, [publicBranchId]);

  useEffect(() => {
    if (activeStep === 1) {
      setForm(prev => ({ ...prev, password: '' }));
      setConfirmPassword('');
    }
  }, [activeStep]);

  const normalizedClasses = useMemo(() => normalizeClasses(classes), [classes]);
  const classSectionErrors = useMemo(() => getClassSectionErrors(normalizedClasses), [normalizedClasses]);
  const passwordsMatch = form.password === confirmPassword;

  const canSubmit = useMemo(() => {
    const hasClasses = normalizedClasses.length > 0 && normalizedClasses.every(c => c.sections.length >= 1);
    return Boolean(
      schoolCode &&
      publicBranchId &&
      safeTrim(form.branch_name) &&
      safeTrim(form.principal_name) &&
      safeTrim(form.principal_email) &&
      isValidEmail(form.principal_email) &&
      safeTrim(form.password).length >= 6 &&
      confirmPassword.length >= 6 &&
      hasClasses &&
      classSectionErrors.length === 0 &&
      passwordsMatch &&
      emailVerified,
    );
  }, [schoolCode, publicBranchId, form, normalizedClasses, classSectionErrors, confirmPassword, passwordsMatch, emailVerified]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'principal_email') {
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
    }
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const sendOtp = async () => {
    const email = safeTrim(form.principal_email).toLowerCase();
    if (!email) {
      showToast('Please enter Principal email first', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid Principal email', 'error');
      return;
    }
    setOtpSending(true);
    try {
      const res = await API.post('/director/register-principal/send-otp', { principal_email: email }, {
        headers: { 'x-school-code': schoolCode },
      });
      setOtp('');
      setOtpSent(true);
      setEmailVerified(false);
      showToast(res.data?.message || 'OTP sent successfully', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to send OTP', 'error');
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    const email = safeTrim(form.principal_email).toLowerCase();
    if (!otp.trim()) {
      showToast('Please enter OTP', 'error');
      return;
    }
    setOtpVerifying(true);
    try {
      await API.post('/director/register-principal/verify-otp', { principal_email: email, otp: otp.trim() }, {
        headers: { 'x-school-code': schoolCode },
      });
      setEmailVerified(true);
      showToast('Email verified successfully', 'success');
    } catch (err: any) {
      setEmailVerified(false);
      showToast(err?.response?.data?.detail || 'OTP verification failed', 'error');
    } finally {
      setOtpVerifying(false);
    }
  };

  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};
    if (activeStep === 0) {
      if (!safeTrim(form.branch_name)) errors.branch_name = 'Branch Name is required';
      if (!form.status) errors.status = 'Please select a status';
    }
    if (activeStep === 1) {
      if (!safeTrim(form.principal_name)) errors.principal_name = 'Full Name is required';
      if (!safeTrim(form.principal_email)) errors.principal_email = 'Email is required';
      else if (!isValidEmail(form.principal_email)) errors.principal_email = 'Enter a valid email';
      if (!safeTrim(form.password)) errors.password = 'Password is required';
      else if (form.password.length < 6) errors.password = 'Minimum 6 characters';
      if (!safeTrim(confirmPassword)) errors.confirm_password = 'Please confirm password';
      else if (form.password !== confirmPassword) errors.confirm_password = 'Passwords do not match';
      if (!emailVerified) errors.principal_email = errors.principal_email || 'Please verify Principal email first';
    }
    if (activeStep === 2) {
      classes.forEach((cls, ci) => {
        if (!safeTrim(cls.class_name)) errors[`class_name_${ci}`] = 'Class name is required';
        cls.sections.forEach((sec, si) => {
          if (!safeTrim(sec)) errors[`section_${ci}_${si}`] = 'Section cannot be empty';
        });
      });
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setFieldErrors({});
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    setActiveStep(prev => prev - 1);
  };

  const addClass = () => setClasses(prev => [...prev, { class_name: '', sections: [''] }]);
  const removeClass = (index: number) => setClasses(prev => prev.filter((_, i) => i !== index));
  const updateClassName = (index: number, value: string) => {
    setClasses(prev => prev.map((c, i) => (i === index ? { ...c, class_name: value } : c)));
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[`class_name_${index}`];
      return updated;
    });
  };
  const addSection = (classIndex: number) => {
    setClasses(prev => prev.map((c, i) => (i === classIndex ? { ...c, sections: [...c.sections, ''] } : c)));
  };
  const updateSection = (classIndex: number, sectionIndex: number, value: string) => {
    setClasses(prev => prev.map((c, i) => {
      if (i === classIndex) {
        return { ...c, sections: c.sections.map((s, j) => (j === sectionIndex ? value : s)) };
      }
      return c;
    }));
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[`section_${classIndex}_${sectionIndex}`];
      return updated;
    });
  };

  const resetForm = () => {
    setForm({
      branch_id: publicBranchId,
      branch_name: '',
      principal_employee_id: '',
      principal_name: '',
      principal_email: '',
      password: '',
      status: 'ACTIVE',
    });
    setClasses([{ class_name: '', sections: [''] }]);
    setConfirmPassword('');
    setFieldErrors({});
    setActiveStep(0);
    setOtp('');
    setOtpSent(false);
    setEmailVerified(false);
  };

  const goBackOrRegister = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else (navigation as any).navigate('RegisterSchool');
  };

  const handleSubmit = async () => {
    if (!schoolCode || !publicBranchId) {
      showToast('School code or branch missing in invite link', 'error');
      return;
    }
    if (!emailVerified) {
      showToast('Please verify Principal email before registration', 'error');
      return;
    }
    if (classSectionErrors.length > 0) {
      showToast(classSectionErrors.join('\n'), 'error');
      return;
    }
    if (!canSubmit) {
      showToast('Please fill all required fields correctly. Passwords must match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        branch_id: safeTrim(form.branch_id),
        branch_name: safeTrim(form.branch_name),
        principal_employee_id: safeTrim(form.principal_employee_id),
        principal_name: safeTrim(form.principal_name),
        principal_email: safeTrim(form.principal_email).toLowerCase(),
        password: form.password,
        status: safeTrim(form.status || 'ACTIVE').toUpperCase(),
        class_sections: normalizedClasses,
      };
      const res = await API.post('/director/register-principal', payload, {
        headers: { 'x-school-code': schoolCode },
      });
      const createdPrincipalEmployeeId = String(res.data?.principal_employee_id || res.data?.employee_id || '').trim();
      showToast(
        createdPrincipalEmployeeId
          ? `Principal registered successfully! Employee ID: ${createdPrincipalEmployeeId}`
          : 'Principal registered successfully!',
        'success',
      );
      resetForm();
      setTimeout(goBackOrRegister, 2000);
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!schoolCode || !publicBranchId) {
    return <PublicInvalidInviteView onGoBack={goBackOrRegister} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.contentContainer}>
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed} title="Principal Registration" onBackPress={() => navigation.goBack()} />
      <RegistrationToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

        <PublicPrincipalRegistrationForm
          schoolCode={schoolCode}
          form={form}
          activeStep={activeStep}
          classes={classes}
          confirmPassword={confirmPassword}
          fieldErrors={fieldErrors}
          classSectionErrors={classSectionErrors}
          otp={otp}
          otpSent={otpSent}
          emailVerified={emailVerified}
          otpSending={otpSending}
          otpVerifying={otpVerifying}
          loading={loading}
          canSubmit={canSubmit}
          onChange={handleChange}
          onConfirmPasswordChange={setConfirmPassword}
          setOtp={setOtp}
          onSendOtp={sendOtp}
          onVerifyOtp={verifyOtp}
          onUpdateClassName={updateClassName}
          onAddClass={addClass}
          onRemoveClass={removeClass}
          onAddSection={addSection}
          onUpdateSection={updateSection}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </View>
  );
}
