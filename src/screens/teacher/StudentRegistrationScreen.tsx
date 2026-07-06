import { useScrollTabBar } from '../../hooks/useScrollTabBar';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Copy,
  Check,
  User,
  BookOpen,
  Users,
  Heart,
  Camera,
  Eye,
  EyeOff,
  ChevronRight,
  PlusCircle,
  Calendar,
  X,
  BadgeCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../../services/api';
import { submitStudentRegistration } from '../../services/teacherService';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import { safeGoBack } from '../../utils/navigationHelpers';
import Loader from '../../components/common/Loader';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Theme, C } from '../../theme/tokens';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';

import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import BloodGroupPicker from '../../components/common/BloodGroupPicker';
import FormSelectPicker from '../../components/common/FormSelectPicker';
import RegistrationFormField, { RequiredSectionTitle, StepRequiredLegend } from '../../components/common/RegistrationFormField';
import {
  buildStudentRegistrationFormData,
  calcAgeFromDOB,
  GENDER_OPTIONS,
  getAcademicYearOptions,
  getDefaultAcademicYear,
  getPasswordStrength,
  HOSTEL_DAY_SCHOLAR_OPTIONS,
  isValidDateOfBirth,
  MEDIUM_OF_INSTRUCTION_OPTIONS,
  MODE_OF_TRANSPORT_OPTIONS,
  safeTrim,
  validateStudentRegistrationStep,
  formatGenderLabel,
  formatOptionLabel,
  toClassPickerOptions,
  toSectionPickerOptions,
} from '../../utils/studentRegistrationValidation';
import { formatErrorMessage } from '../../utils/helpers';
import { launchCameraWithPermission as launchCamera } from '../../utils/cameraUtils';

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
const getSchoolCode = async (): Promise<string> => {
  const code = await storage.getString(StorageKeys.SCHOOL_CODE);
  return code || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
};

const getBranchId = async (): Promise<string> => {
  const id = await storage.getString(StorageKeys.BRANCH_ID);
  return id || (await storage.getString(StorageKeys.BRANCH_ID)) || '';
};

const getAuthToken = async (): Promise<string> => {
  return (await storage.getSecure(StorageKeys.AUTH_TOKEN)) || '';
};

const todayISO = (): string => new Date().toISOString().split('T')[0];

const STEPS = [
  'Personal Info',
  'Academic Details',
  'Guardian Info',
  'Contact Info',
  'Upload Photo',
  'Review & Submit',
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
  academic_year: getDefaultAcademicYear(),
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
      <Check size={12} color={Theme.colors.success} />
    ) : (
      <View style={styles.passwordRuleDot} />
    )}
    <AppText style={[styles.passwordRuleText, valid && styles.passwordRuleTextValid]}>
      {children}
    </AppText>
  </View>
);

// Preview Field Component
const PreviewField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.previewField}>
    <AppText weight="semibold" style={styles.previewFieldLabel}>{label}</AppText>
    <AppText weight="regular" style={styles.previewFieldValue}>{value || '—'}</AppText>
  </View>
);

