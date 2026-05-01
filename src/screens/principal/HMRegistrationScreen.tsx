import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import { formatErrorMessage } from '../../utils/helpers';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';

// Types
interface ClassSection {
  class_name: string;
  sections: string[];
}

interface FormData {
  branch_id: string;
  branch_name: string;
  hm_employee_id: string;
  hm_name: string;
  hm_email: string;
  password: string;
  status: string;
}

// Helper functions
const getSchoolCode = async (): Promise<string> => {
  const code = await AsyncStorage.getItem('school_code');
  return code || (await AsyncStorage.getItem('schoolCode')) || '';
};

const safeTrim = (v: any): string => String(v ?? '').trim();
const normalizeSection = (value: string): string => String(value ?? '').toUpperCase();
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const STEPS = [
  { label: 'Branch Info', icon: '🏢' },
  { label: 'HM Details', icon: '👨‍🏫' },
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
      <Text style={styles.label}>Branch ID <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.branch_id && styles.inputError]}
        placeholder="e.g. BR-001"
        placeholderTextColor="#94a3b8"
        value={form.branch_id}
        onChangeText={(text) => onChange('branch_id', text)}
      />
      {errors.branch_id && <Text style={styles.errorText}>{errors.branch_id}</Text>}
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
          <TouchableOpacity
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

