import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronLeft,
  Check,
  User,
  BookOpen,
  Users,
  Heart,
  Camera,
  Eye,
  EyeOff,
  ChevronRight,
  Calendar,
  X,
  AlertCircle
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../../services/api';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';

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
  identification_mark_1: string;
  identification_mark_2: string;
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

const isValidDateOfBirth = (dobString: string): { valid: boolean; error: string | null } => {
  if (!dobString) return { valid: true, error: null };

  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  const year = dob.getFullYear();
  if (year < 1000 || year > new Date().getFullYear()) {
    return {
      valid: false,
      error: `Invalid year ${year}. Please use a valid year (e.g., 1991, 2024)`
    };
  }

  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  if (dob > oneYearAgo) {
    return {
      valid: false,
      error: "Date of Birth must be more than 1 year old"
    };
  }

  return { valid: true, error: null };
};

const STEPS = [
  'Personal Info',
  'Academic Details',
  'Guardian Info',
  'Contact Info',
  'Upload Photo',
  'Review & Submit'
];

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
  identification_mark_1: '',
  identification_mark_2: '',
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
    {valid ? (
      <Check size={12} color="#059669" />
    ) : (
      <View style={styles.passwordRuleDot} />
    )}
    <AppText style={[styles.passwordRuleText, valid && styles.passwordRuleTextValid]}>
      {children}
    </AppText>
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
    <AppText weight="semiBold" style={styles.formLabel}>
      {label}
      {required && <AppText style={styles.requiredStar}> *</AppText>}
    </AppText>
    {children}
    {error && <AppText style={styles.fieldError}>{error}</AppText>}
  </View>
);

// Preview Field Component
const PreviewField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.previewField}>
    <AppText weight="semiBold" style={styles.previewFieldLabel}>{label}</AppText>
    <AppText weight="regular" style={styles.previewFieldValue}>{value || '—'}</AppText>
  </View>
);