export default function StudentRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setTabBarVisible } = useAuth();
  const [loggedSchoolCode, setLoggedSchoolCode] = useState<string>('');
  const [defaultBranchId, setDefaultBranchId] = useState<string>('');
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string>('');
  const [serverSuccess, setServerSuccess] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, nationality: 'Indian' });
  const [showRollNumberModal, setShowRollNumberModal] = useState<boolean>(false);
  const [generatedRollNumber, setGeneratedRollNumber] = useState<string>('');
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const classPickerOptions = useMemo(
    () => toClassPickerOptions(classOptions),
    [classOptions],
  );
  const sectionPickerOptions = useMemo(
    () => toSectionPickerOptions(sectionOptions),
    [sectionOptions],
  );

  // NEW: Request count state
  const [requestCount, setRequestCount] = useState<number>(0);

  const isMounted = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  // NEW: Fetch request count function
  const fetchRequestCount = async () => {
    try {
      const sc = safeTrim(loggedSchoolCode);
      const bid = safeTrim(defaultBranchId);

      if (!sc || !bid) {return;}

      const res = await API.get('/staff/student-registration-requests', {
        headers: {
          'X-School-Code': sc,
          'X-Branch-Id': bid,
        },
      });

      if (isMounted.current) {
        setRequestCount(res.data?.count || res.data?.requests?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch student requests:', err);
    }
  };

  // Load credentials and fetch request count
  useEffect(() => {
    const load = async () => {
      try {
        const code = await getSchoolCode();
        const branch = await getBranchId();

        if (!isMounted.current) {return;}

        if (!code || !branch) {
          setServerError('Session expired. Please login again.');
          return;
        }
        setLoggedSchoolCode(code);
        setDefaultBranchId(branch);
        setForm(prev => ({ ...prev, branch_id: branch }));

        // Fetch request count after credentials are loaded
        await fetchRequestCount();
      } catch (err) {
        if (isMounted.current) {
          setServerError('Failed to load session info.');
        }
      }
    };
    load();
  }, []);

  // Re-fetch request count when schoolCode or branchId changes
  useEffect(() => {
    if (loggedSchoolCode && defaultBranchId) {
      fetchRequestCount();
    }
  }, [loggedSchoolCode, defaultBranchId]);

  useEffect(() => {
    isMounted.current = true;
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, []);
  const handleScroll = useScrollTabBar();


  // NEW: Show/hide password states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Date pickers
  const [showDOBPicker, setShowDOBPicker] = useState<boolean>(false);
  const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState<boolean>(false);

  // Camera/Image
  const [showImagePicker, setShowImagePicker] = useState<boolean>(false);

  // Load classes
  useEffect(() => {
    if (!form.branch_id || !loggedSchoolCode) {return;}

    const loadClasses = async () => {
      try {
        const res = await API.get('/manage/classes-sections', {
          params: {
            branch_id: form.branch_id,
            school_code: loggedSchoolCode,
          },
          headers: {
            'X-School-Code': loggedSchoolCode,
            'X-Branch-Id': form.branch_id,
          },
        });

        if (!isMounted.current) {return;}

        const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];
        const formattedItems: ClassOption[] = items.map((item: any) => ({
          class_name: String(item?.class_name || '').trim(),
          sections: Array.isArray(item?.sections) ? item.sections.filter(Boolean).map((s: any) => String(s).trim()) : [],
        }));
        setClassOptions(formattedItems);

        if (formattedItems.length > 0 && safeTrim(form.class_grade)) {
          const cur = formattedItems.find(c => c.class_name.toLowerCase() === safeTrim(form.class_grade).toLowerCase());
          setSectionOptions(cur && Array.isArray(cur.sections) ? cur.sections : []);
        } else {
          setSectionOptions([]);
        }
      } catch (err: any) {
        console.error('Load class/section failed:', err);
        if (!isMounted.current) {return;}

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

    if (fieldErrors[name] || (name === 'father_guardian_name' || name === 'mother_guardian_name')) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        if (name === 'father_guardian_name' || name === 'mother_guardian_name') {
          delete newErrors.father_guardian_name;
          delete newErrors.mother_guardian_name;
        }
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

  // NEW: Section input - capital letters only
  const handleSectionChange = (text: string) => {
    // Allow only capital letters (A-Z)
    const capitalOnly = text.replace(/[^A-Z]/g, '');
    handleChange('section', capitalOnly);
  };

  // Updated DOB change with validation
  const handleDOBChange = (date: Date) => {
    const dob = date.toISOString().split('T')[0];

    // Validate DOB is more than 1 year old
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
    launchCamera({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (response) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoFile(asset);
        setPhotoPreview(asset.uri || null);
        setFieldErrors(prev => {
          if (!prev.photo) { return prev; }
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      }
    });
  };

  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (response) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoFile(asset);
        setPhotoPreview(asset.uri || null);
        setFieldErrors(prev => {
          if (!prev.photo) { return prev; }
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      }
    });
  };

  const validateStep = (): Record<string, string> =>
    validateStudentRegistrationStep(step, form, {
      hasPhoto: Boolean(photoFile),
      includePassword: true,
      requireRollNumber: false,
    });

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

  const copyRegistrationLink = async () => {
    const origin = Platform.OS === 'ios' ? 'attendx://' : 'attendx://';
    const sc = safeTrim(loggedSchoolCode);
    const bid = safeTrim(defaultBranchId);
    if (!sc || !bid) {
      Alert.alert('Error', 'School code / Branch ID missing');
      return;
    }
    const link = `${origin}student-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}`;
    Alert.alert('Registration Link', link, [
      { text: 'Copy', onPress: () => Alert.alert('Copied', 'Link copied to clipboard') },
      { text: 'OK' },
    ]);
  };

  // NEW: Navigate to requests page
  const handleViewRequests = () => {
    navigation.navigate('StudentRegistrationRequests' as never);
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
      const formData = buildStudentRegistrationFormData(form as Record<string, unknown>, {
        schoolCode: code,
        branchId: branch,
        photoFile,
      });

      const data = await submitStudentRegistration(code, branch, formData);

      if (!isMounted.current) {return;}

      // If backend returns an assigned roll number (some deployments may auto-create), show modal.
      if (data?.roll_number) {
        const assignedRollNumber = data.roll_number || form.roll_number || '—';
        setGeneratedRollNumber(assignedRollNumber);
        setShowRollNumberModal(true);

        setTimeout(() => {
          if (!isMounted.current) {return;}
          setStep(0);
          setShowRollNumberModal(false);
          setPhotoFile(null);
          setPhotoPreview(null);
          setForm({
            ...INITIAL_FORM,
            nationality: 'Indian',
            branch_id: branch,
          });
          fetchRequestCount();
        }, 3000);
      } else {
        // Otherwise assume a registration request was created and inform the user.
        setServerSuccess('Registration request submitted and will be reviewed by school admins.');
        // Reset visible state and form after short delay
        setTimeout(() => {
          if (!isMounted.current) {return;}
          setStep(0);
          setPhotoFile(null);
          setPhotoPreview(null);
          setForm({
            ...INITIAL_FORM,
            nationality: 'Indian',
            branch_id: branch,
          });
          fetchRequestCount();
        }, 2000);
      }
    } catch (err: any) {
      if (!isMounted.current) {return;}

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
          setServerError(formatErrorMessage(data?.detail) || err.message || 'Could not register student. Please try again.');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;

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
            <TouchableOpacity accessibilityRole="button" key={label} style={styles.stepItem} onPress={() => setStep(i)}>
              <View style={[styles.stepCircle, step > i && styles.stepCompleted, step === i && styles.stepActive]}>
                {step > i ? <Check size={14} color={Theme.colors.card} /> : <AppText weight="bold" style={[styles.stepNumber, step === i && styles.stepNumberActive]}>{i + 1}</AppText>}
              </View>
              <AppText weight={step === i ? 'bold' : 'regular'} style={[styles.stepLabel, step === i && styles.stepLabelActive, step > i && styles.stepLabelCompleted]}>
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
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <User size={18} color={Theme.colors.primary} />
                <AppText weight="bold" style={styles.sectionTitle}>Personal Details</AppText>
              </View>

              <RegistrationFormField label="First Name" step={step} fieldKey="first_name" error={fieldErrors.first_name}>
                <TextInput
                  style={[styles.input, fieldErrors.first_name && styles.inputError]}
                  placeholder="Enter first name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.first_name}
                  onChangeText={(text) => handleChange('first_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Last Name" step={step} fieldKey="last_name" error={fieldErrors.last_name}>
                <TextInput
                  style={[styles.input, fieldErrors.last_name && styles.inputError]}
                  placeholder="Enter last name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.last_name}
                  onChangeText={(text) => handleChange('last_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Gender" step={step} fieldKey="gender" error={fieldErrors.gender}>
                <View style={styles.genderContainer}>
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={option.value}
                      style={[styles.genderBtn, form.gender === option.value && styles.genderBtnActive]}
                      onPress={() => handleChange('gender', option.value)}
                    >
                      <AppText weight="semibold" style={[styles.genderText, form.gender === option.value && styles.genderTextActive]}>
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </RegistrationFormField>

              <RegistrationFormField label="Blood Group" step={step} required={false} error={fieldErrors.blood_group}>
                <BloodGroupPicker
                  value={form.blood_group}
                  onChange={(value) => handleChange('blood_group', value)}
                  error={Boolean(fieldErrors.blood_group)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Date of Birth" step={step} fieldKey="date_of_birth" error={fieldErrors.date_of_birth}>
                <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowDOBPicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} />
                  <AppText style={styles.dateText}>{form.date_of_birth || 'Select date'}</AppText>
                </TouchableOpacity>
                {showDOBPicker && (
                  <DateTimePicker
                    value={form.date_of_birth ? new Date(form.date_of_birth) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) {handleDOBChange(date);}
                      setShowDOBPicker(false);
                    }}
                  />
                )}
              </RegistrationFormField>

              <RegistrationFormField label="Age (Auto-calculated)" step={step} required={false}>
                <TextInput style={[styles.input, styles.disabledInput]} value={form.age} editable={false} />
              </RegistrationFormField>

              <RegistrationFormField label="Nationality" step={step} fieldKey="nationality" error={fieldErrors.nationality}>
                <TextInput
                  style={[styles.input, fieldErrors.nationality && styles.inputError]}
                  placeholder="Nationality"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.nationality}
                  onChangeText={(text) => handleChange('nationality', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother Tongue" step={step} required={false} error={fieldErrors.mother_tongue}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_tongue && styles.inputError]}
                  placeholder="e.g. Telugu"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mother_tongue}
                  onChangeText={(text) => handleChange('mother_tongue', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Religion" step={step} required={false} error={fieldErrors.religion}>
                <TextInput
                  style={[styles.input, fieldErrors.religion && styles.inputError]}
                  placeholder="e.g. Hindu"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.religion}
                  onChangeText={(text) => handleChange('religion', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Caste Category" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. OBC"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.caste_category}
                  onChangeText={(text) => handleChange('caste_category', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Aadhaar Number" step={step} required={false} error={fieldErrors.aadhaar_number}>
                <TextInput
                  style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
                  placeholder="12-digit Aadhaar"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={12}
                  value={form.aadhaar_number}
                  onChangeText={(text) => handleChange('aadhaar_number', text)}
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 1: Academics */}
          {step === 1 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color={Theme.colors.primary} />
                <AppText weight="bold" style={styles.sectionTitle}>Academic Details</AppText>
              </View>

              <RegistrationFormField label="Class" step={step} fieldKey="class_grade" error={fieldErrors.class_grade}>
                <FormSelectPicker
                  value={form.class_grade}
                  onChange={handleClassChange}
                  options={classPickerOptions}
                  title="Select Class"
                  placeholder={classPickerOptions.length ? 'Select class' : 'No classes available'}
                  error={Boolean(fieldErrors.class_grade)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Section" step={step} fieldKey="section" error={fieldErrors.section}>
                {form.class_grade && sectionPickerOptions.length > 0 ? (
                  <FormSelectPicker
                    value={form.section}
                    onChange={(value) => handleChange('section', value)}
                    options={sectionPickerOptions}
                    title="Select Section"
                    placeholder="Select section"
                    error={Boolean(fieldErrors.section)}
                  />
                ) : (
                  <TextInput
                    style={[styles.input, styles.sectionInput, fieldErrors.section && styles.inputError]}
                    placeholder={form.class_grade ? 'Enter section (A, B, C...)' : 'Select class first'}
                    placeholderTextColor={Theme.colors.textMuted}
                    value={form.section}
                    onChangeText={handleSectionChange}
                    autoCapitalize="characters"
                    maxLength={3}
                    editable={Boolean(form.class_grade)}
                  />
                )}
              </RegistrationFormField>

              <RegistrationFormField label="Admission Number" step={step} fieldKey="admission_number" error={fieldErrors.admission_number}>
                <TextInput
                  style={[styles.input, fieldErrors.admission_number && styles.inputError]}
                  placeholder="e.g. ADM2024001"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.admission_number}
                  onChangeText={(text) => handleChange('admission_number', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Roll Number" step={step} required={false} error={fieldErrors.roll_number}>
                <TextInput
                  style={[styles.input, fieldErrors.roll_number && styles.inputError]}
                  placeholder="Leave blank to auto-assign"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.roll_number}
                  onChangeText={(text) => handleChange('roll_number', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Academic Year" step={step} fieldKey="academic_year" error={fieldErrors.academic_year}>
                <FormSelectPicker
                  value={form.academic_year}
                  onChange={(value) => handleChange('academic_year', value)}
                  options={academicYearOptions}
                  title="Select Academic Year"
                  placeholder="YYYY-YY (e.g. 2024-25)"
                  error={Boolean(fieldErrors.academic_year)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Medium of Instruction" step={step} required={false}>
                <FormSelectPicker
                  value={form.medium_of_instruction}
                  onChange={(value) => handleChange('medium_of_instruction', value)}
                  options={[...MEDIUM_OF_INSTRUCTION_OPTIONS]}
                  title="Select Medium"
                  placeholder="Default: ENGLISH"
                />
              </RegistrationFormField>

              <RegistrationFormField label="Date of Admission" step={step} required={false}>
                <TouchableOpacity accessibilityRole="button" style={styles.dateBtn} onPress={() => setShowAdmissionDatePicker(true)}>
                  <Calendar size={18} color={Theme.colors.textSec} />
                  <AppText style={styles.dateText}>{form.date_of_admission || 'Select date'}</AppText>
                </TouchableOpacity>
                {showAdmissionDatePicker && (
                  <DateTimePicker
                    value={form.date_of_admission ? new Date(form.date_of_admission) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      if (date) {handleChange('date_of_admission', date.toISOString().split('T')[0]);}
                      setShowAdmissionDatePicker(false);
                    }}
                  />
                )}
              </RegistrationFormField>

              <RegistrationFormField label="Previous School Name" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter previous school name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.previous_school_name}
                  onChangeText={(text) => handleChange('previous_school_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Transfer Certificate (TC) Number" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="TC Number"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.transfer_certificate_number}
                  onChangeText={(text) => handleChange('transfer_certificate_number', text)}
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 2: Parent / Guardian Info */}
          {step === 2 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <Users size={18} color={Theme.colors.primary} />
                <AppText weight="bold" style={styles.sectionTitle}>Parent / Guardian Details</AppText>
              </View>

              <RegistrationFormField label="Father / Guardian Name" step={step} fieldKey="father_guardian_name" error={fieldErrors.father_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.father_guardian_name}
                  onChangeText={(text) => handleChange('father_guardian_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Father Mobile" step={step} fieldKey="father_guardian_mobile" error={fieldErrors.father_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.father_guardian_mobile}
                  onChangeText={(text) => handleChange('father_guardian_mobile', text.replace(/\D/g, '').slice(0, 10))}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Father Occupation" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Occupation"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.father_guardian_occupation}
                  onChangeText={(text) => handleChange('father_guardian_occupation', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother / Guardian Name" step={step} fieldKey="mother_guardian_name" error={fieldErrors.mother_guardian_name}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_name && styles.inputError]}
                  placeholder="Full name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mother_guardian_name}
                  onChangeText={(text) => handleChange('mother_guardian_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother Mobile" step={step} required={false} error={fieldErrors.mother_guardian_mobile}>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_mobile && styles.inputError]}
                  placeholder="10-digit mobile"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mother_guardian_mobile}
                  onChangeText={(text) => handleChange('mother_guardian_mobile', text.replace(/\D/g, '').slice(0, 10))}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mother Occupation" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Occupation"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mother_guardian_occupation}
                  onChangeText={(text) => handleChange('mother_guardian_occupation', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Parent / Guardian Email" step={step} fieldKey="parent_guardian_email" error={fieldErrors.parent_guardian_email}>
                <TextInput
                  style={[styles.input, fieldErrors.parent_guardian_email && styles.inputError]}
                  placeholder="email@example.com"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.parent_guardian_email}
                  onChangeText={(text) => handleChange('parent_guardian_email', text)}
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 3: Contact & Address */}
          {step === 3 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color={Theme.colors.primary} />
                <AppText weight="bold" style={styles.sectionTitle}>Current Address</AppText>
              </View>

              <RegistrationFormField label="House No." step={step} fieldKey="house_no" error={fieldErrors.house_no}>
                <TextInput
                  style={[styles.input, fieldErrors.house_no && styles.inputError]}
                  placeholder="e.g. 12-3A"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.house_no}
                  onChangeText={(text) => handleChange('house_no', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Street / Locality" step={step} fieldKey="street_locality" error={fieldErrors.street_locality}>
                <TextInput
                  style={[styles.input, fieldErrors.street_locality && styles.inputError]}
                  placeholder="Street or locality"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.street_locality}
                  onChangeText={(text) => handleChange('street_locality', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Village / Town / City" step={step} fieldKey="village_town_city" error={fieldErrors.village_town_city}>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  placeholder="City or village"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.village_town_city}
                  onChangeText={(text) => handleChange('village_town_city', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mandal / Taluk" step={step} fieldKey="mandal_taluk" error={fieldErrors.mandal_taluk}>
                <TextInput
                  style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
                  placeholder="Mandal or Taluk"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.mandal_taluk}
                  onChangeText={(text) => handleChange('mandal_taluk', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="District" step={step} fieldKey="district" error={fieldErrors.district}>
                <TextInput
                  style={[styles.input, fieldErrors.district && styles.inputError]}
                  placeholder="District"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.district}
                  onChangeText={(text) => handleChange('district', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="State" step={step} fieldKey="state" error={fieldErrors.state}>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  placeholder="State"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.state}
                  onChangeText={(text) => handleChange('state', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="PIN Code" step={step} fieldKey="pin_code" error={fieldErrors.pin_code}>
                <TextInput
                  style={[styles.input, fieldErrors.pin_code && styles.inputError]}
                  placeholder="6-digit PIN"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={form.pin_code}
                  onChangeText={(text) => handleChange('pin_code', text.replace(/\D/g, '').slice(0, 6))}
                />
              </RegistrationFormField>

              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <Heart size={18} color={Theme.colors.primary} />
                <AppText weight="bold" style={styles.sectionTitle}>Health, Emergency & Transport</AppText>
              </View>

              <RegistrationFormField label="Allergies Details" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Any allergies"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.allergies_details}
                  onChangeText={(text) => handleChange('allergies_details', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Medical Conditions" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Any medical conditions"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.medical_conditions}
                  onChangeText={(text) => handleChange('medical_conditions', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Emergency Contact Name" step={step} fieldKey="emergency_contact_name" error={fieldErrors.emergency_contact_name}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  placeholder="Contact person name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.emergency_contact_name}
                  onChangeText={(text) => handleChange('emergency_contact_name', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Emergency Contact Number" step={step} fieldKey="emergency_contact_number" error={fieldErrors.emergency_contact_number}>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
                  placeholder="10-digit number"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.emergency_contact_number}
                  onChangeText={(text) => handleChange('emergency_contact_number', text.replace(/\D/g, '').slice(0, 10))}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Nearest Hospital / Doctor" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Hospital or doctor name"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.nearest_hospital_doctor}
                  onChangeText={(text) => handleChange('nearest_hospital_doctor', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Mode of Transport" step={step} required={false} error={fieldErrors.mode_of_transport}>
                <FormSelectPicker
                  value={form.mode_of_transport}
                  onChange={(value) => handleChange('mode_of_transport', value)}
                  options={[...MODE_OF_TRANSPORT_OPTIONS]}
                  title="Select Mode of Transport"
                  placeholder="Select transport mode"
                  error={Boolean(fieldErrors.mode_of_transport)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Bus Route / Vehicle Number" step={step} required={false}>
                <TextInput
                  style={styles.input}
                  placeholder="Bus route or vehicle no."
                  placeholderTextColor={Theme.colors.textMuted}
                  value={form.bus_route_vehicle_number}
                  onChangeText={(text) => handleChange('bus_route_vehicle_number', text)}
                />
              </RegistrationFormField>

              <RegistrationFormField label="Hostel / Day Scholar" step={step} required={false}>
                <FormSelectPicker
                  value={form.hostel_day_scholar}
                  onChange={(value) => handleChange('hostel_day_scholar', value)}
                  options={[...HOSTEL_DAY_SCHOLAR_OPTIONS]}
                  title="Hostel / Day Scholar"
                  placeholder="Select option"
                />
              </RegistrationFormField>
            </View>
          )}

          {/* Step 4: Photo & Password */}
          {step === 4 && (
            <View>
              <StepRequiredLegend />
              <View style={styles.sectionHeader}>
                <Camera size={18} color={Theme.colors.primary} />
                <RequiredSectionTitle title="Student Photograph" required />
              </View>

              {fieldErrors.photo && <AppText style={styles.fieldError}>{fieldErrors.photo}</AppText>}

              <TouchableOpacity accessibilityRole="button" style={styles.photoZone} onPress={handleImagePick}>
                {photoPreview ? (
                  <Image source={{ uri: photoPreview }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={48} color="#CBD5E1" />
                    <AppText weight="semibold" style={styles.photoText}>Tap to add photo</AppText>
                    <AppText style={styles.photoSubtext}>Camera or Gallery</AppText>
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.sectionHeader, { marginTop: Theme.spacing.lg }]}>
                <Check size={18} color={Theme.colors.primary} />
                <AppText weight="bold" style={styles.sectionTitle}>Login Credentials</AppText>
              </View>

              {/* Password Field with Show/Hide */}
              <RegistrationFormField label="Password" step={4} fieldKey="password" error={fieldErrors.password}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, fieldErrors.password && styles.inputError, styles.passwordInput]}
                    placeholder="Enter password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={(text) => handleChange('password', text)}
                  />
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} color={Theme.colors.textSec} /> : <Eye size={20} color={Theme.colors.textSec} />}
                  </TouchableOpacity>
                </View>
                {form.password && <PasswordStrength password={form.password} />}
              </RegistrationFormField>

              {/* Confirm Password Field with Show/Hide */}
              <RegistrationFormField label="Retype Password" step={4} fieldKey="confirm_password" error={fieldErrors.confirm_password}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, fieldErrors.confirm_password && styles.inputError, styles.passwordInput]}
                    placeholder="Retype password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    value={form.confirm_password}
                    onChangeText={(text) => handleChange('confirm_password', text)}
                  />
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} color={Theme.colors.textSec} /> : <Eye size={20} color={Theme.colors.textSec} />}
                  </TouchableOpacity>
                </View>
              </RegistrationFormField>
            </View>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <View>
              <StepRequiredLegend />
              {/* Preview Header */}
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

              {/* Personal Details */}
              <View style={styles.previewCard}>
                <View style={styles.previewCardHeader}>
                  <AppText weight="bold" style={styles.previewCardTitle}>Personal Details</AppText>
                </View>
                <View style={styles.previewGrid}>
                  <PreviewField label="First Name" value={form.first_name} />
                  <PreviewField label="Last Name" value={form.last_name} />
                  <PreviewField label="Gender" value={formatGenderLabel(form.gender)} />
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

              {/* Academic Details */}
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
                  <PreviewField label="Medium" value={formatOptionLabel(form.medium_of_instruction, MEDIUM_OF_INSTRUCTION_OPTIONS)} />
                  <PreviewField label="Date of Admission" value={form.date_of_admission} />
                  <PreviewField label="Previous School" value={form.previous_school_name} />
                  <PreviewField label="TC Number" value={form.transfer_certificate_number} />
                </View>
              </View>

              {/* Parent Details */}
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

              {/* Address */}
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

              {/* Health & Transport */}
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
                  <PreviewField label="Mode of Transport" value={formatOptionLabel(form.mode_of_transport, MODE_OF_TRANSPORT_OPTIONS)} />
                  <PreviewField label="Bus Route" value={form.bus_route_vehicle_number} />
                  <PreviewField label="Hostel/Day Scholar" value={formatOptionLabel(form.hostel_day_scholar, HOSTEL_DAY_SCHOLAR_OPTIONS)} />
                </View>
              </View>

              <View style={styles.previewFooter}>
                <AppText weight="semibold" style={styles.previewFooterText}>
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
              type="primary"
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
          <AppText style={styles.footerText}>School: {loggedSchoolCode || '—'}</AppText>
          <AppText style={styles.footerText}>Branch: {defaultBranchId || '—'}</AppText>
        </View>
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
              <AppText weight="semibold" style={styles.rollNumberLabel}>Assigned Roll Number</AppText>
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
    backgroundColor: Theme.colors.background,
  },
  headerStandard: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 30,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  heroTitle: {
    color: Theme.colors.card,
    ...Theme.typography.h3,
  },
  heroContent: {
    marginTop: Theme.spacing.lg,
  },
  heroGreeting: {
    color: Theme.colors.card,
    ...Theme.typography.h1,
    letterSpacing: -0.5,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.7)',
    ...Theme.typography.body,
    marginTop: Theme.spacing.xs,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: Theme.spacing.md,
    borderRadius: 10,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.md,
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
    marginHorizontal: Theme.spacing.md,
    borderRadius: 10,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.md,
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
        marginBottom: 20,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: Theme.colors.card,
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
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: Theme.colors.success,
  },
  stepActive: {
    backgroundColor: Theme.colors.primary,
  },
  stepNumber: {
    color: Theme.colors.textSec,
    ...Theme.typography.label,
  },
  stepNumberActive: {
    color: Theme.colors.card,
  },
  stepLabel: {
    fontSize: 9,
    color: Theme.colors.textSec,
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: Theme.colors.primary,
  },
  stepLabelCompleted: {
    color: Theme.colors.success,
  },
  formCard: {
    padding: Theme.spacing.lg,
    marginBottom: 20,
    marginHorizontal: Theme.spacing.md,
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
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.background,
  },
  sectionTitle: {
    fontSize: 16,
    color: Theme.colors.primary,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  requiredStar: {
    color: '#EF4444',
  },
  fieldHint: {
    fontSize: 12,
    color: Theme.colors.textSec,
    marginBottom: Theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  disabledInput: {
    backgroundColor: Theme.colors.background,
    color: Theme.colors.textMuted,
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
    borderColor: Theme.colors.border,
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  genderBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  genderText: {
    color: Theme.colors.textSec,
    ...Theme.typography.body,
  },
  genderTextActive: {
    color: Theme.colors.card,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Theme.colors.background,
  },
  dateText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  fieldError: {
    ...Theme.typography.label,
    color: '#EF4444',
    marginTop: Theme.spacing.xs,
  },
  // NEW: Request Badge styles
  requestBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xs,
  },
  requestBadgeText: {
    color: Theme.colors.card,
    fontSize: 9,
    fontWeight: '800',
  },
  passwordStrength: {
    marginTop: 10,
    padding: 12,
    backgroundColor: Theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.xs,
  },
  passwordRuleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  passwordRuleText: {
    ...Theme.typography.label,
    color: Theme.colors.textSec,
  },
  passwordRuleTextValid: {
    color: Theme.colors.success,
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
    padding: Theme.spacing.sm,
  },
  photoZone: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
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
    ...Theme.typography.bodyMd,
    color: Theme.colors.primary,
    marginTop: 12,
  },
  photoSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
    backgroundColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPhotoText: {
    fontSize: 10,
    color: Theme.colors.textSec,
  },
  previewName: {
    fontSize: 18,
    color: Theme.colors.primary,
  },
  previewMeta: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
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
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Theme.colors.card,
  },
  previewCardHeader: {
    padding: 12,
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  previewCardTitle: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
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
    borderBottomColor: Theme.colors.background,
  },
  previewFieldLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.xs,
  },
  previewFieldValue: {
    fontSize: 13,
    color: Theme.colors.text,
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
    ...Theme.typography.caption,
    color: '#166534',
    textAlign: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.lg,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    height: 50,
    backgroundColor: Theme.colors.primary,
  },
  footer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    marginHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
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
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    color: Theme.colors.primary,
    marginBottom: 12,
  },
  modalMessage: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  rollNumberDisplay: {
    backgroundColor: '#F0F9FF',
    padding: Theme.spacing.lg,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rollNumberLabel: {
    ...Theme.typography.caption,
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
    ...Theme.typography.caption,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
});
