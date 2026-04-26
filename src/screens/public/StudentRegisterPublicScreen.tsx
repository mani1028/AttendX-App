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
interface ClassOption {
  class_name: string;
  sections: string[];
}

interface FormData {
  branch_id: string;
  first_name: string;
  last_name: string;
  student_full_name: string;
  gender: string;
  date_of_birth: string;
  age: string;
  blood_group: string;
  nationality: string;
  mother_tongue: string;
  religion: string;
  caste_category: string;
  student_status: string;
  aadhaar_number: string;
  class_grade: string;
  section: string;
  admission_number: string;
  roll_number: string;
  academic_year: string;
  medium_of_instruction: string;
  date_of_admission: string;
  previous_school_name: string;
  transfer_certificate_number: string;
  father_guardian_name: string;
  father_guardian_mobile: string;
  father_guardian_occupation: string;
  mother_guardian_name: string;
  mother_guardian_mobile: string;
  mother_guardian_occupation: string;
  parent_guardian_email: string;
  house_no: string;
  street_locality: string;
  village_town_city: string;
  mandal_taluk: string;
  district: string;
  state: string;
  pin_code: string;
  allergies_details: string;
  medical_conditions: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  nearest_hospital_doctor: string;
  mode_of_transport: string;
  bus_route_vehicle_number: string;
  hostel_day_scholar: string;
  consent_digital_attendance: string;
  password: string;
  confirm_password: string;
}

// Helper functions
const safeTrim = (v: any): string => String(v ?? '').trim();
const isValidEmail = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};
const isValidMobile = (v: string): boolean => /^\d{10}$/.test(String(v || '').trim());
const isValidPin = (v: string): boolean => /^\d{6}$/.test(String(v || '').trim());
const isValidAadhaar = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) return true;
  return /^\d{12}$/.test(s);
};
const isValidName = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) return false;
  return /^[a-zA-Z\s'-]+$/.test(s) && !/^\d+$/.test(s);
};
const isStrongPassword = (v: string): boolean => {
  const s = String(v || '');
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};
const getPasswordStrength = (v: string) => {
  const s = String(v || '');
  return {
    minLength: s.length >= 8,
    hasUpper: /[A-Z]/.test(s),
    hasLower: /[a-z]/.test(s),
    hasNumber: /\d/.test(s),
    hasSpecial: /[^A-Za-z0-9]/.test(s),
  };
};
const calcAgeFromDOB = (dob: string): string => {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '';
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 120 ? String(age) : '';
};
const todayISO = (): string => new Date().toISOString().split('T')[0];

const STEPS = ['Basic Info', 'Academics', 'Parent & Address', 'Health & Transport', 'Photo'];

const INITIAL_FORM: FormData = {
  branch_id: '',
  first_name: '',
  last_name: '',
  student_full_name: '',
  gender: '',
  date_of_birth: '',
  age: '',
  blood_group: '',
  nationality: 'Indian',
  mother_tongue: '',
  religion: '',
  caste_category: '',
  student_status: 'ACTIVE',
  aadhaar_number: '',
  class_grade: '',
  section: '',
  admission_number: '',
  roll_number: '',
  academic_year: '',
  medium_of_instruction: 'ENGLISH',
  date_of_admission: todayISO(),
  previous_school_name: '',
  transfer_certificate_number: '',
  father_guardian_name: '',
  father_guardian_mobile: '',
  father_guardian_occupation: '',
  mother_guardian_name: '',
  mother_guardian_mobile: '',
  mother_guardian_occupation: '',
  parent_guardian_email: '',
  house_no: '',
  street_locality: '',
  village_town_city: '',
  mandal_taluk: '',
  district: '',
  state: '',
  pin_code: '',
  allergies_details: '',
  medical_conditions: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  nearest_hospital_doctor: '',
  mode_of_transport: '',
  bus_route_vehicle_number: '',
  hostel_day_scholar: '',
  consent_digital_attendance: 'YES',
  password: '',
  confirm_password: '',
};

