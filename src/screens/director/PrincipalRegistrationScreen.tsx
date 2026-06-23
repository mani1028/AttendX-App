import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ChevronLeft } from 'lucide-react-native';
import API from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppInput from '../../components/common/AppInput';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import StandardPageHeader from '../../components/layout/StandardPageHeader';

// Types
interface ClassSection {
  class_name: string;
  sections: string[];
}

interface FormData {
  branch_id: string;
  branch_name: string;
  principal_employee_id: string;
  principal_name: string;
  principal_email: string;
  password: string;
  status: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

const safeTrim = (v: any): string => String(v ?? '').trim();
const normalizeSection = (value: string): string => String(value ?? '').toUpperCase();
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

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

    <AppInput
      label="Branch ID"
      placeholder="e.g. BR-001"
      value={form.branch_id}
      onChangeText={(text) => onChange('branch_id', text)}
      error={errors.branch_id}
      autoCapitalize="characters"
    />

    <AppInput
      label="Branch Name"
      placeholder="e.g. Main Campus"
      value={form.branch_name}
      onChangeText={(text) => onChange('branch_name', text)}
      error={errors.branch_name}
    />

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

    <AppInput
      label="Employee ID"
      placeholder="Auto generated"
      value={form.principal_employee_id}
      editable={false}
      containerStyle={{ opacity: 0.7 }}
    />

    <AppInput
      label="Principal Name"
      placeholder="Principal full name"
      value={form.principal_name}
      onChangeText={(text) => onChange('principal_name', text)}
      error={errors.principal_name}
    />

