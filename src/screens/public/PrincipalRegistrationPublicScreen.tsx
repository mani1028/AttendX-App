import React, { useEffect, useState, useCallback, useMemo } from 'react';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import API from '../../services/api';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { Theme } from '../../theme/tokens';


// Types
interface FormData {
  branch_id: string;
  branch_name: string;
  principal_employee_id: string;
  principal_name: string;
  principal_email: string;
  password: string;
  status: string;
}

interface ClassSection {
  class_name: string;
  sections: string[];
}

// Helper functions
const safeTrim = (v: any): string => String(v ?? '').trim();
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const isSafeCode = (v: string): boolean => /^[a-zA-Z0-9_ -]+$/.test(String(v || '').trim());

const STEPS = [
  { label: 'Branch Info', icon: '🏢' },
  { label: 'Principal Details', icon: '👨‍🏫' },
  { label: 'Classes', icon: '📚' },
];

// Branch Step Component
const BranchStep: React.FC<{
  form: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  errors: Record<string, string>;
}> = ({ form, onChange, errors }) => (
  <View>
    <Text style={styles.sectionTitle}>🏢 Branch Information</Text>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Branch ID</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={form.branch_id}
        editable={false}
      />
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Branch Name <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.branch_name && styles.inputError]}
        placeholder="e.g. Main Campus"
        placeholderTextColor="#94a3b8"
        value={form.branch_name}
        onChangeText={(text) => onChange('branch_name', text)}
      />
      {errors.branch_name && <Text style={styles.errorText}>{errors.branch_name}</Text>}
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Status <Text style={styles.required}>*</Text></Text>
      <View style={styles.pickerContainer}>
        {['ACTIVE', 'INACTIVE'].map(opt => (
          <TouchableOpacity accessibilityRole="button"
            key={opt}
            style={[styles.pickerOption, form.status === opt && styles.pickerOptionActive]}
            onPress={() => onChange('status', opt)}
          >
            <Text style={[styles.pickerText, form.status === opt && styles.pickerTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.status && <Text style={styles.errorText}>{errors.status}</Text>}
    </View>
  </View>
);

// Principal Details Step Component
const PrincipalDetailsStep: React.FC<{
  form: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  errors: Record<string, string>;
  otp: string;
  setOtp: (value: string) => void;
  otpSent: boolean;
  emailVerified: boolean;
  otpSending: boolean;
  otpVerifying: boolean;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
}> = ({
  form,
  onChange,
  confirmPassword,
  onConfirmPasswordChange,
  errors,
  otp,
  setOtp,
  otpSent,
  emailVerified,
  otpSending,
  otpVerifying,
  onSendOtp,
  onVerifyOtp,
}) => (
  <View>
    <Text style={styles.sectionTitle}>👨‍🏫 Principal Details</Text>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Employee ID</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        placeholder="Auto generated"
        placeholderTextColor="#94a3b8"
        value={form.principal_employee_id}
        editable={false}
      />
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.principal_name && styles.inputError]}
        placeholder="Principal full name"
        placeholderTextColor="#94a3b8"
        value={form.principal_name}
        onChangeText={(text) => onChange('principal_name', text)}
      />
      {errors.principal_name && <Text style={styles.errorText}>{errors.principal_name}</Text>}
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
      <View style={styles.rowWithButton}>
        <TextInput
          style={[styles.input, styles.flex1, errors.principal_email && styles.inputError, emailVerified && styles.disabledInput]}
          placeholder="principal@school.edu"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.principal_email}
          onChangeText={(text) => onChange('principal_email', text)}
          editable={!emailVerified}
        />
        <TouchableOpacity accessibilityRole="button"
          style={[styles.verifyBtn, (otpSending || emailVerified) && styles.verifyBtnDisabled]}
          onPress={onSendOtp}
          disabled={otpSending || emailVerified}
        >
          <Text style={styles.verifyBtnText}>
            {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
          </Text>
        </TouchableOpacity>
      </View>
      {errors.director_email && <Text style={styles.errorText}>{errors.director_email}</Text>}
    </View>

    {otpSent && !emailVerified && (
      <View style={styles.formGroup}>
        <View style={styles.rowWithButton}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Enter OTP"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={otp}
            onChangeText={setOtp}
          />
          <TouchableOpacity accessibilityRole="button"
            style={[styles.verifyBtn, styles.verifyOtpBtn]}
            onPress={onVerifyOtp}
            disabled={otpVerifying}
          >
            <Text style={styles.verifyBtnText}>
              {otpVerifying ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    <View style={styles.formGroup}>
      <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="••••••••"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={form.password}
        onChangeText={(text) => onChange('password', text)}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.confirm_password && styles.inputError]}
        placeholder="Re-enter password"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
      />
      {errors.confirm_password && <Text style={styles.errorText}>{errors.confirm_password}</Text>}
    </View>
  </View>
);

// Classes Step Component
const ClassesStep: React.FC<{
  classes: ClassSection[];
  onUpdateClassName: (index: number, value: string) => void;
  onAddClass: () => void;
  onRemoveClass: (index: number) => void;
  onAddSection: (classIndex: number) => void;
  onRemoveSection: (classIndex: number, sectionIndex: number) => void;
  onUpdateSection: (classIndex: number, sectionIndex: number, value: string) => void;
  errors: string[];
  fieldErrors: Record<string, string>;
}> = ({
  classes,
  onUpdateClassName,
  onAddClass,
  onRemoveClass,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  errors,
  fieldErrors,
}) => (
  <View>
    <Text style={styles.sectionTitle}>📚 Classes & Sections</Text>

    {errors.length > 0 && (
      <View style={styles.warningBox}>
        {errors.map((err, i) => (
          <Text key={i} style={styles.warningText}>⚠ {err}</Text>
        ))}
      </View>
    )}

    {classes.map((cls, ci) => (
      <View key={ci} style={styles.classCard}>
        <View style={styles.classHeader}>
          <View style={styles.classNumber}>
            <Text style={styles.classNumberText}>{ci + 1}</Text>
          </View>
          <View style={styles.classNameField}>
            <Text style={styles.label}>Class Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, fieldErrors[`class_name_${ci}`] && styles.inputError]}
              placeholder="e.g. Grade 1, LKG, Class 10"
              placeholderTextColor="#94a3b8"
              value={cls.class_name}
              onChangeText={(text) => onUpdateClassName(ci, text)}
            />
            {fieldErrors[`class_name_${ci}`] && <Text style={styles.errorText}>{fieldErrors[`class_name_${ci}`]}</Text>}
          </View>
        </View>

        {cls.sections.map((sec, si) => (
          <View key={si} style={styles.sectionRow}>
            <TextInput
              style={[styles.sectionInput, fieldErrors[`section_${ci}_${si}`] && styles.inputError]}
              placeholder={`Section ${String.fromCharCode(65 + si)} (e.g. A, B)`}
              placeholderTextColor="#94a3b8"
              value={sec}
              onChangeText={(text) => onUpdateSection(ci, si, text)}
            />
            {fieldErrors[`section_${ci}_${si}`] && <Text style={styles.errorText}>{fieldErrors[`section_${ci}_${si}`]}</Text>}
          </View>
        ))}

        <TouchableOpacity accessibilityRole="button" style={styles.addSectionBtn} onPress={() => onAddSection(ci)}>
          <Text style={styles.addSectionBtnText}>+ Add Section</Text>
        </TouchableOpacity>
      </View>
    ))}

    <TouchableOpacity accessibilityRole="button" style={styles.addClassBtn} onPress={onAddClass}>
      <Text style={styles.addClassBtnText}>+ Add Another Class</Text>
    </TouchableOpacity>
  </View>
);