export default function StudentRegisterPublicScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, nationality: 'Indian', branch_id: publicBranchId });
  const [showRollNumberModal, setShowRollNumberModal] = useState<boolean>(false);
  const [generatedRollNumber, setGeneratedRollNumber] = useState<string>('');

  // Password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Date pickers
  const [showDOBPicker, setShowDOBPicker] = useState<boolean>(false);
  const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState<boolean>(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch classes when branch changes
  useEffect(() => {
    if (!isPublicInvite || !form.branch_id || !publicSchoolCode) return;

    const loadClasses = async () => {
      try {
        const res = await API.get('/hm/public/classes-sections', {
          params: {
            branch_id: form.branch_id,
            school_code: publicSchoolCode,
          },
          headers: {
            'X-School-Code': publicSchoolCode,
          },
        });

        if (!isMounted.current) return;

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
        if (!isMounted.current) return;
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

  const handleAcademicYearChange = (text: string) => {
    let value = text.replace(/[^0-9-]/g, '');
    if (value.length > 7) value = value.slice(0, 7);
    if (value.length === 5 && !value.includes('-')) value = value.slice(0, 4) + '-' + value.slice(4);
    if (value.length === 5 && value[4] !== '-') value = value.slice(0, 4) + '-' + value.slice(4);

    if (fieldErrors.academic_year) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.academic_year;
        return newErrors;
      });
    }
    handleChange('academic_year', value);
  };

  const handleSectionChange = (text: string) => {
    const capitalOnly = text.replace(/[^A-Z]/g, '');
    handleChange('section', capitalOnly);
  };

  const handleDOBChange = (date: Date) => {
    const dob = date.toISOString().split('T')[0];
    const dobValidation = isValidDateOfBirth(dob);
    if (!dobValidation.valid) {
      setFieldErrors(prev => ({ ...prev, date_of_birth: dobValidation.error! }));
      setShowDOBPicker(false);
      return;
    }
    
    if (fieldErrors.date_of_birth) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.date_of_birth;
        return newErrors;
      });
    }
    setForm(prev => ({
      ...prev,
      date_of_birth: dob,
      age: calcAgeFromDOB(dob),
    }));
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

  const validateStep = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!safeTrim(form.first_name)) errors.first_name = 'First name is required';
      else if (!isValidName(form.first_name)) errors.first_name = 'First name must contain letters';

      if (!safeTrim(form.last_name)) errors.last_name = 'Last name is required';
      else if (!isValidName(form.last_name)) errors.last_name = 'Last name must contain letters';

      if (!form.gender) errors.gender = 'Gender is required';
      if (!form.date_of_birth) errors.date_of_birth = 'Date of birth is required';

      if (!safeTrim(form.nationality)) errors.nationality = 'Nationality is required';
      if (!safeTrim(form.mother_tongue)) errors.mother_tongue = 'Mother tongue is required';
      if (!safeTrim(form.religion)) errors.religion = 'Religion is required';
      if (!safeTrim(form.aadhaar_number)) errors.aadhaar_number = 'Aadhaar number is required';
      if (form.aadhaar_number && !isValidAadhaar(form.aadhaar_number)) {
        errors.aadhaar_number = 'Aadhaar must be 12 digits';
      }
    }

    if (step === 1) {
      if (!safeTrim(form.class_grade)) errors.class_grade = 'Class is required';
      if (!safeTrim(form.section)) errors.section = 'Section is required';
      if (!safeTrim(form.admission_number)) errors.admission_number = 'Admission number is required';
      if (!safeTrim(form.academic_year)) errors.academic_year = 'Academic year is required';
      if (form.academic_year && !(/^\d{4}-\d{2}$/.test(form.academic_year))) {
        errors.academic_year = 'Academic year must be in YYYY-YY format (e.g., 2024-25)';
      }
    }

    if (step === 2) {
      if (!safeTrim(form.father_guardian_name)) errors.father_guardian_name = 'Father name is required';
      if (!isValidMobile(form.father_guardian_mobile)) errors.father_guardian_mobile = 'Enter valid 10-digit number';
      if (!safeTrim(form.mother_guardian_name)) errors.mother_guardian_name = 'Mother name is required';
      if (!isValidMobile(form.mother_guardian_mobile)) errors.mother_guardian_mobile = 'Enter valid 10-digit number';
      if (!safeTrim(form.parent_guardian_email)) errors.parent_guardian_email = 'Parent email is required';
      else if (!isValidEmail(form.parent_guardian_email)) errors.parent_guardian_email = 'Enter valid email';
    }

    if (step === 3) {
      if (!safeTrim(form.house_no)) errors.house_no = 'House No is required';
      if (!safeTrim(form.street_locality)) errors.street_locality = 'Street is required';
      if (!safeTrim(form.village_town_city)) errors.village_town_city = 'City is required';
      if (!safeTrim(form.mandal_taluk)) errors.mandal_taluk = 'Mandal/Taluk is required';
      if (!safeTrim(form.district)) errors.district = 'District is required';
      if (!safeTrim(form.state)) errors.state = 'State is required';
      if (!isValidPin(form.pin_code)) errors.pin_code = 'Enter valid 6-digit pin code';

      if (!safeTrim(form.emergency_contact_name)) errors.emergency_contact_name = 'Contact name is required';
      if (!isValidMobile(form.emergency_contact_number)) errors.emergency_contact_number = 'Enter valid 10-digit number';
      if (!safeTrim(form.mode_of_transport)) errors.mode_of_transport = 'Mode of transport is required';
    }

    if (step === 4) {
      if (!photoFile) errors.photo = 'Student photograph is required';

      if (!safeTrim(form.password)) {
        errors.password = 'Password is required';
      } else if (!isStrongPassword(form.password)) {
        errors.password = 'Password must contain uppercase, lowercase, number, and special character';
      }
      if (!safeTrim(form.confirm_password)) {
        errors.confirm_password = 'Please retype password';
      }
      if (form.password && form.confirm_password && form.password !== form.confirm_password) {
        errors.confirm_password = 'Passwords do not match';
      }
    }

    return errors;
  };

  const nextStep = () => {
    if (!isPublicInvite) {
      setServerError('Invalid invite link. Missing school code or branch ID.');
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

  const getImageMimeType = (file: any): string => {
    const explicitType = String(file?.type || '').trim().toLowerCase();
    if (explicitType.startsWith('image/')) return explicitType;
    const source = String(file?.fileName || file?.name || file?.uri || '').trim().toLowerCase();
    if (source.endsWith('.png')) return 'image/png';
    if (source.endsWith('.webp')) return 'image/webp';
    if (source.endsWith('.gif')) return 'image/gif';
    if (source.endsWith('.jpg') || source.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/jpeg';
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const runtimeBuffer = (globalThis as any).Buffer;
    if (runtimeBuffer?.from) return runtimeBuffer.from(buffer).toString('base64');
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    const btoaFn = (globalThis as any).btoa;
    if (typeof btoaFn === 'function') return btoaFn(binary);
    throw new Error('Base64 encoder is unavailable');
  };

  const fileToBase64 = async (file: any): Promise<string> => {
    if (String(file?.base64 || '').trim()) return `data:${getImageMimeType(file)};base64,${String(file.base64).replace(/\s+/g, '')}`;
    if (!file?.uri) throw new Error('Missing image URI');
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return `data:${getImageMimeType(file)};base64,${base64}`;
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
          'Content-Type': 'multipart/form-data',
          'X-School-Code': publicSchoolCode,
          'X-Branch-Id': publicBranchId,
        },
      });

      if (!isMounted.current) return;

      const assignedRollNumber = res.data?.roll_number || form.roll_number || '—';
      setGeneratedRollNumber(assignedRollNumber);
      setShowRollNumberModal(true);

      setTimeout(() => {
        if (!isMounted.current) return;
        setStep(0);
        setShowRollNumberModal(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setForm({ ...INITIAL_FORM, nationality: 'Indian', branch_id: publicBranchId });
      }, 3000);
    } catch (err: any) {
      if (isMounted.current) {
        const data = err.response?.data;
        if (data && data.detail) {
          if (typeof data.detail === 'object' && !Array.isArray(data.detail)) {
            setFieldErrors(prev => ({ ...prev, ...data.detail }));
            const errorMsg = Object.entries(data.detail).map(([f, msg]) => `${f}: ${msg}`).join('\n');
            setServerError(errorMsg);
          } else if (Array.isArray(data.detail)) {
            const errorMsg = data.detail.map((e: any) => {
              const field = (e.loc || []).slice(1).join('.');
              return `${field}: ${e.msg}`;
            }).join('\n');
            setServerError(errorMsg);
          } else {
            setServerError(data.detail);
          }
        } else {
          setServerError(`Submission Error: ${err.message}`);
        }
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;

  if (!isPublicInvite) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <AppText weight="bold" style={styles.errorTitle}>Invalid Invite Link</AppText>
        <AppText style={styles.errorText}>
          The link you used is invalid. Please ensure you have correct school code and branch ID.
        </AppText>
        <AppButton title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Navy Hero Header */}
        <View style={[styles.headerStandard, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <AppText weight="bold" style={styles.heroTitle}>Student Registration</AppText>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroContent}>
            <AppText weight="bold" style={styles.heroGreeting}>Enrollment Portal</AppText>
            <AppText style={styles.heroSubtext}>
              {step === totalSteps - 1 ? 'Preview & Confirm' : `Step ${step + 1} of ${totalSteps} — ${STEPS[step]}`}
            </AppText>
          </View>
        </View>

        {serverError && (
          <View style={styles.errorBox}>
            <AppText style={styles.errorText}>{serverError}</AppText>
          </View>
        )}
        {serverSuccess && (
          <View style={styles.successBox}>
            <AppText style={styles.successText}>{serverSuccess}</AppText>
          </View>
        )}

        {/* Stepper */}
        <View style={styles.stepperContainer}>
          {STEPS.map((label, i) => (
            <TouchableOpacity key={label} style={styles.stepItem} onPress={() => setStep(i)}>
              <View style={[styles.stepCircle, step > i && styles.stepCompleted, step === i && styles.stepActive]}>
                {step > i ? <Check size={14} color="#FFF" /> : <AppText weight="bold" style={[styles.stepNumber, step === i && styles.stepNumberActive]}>{i + 1}</AppText>}
              </View>
              <AppText weight={step === i ? "bold" : "regular"} style={[styles.stepLabel, step === i && styles.stepLabelActive, step > i && styles.stepLabelCompleted]}>
                {label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Card */}
        <AppCard style={styles.formCard}>
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <User size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Personal Details</AppText>
              </View>
              
              <FormField label="First Name" required error={fieldErrors.first_name}>
                <TextInput
                  style={[styles.input, fieldErrors.first_name && styles.inputError]}
                  placeholder="Enter first name"
                  placeholderTextColor="#94A3B8"
                  value={form.first_name}
                  onChangeText={(text) => handleChange('first_name', text)}
                />
              </FormField>

              <FormField label="Last Name" required error={fieldErrors.last_name}>
                <TextInput
                  style={[styles.input, fieldErrors.last_name && styles.inputError]}
                  placeholder="Enter last name"
                  placeholderTextColor="#94A3B8"
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
                      <AppText weight="semiBold" style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Blood Group">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. O+"
                  placeholderTextColor="#94A3B8"
                  value={form.blood_group}
                  onChangeText={(text) => handleChange('blood_group', text)}
                />
              </FormField>

              <FormField label="Date of Birth" required error={fieldErrors.date_of_birth}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDOBPicker(true)}>
                  <Calendar size={18} color="#64748B" />
                  <AppText style={styles.dateText}>{form.date_of_birth || 'Select date'}</AppText>
                </TouchableOpacity>
                {showDOBPicker && (
                  <DateTimePicker
                    value={form.date_of_birth ? new Date(form.date_of_birth) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
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
                  placeholderTextColor="#94A3B8"
                  value={form.nationality}
                  onChangeText={(text) => handleChange('nationality', text)}
                />
              </FormField>

              <FormField label="Mother Tongue" required error={fieldErrors.mother_tongue}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_tongue && styles.inputError]}
                  placeholder="e.g. Telugu"
                  placeholderTextColor="#94A3B8"
                  value={form.mother_tongue}
                  onChangeText={(text) => handleChange('mother_tongue', text)}
                />
              </FormField>

              <FormField label="Religion" required error={fieldErrors.religion}>
                <TextInput
                  style={[styles.input, fieldErrors.religion && styles.inputError]}
                  placeholder="e.g. Hindu"
                  placeholderTextColor="#94A3B8"
                  value={form.religion}
                  onChangeText={(text) => handleChange('religion', text)}
                />
              </FormField>

              <FormField label="Caste Category">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. OBC"
                  placeholderTextColor="#94A3B8"
                  value={form.caste_category}
                  onChangeText={(text) => handleChange('caste_category', text)}
                />
              </FormField>

              <FormField label="Aadhaar Number" required error={fieldErrors.aadhaar_number}>
                <TextInput
                  style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
                  placeholder="12-digit Aadhaar"
                  placeholderTextColor="#94A3B8"
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
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Academic Details</AppText>
              </View>

              <FormField label="Class" required error={fieldErrors.class_grade}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {classOptions.map(cls => (
                      <TouchableOpacity
                        key={cls.class_name}
                        style={[styles.chip, form.class_grade === cls.class_name && styles.chipActive]}
                        onPress={() => handleClassChange(cls.class_name)}
                      >
                        <AppText weight="semiBold" style={[styles.chipText, form.class_grade === cls.class_name && styles.chipTextActive]}>
                          Class {cls.class_name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </FormField>

              {form.class_grade && (
                <FormField label="Section" required error={fieldErrors.section}>
                  <TextInput
                    style={[styles.input, styles.sectionInput, fieldErrors.section && styles.inputError]}
                    placeholder="Enter section (A, B, C...)"
                    placeholderTextColor="#94A3B8"
                    value={form.section}
                    onChangeText={handleSectionChange}
                    autoCapitalize="characters"
                    maxLength={3}
                  />
                </FormField>
              )}

              <FormField label="Admission Number" required error={fieldErrors.admission_number}>
                <TextInput
                  style={[styles.input, fieldErrors.admission_number && styles.inputError]}
                  placeholder="e.g. ADM2024001"
                  placeholderTextColor="#94A3B8"
                  value={form.admission_number}
                  onChangeText={(text) => handleChange('admission_number', text)}
                />
              </FormField>

              <FormField label="Academic Year" required error={fieldErrors.academic_year}>
                <TextInput
                  style={[styles.input, fieldErrors.academic_year && styles.inputError]}
                  placeholder="e.g. 2024-25"
                  placeholderTextColor="#94A3B8"
                  value={form.academic_year}
                  onChangeText={handleAcademicYearChange}
                  maxLength={7}
                />
              </FormField>

              <FormField label="Medium of Instruction">
                <TextInput
                  style={styles.input}
                  placeholder="Default: ENGLISH"
                  placeholderTextColor="#94A3B8"
                  value={form.medium_of_instruction}
                  onChangeText={(text) => handleChange('medium_of_instruction', text)}
                />
              </FormField>

              <FormField label="Date of Admission">
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowAdmissionDatePicker(true)}>
                  <Calendar size={18} color="#64748B" />
                  <AppText style={styles.dateText}>{form.date_of_admission || 'Select date'}</AppText>
                </TouchableOpacity>
                {showAdmissionDatePicker && (
                  <DateTimePicker
                    value={form.date_of_admission ? new Date(form.date_of_admission) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
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
                  placeholderTextColor="#94A3B8"
                  value={form.previous_school_name}
                  onChangeText={(text) => handleChange('previous_school_name', text)}
                />
              </FormField>

              <FormField label="Transfer Certificate (TC) Number">
                <TextInput
                  style={styles.input}
                  placeholder="TC Number"
                  placeholderTextColor="#94A3B8"
                  value={form.transfer_certificate_number}
                  onChangeText={(text) => handleChange('transfer_certificate_number', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 2: Parent / Guardian Info */}
          {step === 2 && (
            <View>
              <View style={styles.sectionHeader}>
                <Users size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Parent / Guardian Details</AppText>
              </View>

              <FormField label="Father / Guardian Name" required error={fieldErrors.father_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  value={form.father_guardian_name}
                  onChangeText={(text) => handleChange('father_guardian_name', text)}
                />
              </FormField>

              <FormField label="Father Mobile" required error={fieldErrors.father_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
                  value={form.father_guardian_occupation}
                  onChangeText={(text) => handleChange('father_guardian_occupation', text)}
                />
              </FormField>

              <FormField label="Mother / Guardian Name" required error={fieldErrors.mother_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  value={form.mother_guardian_name}
                  onChangeText={(text) => handleChange('mother_guardian_name', text)}
                />
              </FormField>

              <FormField label="Mother Mobile" required error={fieldErrors.mother_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
                  value={form.mother_guardian_occupation}
                  onChangeText={(text) => handleChange('mother_guardian_occupation', text)}
                />
              </FormField>

              <FormField label="Parent / Guardian Email" required error={fieldErrors.parent_guardian_email}>
                <TextInput
                  style={[styles.input, fieldErrors.parent_guardian_email && styles.inputError]}
                  placeholder="email@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.parent_guardian_email}
                  onChangeText={(text) => handleChange('parent_guardian_email', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 3: Contact & Address */}
          {step === 3 && (
            <View>
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Current Address</AppText>
              </View>

              <FormField label="House No." required error={fieldErrors.house_no}>
                <TextInput
                  style={[styles.input, fieldErrors.house_no && styles.inputError]}
                  placeholder="e.g. 12-3A"
                  placeholderTextColor="#94A3B8"
                  value={form.house_no}
                  onChangeText={(text) => handleChange('house_no', text)}
                />
              </FormField>

              <FormField label="Street / Locality" required error={fieldErrors.street_locality}>
                <TextInput
                  style={[styles.input, fieldErrors.street_locality && styles.inputError]}
                  placeholder="Street or locality"
                  placeholderTextColor="#94A3B8"
                  value={form.street_locality}
                  onChangeText={(text) => handleChange('street_locality', text)}
                />
              </FormField>

              <FormField label="Village / Town / City" required error={fieldErrors.village_town_city}>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  placeholder="City or village"
                  placeholderTextColor="#94A3B8"
                  value={form.village_town_city}
                  onChangeText={(text) => handleChange('village_town_city', text)}
                />
              </FormField>

              <FormField label="Mandal / Taluk" required error={fieldErrors.mandal_taluk}>
                <TextInput
                  style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
                  placeholder="Mandal or Taluk"
                  placeholderTextColor="#94A3B8"
                  value={form.mandal_taluk}
                  onChangeText={(text) => handleChange('mandal_taluk', text)}
                />
              </FormField>

              <FormField label="District" required error={fieldErrors.district}>
                <TextInput
                  style={[styles.input, fieldErrors.district && styles.inputError]}
                  placeholder="District"
                  placeholderTextColor="#94A3B8"
                  value={form.district}
                  onChangeText={(text) => handleChange('district', text)}
                />
              </FormField>

              <FormField label="State" required error={fieldErrors.state}>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  placeholder="State"
                  placeholderTextColor="#94A3B8"
                  value={form.state}
                  onChangeText={(text) => handleChange('state', text)}
                />
              </FormField>

              <FormField label="PIN Code" required error={fieldErrors.pin_code}>
                <TextInput
                  style={[styles.input, fieldErrors.pin_code && styles.inputError]}
                  placeholder="6-digit PIN"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                  value={form.pin_code}
                  onChangeText={(text) => handleChange('pin_code', text.replace(/\D/g, '').slice(0, 6))}
                />
              </FormField>

              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <Heart size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Health, Emergency & Transport</AppText>
              </View>

              <FormField label="Allergies Details">
                <TextInput
                  style={styles.input}
                  placeholder="Any allergies"
                  placeholderTextColor="#94A3B8"
                  value={form.allergies_details}
                  onChangeText={(text) => handleChange('allergies_details', text)}
                />
              </FormField>

              <FormField label="Medical Conditions">
                <TextInput
                  style={styles.input}
                  placeholder="Any medical conditions"
                  placeholderTextColor="#94A3B8"
                  value={form.medical_conditions}
                  onChangeText={(text) => handleChange('medical_conditions', text)}
                />
              </FormField>

              <FormField label="Emergency Contact Name" required error={fieldErrors.emergency_contact_name}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  placeholder="Contact person name"
                  placeholderTextColor="#94A3B8"
                  value={form.emergency_contact_name}
                  onChangeText={(text) => handleChange('emergency_contact_name', text)}
                />
              </FormField>

              <FormField label="Emergency Contact Number" required error={fieldErrors.emergency_contact_number}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
                  placeholder="10-digit number"
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
                  value={form.nearest_hospital_doctor}
                  onChangeText={(text) => handleChange('nearest_hospital_doctor', text)}
                />
              </FormField>

              <FormField label="Mode of Transport" required error={fieldErrors.mode_of_transport}>
                <TextInput
                  style={[styles.input, fieldErrors.mode_of_transport && styles.inputError]}
                  placeholder="e.g. Bus, Private"
                  placeholderTextColor="#94A3B8"
                  value={form.mode_of_transport}
                  onChangeText={(text) => handleChange('mode_of_transport', text)}
                />
              </FormField>

              <FormField label="Bus Route / Vehicle Number">
                <TextInput
                  style={styles.input}
                  placeholder="Bus route or vehicle no."
                  placeholderTextColor="#94A3B8"
                  value={form.bus_route_vehicle_number}
                  onChangeText={(text) => handleChange('bus_route_vehicle_number', text)}
                />
              </FormField>

              <FormField label="Hostel / Day Scholar">
                <TextInput
                  style={styles.input}
                  placeholder="Hostel or Day Scholar"
                  placeholderTextColor="#94A3B8"
                  value={form.hostel_day_scholar}
                  onChangeText={(text) => handleChange('hostel_day_scholar', text)}
                />
              </FormField>
            </View>
          )}

          {/* Step 4: Photo & Password */}
          {step === 4 && (
            <View>
              <View style={styles.sectionHeader}>
                <Camera size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Student Photograph</AppText>
              </View>

              {fieldErrors.photo && <AppText style={styles.fieldError}>{fieldErrors.photo}</AppText>}

              <TouchableOpacity style={styles.photoZone} onPress={handleImagePick}>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={48} color="#CBD5E1" />
                    <AppText weight="semiBold" style={styles.photoText}>Tap to add photo</AppText>
                    <AppText style={styles.photoSubtext}>Camera or Gallery</AppText>
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Check size={18} color="#001F3F" />
                <AppText weight="bold" style={styles.sectionTitle}>Login Credentials</AppText>
              </View>

              <FormField label="Password" required error={fieldErrors.password}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, fieldErrors.password && styles.inputError, styles.passwordInput]}
                    placeholder="Enter password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(text) => handleChange('password', text)}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                  </TouchableOpacity>
                </View>
                {form.password && <PasswordStrength password={form.password} />}
              </FormField>

              <FormField label="Retype Password" required error={fieldErrors.confirm_password}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, fieldErrors.confirm_password && styles.inputError, styles.passwordInput]}
                    placeholder="Retype password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    value={form.confirm_password}
                    onChangeText={(text) => handleChange('confirm_password', text)}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                  </TouchableOpacity>
                </View>
              </FormField>
            </View>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <View>
              <View style={styles.previewHeader}>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={styles.previewPhoto} />
                ) : (
                  <View style={styles.previewPhotoPlaceholder}>
                    <AppText style={styles.previewPhotoText}>No Photo</AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" style={styles.previewName}>{form.student_full_name || '—'}</AppText>
                  <AppText style={styles.previewMeta}>
                    Class {form.class_grade || '—'} | Section {form.section || '—'}
                  </AppText>
                  <AppText style={styles.previewMeta}>
                    {form.academic_year || '—'} | Admission: {form.admission_number || '—'}
                  </AppText>
                  <View style={styles.previewBadge}>
                    <AppText weight="bold" style={styles.previewBadgeText}>{form.student_status}</AppText>
                  </View>
                </View>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Personal Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="First Name" value={form.first_name} />
                  <PreviewField label="Last Name" value={form.last_name} />
                  <PreviewField label="Gender" value={form.gender} />
                  <PreviewField label="Date of Birth" value={form.date_of_birth} />
                  <PreviewField label="Age" value={form.age ? `${form.age} yrs` : '—'} />
                  <PreviewField label="Blood Group" value={form.blood_group} />
                  <PreviewField label="Nationality" value={form.nationality} />
                  <PreviewField label="Mother Tongue" value={form.mother_tongue} />
                  <PreviewField label="Religion" value={form.religion} />
                  <PreviewField label="Caste" value={form.caste_category} />
                  <PreviewField label="Aadhaar" value={form.aadhaar_number || '—'} />
                  <PreviewField label="Status" value={form.student_status} />
                </View>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Academic Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="Class" value={form.class_grade} />
                  <PreviewField label="Section" value={form.section} />
                  <PreviewField label="Admission No." value={form.admission_number} />
                  <PreviewField label="Roll Number" value={form.roll_number} />
                  <PreviewField label="Academic Year" value={form.academic_year} />
                  <PreviewField label="Medium" value={form.medium_of_instruction} />
                  <PreviewField label="Date of Admission" value={form.date_of_admission} />
                  <PreviewField label="Previous School" value={form.previous_school_name} />
                  <PreviewField label="TC Number" value={form.transfer_certificate_number} />
                </View>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Parent / Guardian Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="Father Name" value={form.father_guardian_name} />
                  <PreviewField label="Father Mobile" value={form.father_guardian_mobile} />
                  <PreviewField label="Father Occupation" value={form.father_guardian_occupation} />
                  <PreviewField label="Mother Name" value={form.mother_guardian_name} />
                  <PreviewField label="Mother Mobile" value={form.mother_guardian_mobile} />
                  <PreviewField label="Mother Occupation" value={form.mother_guardian_occupation} />
                  <PreviewField label="Parent Email" value={form.parent_guardian_email} />
                </View>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Address</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="House No." value={form.house_no} />
                  <PreviewField label="Street" value={form.street_locality} />
                  <PreviewField label="City" value={form.village_town_city} />
                  <PreviewField label="Mandal/Taluk" value={form.mandal_taluk} />
                  <PreviewField label="District" value={form.district} />
                  <PreviewField label="State" value={form.state} />
                  <PreviewField label="PIN Code" value={form.pin_code} />
                </View>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Health & Transport</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="Allergies" value={form.allergies_details} />
                  <PreviewField label="Medical Conditions" value={form.medical_conditions} />
                  <PreviewField label="Emergency Contact" value={form.emergency_contact_name} />
                  <PreviewField label="Emergency Mobile" value={form.emergency_contact_number} />
                  <PreviewField label="Nearest Hospital" value={form.nearest_hospital_doctor} />
                  <PreviewField label="Mode of Transport" value={form.mode_of_transport} />
                  <PreviewField label="Bus Route" value={form.bus_route_vehicle_number} />
                  <PreviewField label="Hostel/Day Scholar" value={form.hostel_day_scholar} />
                </View>
              </View>

              <View style={styles.previewFooter}>
                <AppText weight="semiBold" style={styles.previewFooterText}>
                  Please review all details carefully before submitting.
                </AppText>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navButtons}>
            <AppButton
              title="Back"
              onPress={prevStep}
              disabled={step === 0 || loading}
              type="secondary"
              style={styles.navBtn}
            />
            {isLastStep ? (
              <AppButton
                title={loading ? 'Registering...' : 'Confirm'}
                onPress={submit}
                disabled={loading}
                style={styles.navBtn}
              />
            ) : (
              <AppButton
                title="Next"
                onPress={nextStep}
                disabled={loading}
                style={styles.navBtn}
              />
            )}
          </View>
        </AppCard>

        {/* Footer */}
        <View style={styles.footer}>
          <AppText style={styles.footerText}>School: {publicSchoolCode || '—'}</AppText>
          <AppText style={styles.footerText}>Branch: {publicBranchId || '—'}</AppText>
        </View>
      </ScrollView>

      {/* Roll Number Modal */}
      <Modal visible={showRollNumberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText weight="bold" style={styles.modalTitle}>Registration Complete</AppText>
            <AppText style={styles.modalMessage}>
              Your student details were saved successfully and a roll number has been assigned.
            </AppText>
            <View style={styles.rollNumberDisplay}>
              <AppText weight="semiBold" style={styles.rollNumberLabel}>Assigned Roll Number</AppText>
              <AppText weight="bold" style={styles.rollNumberValue}>{generatedRollNumber || '—'}</AppText>
            </View>
            <AppText style={styles.modalNote}>
              Copy this roll number or note it down for records.
            </AppText>
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
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    color: '#001F3F',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  heroContent: {
    marginTop: 20,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  successBox: {
    backgroundColor: '#d1fae5',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  successText: {
    color: '#065f46',
    fontSize: 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -30,
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: '#059669',
  },
  stepActive: {
    backgroundColor: '#001F3F',
  },
  stepNumber: {
    color: '#64748B',
    fontSize: 11,
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#001F3F',
  },
  stepLabelCompleted: {
    color: '#059669',
  },
  formCard: {
    padding: 24,
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#001F3F',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  sectionInput: {
    textTransform: 'uppercase',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderBtnActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  genderText: {
    color: '#64748B',
    fontSize: 14,
  },
  genderTextActive: {
    color: '#FFF',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  dateText: {
    fontSize: 14,
    color: '#0F172A',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  chipText: {
    fontSize: 14,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFF',
  },
  fieldError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  passwordStrength: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  passwordRuleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  passwordRuleText: {
    fontSize: 11,
    color: '#64748B',
  },
  passwordRuleTextValid: {
    color: '#059669',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 45,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  photoZone: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  photoPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoText: {
    fontSize: 15,
    color: '#001F3F',
    marginTop: 12,
  },
  photoSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: 'cover',
  },
  previewPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPhotoText: {
    fontSize: 10,
    color: '#64748B',
  },
  previewName: {
    fontSize: 18,
    color: '#001F3F',
  },
  previewMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewBadge: {
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  previewBadgeText: {
    fontSize: 10,
    color: '#166534',
    textTransform: 'uppercase',
  },
  previewCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  previewCardHeader: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewCardTitle: {
    fontSize: 12,
    color: '#001F3F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewField: {
    width: '50%',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  previewFieldLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewFieldValue: {
    fontSize: 13,
    color: '#0F172A',
  },
  previewFooter: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  previewFooterText: {
    fontSize: 12,
    color: '#166534',
    textAlign: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    height: 50,
  },
  footer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    color: '#001F3F',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rollNumberDisplay: {
    backgroundColor: '#F0F9FF',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rollNumberLabel: {
    fontSize: 12,
    color: '#0369A1',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rollNumberValue: {
    fontSize: 36,
    color: '#0284C7',
    letterSpacing: 2,
  },
  modalNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
});