// Password Strength Component
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const strength = getPasswordStrength(password);
  
  return (
    <View style={styles.passwordStrength}>
      <PasswordRule valid={strength.minLength}>At least 8 characters</PasswordRule>
      <PasswordRule valid={strength.hasUpper}>At least 1 uppercase (A-Z)</PasswordRule>
      <PasswordRule valid={strength.hasLower}>At least 1 lowercase (a-z)</PasswordRule>
      <PasswordRule valid={strength.hasNumber}>At least 1 number (0-9)</PasswordRule>
      <PasswordRule valid={strength.hasSpecial}>At least 1 special character (!@#$%)</PasswordRule>
    </View>
  );
};

const PasswordRule: React.FC<{ valid: boolean; children: React.ReactNode }> = ({ valid, children }) => (
  <View style={styles.passwordRule}>
    <Text style={[styles.passwordRuleIcon, valid && styles.passwordRuleIconValid]}>
      {valid ? '✓' : '○'}
    </Text>
    <Text style={[styles.passwordRuleText, valid && styles.passwordRuleTextValid]}>
      {children}
    </Text>
  </View>
);

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

export default function StudentRegisterPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  // Get params from route
  const params = route.params as any;
  const publicSchoolCode = params?.school_code || '';
  const publicBranchId = params?.branch_id || '';
  const isPublicInvite = Boolean(publicSchoolCode && publicBranchId);

  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string>('');
  const [serverSuccess, setServerSuccess] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRollNumberModal, setShowRollNumberModal] = useState<boolean>(false);
  const [generatedRollNumber, setGeneratedRollNumber] = useState<string>('');
  
  // Date pickers
  const [showDOBPicker, setShowDOBPicker] = useState<boolean>(false);
  const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState<boolean>(false);
  
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, nationality: 'Indian', branch_id: publicBranchId });

  // Fetch classes when branch changes
  useEffect(() => {
    if (!isPublicInvite || !form.branch_id || !publicSchoolCode) return;

    const loadClasses = async () => {
      try {
        const res = await API.get(`/hm/public/classes-sections`, {
          params: {
            branch_id: form.branch_id,
            school_code: publicSchoolCode,
          },
          headers: { 'X-School-Code': publicSchoolCode },
        });
        
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setClassOptions(items);

        if (items.length > 0 && safeTrim(form.class_grade)) {
          const cur = items.find(c => safeTrim(c.class_name).toLowerCase() === safeTrim(form.class_grade).toLowerCase());
          setSectionOptions(cur?.sections || []);
        } else {
          setSectionOptions([]);
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
        setClassOptions([]);
        setSectionOptions([]);
        setServerError('Unable to load class and section options. Please refresh.');
      }
    };

    loadClasses();
  }, [isPublicInvite, form.branch_id, publicSchoolCode, form.class_grade]);

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
    launchCamera({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoFile(asset);
        setPhotoPreview(asset.uri || null);
      }
    });
  };

  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, (response) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoFile(asset);
        setPhotoPreview(asset.uri || null);
      }
    });
  };

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

  const handleDOBChange = (date: Date) => {
    const dob = date.toISOString().split('T')[0];
    const age = calcAgeFromDOB(dob);
    
    if (fieldErrors.date_of_birth) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.date_of_birth;
        return newErrors;
      });
    }
    
    setForm(prev => ({ ...prev, date_of_birth: dob, age }));
    setShowDOBPicker(false);
  };

  const handleClassChange = (className: string) => {
    const cls = classOptions.find(c => c.class_name.toLowerCase() === className.toLowerCase());
    setSectionOptions(cls?.sections || []);
    setForm(prev => ({
      ...prev,
      class_grade: className,
      section: '',
      roll_number: '',
    }));
  };

  const handleSectionChange = (section: string) => {
    setForm(prev => ({
      ...prev,
      section: section,
      roll_number: '',
    }));
  };

  const validateStep = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const currentYear = new Date().getFullYear();

    if (step === 0) {
      if (!safeTrim(form.first_name)) errors.first_name = 'First name is required';
      if (!safeTrim(form.last_name)) errors.last_name = 'Last name is required';
      if (!form.gender) errors.gender = 'Gender is required';
      if (!form.date_of_birth) errors.date_of_birth = 'Date of birth is required';
      else {
        const year = new Date(form.date_of_birth).getFullYear();
        if (year < 1900 || year > currentYear) errors.date_of_birth = `Year must be between 1900 and ${currentYear}`;
      }
      if (!safeTrim(form.nationality)) errors.nationality = 'Nationality is required';
      if (!safeTrim(form.mother_tongue)) errors.mother_tongue = 'Mother tongue is required';
      if (!safeTrim(form.religion)) errors.religion = 'Religion is required';
      if (!safeTrim(form.aadhaar_number)) errors.aadhaar_number = 'Aadhaar number is required';
      if (form.aadhaar_number && !isValidAadhaar(form.aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits';
    }

    if (step === 1) {
      if (!safeTrim(form.class_grade)) errors.class_grade = 'Class is required';
      if (!safeTrim(form.section)) errors.section = 'Section is required';
      if (!safeTrim(form.admission_number)) errors.admission_number = 'Admission number is required';
      if (!safeTrim(form.academic_year)) errors.academic_year = 'Academic year is required';
      if (form.academic_year && isNaN(parseInt(form.academic_year))) errors.academic_year = 'Academic year must be a number';
    }

    if (step === 2) {
      if (!safeTrim(form.father_guardian_name)) errors.father_guardian_name = 'Father name is required';
      if (!isValidMobile(form.father_guardian_mobile)) errors.father_guardian_mobile = 'Enter valid 10-digit number';
      if (!safeTrim(form.mother_guardian_name)) errors.mother_guardian_name = 'Mother name is required';
      if (!isValidMobile(form.mother_guardian_mobile)) errors.mother_guardian_mobile = 'Enter valid 10-digit number';
      if (!safeTrim(form.parent_guardian_email)) errors.parent_guardian_email = 'Parent / Guardian email is required';
      else if (!isValidEmail(form.parent_guardian_email)) errors.parent_guardian_email = 'Enter valid email';
      if (!safeTrim(form.house_no)) errors.house_no = 'House No is required';
      if (!safeTrim(form.street_locality)) errors.street_locality = 'Street is required';
      if (!safeTrim(form.village_town_city)) errors.village_town_city = 'City is required';
      if (!safeTrim(form.mandal_taluk)) errors.mandal_taluk = 'Mandal/Taluk is required';
      if (!safeTrim(form.district)) errors.district = 'District is required';
      if (!safeTrim(form.state)) errors.state = 'State is required';
      if (!isValidPin(form.pin_code)) errors.pin_code = 'Enter valid 6-digit pin code';
    }

    if (step === 3) {
      if (!safeTrim(form.emergency_contact_name)) errors.emergency_contact_name = 'Contact name is required';
      if (!isValidMobile(form.emergency_contact_number)) errors.emergency_contact_number = 'Enter valid 10-digit number';
      if (!safeTrim(form.mode_of_transport)) errors.mode_of_transport = 'Mode of transport is required';
      if (!safeTrim(form.password)) {
        errors.password = 'Password is required';
      } else if (!isStrongPassword(form.password)) {
        errors.password = 'Use 8+ chars with uppercase, lowercase, number, and special character';
      }
      if (!safeTrim(form.confirm_password)) {
        errors.confirm_password = 'Please retype password';
      } else if (form.password !== form.confirm_password) {
        errors.confirm_password = 'Passwords do not match';
      }
    }

    if (step === 4) {
      if (!photoFile) errors.photo = 'Student photograph is required';
    }

    return errors;
  };

  const nextStep = () => {
    if (!isPublicInvite) {
      setServerError('Invalid invite link. Use ?school_code=...&branch_id=...');
      return;
    }

    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setFieldErrors({});
    setStep(s => Math.max(s - 1, 0));
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

    if (!photoFile) {
      setServerError('Please provide student photograph.');
      return;
    }

    setLoading(true);
    setServerError('');
    setServerSuccess('');

    try {
      const studentPhotoBase64 = await fileToBase64(photoFile);
      const formData = new FormData();

      formData.append('school_code', publicSchoolCode);
      formData.append('branch_id', publicBranchId);
      formData.append('student_photograph', studentPhotoBase64);

      const skip = new Set(['branch_id', 'confirm_password']);
      Object.entries(form).forEach(([k, v]) => {
        if (skip.has(k)) return;
        if (k === 'date_of_admission' && !safeTrim(v)) return;
        formData.append(k, v ?? '');
      });

      const res = await API.post('/student/register', formData, {
        headers: {
          'X-School-Code': publicSchoolCode,
          'X-Branch-Id': publicBranchId,
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = res.data;

      setServerSuccess('Student Registered Successfully! ✅');
      
      if (data?.roll_number) {
        setGeneratedRollNumber(data.roll_number);
        setShowRollNumberModal(true);
      }
      
      // Reset form
      setStep(0);
      setPhotoFile(null);
      setPhotoPreview(null);
      setForm({ ...INITIAL_FORM, nationality: 'Indian', branch_id: publicBranchId });
      
      setTimeout(() => {
        setShowRollNumberModal(false);
      }, 3000);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData && errorData.detail) {
        if (typeof errorData.detail === 'object' && !Array.isArray(errorData.detail)) {
          setFieldErrors(prev => ({ ...prev, ...errorData.detail }));
          const errorMsg = Object.entries(errorData.detail).map(([f, msg]) => `${f}: ${msg}`).join('\n');
          setServerError(errorMsg);
        } else if (Array.isArray(errorData.detail)) {
          const errorMsg = errorData.detail.map((e: any) => {
            const field = (e.loc || []).slice(1).join('.');
            return `${field}: ${e.msg}`;
          }).join('\n');
          setServerError(errorMsg);
        } else {
          setServerError(errorData.detail);
        }
      } else {
        setServerError(err?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = STEPS.length;
  const currentYear = new Date().getFullYear();

  if (!isPublicInvite) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Invalid Invite Link</Text>
        <Text style={styles.errorText}>
          Use: /student-registration?school_code=SCHxxxx&branch_id=01
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
          <Text style={styles.title}>📝 Student Registration</Text>
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
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <View>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              
              <FormField label="First Name" required error={fieldErrors.first_name}>
                <TextInput
                  style={[styles.input, fieldErrors.first_name && styles.inputError]}
                  placeholder="Enter first name"
                  value={form.first_name}
                  onChangeText={(text) => handleChange('first_name', text)}
                />
              </FormField>

              <FormField label="Last Name" required error={fieldErrors.last_name}>
                <TextInput
                  style={[styles.input, fieldErrors.last_name && styles.inputError]}
                  placeholder="Enter last name"
                  value={form.last_name}
                  onChangeText={(text) => handleChange('last_name', text)}
                />
              </FormField>

              <FormField label="Gender" required error={fieldErrors.gender}>
                <View style={styles.genderContainer}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                      onPress={() => handleChange('gender', g)}
                    >
                      <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Blood Group">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. O+"
                  value={form.blood_group}
                  onChangeText={(text) => handleChange('blood_group', text)}
                />
              </FormField>

              <FormField label="Date of Birth" required error={fieldErrors.date_of_birth}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDOBPicker(true)}>
                  <Text style={styles.dateText}>{form.date_of_birth || 'Select date'}</Text>
                </TouchableOpacity>
                {showDOBPicker && (
                  <DateTimePicker
                    value={form.date_of_birth ? new Date(form.date_of_birth) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (date) handleDOBChange(date);
                      setShowDOBPicker(false);
                    }}
                  />
                )}
              </FormField>

              <FormField label="Age (Auto-calculated)">
                <TextInput style={[styles.input, styles.disabledInput]} value={form.age} editable={false} />
              </FormField>

              <FormField label="Nationality" required error={fieldErrors.nationality}>
                <TextInput
                  style={[styles.input, fieldErrors.nationality && styles.inputError]}
                  placeholder="Nationality"
                  value={form.nationality}
                  onChangeText={(text) => handleChange('nationality', text)}
                />
              </FormField>

              <FormField label="Mother Tongue" required error={fieldErrors.mother_tongue}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_tongue && styles.inputError]}
                  placeholder="e.g. Telugu"
                  value={form.mother_tongue}
                  onChangeText={(text) => handleChange('mother_tongue', text)}
                />
              </FormField>

              <FormField label="Religion" required error={fieldErrors.religion}>
                <TextInput
                  style={[styles.input, fieldErrors.religion && styles.inputError]}
                  placeholder="e.g. Hindu"
                  value={form.religion}
                  onChangeText={(text) => handleChange('religion', text)}
                />
              </FormField>

              <FormField label="Caste Category">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. OBC"
                  value={form.caste_category}
                  onChangeText={(text) => handleChange('caste_category', text)}
                />
              </FormField>

              <FormField label="Aadhaar Number" required error={fieldErrors.aadhaar_number}>
                <TextInput
                  style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
                  placeholder="12-digit Aadhaar"
                  keyboardType="numeric"
                  maxLength={12}
                  value={form.aadhaar_number}
                  onChangeText={(text) => handleChange('aadhaar_number', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 1: Academics */}
          {step === 1 && (
            <View>
              <Text style={styles.sectionTitle}>Academic Details</Text>

              <FormField label="Class" required error={fieldErrors.class_grade}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {classOptions.map(cls => (
                      <TouchableOpacity
                        key={cls.class_name}
                        style={[styles.chip, form.class_grade === cls.class_name && styles.chipActive]}
                        onPress={() => handleClassChange(cls.class_name)}
                      >
                        <Text style={[styles.chipText, form.class_grade === cls.class_name && styles.chipTextActive]}>
                          Class {cls.class_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </FormField>

              {form.class_grade && (
                <FormField label="Section" required error={fieldErrors.section}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipContainer}>
                      {sectionOptions.map(sec => (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.chip, form.section === sec && styles.chipActive]}
                          onPress={() => handleSectionChange(sec)}
                        >
                          <Text style={[styles.chipText, form.section === sec && styles.chipTextActive]}>
                            Section {sec}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </FormField>
              )}

              <FormField label="Admission Number" required error={fieldErrors.admission_number}>
                <TextInput
                  style={[styles.input, fieldErrors.admission_number && styles.inputError]}
                  placeholder="e.g. ADM2024001"
                  value={form.admission_number}
                  onChangeText={(text) => handleChange('admission_number', text)}
                />
              </FormField>

              <FormField label="Roll Number">
                <TextInput
                  style={[styles.input, styles.disabledInput, styles.rollNumberInput]}
                  placeholder="Assigned after registration"
                  value={form.roll_number}
                  editable={false}
                />
              </FormField>

              <FormField label="Academic Year" required error={fieldErrors.academic_year}>
                <TextInput
                  style={[styles.input, fieldErrors.academic_year && styles.inputError]}
                  placeholder="e.g. 2024-25"
                  value={form.academic_year}
                  onChangeText={(text) => handleChange('academic_year', text)}
                />
              </FormField>

              <FormField label="Medium of Instruction">
                <TextInput
                  style={styles.input}
                  placeholder="Default: ENGLISH"
                  value={form.medium_of_instruction}
                  onChangeText={(text) => handleChange('medium_of_instruction', text)}
                />
              </FormField>

              <FormField label="Date of Admission">
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowAdmissionDatePicker(true)}>
                  <Text style={styles.dateText}>{form.date_of_admission || 'Select date'}</Text>
                </TouchableOpacity>
                {showAdmissionDatePicker && (
                  <DateTimePicker
                    value={form.date_of_admission ? new Date(form.date_of_admission) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      if (date) handleChange('date_of_admission', date.toISOString().split('T')[0]);
                      setShowAdmissionDatePicker(false);
                    }}
                  />
                )}
              </FormField>

              <FormField label="Previous School Name">
                <TextInput
                  style={styles.input}
                  placeholder="Enter previous school name"
                  value={form.previous_school_name}
                  onChangeText={(text) => handleChange('previous_school_name', text)}
                />
              </FormField>

              <FormField label="Transfer Certificate (TC) Number">
                <TextInput
                  style={styles.input}
                  placeholder="TC Number"
                  value={form.transfer_certificate_number}
                  onChangeText={(text) => handleChange('transfer_certificate_number', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 2: Parent & Address */}
          {step === 2 && (
            <View>
              <Text style={styles.sectionTitle}>Parent / Guardian Details</Text>

              <FormField label="Father / Guardian Name" required error={fieldErrors.father_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  value={form.father_guardian_name}
                  onChangeText={(text) => handleChange('father_guardian_name', text)}
                />
              </FormField>

              <FormField label="Father Mobile" required error={fieldErrors.father_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.father_guardian_mobile}
                  onChangeText={(text) => handleChange('father_guardian_mobile', text.replace(/\D/g, '').slice(0, 10))}
                />
              </FormField>

              <FormField label="Father Occupation">
                <TextInput
                  style={styles.input}
                  placeholder="Occupation"
                  value={form.father_guardian_occupation}
                  onChangeText={(text) => handleChange('father_guardian_occupation', text)}
                />
              </FormField>

              <FormField label="Mother / Guardian Name" required error={fieldErrors.mother_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  value={form.mother_guardian_name}
                  onChangeText={(text) => handleChange('mother_guardian_name', text)}
                />
              </FormField>

              <FormField label="Mother Mobile" required error={fieldErrors.mother_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mother_guardian_mobile}
                  onChangeText={(text) => handleChange('mother_guardian_mobile', text.replace(/\D/g, '').slice(0, 10))}
                />
              </FormField>

              <FormField label="Mother Occupation">
                <TextInput
                  style={styles.input}
                  placeholder="Occupation"
                  value={form.mother_guardian_occupation}
                  onChangeText={(text) => handleChange('mother_guardian_occupation', text)}
                />
              </FormField>

              <FormField label="Parent / Guardian Email" required error={fieldErrors.parent_guardian_email}>
                <TextInput
                  style={[styles.input, fieldErrors.parent_guardian_email && styles.inputError]}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.parent_guardian_email}
                  onChangeText={(text) => handleChange('parent_guardian_email', text)}
                />
              </FormField>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Current Address</Text>

              <FormField label="House No." required error={fieldErrors.house_no}>
                <TextInput
                  style={[styles.input, fieldErrors.house_no && styles.inputError]}
                  placeholder="e.g. 12-3A"
                  value={form.house_no}
                  onChangeText={(text) => handleChange('house_no', text)}
                />
              </FormField>

              <FormField label="Street / Locality" required error={fieldErrors.street_locality}>
                <TextInput
                  style={[styles.input, fieldErrors.street_locality && styles.inputError]}
                  placeholder="Street or locality"
                  value={form.street_locality}
                  onChangeText={(text) => handleChange('street_locality', text)}
                />
              </FormField>

              <FormField label="Village / Town / City" required error={fieldErrors.village_town_city}>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  placeholder="City or village"
                  value={form.village_town_city}
                  onChangeText={(text) => handleChange('village_town_city', text)}
                />
              </FormField>

              <FormField label="Mandal / Taluk" required error={fieldErrors.mandal_taluk}>
                <TextInput
                  style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
                  placeholder="Mandal or Taluk"
                  value={form.mandal_taluk}
                  onChangeText={(text) => handleChange('mandal_taluk', text)}
                />
              </FormField>

              <FormField label="District" required error={fieldErrors.district}>
                <TextInput
                  style={[styles.input, fieldErrors.district && styles.inputError]}
                  placeholder="District"
                  value={form.district}
                  onChangeText={(text) => handleChange('district', text)}
                />
              </FormField>

              <FormField label="State" required error={fieldErrors.state}>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  placeholder="State"
                  value={form.state}
                  onChangeText={(text) => handleChange('state', text)}
                />
              </FormField>

              <FormField label="PIN Code" required error={fieldErrors.pin_code}>
                <TextInput
                  style={[styles.input, fieldErrors.pin_code && styles.inputError]}
                  placeholder="6-digit PIN"
                  keyboardType="numeric"
                  maxLength={6}
                  value={form.pin_code}
                  onChangeText={(text) => handleChange('pin_code', text.replace(/\D/g, '').slice(0, 6))}
                />
              </FormField>
            </View>
          )}

          {/* Step 3: Health & Transport */}
          {step === 3 && (
            <View>
              <Text style={styles.sectionTitle}>Health, Emergency & Transport</Text>

              <FormField label="Allergies Details">
                <TextInput
                  style={styles.input}
                  placeholder="Any allergies"
                  value={form.allergies_details}
                  onChangeText={(text) => handleChange('allergies_details', text)}
                />
              </FormField>

              <FormField label="Medical Conditions">
                <TextInput
                  style={styles.input}
                  placeholder="Any medical conditions"
                  value={form.medical_conditions}
                  onChangeText={(text) => handleChange('medical_conditions', text)}
                />
              </FormField>

              <FormField label="Emergency Contact Name" required error={fieldErrors.emergency_contact_name}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  placeholder="Contact person name"
                  value={form.emergency_contact_name}
                  onChangeText={(text) => handleChange('emergency_contact_name', text)}
                />
              </FormField>

              <FormField label="Emergency Contact Number" required error={fieldErrors.emergency_contact_number}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
                  placeholder="10-digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.emergency_contact_number}
                  onChangeText={(text) => handleChange('emergency_contact_number', text.replace(/\D/g, '').slice(0, 10))}
                />
              </FormField>

              <FormField label="Nearest Hospital / Doctor">
                <TextInput
                  style={styles.input}
                  placeholder="Hospital or doctor name"
                  value={form.nearest_hospital_doctor}
                  onChangeText={(text) => handleChange('nearest_hospital_doctor', text)}
                />
              </FormField>

              <FormField label="Mode of Transport" required error={fieldErrors.mode_of_transport}>
                <TextInput
                  style={[styles.input, fieldErrors.mode_of_transport && styles.inputError]}
                  placeholder="e.g. Bus, Private"
                  value={form.mode_of_transport}
                  onChangeText={(text) => handleChange('mode_of_transport', text)}
                />
              </FormField>

              <FormField label="Bus Route / Vehicle Number">
                <TextInput
                  style={styles.input}
                  placeholder="Bus route or vehicle no."
                  value={form.bus_route_vehicle_number}
                  onChangeText={(text) => handleChange('bus_route_vehicle_number', text)}
                />
              </FormField>

              <FormField label="Hostel / Day Scholar">
                <TextInput
                  style={styles.input}
                  placeholder="Hostel or Day Scholar"
                  value={form.hostel_day_scholar}
                  onChangeText={(text) => handleChange('hostel_day_scholar', text)}
                />
              </FormField>

              <FormField label="Password" required error={fieldErrors.password}>
                <TextInput
                  style={[styles.input, fieldErrors.password && styles.inputError]}
                  placeholder="Create password"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(text) => handleChange('password', text)}
                />
                {form.password && <PasswordStrength password={form.password} />}
              </FormField>

              <FormField label="Retype Password" required error={fieldErrors.confirm_password}>
                <TextInput
                  style={[styles.input, fieldErrors.confirm_password && styles.inputError]}
                  placeholder="Retype password"
                  secureTextEntry
                  value={form.confirm_password}
                  onChangeText={(text) => handleChange('confirm_password', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 4: Photo */}
          {step === 4 && (
            <View>
              <Text style={styles.sectionTitle}>Student Photograph</Text>
              
              {fieldErrors.photo && <Text style={styles.fieldError}>{fieldErrors.photo}</Text>}

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
                title={loading ? 'Registering...' : '✓ Register Student'}
                onPress={submit}
                disabled={loading}
                style={styles.navBtn}
              />
            )}
          </View>
        </AppCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🏫 School: {publicSchoolCode || '—'}</Text>
          <Text style={styles.footerText}>🏢 Branch: {publicBranchId || '—'}</Text>
        </View>
      </ScrollView>

      {/* Roll Number Modal */}
      <Modal visible={showRollNumberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Registration Complete!</Text>
            <Text style={styles.modalMessage}>
              Your student details were saved successfully and a roll number has been assigned.
            </Text>
            <View style={styles.rollNumberDisplay}>
              <Text style={styles.rollNumberLabel}>Assigned Roll Number</Text>
              <Text style={styles.rollNumberValue}>{generatedRollNumber || '—'}</Text>
            </View>
            <Text style={styles.modalNote}>
              Copy this roll number or note it down for records.
            </Text>
            <AppButton title="OK" onPress={() => setShowRollNumberModal(false)} />
          </View>
        </View>
      </Modal>
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
  rollNumberInput: {
    fontWeight: '700',
    color: '#2563eb',
  },
  fieldError: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#4a5568',
  },
  chipTextActive: {
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
    width: 150,
    height: 150,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 16,
  },
  rollNumberDisplay: {
    backgroundColor: '#dbeafe',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  rollNumberLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  rollNumberValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
});