    <AppInput
      label="Email"
      placeholder="principal@school.edu"
      keyboardType="email-address"
      autoCapitalize="none"
      value={form.principal_email}
      onChangeText={(text) => onChange('principal_email', text)}
      editable={!emailVerified}
      error={errors.principal_email}
      rightIcon={
        <TouchableOpacity accessibilityRole="button"
          style={[styles.verifyBtn, (otpSending || emailVerified) && styles.verifyBtnDisabled, { height: 34, paddingVertical: 0, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }]}
          onPress={onSendOtp}
          disabled={otpSending || emailVerified}
        >
          <Text style={[styles.verifyBtnText, { ...Theme.typography.label }]}>
            {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
          </Text>
        </TouchableOpacity>
      }
    />

    {otpSent && !emailVerified && (
      <AppInput
        label="Enter OTP"
        placeholder="Enter OTP"
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
        rightIcon={
          <TouchableOpacity accessibilityRole="button"
            style={[styles.verifyBtn, styles.verifyOtpBtn, { height: 34, paddingVertical: 0, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }]}
            onPress={onVerifyOtp}
            disabled={otpVerifying}
          >
            <Text style={[styles.verifyBtnText, { ...Theme.typography.label }]}>
              {otpVerifying ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>
        }
      />
    )}

    <AppInput
      label="Password"
      placeholder="••••••••"
      secureTextEntry
      value={form.password}
      onChangeText={(text) => onChange('password', text)}
      error={errors.password}
    />

    <AppInput
      label="Confirm Password"
      placeholder="Re-enter password"
      secureTextEntry
      value={confirmPassword}
      onChangeText={onConfirmPasswordChange}
      error={errors.confirm_password}
    />
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
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
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
  focusedField,
  setFocusedField,
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
              style={[
                styles.input,
                fieldErrors[`class_name_${ci}`] && styles.inputError,
                focusedField === `class_name_${ci}` && styles.inputFocused,
              ]}
              placeholder="e.g. Grade 1, LKG, Class 10"
              placeholderTextColor="#94a3b8"
              value={cls.class_name}
              onChangeText={(text) => onUpdateClassName(ci, text)}
              onFocus={() => setFocusedField(`class_name_${ci}`)}
              onBlur={() => setFocusedField(null)}
            />
            {fieldErrors[`class_name_${ci}`] && <Text style={styles.errorText}>{fieldErrors[`class_name_${ci}`]}</Text>}
          </View>
          {classes.length > 1 && (
            <TouchableOpacity accessibilityRole="button" style={styles.removeClassBtn} onPress={() => onRemoveClass(ci)}>
              <Text style={styles.removeClassBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>

        {cls.sections.map((sec, si) => (
          <View key={si} style={styles.sectionRow}>
            <TextInput
              style={[
                styles.sectionInput,
                fieldErrors[`section_${ci}_${si}`] && styles.inputError,
                focusedField === `section_${ci}_${si}` && styles.sectionInputFocused,
              ]}
              placeholder={`Section ${String.fromCharCode(65 + si)} (e.g. A, B)`}
              placeholderTextColor="#94a3b8"
              value={sec}
              onChangeText={(text) => onUpdateSection(ci, si, text)}
              onFocus={() => setFocusedField(`section_${ci}_${si}`)}
              onBlur={() => setFocusedField(null)}
            />
            {cls.sections.length > 1 && (
              <TouchableOpacity accessibilityRole="button" style={styles.removeSectionBtn} onPress={() => onRemoveSection(ci, si)}>
                <Text style={styles.removeSectionBtnText}>✕</Text>
              </TouchableOpacity>
            )}
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
  }, [visible, onClose]);

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

export default function PrincipalRegistrationScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [existingBranchIds, setExistingBranchIds] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState<FormData>({
    branch_id: '',
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
  const [showInviteLink, setShowInviteLink] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Load school code
  useEffect(() => {
    const load = async () => {
      const code = await getSchoolCode();
      setSchoolCode(code);
      if (code) {
        loadExistingBranches(code);
      }
    };
    load();

    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  // Load existing branch IDs
  const loadExistingBranches = async (code: string) => {
    try {
      const res = await API.get('/director/branches', {
        headers: { 'x-school-code': code },
      });
      if (res.data?.items) {
        const ids = res.data.items.map((b: any) => safeTrim(b.branch_id).toUpperCase());
        setExistingBranchIds(ids);
      }
    } catch (err) {
      console.error('Failed to load branch IDs:', err);
    }
  };

  // Fetch Principal employee ID when entering step 1
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

  // Normalized classes
  const normalizedClasses = useMemo(() => {
    return classes
      .map(c => ({
        class_name: safeTrim(c.class_name),
        sections: (c.sections || []).map(s => safeTrim(normalizeSection(s))).filter(Boolean),
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

  // Invite link
  const inviteLink = useMemo(() => {
    const sc = safeTrim(schoolCode);
    const bid = safeTrim(form.branch_id);
    return sc && bid ? `attendx://principal-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}` : '';
  }, [schoolCode, form.branch_id]);

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
      showToast(formatErrorMessage(err?.response?.data?.detail) || 'Failed to send OTP', 'error');
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
      showToast(formatErrorMessage(err?.response?.data?.detail) || 'OTP verification failed', 'error');
    } finally {
      setOtpVerifying(false);
    }
  };

  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (activeStep === 0) {
      if (!safeTrim(form.branch_id)) {errors.branch_id = 'Branch ID is required';}
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

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('DirectorDashboard');
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

  const removeSection = (classIndex: number, sectionIndex: number) => {
    setClasses(prev => prev.map((c, i) => {
      if (i === classIndex) {
        const newSections = c.sections.filter((_, j) => j !== sectionIndex);
        return { ...c, sections: newSections.length ? newSections : [''] };
      }
      return c;
    }));
  };

  const updateSection = (classIndex: number, sectionIndex: number, value: string) => {
    const normalizedValue = normalizeSection(value);
    setClasses(prev => prev.map((c, i) => {
      if (i === classIndex) {
        return { ...c, sections: c.sections.map((s, j) => j === sectionIndex ? normalizedValue : s) };
      }
      return c;
    }));
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[`section_${classIndex}_${sectionIndex}`];
      return updated;
    });
  };

  const handleSubmit = async () => {
    const trimmedBranchId = safeTrim(form.branch_id).toUpperCase();

    // Check for duplicate branch ID
    if (existingBranchIds.includes(trimmedBranchId)) {
      showToast(`❌ Branch ID "${trimmedBranchId}" already exists! Please enter another Branch ID.`, 'error');
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

      const createdPrincipalEmployeeId = String(res?.data?.principal_employee_id || res?.data?.employee_id || '').trim();
      showToast(
        createdPrincipalEmployeeId
          ? `Principal registered successfully! Employee ID: ${createdPrincipalEmployeeId}`
          : 'Principal registered successfully!',
        'success'
      );

      setExistingBranchIds([...existingBranchIds, trimmedBranchId]);

      // Reset form
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
    } catch (err: any) {
      const errDetail = formatErrorMessage(err?.response?.data?.detail) || err?.message || 'Register failed';
      if (errDetail.includes('already exists') || err?.response?.status === 409) {
        showToast(`❌ Branch ID "${trimmedBranchId}" already exists! Please enter another Branch ID.`, 'error');
      } else {
        showToast(errDetail, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = STEPS.length;

  return (
    <View style={styles.container}>


      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vibrant Gradient Header with Stepper */}
        <StandardPageHeader title="Principal Registration" onBackPress={() => navigation.goBack()} />

        {/* Form Card */}
        <AppCard style={styles.formCard} padded={false}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Register Principal</Text>
              <View style={styles.cardBadges}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>School: {schoolCode || '—'}</Text>
                </View>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>Branch: {safeTrim(form.branch_id) || '—'}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.copyLinkBtn} onPress={copyInviteLink}>
              <Text style={styles.copyLinkBtnText}>🔗 Copy Invite Link</Text>
            </TouchableOpacity>
          </View>

          {showInviteLink && inviteLink && (
            <View style={styles.linkBanner}>
              <Text style={styles.linkBannerText}>
                <Text style={styles.linkBannerLabel}>Invite Link:</Text> {inviteLink}
              </Text>
            </View>
          )}

          <View style={styles.formBody}>
            {activeStep === 0 && (
              <BranchStep
                form={form}
                onChange={handleChange}
                errors={fieldErrors}
              />
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
                onRemoveSection={removeSection}
                onUpdateSection={updateSection}
                errors={classSectionErrors}
                fieldErrors={fieldErrors}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
              />
            )}

            <View style={styles.formFooter}>
              {activeStep === 0 ? (
                <AppButton title="Cancel" onPress={handleCancel} type="secondary" />
              ) : (
                <AppButton title="← Back" onPress={handleBack} type="secondary" />
              )}
              {activeStep < totalSteps - 1 ? (
                <AppButton title="Next →" onPress={handleNext} />
              ) : (
                <AppButton
                  title={loading ? 'Registering...' : '✓ Register Principal'}
                  onPress={handleSubmit}
                  disabled={loading || !canSubmit}
                />
              )}
            </View>
          </View>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              ℹ️ Principal can login using: School Code + Employee ID or Email + Password
            </Text>
          </View>
        </AppCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏫 School Code: {schoolCode || '—'}</Text>
          <Text style={styles.footerText}>🏢 Branch ID: {safeTrim(form.branch_id) || '—'}</Text>
          <Text style={styles.footerText}>👑 Role: Principal (Registration)</Text>
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
  headerStandard: {
    paddingBottom: Theme.spacing.lg,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Theme.colors.card,
    ...Theme.typography.h3,
  },
  backButton: {
    padding: Theme.spacing.sm,
    marginLeft: -8,
  },
  headerStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  stepperLine: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 18,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: -1,
  },
  stepperLineProgress: {
    position: 'absolute',
    left: 36,
    top: 18,
    height: 2,
    backgroundColor: '#10B981',
    zIndex: -1,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepActive: {
    backgroundColor: Theme.colors.background,
    borderColor: Theme.colors.card,
  },
  stepIcon: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: 'bold',
  },
  stepNumber: {
    ...Theme.typography.body,
  },
  stepLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: Theme.colors.card,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: '#10B981',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollViewContent: {
    padding: Theme.spacing.md,
    paddingBottom: 150,
  },
  formCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: Theme.colors.background,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
    backgroundColor: Theme.colors.background,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cardBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10,
    color: Theme.colors.blue,
    fontWeight: '600',
  },
  copyLinkBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 8,
  },
  copyLinkBtnText: {
    color: Theme.colors.blue,
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  linkBanner: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  linkBannerText: {
    ...Theme.typography.caption,
    color: '#92400e',
  },
  linkBannerLabel: {
    fontWeight: 'bold',
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
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 14,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  inputFocused: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.background,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: Theme.colors.error,
    backgroundColor: '#fff8f8',
  },
  disabledInput: {
    backgroundColor: Theme.colors.background,
    borderColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.primary,
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
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  pickerText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  pickerTextActive: {
    color: Theme.colors.card,
    fontWeight: '700',
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
    color: Theme.colors.primary,
  },
  classNameField: {
    flex: 1,
  },
  removeClassBtn: {
    padding: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  removeClassBtnText: {
    ...Theme.typography.body,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  sectionInputFocused: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.background,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  removeSectionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSectionBtnText: {
    ...Theme.typography.body,
    color: Theme.colors.error,
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
    color: Theme.colors.primary,
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
  },
  addClassBtnText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textSec,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.lg,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  hintBox: {
    marginTop: Theme.spacing.md,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
  },
  hintText: {
    ...Theme.typography.caption,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    marginHorizontal: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  footerText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    fontWeight: '600',
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