// Toast Component
const Toast: React.FC<{
  visible: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}> = ({ visible, message, type, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) {return null;}

  return (
    <View style={[styles.toast, type === 'success' ? styles.toastSuccess : styles.toastError]}>
      <Text style={styles.toastIcon}>{type === 'success' ? '✅' : '❌'}</Text>
      <Text style={styles.toastMessage}>{message}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onClose}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function PrincipalRegistrationPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  // Get params from route
  const params = route.params as any;
  const schoolCode = params?.school_code || '';
  const publicBranchId = params?.branch_id || '';

  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Form state
  const [form, setForm] = useState<FormData>({
    branch_id: publicBranchId,
    branch_name: '',
    principal_employee_id: '',
    principal_name: '',
    principal_email: '',
    password: '',
    status: 'ACTIVE',
  });

  // Classes state
  const [classes, setClasses] = useState<ClassSection[]>([{ class_name: '', sections: [''] }]);

  // Password confirmation
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // OTP state
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Set branch ID from params
  useEffect(() => {
    setForm(prev => ({ ...prev, branch_id: publicBranchId }));
  }, [publicBranchId]);

  // Reset password on step change
  useEffect(() => {
    if (activeStep === 1) {
      setForm(prev => ({ ...prev, password: '' }));
      setConfirmPassword('');
    }
  }, [activeStep]);

  // Normalized classes
  const normalizedClasses = useMemo(() => {
    return classes
      .map(c => ({
        class_name: safeTrim(c.class_name),
        sections: (c.sections || []).map(s => safeTrim(s)).filter(Boolean),
      }))
      .filter(c => c.class_name && c.sections.length > 0);
  }, [classes]);

  // Class section errors
  const classSectionErrors = useMemo(() => {
    const errs: string[] = [];
    const names = normalizedClasses.map(c => c.class_name.toLowerCase());
    if (names.some((n, i) => names.indexOf(n) !== i)) {
      errs.push('Duplicate class names found.');
    }
    normalizedClasses.forEach(c => {
      const secs = c.sections.map(s => s.toLowerCase());
      if (secs.some((n, i) => secs.indexOf(n) !== i)) {
        errs.push(`Duplicate sections in class "${c.class_name}".`);
      }
    });
    return errs;
  }, [normalizedClasses]);

  // Passwords match
  const passwordsMatch = form.password === confirmPassword;

  // Can submit
  const canSubmit = useMemo(() => {
    const hasClasses = normalizedClasses.length > 0 && normalizedClasses.every(c => c.sections.length >= 1);
    return (
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
      emailVerified
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
      const res = await API.post('/director/register-principal/send-otp',
        { principal_email: email },
        { headers: { 'x-school-code': schoolCode } }
      );
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
      await API.post('/director/register-principal/verify-otp',
        { principal_email: email, otp: otp.trim() },
        { headers: { 'x-school-code': schoolCode } }
      );
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
      if (!safeTrim(form.branch_name)) {errors.branch_name = 'Branch Name is required';}
      if (!form.status) {errors.status = 'Please select a status';}
    }

    if (activeStep === 1) {
      if (!safeTrim(form.principal_name)) {errors.principal_name = 'Full Name is required';}
      if (!safeTrim(form.principal_email)) {errors.principal_email = 'Email is required';}
      else if (!isValidEmail(form.principal_email)) {errors.principal_email = 'Enter a valid email';}
      if (!safeTrim(form.password)) {errors.password = 'Password is required';}
      else if (form.password.length < 6) {errors.password = 'Minimum 6 characters';}
      if (!safeTrim(confirmPassword)) {errors.confirm_password = 'Please confirm password';}
      else if (form.password !== confirmPassword) {errors.confirm_password = 'Passwords do not match';}
      if (!emailVerified) {errors.principal_email = errors.principal_email || 'Please verify Principal email first';}
    }

    if (activeStep === 2) {
      classes.forEach((cls, ci) => {
        if (!safeTrim(cls.class_name)) {errors[`class_name_${ci}`] = 'Class name is required';}
        cls.sections.forEach((sec, si) => {
          if (!safeTrim(sec)) {errors[`section_${ci}_${si}`] = 'Section cannot be empty';}
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

  const addClass = () => {
    setClasses(prev => [...prev, { class_name: '', sections: [''] }]);
  };

  const removeClass = (index: number) => {
    setClasses(prev => prev.filter((_, i) => i !== index));
  };

  const updateClassName = (index: number, value: string) => {
    setClasses(prev => prev.map((c, i) => i === index ? { ...c, class_name: value } : c));
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[`class_name_${index}`];
      return updated;
    });
  };

  const addSection = (classIndex: number) => {
    setClasses(prev => prev.map((c, i) => i === classIndex ? { ...c, sections: [...c.sections, ''] } : c));
  };

  const updateSection = (classIndex: number, sectionIndex: number, value: string) => {
    setClasses(prev => prev.map((c, i) => {
      if (i === classIndex) {
        return { ...c, sections: c.sections.map((s, j) => j === sectionIndex ? value : s) };
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
        'success'
      );

      resetForm();
      if (navigation.canGoBack()) {
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        setTimeout(() => (navigation as any).navigate('RegisterSchool'), 2000);
      }
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = STEPS.length;

  if (!schoolCode || !publicBranchId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Invalid Invite Link</Text>
        <Text style={styles.errorDescription}>School code or branch ID missing.</Text>
        <AppButton title="Go Back" onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('RegisterSchool');
          }
        }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StandardPageHeader title="Principal Registration" onBackPress={() => navigation.goBack()} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <ScrollView style={innerPageLayoutStyles.scrollViewFront} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📋 Principal Registration</Text>
          <Text style={styles.subtitle}>
            Public invite — Step {activeStep + 1} of {totalSteps}
          </Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepCircle, activeStep > i && styles.stepCompleted, activeStep === i && styles.stepActive]}>
                {activeStep > i ? (
                  <Text style={styles.stepIcon}>✓</Text>
                ) : (
                  <Text style={styles.stepNumber}>{step.icon}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, activeStep === i && styles.stepLabelActive, activeStep > i && styles.stepLabelCompleted]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Form Card */}
        <AppCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>🔗 Public Principal Registration</Text>
              <View style={styles.cardBadges}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>School: {schoolCode || '—'}</Text>
                </View>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>Branch: {safeTrim(form.branch_id) || '—'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.publicBanner}>
            <Text style={styles.publicBannerText}>
              ✅ Public registration — School & Branch are locked by invite URL.
            </Text>
          </View>

          <View style={styles.formBody}>
            {activeStep === 0 && (
              <BranchStep form={form} onChange={handleChange} errors={fieldErrors} />
            )}

            {activeStep === 1 && (
              <PrincipalDetailsStep
                form={form}
                onChange={handleChange}
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={setConfirmPassword}
                errors={fieldErrors}
                otp={otp}
                setOtp={setOtp}
                otpSent={otpSent}
                emailVerified={emailVerified}
                otpSending={otpSending}
                otpVerifying={otpVerifying}
                onSendOtp={sendOtp}
                onVerifyOtp={verifyOtp}
              />
            )}

            {activeStep === 2 && (
              <ClassesStep
                classes={classes}
                onUpdateClassName={updateClassName}
                onAddClass={addClass}
                onRemoveClass={removeClass}
                onAddSection={addSection}
                onRemoveSection={() => {}}
                onUpdateSection={updateSection}
                errors={classSectionErrors}
                fieldErrors={fieldErrors}
              />
            )}

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                ℹ️ Principal can login using: School Code + (Email or Employee ID) + Password
              </Text>
            </View>

            <View style={styles.formFooter}>
              {activeStep === 0 ? (
                <View />
              ) : (
                <AppButton title="← Back" onPress={handleBack} type="secondary" />
              )}
              {activeStep < totalSteps - 1 ? (
                <AppButton title="Next →" onPress={handleNext} />
              ) : (
                <AppButton
                  title={loading ? 'Registering...' : '✓ Register Headmaster'}
                  onPress={handleSubmit}
                  disabled={loading || !canSubmit}
                />
              )}
            </View>
          </View>
        </AppCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏫 School: {schoolCode || '—'}</Text>
          <Text style={styles.footerText}>🏢 Branch: {safeTrim(form.branch_id) || '—'}</Text>
          <Text style={styles.footerText}>🌐 Mode: Public Invite</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  contentContainer: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.error,
    marginBottom: Theme.spacing.sm,
  },
  errorDescription: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: Theme.colors.success,
  },
  stepActive: {
    backgroundColor: '#6648dc',
  },
  stepIcon: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: 'bold',
  },
  stepNumber: {
    fontSize: 16,
  },
  stepLabel: {
    fontSize: 10,
    color: Theme.colors.textSec,
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#6648dc',
    fontWeight: 'bold',
  },
  stepLabelCompleted: {
    color: Theme.colors.success,
  },
  formCard: {
    overflow: 'hidden',
  },
  cardHeader: {
    padding: Theme.spacing.md,
    backgroundColor: '#6648dc',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.card,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Theme.spacing.sm,
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10,
    color: Theme.colors.card,
    fontWeight: '600',
  },
  publicBanner: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  publicBannerText: {
    ...Theme.typography.caption,
    color: '#166534',
    fontWeight: '600',
  },
  formBody: {
    padding: 20,
  },
  sectionTitle: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.success,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Theme.spacing.md,
  },
  formGroup: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSec,
    marginBottom: 6,
  },
  required: {
    color: Theme.colors.error,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    padding: 12,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  inputError: {
    borderColor: Theme.colors.error,
  },
  disabledInput: {
    backgroundColor: Theme.colors.background,
    color: '#94a3b8',
  },
  errorText: {
    ...Theme.typography.label,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
  rowWithButton: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  verifyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#6648dc',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: Theme.colors.card,
    fontWeight: '600',
    fontSize: 13,
  },
  verifyOtpBtn: {
    backgroundColor: Theme.colors.success,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#6648dc',
    borderColor: '#6648dc',
  },
  pickerText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  pickerTextActive: {
    color: Theme.colors.card,
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    color: Theme.colors.error,
    fontSize: 13,
    marginBottom: Theme.spacing.xs,
  },
  classCard: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    padding: Theme.spacing.md,
    marginBottom: 12,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Theme.spacing.md,
  },
  classNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classNumberText: {
    ...Theme.typography.caption,
    fontWeight: '800',
    color: '#6648dc',
  },
  classNameField: {
    flex: 1,
  },
  sectionRow: {
    marginBottom: 12,
  },
  sectionInput: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    padding: 10,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
  },
  addSectionBtn: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  addSectionBtnText: {
    ...Theme.typography.caption,
    fontWeight: '700',
    color: '#6648dc',
  },
  addClassBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: Theme.colors.background,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  addClassBtnText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  hintBox: {
    marginTop: Theme.spacing.md,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    alignItems: 'center',
  },
  hintText: {
    ...Theme.typography.caption,
    color: '#0369a1',
    textAlign: 'center',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  footer: {
    marginTop: Theme.spacing.md,
    padding: 12,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerText: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    gap: 10,
  },
  toastSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  toastError: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.error,
  },
  toastIcon: {
    fontSize: 18,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.text,
  },
  toastClose: {
    fontSize: 16,
    color: '#94a3b8',
    padding: Theme.spacing.xs,
  },
});
