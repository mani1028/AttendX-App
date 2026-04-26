import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  Image,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';

// Types
interface FormData {
  branch_id: string;
  teacher_full_name: string;
  gender: string;
  date_of_birth: string;
  age: string;
  blood_group: string;
  nationality: string;
  mother_tongue: string;
  religion: string;
  marital_status: string;
  aadhaar_number: string;
  mobile_number: string;
  alternate_mobile_number: string;
  email_id: string;
  house_no: string;
  street_locality: string;
  village_town_city: string;
  mandal_taluk: string;
  district: string;
  state: string;
  pin_code: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_relationship: string;
  employee_id: string;
  designation: string;
  department_subject: string;
  qualification: string;
  experience_years: string;
  date_of_joining: string;
  employment_type: string;
  teacher_status: string;
  salary_amount: string;
  password: string;
  teacher_photograph: any;
}

// Helper functions
const safeTrim = (v: any): string => String(v ?? '').trim();
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const isValidAadhaar = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) return true;
  return /^\d{12}$/.test(s);
};
const isValidMobile = (v: string): boolean => /^\d{10}$/.test(String(v || '').trim());
const isValidPin = (v: string): boolean => /^\d{6}$/.test(String(v || '').trim());
const calculateAge = (dob: string): string => {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '';
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : '';
};

const STEPS = ['Basics', 'Contact', 'Emergency', 'Employment', 'Preview'];

