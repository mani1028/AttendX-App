import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import API from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import { getDirectorDashboardOverview } from '../../services/directorService';
import { getSubscriptionStatus } from '../../services/paymentService';
import { canAddBranch, getEffectiveBranchLimit } from '../../utils/pricingPlans';
import {
  DirectorBranchLimitPanel,
  DirectorUpgradeChoiceModal,
} from '../../components/director/DirectorBranchUpgradeFlow';
import AppCard from '../../components/common/AppCard';
import { useAuth } from '../../context/AuthContext';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  getSchoolCode,
  safeTrim,
  normalizeSection,
  isValidEmail,
  normalizeClasses,
  getClassSectionErrors,
  buildInviteLink,
  principalRegistrationStyles as styles,
  RegistrationToast,
  PrincipalRegistrationForm,
  PrincipalRegistrationFooter,
  type FormData,
  type ClassSection,
  type ToastState,
} from '../../components/director/principalRegistration';

export default function PrincipalRegistrationScreen() {
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [limitChecking, setLimitChecking] = useState<boolean>(true);
  const [branchLimitReached, setBranchLimitReached] = useState<boolean>(false);
  const [branchCount, setBranchCount] = useState<number>(0);
  const [branchLimit, setBranchLimit] = useState<number>(1);
  const [planName, setPlanName] = useState<string>('Trial');
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [existingBranchIds, setExistingBranchIds] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    branch_id: '',
    branch_name: '',
    principal_employee_id: '',
    principal_name: '',
    principal_email: '',
    password: '',
    status: 'ACTIVE',
  });

  const [classes, setClasses] = useState<ClassSection[]>([{ class_name: '', sections: [''] }]);
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [showInviteLink, setShowInviteLink] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      setSchoolCode(code);
      if (code) {
        await Promise.all([loadExistingBranches(code), checkBranchLimit(code)]);
      } else {
        setLimitChecking(false);
      }
    };
    load();

    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const checkBranchLimit = async (code: string) => {
    setLimitChecking(true);
    try {
      const [overview, status] = await Promise.all([
        getDirectorDashboardOverview(code),
        getSubscriptionStatus(code),
      ]);
      const count = overview.stats.branches;
      const limit = getEffectiveBranchLimit(status);
      setBranchCount(count);
      setBranchLimit(limit);
      setPlanName(String(status?.current_plan_name || status?.current_plan || 'Trial'));
      setBranchLimitReached(!canAddBranch(count, limit));
    } catch (err) {
      console.error('Failed to verify branch limits:', err);
      setBranchLimitReached(false);
    } finally {
      setLimitChecking(false);
    }
  };

  const loadExistingBranches = async (code: string) => {
    try {
      const res = await API.get('/director/branches', {
        headers: { 'x-school-code': code },
      });
      if (res.data?.items) {
        const ids = res.data.items.map((b: { branch_id: string }) =>
          safeTrim(b.branch_id).toUpperCase(),
        );
        setExistingBranchIds(ids);
      }
    } catch (err) {
      console.error('Failed to load branch IDs:', err);
    }
  };

  useEffect(() => {
    if (activeStep === 1 && schoolCode) {
      const fetchPrincipalId = async () => {
        try {
          const res = await API.get('/director/generate-principal-id', {
            headers: { 'x-school-code': schoolCode },
          });
          if (res.data?.principal_employee_id) {
            setForm(prev => ({ ...prev, principal_employee_id: res.data.principal_employee_id }));
          }
        } catch (err) {
          console.error('Failed to generate Principal ID:', err);
          setForm(prev => ({ ...prev, principal_employee_id: 'Principal-000' }));
        }
      };
      fetchPrincipalId();
    }
  }, [activeStep, schoolCode]);

  const normalizedClasses = useMemo(() => normalizeClasses(classes), [classes]);
  const classSectionErrors = useMemo(
    () => getClassSectionErrors(normalizedClasses),
    [normalizedClasses],
  );
  const passwordsMatch = form.password === confirmPassword;

  const canSubmit = useMemo(() => {
    const hasClasses =
      normalizedClasses.length > 0 && normalizedClasses.every(c => c.sections.length >= 1);
    return (
      schoolCode &&
      safeTrim(form.branch_id) &&
      safeTrim(form.branch_name) &&
      safeTrim(form.principal_name) &&
      safeTrim(form.principal_email) &&
      isValidEmail(form.principal_email) &&
      safeTrim(form.password).length >= 6 &&
      confirmPassword.length >= 6 &&
      hasClasses &&
      classSectionErrors.length === 0 &&
      passwordsMatch &&
      emailVerified
    );
  }, [schoolCode, form, normalizedClasses, classSectionErrors, confirmPassword, passwordsMatch, emailVerified]);

  const inviteLink = useMemo(
    () => buildInviteLink(schoolCode, form.branch_id),
    [schoolCode, form.branch_id],
  );

  const showToast = (message: string, type: ToastState['type']) => {
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
      const res = await API.post(
        '/director/register-principal/send-otp',
        { principal_email: email },
        { headers: { 'x-school-code': schoolCode } },
      );
      setOtp('');
      setOtpSent(true);
      setEmailVerified(false);
      showToast(res.data?.message || 'OTP sent successfully', 'success');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      showToast(formatErrorMessage(detail) || 'Failed to send OTP', 'error');
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
      await API.post(
        '/director/register-principal/verify-otp',
        { principal_email: email, otp: otp.trim() },
        { headers: { 'x-school-code': schoolCode } },
      );
      setEmailVerified(true);
      showToast('Email verified successfully', 'success');
    } catch (err: unknown) {
      setEmailVerified(false);
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      showToast(formatErrorMessage(detail) || 'OTP verification failed', 'error');
    } finally {
      setOtpVerifying(false);
    }
  };

  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (activeStep === 0) {
      if (!safeTrim(form.branch_id)) { errors.branch_id = 'Branch ID is required'; }
      if (!safeTrim(form.branch_name)) { errors.branch_name = 'Branch Name is required'; }
      if (!form.status) { errors.status = 'Please select a status'; }
    }

    if (activeStep === 1) {
      if (!safeTrim(form.principal_name)) { errors.principal_name = 'Full Name is required'; }
      if (!safeTrim(form.principal_email)) { errors.principal_email = 'Email is required'; }
      else if (!isValidEmail(form.principal_email)) { errors.principal_email = 'Enter a valid email'; }
      if (!safeTrim(form.password)) { errors.password = 'Password is required'; }
      else if (form.password.length < 6) { errors.password = 'Minimum 6 characters'; }
      if (!safeTrim(confirmPassword)) { errors.confirm_password = 'Please confirm password'; }
      else if (form.password !== confirmPassword) { errors.confirm_password = 'Passwords do not match'; }
      if (!emailVerified) {
        errors.principal_email = errors.principal_email || 'Please verify Principal email first';
      }
    }

    if (activeStep === 2) {
      classes.forEach((cls, ci) => {
        if (!safeTrim(cls.class_name)) { errors[`class_name_${ci}`] = 'Class name is required'; }
        cls.sections.forEach((sec, si) => {
          if (!safeTrim(sec)) { errors[`section_${ci}_${si}`] = 'Section cannot be empty'; }
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

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as { navigate: (name: string) => void }).navigate('DirectorDashboard');
    }
  };

  const copyInviteLink = async () => {
    setShowInviteLink(true);
    if (!inviteLink) {
      showToast('Please enter Branch ID first', 'error');
      return;
    }
    try {
      Clipboard.setString(inviteLink);
      showToast('Link copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy link:', err);
      Alert.alert('Invite Link', inviteLink);
    }
  };

  const addClass = () => {
    setClasses(prev => [...prev, { class_name: '', sections: [''] }]);
  };

  const removeClass = (index: number) => {
    setClasses(prev => prev.filter((_, i) => i !== index));
  };

  const updateClassName = (index: number, value: string) => {
    setClasses(prev => prev.map((c, i) => (i === index ? { ...c, class_name: value } : c)));
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[`class_name_${index}`];
      return updated;
    });
  };

  const addSection = (classIndex: number) => {
    setClasses(prev =>
      prev.map((c, i) => (i === classIndex ? { ...c, sections: [...c.sections, ''] } : c)),
    );
  };

  const removeSection = (classIndex: number, sectionIndex: number) => {
    setClasses(prev =>
      prev.map((c, i) => {
        if (i === classIndex) {
          const newSections = c.sections.filter((_, j) => j !== sectionIndex);
          return { ...c, sections: newSections.length ? newSections : [''] };
        }
        return c;
      }),
    );
  };

  const updateSection = (classIndex: number, sectionIndex: number, value: string) => {
    const normalizedValue = normalizeSection(value);
    setClasses(prev =>
      prev.map((c, i) => {
        if (i === classIndex) {
          return {
            ...c,
            sections: c.sections.map((s, j) => (j === sectionIndex ? normalizedValue : s)),
          };
        }
        return c;
      }),
    );
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[`section_${classIndex}_${sectionIndex}`];
      return updated;
    });
  };

  const handleSubmit = async () => {
    const trimmedBranchId = safeTrim(form.branch_id).toUpperCase();

    if (existingBranchIds.includes(trimmedBranchId)) {
      showToast(
        `❌ Branch ID "${trimmedBranchId}" already exists! Please enter another Branch ID.`,
        'error',
      );
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

      const createdPrincipalEmployeeId = String(
        res?.data?.principal_employee_id || res?.data?.employee_id || '',
      ).trim();
      showToast(
        createdPrincipalEmployeeId
          ? `Principal registered successfully! Employee ID: ${createdPrincipalEmployeeId}`
          : 'Principal registered successfully!',
        'success',
      );

      setExistingBranchIds([...existingBranchIds, trimmedBranchId]);

      setForm({
        branch_id: '',
        branch_name: '',
        principal_employee_id: '',
        principal_name: '',
        principal_email: '',
        password: '',
        status: 'ACTIVE',
      });
      setClasses([{ class_name: '', sections: [''] }]);
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      setActiveStep(0);

      setTimeout(() => navigation.goBack(), 2000);
    } catch (err: unknown) {
      const apiErr = err as {
        message?: string;
        response?: { status?: number; data?: { detail?: unknown } };
      };
      const errDetail =
        formatErrorMessage(apiErr?.response?.data?.detail) ||
        apiErr?.message ||
        'Register failed';
      if (errDetail.includes('already exists') || apiErr?.response?.status === 409) {
        showToast(
          `❌ Branch ID "${trimmedBranchId}" already exists! Please enter another Branch ID.`,
          'error',
        );
      } else {
        showToast(errDetail, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <StandardPageHeader
        scrollWithContent
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed} title="Principal Registration" onBackPress={() => navigation.goBack()} />

      <RegistrationToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

        {limitChecking ? (
          <AppCard>
            <Text style={styles.limitCheckingText}>Verifying branch limits…</Text>
          </AppCard>
        ) : branchLimitReached ? (
          <>
            <DirectorBranchLimitPanel
              branchCount={branchCount}
              branchLimit={branchLimit}
              planName={planName}
              onCancel={() => navigation.goBack()}
              onUpgradePress={() => setShowUpgradeModal(true)}
            />
            <DirectorUpgradeChoiceModal
              visible={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              currentPlanName={planName}
              onUpgradePlan={() => {
                setShowUpgradeModal(false);
                (navigation as { navigate: (name: string, params?: object) => void }).navigate(
                  'RenewalPayment',
                  { upgradeMode: 'plan' },
                );
              }}
              onAddBranchSlot={() => {
                setShowUpgradeModal(false);
                (navigation as { navigate: (name: string, params?: object) => void }).navigate(
                  'RenewalPayment',
                  { upgradeMode: 'branch' },
                );
              }}
            />
          </>
        ) : (
          <>
            <PrincipalRegistrationForm
              schoolCode={schoolCode}
              form={form}
              activeStep={activeStep}
              inviteLink={inviteLink}
              showInviteLink={showInviteLink}
              onCopyInviteLink={copyInviteLink}
              onChange={handleChange}
              fieldErrors={fieldErrors}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={setConfirmPassword}
              otp={otp}
              setOtp={setOtp}
              otpSent={otpSent}
              emailVerified={emailVerified}
              otpSending={otpSending}
              otpVerifying={otpVerifying}
              onSendOtp={sendOtp}
              onVerifyOtp={verifyOtp}
              classes={classes}
              onUpdateClassName={updateClassName}
              onAddClass={addClass}
              onRemoveClass={removeClass}
              onAddSection={addSection}
              onRemoveSection={removeSection}
              onUpdateSection={updateSection}
              classSectionErrors={classSectionErrors}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              loading={loading}
              canSubmit={!!canSubmit}
              onCancel={handleCancel}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
            <PrincipalRegistrationFooter schoolCode={schoolCode} branchId={form.branch_id} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