// HM Details Step Component
const HMDetailsStep: React.FC<{
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
    <Text style={styles.sectionTitle}>👨‍🏫 Headmaster Details</Text>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Employee ID</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        placeholder="Auto generated"
        placeholderTextColor="#94a3b8"
        value={form.hm_employee_id}
        editable={false}
      />
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.hm_name && styles.inputError]}
        placeholder="Headmaster full name"
        placeholderTextColor="#94a3b8"
        value={form.hm_name}
        onChangeText={(text) => onChange('hm_name', text)}
      />
      {errors.hm_name && <Text style={styles.errorText}>{errors.hm_name}</Text>}
    </View>

    <View style={styles.formGroup}>
      <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
      <View style={styles.rowWithButton}>
        <TextInput
          style={[styles.input, styles.flex1, errors.hm_email && styles.inputError, emailVerified && styles.disabledInput]}
          placeholder="hm@school.edu"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.hm_email}
          onChangeText={(text) => onChange('hm_email', text)}
          editable={!emailVerified}
        />
        <TouchableOpacity
          style={[styles.verifyBtn, (otpSending || emailVerified) && styles.verifyBtnDisabled]}
          onPress={onSendOtp}
          disabled={otpSending || emailVerified}
        >
          <Text style={styles.verifyBtnText}>
            {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
          </Text>
        </TouchableOpacity>
      </View>
      {errors.hm_email && <Text style={styles.errorText}>{errors.hm_email}</Text>}
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
          <TouchableOpacity
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
          {classes.length > 1 && (
            <TouchableOpacity style={styles.removeClassBtn} onPress={() => onRemoveClass(ci)}>
              <Text style={styles.removeClassBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
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
            {cls.sections.length > 1 && (
              <TouchableOpacity style={styles.removeSectionBtn} onPress={() => onRemoveSection(ci, si)}>
                <Text style={styles.removeSectionBtnText}>✕</Text>
              </TouchableOpacity>
            )}
            {fieldErrors[`section_${ci}_${si}`] && <Text style={styles.errorText}>{fieldErrors[`section_${ci}_${si}`]}</Text>}
          </View>
        ))}

        <TouchableOpacity style={styles.addSectionBtn} onPress={() => onAddSection(ci)}>
          <Text style={styles.addSectionBtnText}>+ Add Section</Text>
        </TouchableOpacity>
      </View>
    ))}

    <TouchableOpacity style={styles.addClassBtn} onPress={onAddClass}>
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

  if (!visible) return null;

  return (
    <View style={[styles.toast, type === 'success' ? styles.toastSuccess : styles.toastError]}>
      <Text style={styles.toastIcon}>{type === 'success' ? '✅' : '❌'}</Text>
      <Text style={styles.toastMessage}>{message}</Text>
      <TouchableOpacity onPress={onClose}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function HMRegistrationScreen() {
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
    hm_employee_id: '',
    hm_name: '',
    hm_email: '',
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
  const [copied, setCopied] = useState<boolean>(false);

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
  }, []);

  // Load existing branch IDs
  const loadExistingBranches = async (code: string) => {
    try {
      const res = await API.get('/principal/branches', {
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

  // Fetch HM employee ID when entering step 1
  useEffect(() => {
    if (activeStep === 1 && schoolCode) {
      const fetchHmId = async () => {
        try {
          const res = await API.get('/principal/generate-hm-id', {
            headers: { 'x-school-code': schoolCode },
          });
          if (res.data?.hm_employee_id) {
            setForm(prev => ({ ...prev, hm_employee_id: res.data.hm_employee_id }));
          }
        } catch (err) {
          console.error('Failed to generate HM ID:', err);
          setForm(prev => ({ ...prev, hm_employee_id: 'HM-000' }));
        }
      };
      fetchHmId();
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
      safeTrim(form.hm_name) &&
      safeTrim(form.hm_email) &&
      isValidEmail(form.hm_email) &&
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
    return sc && bid ? `attendx://hm-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}` : '';
  }, [schoolCode, form.branch_id]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'hm_email') {
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
    const email = safeTrim(form.hm_email).toLowerCase();

    if (!email) {
      showToast('Please enter HM email first', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showToast('Please enter a valid HM email', 'error');
      return;
    }

    setOtpSending(true);
    try {
      const res = await API.post('/principal/register-hm/send-otp', { hm_email: email }, {
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
    const email = safeTrim(form.hm_email).toLowerCase();

    if (!otp.trim()) {
      showToast('Please enter OTP', 'error');
      return;
    }

    setOtpVerifying(true);
    try {
      await API.post('/principal/register-hm/verify-otp', { hm_email: email, otp: otp.trim() }, {
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
      if (!safeTrim(form.branch_id)) errors.branch_id = 'Branch ID is required';
      if (!safeTrim(form.branch_name)) errors.branch_name = 'Branch Name is required';
      if (!form.status) errors.status = 'Please select a status';
    }

    if (activeStep === 1) {
      if (!safeTrim(form.hm_name)) errors.hm_name = 'Full Name is required';
      if (!safeTrim(form.hm_email)) errors.hm_email = 'Email is required';
      else if (!isValidEmail(form.hm_email)) errors.hm_email = 'Enter a valid email';
      if (!safeTrim(form.password)) errors.password = 'Password is required';
      else if (form.password.length < 6) errors.password = 'Minimum 6 characters';
      if (!safeTrim(confirmPassword)) errors.confirm_password = 'Please confirm password';
      else if (form.password !== confirmPassword) errors.confirm_password = 'Passwords do not match';
      if (!emailVerified) errors.hm_email = errors.hm_email || 'Please verify HM email first';
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

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('PrincipalDashboard');
    }
  };

  const copyInviteLink = async () => {
    setShowInviteLink(true);
    if (!inviteLink) {
      showToast('Please enter Branch ID first', 'error');
      return;
    }
    // On mobile, we'll just show the link in an alert
    Alert.alert('Invite Link', inviteLink, [
      { text: 'OK' },
      { text: 'Copy', onPress: () => {
        // For mobile, we'll use AsyncStorage or share
        showToast('Link copied to clipboard', 'success');
      } },
    ]);
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
      showToast('Please verify HM email before registration', 'error');
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
        hm_employee_id: safeTrim(form.hm_employee_id),
        hm_name: safeTrim(form.hm_name),
        hm_email: safeTrim(form.hm_email).toLowerCase(),
        password: form.password,
        status: safeTrim(form.status || 'ACTIVE').toUpperCase(),
        class_sections: normalizedClasses,
      };

      const res = await API.post('/principal/register-hm', payload, {
        headers: { 'x-school-code': schoolCode },
      });

      const createdHmEmployeeId = String(res?.data?.hm_employee_id || res?.data?.employee_id || '').trim();
      showToast(
        createdHmEmployeeId
          ? `Headmaster registered successfully! Employee ID: ${createdHmEmployeeId}`
          : 'Headmaster registered successfully!',
        'success'
      );
      
      setExistingBranchIds([...existingBranchIds, trimmedBranchId]);
      
      // Reset form
      setForm({
        branch_id: '',
        branch_name: '',
        hm_employee_id: '',
        hm_name: '',
        hm_email: '',
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
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Navy Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('PrincipalDashboard');
          }
        }}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>HM Registration</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator Sub-header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Step {activeStep + 1} of {totalSteps} — {STEPS[activeStep].label}
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
              <Text style={styles.cardTitle}>Register Headmaster</Text>
              <View style={styles.cardBadges}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>School: {schoolCode || '—'}</Text>
                </View>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>Branch: {safeTrim(form.branch_id) || '—'}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.copyLinkBtn} onPress={copyInviteLink}>
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
              <BranchStep form={form} onChange={handleChange} errors={fieldErrors} />
            )}
            {activeStep === 1 && (
              <HMDetailsStep
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
                  title={loading ? 'Registering...' : '✓ Register HM'}
                  onPress={handleSubmit}
                  disabled={loading || !canSubmit}
                />
              )}
            </View>
          </View>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              ℹ️ HM can login using: School Code + Employee ID or Email + Password
            </Text>
          </View>
        </AppCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏫 School Code: {schoolCode || '—'}</Text>
          <Text style={styles.footerText}>🏢 Branch ID: {safeTrim(form.branch_id) || '—'}</Text>
          <Text style={styles.footerText}>👑 Role: Principal</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingBottom: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    marginTop: -30,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e9f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: '#059669',
  },
  stepActive: {
    backgroundColor: '#2563eb',
  },
  stepIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepNumber: {
    fontSize: 16,
  },
  stepLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  stepLabelCompleted: {
    color: '#059669',
  },
  formCard: {
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2563eb',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  copyLinkBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyLinkBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  linkBanner: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  linkBannerText: {
    fontSize: 12,
    color: '#92400e',
  },
  linkBannerLabel: {
    fontWeight: 'bold',
  },
  formBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
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
    backgroundColor: '#2563eb',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  verifyOtpBtn: {
    backgroundColor: '#059669',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  pickerTextActive: {
    color: '#fff',
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 4,
  },
  classCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
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
    fontSize: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
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
    fontSize: 14,
    color: '#dc2626',
  },
  addSectionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  addSectionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  addClassBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e4e9f2',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
  },
  addClassBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f2',
  },
  hintBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center',
  },
  footer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    borderLeftColor: '#ef4444',
  },
  toastIcon: {
    fontSize: 18,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  toastClose: {
    fontSize: 16,
    color: '#94a3b8',
    padding: 4,
  },
});