// Password Strength Component
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const checks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'At least 1 uppercase (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'At least 1 lowercase (a-z)', valid: /[a-z]/.test(password) },
    { label: 'At least 1 number (0-9)', valid: /\d/.test(password) },
    { label: 'At least 1 special character (!@#$%)', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <View style={styles.passwordStrength}>
      {checks.map((check, idx) => (
        <View key={idx} style={styles.passwordRule}>
          <Text style={[styles.passwordRuleIcon, check.valid && styles.passwordRuleIconValid]}>
            {check.valid ? '✓' : '○'}
          </Text>
          <Text style={[styles.passwordRuleText, check.valid && styles.passwordRuleTextValid]}>
            {check.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

// Form Field Component
const FormField: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>
      {label}
      {required && <Text style={styles.requiredStar}> *</Text>}
    </Text>
    {children}
    {error && <Text style={styles.fieldError}>{error}</Text>}
  </View>
);

// Preview Field Component
const PreviewField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.previewField}>
    <Text style={styles.previewFieldLabel}>{label}</Text>
    <Text style={styles.previewFieldValue}>{value || '—'}</Text>
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

export default function TeacherRegisterPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // Get params from route
  const params = route.params as any;
  const schoolCode = params?.school_code || '';
  const branchId = params?.branch_id || '';
  const isValidPublicLink = Boolean(schoolCode && branchId);

  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');
  const [serverSuccess, setServerSuccess] = useState<string>('');

  // OTP state
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);

  // Date pickers
  const [showDOBPicker, setShowDOBPicker] = useState<boolean>(false);
  const [showJoiningPicker, setShowJoiningPicker] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    branch_id: branchId || '',
    teacher_full_name: '',
    gender: '',
    date_of_birth: '',
    age: '',
    blood_group: '',
    nationality: 'Indian',
    mother_tongue: '',
    religion: '',
    marital_status: '',
    aadhaar_number: '',
    mobile_number: '',
    alternate_mobile_number: '',
    email_id: '',
    house_no: '',
    street_locality: '',
    village_town_city: '',
    mandal_taluk: '',
    district: '',
    state: '',
    pin_code: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relationship: '',
    employee_id: '',
    designation: '',
    department_subject: '',
    qualification: '',
    experience_years: '',
    date_of_joining: '',
    employment_type: 'FULL_TIME',
    teacher_status: 'ACTIVE',
    salary_amount: '',
    password: '',
    teacher_photograph: null,
  });

  // Set branch ID from params
  useEffect(() => {
    setFormData(prev => ({ ...prev, branch_id: branchId || '' }));
  }, [branchId]);

  const handleChange = (name: keyof FormData, value: string) => {
    setServerError('');
    setServerSuccess('');
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === 'date_of_birth') {
      setFormData(prev => ({
        ...prev,
        date_of_birth: value,
        age: calculateAge(value),
      }));
      return;
    }

    if (name === 'email_id') {
      const normalizedEmail = String(value || '').trim().toLowerCase();
      setFormData(prev => ({ ...prev, email_id: normalizedEmail }));
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImagePick = () => {
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => openCamera() },
        { text: 'Choose from Gallery', onPress: () => openGallery() },
      ]
    );
  };

  const openCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 0.9 }, (response: any) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoFile(asset);
        setPhotoPreview(asset.uri || null);
        setFormData(prev => ({ ...prev, teacher_photograph: asset }));
      }
    });
  };

  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response: any) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoFile(asset);
        setPhotoPreview(asset.uri || null);
        setFormData(prev => ({ ...prev, teacher_photograph: asset }));
      }
    });
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
      const res = await API.post('/teacher/register/send-otp',
        { email_id: email },
        { headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId } }
      );
      setOtp('');
      setOtpSent(true);
      setEmailVerified(false);
      setServerSuccess(res?.data?.message || 'OTP sent successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP';
      if (err?.response?.status === 409) {
        setFieldErrors(prev => ({ ...prev, email_id: 'Email already exists' }));
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
      const res = await API.post('/teacher/register/verify-otp',
        { email_id: email, otp: enteredOtp },
        { headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId } }
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

  const validateStep = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!safeTrim(formData.teacher_full_name)) errors.teacher_full_name = 'Full name is required';
      if (!formData.gender) errors.gender = 'Gender is required';
      if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
      if (!safeTrim(formData.nationality)) errors.nationality = 'Nationality is required';
      if (!safeTrim(formData.mother_tongue)) errors.mother_tongue = 'Mother tongue is required';
      if (!photoFile && !formData.teacher_photograph) errors.teacher_photograph = 'Photo is required';
      if (!safeTrim(formData.email_id)) errors.email_id = 'Email is required';
      else if (!isValidEmail(formData.email_id)) errors.email_id = 'Enter a valid email';
      else if (!emailVerified) errors.email_id = 'Please verify email with OTP before next step';
      if (formData.aadhaar_number && !isValidAadhaar(formData.aadhaar_number)) {
        errors.aadhaar_number = 'Aadhaar must be 12 digits';
      }
    }

    if (step === 1) {
      if (!safeTrim(formData.mobile_number)) errors.mobile_number = 'Mobile is required';
      else if (!isValidMobile(formData.mobile_number)) errors.mobile_number = 'Enter valid 10-digit number';
      if (!safeTrim(formData.house_no)) errors.house_no = 'House No is required';
      if (!safeTrim(formData.street_locality)) errors.street_locality = 'Street is required';
      if (!safeTrim(formData.village_town_city)) errors.village_town_city = 'City is required';
      if (!safeTrim(formData.mandal_taluk)) errors.mandal_taluk = 'Mandal/Taluk is required';
      if (!safeTrim(formData.district)) errors.district = 'District is required';
      if (!safeTrim(formData.state)) errors.state = 'State is required';
      if (!safeTrim(formData.pin_code)) errors.pin_code = 'Pin code is required';
      else if (!isValidPin(formData.pin_code)) errors.pin_code = 'Enter valid 6-digit pin code';
    }

    if (step === 2) {
      if (!safeTrim(formData.emergency_contact_name)) errors.emergency_contact_name = 'Contact name is required';
      if (!safeTrim(formData.emergency_contact_number)) errors.emergency_contact_number = 'Contact number is required';
      if (!safeTrim(formData.emergency_contact_relationship)) errors.emergency_contact_relationship = 'Relationship is required';
    }

    if (step === 3) {
      if (!safeTrim(formData.designation)) errors.designation = 'Designation is required';
      if (!safeTrim(formData.department_subject)) errors.department_subject = 'Department/Subject is required';
      if (!formData.date_of_joining) errors.date_of_joining = 'Joining date is required';
      if (!formData.password || String(formData.password).length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }

    return errors;
  };

  const nextStep = () => {
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setFieldErrors({});
    setStep(prev => Math.max(prev - 1, 0));
  };

  const fileToBase64 = (file: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      const imageBase64 = await fileToBase64(imageSource);
      
      const payload = {
        ...formData,
        teacher_photograph: imageBase64,
      };

      const res = await API.post('/teacher/register', payload, {
        headers: { 'X-School-Code': schoolCode, 'X-Branch-Id': branchId },
      });

      const createdTeacherId = String(res?.data?.teacher_id || '').trim();
      const createdEmployeeId = String(res?.data?.employee_id || formData.employee_id || '').trim();

      setServerSuccess(
        createdTeacherId
          ? `Teacher Registered Successfully! Teacher ID: ${createdTeacherId}${createdEmployeeId ? ` | Employee ID: ${createdEmployeeId}` : ''}`
          : 'Teacher Registered Successfully!'
      );
      
      // Reset form
      setStep(0);
      setPhotoFile(null);
      setPhotoPreview(null);
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      setFormData({
        branch_id: branchId || '',
        teacher_full_name: '',
        gender: '',
        date_of_birth: '',
        age: '',
        blood_group: '',
        nationality: 'Indian',
        mother_tongue: '',
        religion: '',
        marital_status: '',
        aadhaar_number: '',
        mobile_number: '',
        alternate_mobile_number: '',
        email_id: '',
        house_no: '',
        street_locality: '',
        village_town_city: '',
        mandal_taluk: '',
        district: '',
        state: '',
        pin_code: '',
        emergency_contact_name: '',
        emergency_contact_number: '',
        emergency_contact_relationship: '',
        employee_id: '',
        designation: '',
        department_subject: '',
        qualification: '',
        experience_years: '',
        date_of_joining: '',
        employment_type: 'FULL_TIME',
        teacher_status: 'ACTIVE',
        salary_amount: '',
        password: '',
        teacher_photograph: null,
      });
    } catch (err: any) {
      setServerError(err?.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = STEPS.length;

  if (!isValidPublicLink) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Invalid Registration Link</Text>
        <Text style={styles.errorText}>
          Please use the link shared by your school.
        </Text>
        <AppButton title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast
        visible={!!serverError}
        message={serverError}
        type="error"
        onClose={() => setServerError('')}
      />
      <Toast
        visible={!!serverSuccess}
        message={serverSuccess}
        type="success"
        onClose={() => setServerSuccess('')}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👨‍🏫 Teacher Registration</Text>
          <Text style={styles.subtitle}>
            Step {step + 1} of {totalSteps} — {STEPS[step]}
          </Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((label, i) => (
            <TouchableOpacity key={label} style={styles.stepItem} onPress={() => setStep(i)}>
              <View style={[styles.stepCircle, step > i && styles.stepCompleted, step === i && styles.stepActive]}>
                {step > i ? <Text style={styles.stepIcon}>✓</Text> : <Text style={styles.stepNumber}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepLabel, step === i && styles.stepLabelActive, step > i && styles.stepLabelCompleted]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Card */}
        <AppCard style={styles.formCard}>
          {/* Step 0: Basics */}
          {step === 0 && (
            <View>
              <Text style={styles.sectionTitle}>Personal Details</Text>

              <FormField label="Branch ID">
                <TextInput style={[styles.input, styles.disabledInput]} value={formData.branch_id} editable={false} />
              </FormField>

              <FormField label="Full Name" required error={fieldErrors.teacher_full_name}>
                <TextInput
                  style={[styles.input, fieldErrors.teacher_full_name && styles.inputError]}
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.teacher_full_name}
                  onChangeText={(text) => handleChange('teacher_full_name', text)}
                />
              </FormField>

              <FormField label="Gender" required error={fieldErrors.gender}>
                <View style={styles.genderContainer}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                      onPress={() => handleChange('gender', g)}
                    >
                      <Text style={[styles.genderText, formData.gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Date of Birth" required error={fieldErrors.date_of_birth}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDOBPicker(true)}>
                  <Text style={styles.dateText}>{formData.date_of_birth || 'Select date'}</Text>
                </TouchableOpacity>
                {showDOBPicker && (
                  <DateTimePicker
                    value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event: any, date?: Date) => {
                      if (date) handleChange('date_of_birth', date.toISOString().split('T')[0]);
                      setShowDOBPicker(false);
                    }}
                  />
                )}
              </FormField>

              <FormField label="Age (auto-calculated)">
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.age ? `${formData.age} years` : 'Select DOB above'}
                  editable={false}
                />
              </FormField>

              <FormField label="Blood Group">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. O+"
                  value={formData.blood_group}
                  onChangeText={(text) => handleChange('blood_group', text)}
                />
              </FormField>

              <FormField label="Nationality" required error={fieldErrors.nationality}>
                <TextInput
                  style={[styles.input, fieldErrors.nationality && styles.inputError]}
                  value={formData.nationality}
                  onChangeText={(text) => handleChange('nationality', text)}
                />
              </FormField>

              <FormField label="Mother Tongue" required error={fieldErrors.mother_tongue}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_tongue && styles.inputError]}
                  placeholder="e.g. Telugu"
                  value={formData.mother_tongue}
                  onChangeText={(text) => handleChange('mother_tongue', text)}
                />
              </FormField>

              <FormField label="Email ID" required error={fieldErrors.email_id}>
                <View style={styles.rowWithButton}>
                  <TextInput
                    style={[styles.input, styles.flex1, fieldErrors.email_id && styles.inputError, emailVerified && styles.disabledInput]}
                    placeholder="teacher@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email_id}
                    onChangeText={(text) => handleChange('email_id', text)}
                    editable={!emailVerified}
                  />
                  <TouchableOpacity
                    style={[styles.verifyBtn, (otpSending || emailVerified) && styles.verifyBtnDisabled]}
                    onPress={sendOtp}
                    disabled={otpSending || emailVerified}
                  >
                    <Text style={styles.verifyBtnText}>
                      {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {fieldErrors.email_id && <Text style={styles.fieldError}>{fieldErrors.email_id}</Text>}
              </FormField>

              {otpSent && !emailVerified && (
                <View style={styles.otpRow}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    placeholder="Enter OTP"
                    keyboardType="numeric"
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <TouchableOpacity
                    style={[styles.verifyBtn, styles.verifyOtpBtn]}
                    onPress={verifyOtp}
                    disabled={otpVerifying}
                  >
                    <Text style={styles.verifyBtnText}>
                      {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {emailVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              )}

              <FormField label="Religion">
                <TextInput
                  style={styles.input}
                  value={formData.religion}
                  onChangeText={(text) => handleChange('religion', text)}
                />
              </FormField>

              <FormField label="Marital Status">
                <TextInput
                  style={styles.input}
                  value={formData.marital_status}
                  onChangeText={(text) => handleChange('marital_status', text)}
                />
              </FormField>

              <FormField label="Aadhaar Number">
                <TextInput
                  style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
                  placeholder="12-digit Aadhaar"
                  keyboardType="numeric"
                  maxLength={12}
                  value={formData.aadhaar_number}
                  onChangeText={(text) => handleChange('aadhaar_number', text)}
                />
                {fieldErrors.aadhaar_number && <Text style={styles.fieldError}>{fieldErrors.aadhaar_number}</Text>}
              </FormField>

              <FormField label="Teacher Photo" required error={fieldErrors.teacher_photograph}>
                <TouchableOpacity style={styles.photoZone} onPress={handleImagePick}>
                  {photoPreview ? (
                    <Image source={{ uri: photoPreview }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoIcon}>📷</Text>
                      <Text style={styles.photoText}>Tap to add photo</Text>
                      <Text style={styles.photoSubtext}>Camera or Gallery</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </FormField>
            </View>
          )}

          {/* Step 1: Contact */}
          {step === 1 && (
            <View>
              <Text style={styles.sectionTitle}>Contact & Address</Text>

              <FormField label="Mobile Number" required error={fieldErrors.mobile_number}>
                <TextInput
                  style={[styles.input, fieldErrors.mobile_number && styles.inputError]}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.mobile_number}
                  onChangeText={(text) => handleChange('mobile_number', text.replace(/\D/g, '').slice(0, 10))}
                />
              </FormField>

              <FormField label="Alternate Mobile">
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.alternate_mobile_number}
                  onChangeText={(text) => handleChange('alternate_mobile_number', text.replace(/\D/g, '').slice(0, 10))}
                />
              </FormField>

              <FormField label="House No" required error={fieldErrors.house_no}>
                <TextInput
                  style={[styles.input, fieldErrors.house_no && styles.inputError]}
                  value={formData.house_no}
                  onChangeText={(text) => handleChange('house_no', text)}
                />
              </FormField>

              <FormField label="Street / Locality" required error={fieldErrors.street_locality}>
                <TextInput
                  style={[styles.input, fieldErrors.street_locality && styles.inputError]}
                  value={formData.street_locality}
                  onChangeText={(text) => handleChange('street_locality', text)}
                />
              </FormField>

              <FormField label="City / Town" required error={fieldErrors.village_town_city}>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  value={formData.village_town_city}
                  onChangeText={(text) => handleChange('village_town_city', text)}
                />
              </FormField>

              <FormField label="Mandal / Taluk" required error={fieldErrors.mandal_taluk}>
                <TextInput
                  style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
                  value={formData.mandal_taluk}
                  onChangeText={(text) => handleChange('mandal_taluk', text)}
                />
              </FormField>

              <FormField label="District" required error={fieldErrors.district}>
                <TextInput
                  style={[styles.input, fieldErrors.district && styles.inputError]}
                  value={formData.district}
                  onChangeText={(text) => handleChange('district', text)}
                />
              </FormField>

              <FormField label="State" required error={fieldErrors.state}>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  value={formData.state}
                  onChangeText={(text) => handleChange('state', text)}
                />
              </FormField>

              <FormField label="Pin Code" required error={fieldErrors.pin_code}>
                <TextInput
                  style={[styles.input, fieldErrors.pin_code && styles.inputError]}
                  placeholder="6-digit PIN"
                  keyboardType="numeric"
                  maxLength={6}
                  value={formData.pin_code}
                  onChangeText={(text) => handleChange('pin_code', text.replace(/\D/g, '').slice(0, 6))}
                />
              </FormField>
            </View>
          )}

          {/* Step 2: Emergency */}
          {step === 2 && (
            <View>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>

              <FormField label="Contact Name" required error={fieldErrors.emergency_contact_name}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  value={formData.emergency_contact_name}
                  onChangeText={(text) => handleChange('emergency_contact_name', text)}
                />
              </FormField>

              <FormField label="Contact Number" required error={fieldErrors.emergency_contact_number}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
                  placeholder="10-digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.emergency_contact_number}
                  onChangeText={(text) => handleChange('emergency_contact_number', text.replace(/\D/g, '').slice(0, 10))}
                />
              </FormField>

              <FormField label="Relationship" required error={fieldErrors.emergency_contact_relationship}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_relationship && styles.inputError]}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  value={formData.emergency_contact_relationship}
                  onChangeText={(text) => handleChange('emergency_contact_relationship', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 3: Employment */}
          {step === 3 && (
            <View>
              <Text style={styles.sectionTitle}>Employment Details</Text>

              <FormField label="Employee ID">
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  placeholder="Assigned after registration"
                  value={formData.employee_id}
                  editable={false}
                />
                <Text style={styles.helperText}>Employee ID will be assigned after save.</Text>
              </FormField>

              <FormField label="Designation" required error={fieldErrors.designation}>
                <View style={styles.pickerContainer}>
                  {['Teacher', 'Senior Teacher', 'Head of Department', 'Vice Principal', 'Principal', 'Lab Assistant', 'Sports Teacher', 'Special Educator', 'Accountant'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOption, formData.designation === opt && styles.pickerOptionActive]}
                      onPress={() => handleChange('designation', opt)}
                    >
                      <Text style={[styles.pickerText, formData.designation === opt && styles.pickerTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {fieldErrors.designation && <Text style={styles.fieldError}>{fieldErrors.designation}</Text>}
              </FormField>

              <FormField label="Department / Subject" required error={fieldErrors.department_subject}>
                <TextInput
                  style={[styles.input, fieldErrors.department_subject && styles.inputError]}
                  placeholder="Enter department or subject"
                  value={formData.department_subject}
                  onChangeText={(text) => handleChange('department_subject', text)}
                />
              </FormField>

              <FormField label="Qualification">
                <View style={styles.pickerContainer}>
                  {['B.Ed', 'M.Ed', 'B.Sc + B.Ed', 'M.Sc + B.Ed', 'BA + B.Ed', 'MA + B.Ed', 'Ph.D', 'Other'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOption, formData.qualification === opt && styles.pickerOptionActive]}
                      onPress={() => handleChange('qualification', opt)}
                    >
                      <Text style={[styles.pickerText, formData.qualification === opt && styles.pickerTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Experience (Years)">
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  value={formData.experience_years}
                  onChangeText={(text) => handleChange('experience_years', text)}
                />
              </FormField>

              <FormField label="Date of Joining" required error={fieldErrors.date_of_joining}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowJoiningPicker(true)}>
                  <Text style={styles.dateText}>{formData.date_of_joining || 'Select date'}</Text>
                </TouchableOpacity>
                {showJoiningPicker && (
                  <DateTimePicker
                    value={formData.date_of_joining ? new Date(formData.date_of_joining) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event: any, date?: Date) => {
                      if (date) handleChange('date_of_joining', date.toISOString().split('T')[0]);
                      setShowJoiningPicker(false);
                    }}
                  />
                )}
              </FormField>

              <FormField label="Employment Type">
                <View style={styles.pickerContainer}>
                  {['FULL_TIME', 'PART_TIME', 'CONTRACTOR'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOption, formData.employment_type === opt && styles.pickerOptionActive]}
                      onPress={() => handleChange('employment_type', opt)}
                    >
                      <Text style={[styles.pickerText, formData.employment_type === opt && styles.pickerTextActive]}>
                        {opt.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Teacher Status">
                <View style={styles.pickerContainer}>
                  {['ACTIVE', 'INACTIVE'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerOption, formData.teacher_status === opt && styles.pickerOptionActive]}
                      onPress={() => handleChange('teacher_status', opt)}
                    >
                      <Text style={[styles.pickerText, formData.teacher_status === opt && styles.pickerTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Password" required error={fieldErrors.password}>
                <TextInput
                  style={[styles.input, fieldErrors.password && styles.inputError]}
                  placeholder="Min. 6 characters"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                />
                {formData.password && <PasswordStrength password={formData.password} />}
                {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
              </FormField>

              <FormField label="Salary Amount">
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Optional"
                  value={formData.salary_amount}
                  onChangeText={(text) => handleChange('salary_amount', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <View>
              <Text style={styles.sectionTitle}>Final Review</Text>
              <Text style={styles.previewNote}>Please verify all details before submitting.</Text>

              {/* Preview Card */}
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewPhoto}>
                    {photoPreview ? (
                      <Image source={{ uri: photoPreview }} style={styles.previewPhotoImage} />
                    ) : (
                      <View style={styles.previewPhotoPlaceholder}>
                        <Text style={styles.previewPhotoText}>
                          {formData.teacher_full_name ? formData.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={styles.previewName}>{formData.teacher_full_name || '—'}</Text>
                    <Text style={styles.previewDesignation}>
                      {formData.designation || '—'} · {formData.department_subject || '—'}
                    </Text>
                    <Text style={styles.previewEmail}>{formData.email_id || '—'}</Text>
                    <View style={[styles.previewStatus, formData.teacher_status === 'ACTIVE' ? styles.previewStatusActive : styles.previewStatusInactive]}>
                      <Text style={styles.previewStatusText}>{formData.teacher_status}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.previewSectionTitle}>Personal Information</Text>
                <View style={styles.previewGrid}>
                  <PreviewField label="Gender" value={formData.gender} />
                  <PreviewField label="Date of Birth" value={formData.date_of_birth} />
                  <PreviewField label="Age" value={formData.age} />
                  <PreviewField label="Blood Group" value={formData.blood_group} />
                  <PreviewField label="Nationality" value={formData.nationality} />
                  <PreviewField label="Mother Tongue" value={formData.mother_tongue} />
                  <PreviewField label="Religion" value={formData.religion} />
                  <PreviewField label="Marital Status" value={formData.marital_status} />
                  <PreviewField label="Aadhaar Number" value={formData.aadhaar_number} />
                </View>

                <Text style={styles.previewSectionTitle}>Contact & Address</Text>
                <View style={styles.previewGrid}>
                  <PreviewField label="Mobile" value={formData.mobile_number} />
                  <PreviewField label="Alt Mobile" value={formData.alternate_mobile_number} />
                  <PreviewField label="House No" value={formData.house_no} />
                  <PreviewField label="Street" value={formData.street_locality} />
                  <PreviewField label="City" value={formData.village_town_city} />
                  <PreviewField label="Mandal/Taluk" value={formData.mandal_taluk} />
                  <PreviewField label="District" value={formData.district} />
                  <PreviewField label="State" value={formData.state} />
                  <PreviewField label="Pin Code" value={formData.pin_code} />
                </View>

                <Text style={styles.previewSectionTitle}>Emergency Contact</Text>
                <View style={styles.previewGrid}>
                  <PreviewField label="Contact Name" value={formData.emergency_contact_name} />
                  <PreviewField label="Contact Number" value={formData.emergency_contact_number} />
                  <PreviewField label="Relationship" value={formData.emergency_contact_relationship} />
                </View>

                <Text style={styles.previewSectionTitle}>Employment Details</Text>
                <View style={styles.previewGrid}>
                  <PreviewField label="Employee ID" value={formData.employee_id} />
                  <PreviewField label="Designation" value={formData.designation} />
                  <PreviewField label="Department" value={formData.department_subject} />
                  <PreviewField label="Qualification" value={formData.qualification} />
                  <PreviewField label="Experience" value={formData.experience_years ? `${formData.experience_years} yrs` : '—'} />
                  <PreviewField label="Date of Joining" value={formData.date_of_joining} />
                  <PreviewField label="Employment Type" value={formData.employment_type?.replace('_', ' ')} />
                  <PreviewField label="Salary" value={formData.salary_amount} />
                  <PreviewField label="Branch ID" value={formData.branch_id} />
                </View>
              </View>

              <View style={styles.inlineNote}>
                <Text style={styles.inlineNoteText}>
                  Branch: <Text style={styles.inlineNoteBold}>{formData.branch_id || '—'}</Text> • Email:{' '}
                  <Text style={styles.inlineNoteBold}>{formData.email_id || '—'}</Text> • Employee ID:{' '}
                  <Text style={styles.inlineNoteBold}>{formData.employee_id || '—'}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navButtons}>
            <AppButton
              title="← Back"
              onPress={prevStep}
              disabled={step === 0 || loading}
              type="secondary"
              style={styles.navBtn}
            />
            {step < totalSteps - 1 ? (
              <AppButton
                title="Next →"
                onPress={nextStep}
                disabled={loading}
                style={styles.navBtn}
              />
            ) : (
              <AppButton
                title={loading ? 'Registering...' : '✓ Register Teacher'}
                onPress={submitTeacher}
                disabled={loading}
                style={styles.navBtn}
              />
            )}
          </View>
        </AppCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏫 School: {schoolCode || '—'}</Text>
          <Text style={styles.footerText}>🏢 Branch: {branchId || '—'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  contentContainer: {
    padding: 16,
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
    color: '#dc2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d1b2a',
  },
  subtitle: {
    fontSize: 13,
    color: '#4a5568',
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepNumber: {
    color: '#4a5568',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 9,
    color: '#4a5568',
    marginTop: 4,
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
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d1b2a',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    color: '#0d1b2a',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  fieldError: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
  },
  helperText: {
    fontSize: 10,
    color: '#94a3b8',
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
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  genderText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#fff',
  },
  dateBtn: {
    borderWidth: 1.5,
    borderColor: '#e4e9f2',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  dateText: {
    fontSize: 14,
    color: '#0d1b2a',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  pickerOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerText: {
    fontSize: 13,
    color: '#4a5568',
  },
  pickerTextActive: {
    color: '#fff',
  },
  passwordStrength: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f0f2f7',
    borderRadius: 8,
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  passwordRuleIcon: {
    fontSize: 12,
    color: '#94a3b8',
  },
  passwordRuleIconValid: {
    color: '#059669',
  },
  passwordRuleText: {
    fontSize: 11,
    color: '#4a5568',
  },
  passwordRuleTextValid: {
    color: '#059669',
    fontWeight: '600',
  },
  photoZone: {
    borderWidth: 2,
    borderColor: '#e4e9f2',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  photoSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  previewNote: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e9f2',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewHeader: {
    backgroundColor: '#2563eb',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  previewPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPhotoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  previewDesignation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  previewEmail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  previewStatus: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  previewStatusActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  previewStatusInactive: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  previewStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  previewSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#2563eb',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewField: {
    width: '50%',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
  },
  previewFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewFieldValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0d1b2a',
  },
  inlineNote: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  inlineNoteText: {
    fontSize: 12,
    color: '#1e40af',
  },
  inlineNoteBold: {
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  navBtn: {
    flex: 1,
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
    color: '#4a5568',
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