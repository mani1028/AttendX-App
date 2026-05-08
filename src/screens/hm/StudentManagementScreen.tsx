import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera, type CameraOptions, type ImageLibraryOptions } from 'react-native-image-picker';
import {
  ChevronLeft,
  X,
  Plus,
  Calendar,
  RefreshCw,
  Users,
  Check,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Home,
  GitBranch,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  BookOpen,
  Heart,
  Camera,
} from 'lucide-react-native';
import * as RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import API, { buildApiUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { HM_THEME as C } from '../../constants/hmTheme';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';
import AppButton from '../../components/common/AppButton';


interface ClassItem {
  class_grade: string;
  section: string;
  label: string;
  students_total: number;
  present: number;
}

interface Student {
  student_id: string;
  student_full_name: string;
  roll_number: string;
  admission_number: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  parent_name?: string;
  emergency_contact?: string;
}

interface SelectedClass {
  class_grade: string;
  section: string;
  label: string;
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
  date_of_admission: new Date().toISOString().split('T')[0],
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

const PALETTE = [
  { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' },
  { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
  { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
  { bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' },
  { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  { bg: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' },
];

const readLS = async (...keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

const avColor = (i: number) => PALETTE[i % PALETTE.length];

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

const isValidDateOfBirth = (dobString: string): { valid: boolean; error: string | null } => {
  if (!dobString) return { valid: true, error: null };
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return { valid: false, error: "Invalid date format" };
  const year = dob.getFullYear();
  if (year < 1000 || year > new Date().getFullYear()) {
    return { valid: false, error: `Invalid year ${year}.` };
  }
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  if (dob > oneYearAgo) return { valid: false, error: "Date of Birth must be more than 1 year old" };
  return { valid: true, error: null };
};

const initials = (name: string = ''): string => {
  const text = String(name || '').trim();
  if (!text) return 'ST';
  const parts = text.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
};

interface AddClassModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: { class_name: string; sections: string[] }) => Promise<void>;
  existingClasses: ClassItem[];
}

function AddClassModal({ visible, onClose, onSave, existingClasses }: AddClassModalProps) {
  const [className, setClassName] = useState('');
  const [sections, setSections] = useState<string[]>(['A']);
  const [sectionInput, setSectionInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!className.trim()) e.className = 'Class name is required.';
    if (sections.length === 0) e.sections = 'Add at least one section.';

    const duplicates = sections.filter((sec) =>
      existingClasses.some(
        (c) =>
          String(c.class_grade || '').trim() === className.trim() &&
          String(c.section || '').trim().toUpperCase() === sec
      )
    );

    if (duplicates.length > 0) {
      e.sections = `Class ${className} Section ${duplicates.join(', ')} already exists.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSection = () => {
    const v = sectionInput.trim().toUpperCase();
    if (!v) return;
    if (sections.includes(v)) {
      setErrors((p) => ({ ...p, sectionInput: 'Section already added.' }));
      return;
    }
    setSections((p) => [...p, v]);
    setSectionInput('');
    setErrors((p) => {
      const newErrors = { ...p };
      delete newErrors.sections;
      delete newErrors.sectionInput;
      return newErrors;
    });
  };

  const removeSection = (s: string) => setSections((p) => p.filter((x) => x !== s));

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        class_name: className.trim(),
        sections: sections.map((s) => s.toLowerCase()),
      });
      onClose();
    } catch (err: any) {
      setErrors({
        api: err?.response?.data?.detail || 'Failed to add class. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <AppText style={styles.modalTitle} weight="bold">Add New Class</AppText>
              <AppText style={styles.modalSubtitle}>Enter class details and configure sections</AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {errors.api && (
              <View style={styles.errorBanner}>
                <AlertTriangle size={16} color={C.danger} />
                <AppText style={styles.errorBannerText} weight="semiBold">{errors.api}</AppText>
              </View>
            )}

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">
                Class Name <AppText style={styles.requiredStar} weight="bold">*</AppText>
              </AppText>
              <TextInput
                style={styles.input}
                value={className}
                onChangeText={(text) => {
                  setClassName(text);
                  setErrors((p) => {
                    const newErrors = { ...p };
                    delete newErrors.className;
                    return newErrors;
                  });
                }}
                placeholder="e.g. Grade 10, Class VI, Standard 2"
                placeholderTextColor={colors.textMuted}
              />
              {errors.className && <AppText style={styles.errorText}>{errors.className}</AppText>}
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">
                Sections <AppText style={styles.requiredStar} weight="bold">*</AppText>
              </AppText>

              <View style={styles.sectionsRow}>
                <TextInput
                  style={[styles.input, styles.flexOne]}
                  value={sectionInput}
                  onChangeText={(text) => {
                    setSectionInput(text.toUpperCase());
                    setErrors((p) => {
                      const newErrors = { ...p };
                      delete newErrors.sectionInput;
                      return newErrors;
                    });
                  }}
                  placeholder="e.g. A, B, C"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={addSection}
                />
                <TouchableOpacity style={styles.addSectionBtn} onPress={addSection}>
                  <Plus size={12} color={colors.textMuted} />
                  <AppText style={styles.addSectionBtnText} weight="semiBold">Add</AppText>
                </TouchableOpacity>
              </View>

              {errors.sectionInput && <AppText style={styles.errorText}>{errors.sectionInput}</AppText>}

              {sections.length > 0 && (
                <View style={styles.sectionsWrap}>
                  {sections.map((s) => (
                    <View key={s} style={styles.sectionPill}>
                      <AppText style={styles.sectionPillText} weight="semiBold">Section {s}</AppText>
                      <TouchableOpacity onPress={() => removeSection(s)}>
                        <X size={10} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {errors.sections && <AppText style={styles.errorText}>{errors.sections}</AppText>}

              <AppText style={styles.hintText}>
                Type a letter and click "Add" or press Enter. You can add multiple sections.
              </AppText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText} weight="semiBold">Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <AppText style={styles.saveBtnText} weight="semiBold">{saving ? 'Saving…' : 'Add Class'}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const Stepper = ({ currentStep }: { currentStep: number }) => (
  <View style={styles.stepperWrapper}>
    <View style={styles.stepperContainer}>
      {STEPS.map((label, idx) => {
        const stepNumber = idx + 1;
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;
        return (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                isDone && styles.stepDone,
                isActive && styles.stepActive
              ]}>
                {isDone ? (
                  <Check size={14} color="#fff" />
                ) : (
                  <AppText style={[styles.stepNumber, isActive && styles.stepNumberActive]} weight="bold">{stepNumber}</AppText>
                )}
              </View>
              <AppText style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} weight={isActive ? "bold" : "regular"} numberOfLines={1}>
                {label}
              </AppText>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  </View>
);

export default function StudentPage() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 520;
  const { userName, setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
  const [activeTab, setActiveTab] = useState<'list' | 'enroll'>('list');
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [cErr, setCErr] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sErr, setSErr] = useState('');
  const [sLoading, setSLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState<'dob' | 'doa'>('dob');
  const ITEMS_PER_PAGE = 10;

  const validateStep = (s: number) => {
    const errors: Record<string, string> = {};
    const f = formData;

    if (s === 0) {
      if (!isValidName(f.first_name)) errors.first_name = 'Valid first name required.';
      if (!isValidName(f.last_name)) errors.last_name = 'Valid last name required.';
      if (!f.gender) errors.gender = 'Gender is required.';
      if (!f.date_of_birth) errors.date_of_birth = 'Date of birth is required.';
      else {
        const { valid, error } = isValidDateOfBirth(f.date_of_birth);
        if (!valid) errors.date_of_birth = error || 'Invalid DOB.';
      }
      if (!isValidAadhaar(f.aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits.';
    } else if (s === 1) {
      if (!f.class_grade) errors.class_grade = 'Class is required.';
      if (!f.section) errors.section = 'Section is required.';
      if (!f.admission_number) errors.admission_number = 'Admission number is required.';
      if (!f.roll_number) errors.roll_number = 'Roll number is required.';
      if (!f.academic_year) errors.academic_year = 'Academic year is required.';
      else if (!/^\d{4}-\d{2}$/.test(f.academic_year)) errors.academic_year = 'Format: YYYY-YY (e.g. 2023-24).';
    } else if (s === 2) {
      if (!isValidName(f.father_guardian_name) && !isValidName(f.mother_guardian_name)) {
        errors.father_guardian_name = 'At least one guardian name is required.';
      }
      if (f.father_guardian_mobile && !isValidMobile(f.father_guardian_mobile)) errors.father_guardian_mobile = 'Invalid mobile.';
      if (f.mother_guardian_mobile && !isValidMobile(f.mother_guardian_mobile)) errors.mother_guardian_mobile = 'Invalid mobile.';
      if (f.parent_guardian_email && !isValidEmail(f.parent_guardian_email)) errors.parent_guardian_email = 'Invalid email.';
    } else if (s === 3) {
      if (!f.village_town_city) errors.village_town_city = 'City/Village is required.';
      if (!f.state) errors.state = 'State is required.';
      if (f.pin_code && !isValidPin(f.pin_code)) errors.pin_code = 'Invalid PIN code.';
      if (!f.emergency_contact_number) errors.emergency_contact_number = 'Emergency contact is required.';
      else if (!isValidMobile(f.emergency_contact_number)) errors.emergency_contact_number = 'Invalid mobile.';
    } else if (s === 4) {
      if (!selectedPhoto) errors.photo = 'Student photo is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
      setServerError('');
    }
  };

  const prevStep = () => {
    setStep(s => s - 1);
    setServerError('');
  };

  const handlePickImage = (type: 'camera' | 'library') => {
    const options: CameraOptions & ImageLibraryOptions = {
      mediaType: 'photo' as const,
      includeBase64: true,
      quality: 0.7 as const,
      maxWidth: 800,
      maxHeight: 800,
    };

    const callback = (res: any) => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to capture image');
        return;
      }
      if (res.assets && res.assets[0]) {
        setSelectedPhoto(res.assets[0]);
        setFieldErrors(p => {
          const n = { ...p };
          delete n.photo;
          return n;
        });
      }
    };

    if (type === 'camera') launchCamera(options, callback);
    else launchImageLibrary(options, callback);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    setServerError('');
    setServerSuccess('');

    try {
      const payload = {
        ...formData,
        student_full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        branch_id: branchId,
        photo: selectedPhoto?.base64 || '',
      };

      const res = await API.post('/hm/students/register', payload, {
        headers: getHeaders(),
      });

      setServerSuccess('Student registered successfully!');
      setTimeout(() => {
        setServerSuccess('');
        setStep(0);
        setFormData({ ...INITIAL_FORM });
        setSelectedPhoto(null);
        setActiveTab('list');
        loadStudents(formData.class_grade, formData.section);
      }, 2000);

    } catch (err: any) {
      setServerError(err?.response?.data?.detail || 'Registration failed. Please check the form and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      if (dateType === 'dob') {
        setFormData(p => ({ ...p, date_of_birth: dateStr, age: calcAgeFromDOB(dateStr) }));
        setFieldErrors(p => {
          const n = { ...p };
          delete n.date_of_birth;
          return n;
        });
      } else {
        setFormData(p => ({ ...p, date_of_admission: dateStr }));
      }
    }
  };

  const renderEnrollmentTab = () => (
    <View style={styles.enrollmentContainer}>
      <Stepper currentStep={step} />

      <View style={styles.stepForm}>
        {step === 0 && (
          <View style={styles.formGrid}>
            <AppText style={styles.stepTitle} weight="bold">Personal Information</AppText>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">First Name <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.first_name && styles.inputError]}
                  value={formData.first_name}
                  onChangeText={v => setFormData(p => ({ ...p, first_name: v }))}
                  placeholder="Enter first name"
                />
                {fieldErrors.first_name && <AppText style={styles.errorText}>{fieldErrors.first_name}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Last Name <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.last_name && styles.inputError]}
                  value={formData.last_name}
                  onChangeText={v => setFormData(p => ({ ...p, last_name: v }))}
                  placeholder="Enter last name"
                />
                {fieldErrors.last_name && <AppText style={styles.errorText}>{fieldErrors.last_name}</AppText>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Gender <AppText style={styles.requiredStar}>*</AppText></AppText>
                <View style={[styles.pickerContainer, fieldErrors.gender && styles.inputError]}>
                  <Picker
                    selectedValue={formData.gender}
                    onValueChange={v => setFormData(p => ({ ...p, gender: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Gender" value="" />
                    <Picker.Item label="Male" value="MALE" />
                    <Picker.Item label="Female" value="FEMALE" />
                    <Picker.Item label="Other" value="OTHER" />
                  </Picker>
                </View>
                {fieldErrors.gender && <AppText style={styles.errorText}>{fieldErrors.gender}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Date of Birth <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput, fieldErrors.date_of_birth && styles.inputError]}
                  onPress={() => { setDateType('dob'); setShowDatePicker(true); }}
                >
                  <AppText style={formData.date_of_birth ? styles.inputText : styles.placeholderText}>
                    {formData.date_of_birth || 'YYYY-MM-DD'}
                  </AppText>
                  <Calendar size={18} color={C.t3} />
                </TouchableOpacity>
                {fieldErrors.date_of_birth && <AppText style={styles.errorText}>{fieldErrors.date_of_birth}</AppText>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Aadhaar Number</AppText>
                <TextInput
                  style={[styles.input, fieldErrors.aadhaar_number && styles.inputError]}
                  value={formData.aadhaar_number}
                  onChangeText={v => setFormData(p => ({ ...p, aadhaar_number: v }))}
                  placeholder="12 digit number"
                  keyboardType="number-pad"
                  maxLength={12}
                />
                {fieldErrors.aadhaar_number && <AppText style={styles.errorText}>{fieldErrors.aadhaar_number}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Blood Group</AppText>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.blood_group}
                    onValueChange={v => setFormData(p => ({ ...p, blood_group: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select" value="" />
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <Picker.Item key={bg} label={bg} value={bg} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Religion</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.religion}
                  onChangeText={v => setFormData(p => ({ ...p, religion: v }))}
                  placeholder="e.g. Hindu, Muslim, Christian"
                />
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Caste Category</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.caste_category}
                  onChangeText={v => setFormData(p => ({ ...p, caste_category: v }))}
                  placeholder="e.g. General, OBC, SC, ST"
                />
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.formGrid}>
            <AppText style={styles.stepTitle} weight="bold">Academic Details</AppText>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Class <AppText style={styles.requiredStar}>*</AppText></AppText>
                <View style={[styles.pickerContainer, fieldErrors.class_grade && styles.inputError]}>
                  <Picker
                    selectedValue={formData.class_grade}
                    onValueChange={v => setFormData(p => ({ ...p, class_grade: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Class" value="" />
                    {Array.from(new Set(classes.map(c => c.class_grade))).sort().map(cg => (
                      <Picker.Item key={cg} label={cg} value={cg} />
                    ))}
                  </Picker>
                </View>
                {fieldErrors.class_grade && <AppText style={styles.errorText}>{fieldErrors.class_grade}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Section <AppText style={styles.requiredStar}>*</AppText></AppText>
                <View style={[styles.pickerContainer, fieldErrors.section && styles.inputError]}>
                  <Picker
                    selectedValue={formData.section}
                    onValueChange={v => setFormData(p => ({ ...p, section: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Section" value="" />
                    {classes
                      .filter(c => c.class_grade === formData.class_grade)
                      .map(c => (
                        <Picker.Item key={c.section} label={c.section.toUpperCase()} value={c.section} />
                      ))}
                  </Picker>
                </View>
                {fieldErrors.section && <AppText style={styles.errorText}>{fieldErrors.section}</AppText>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Admission Number <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.admission_number && styles.inputError]}
                  value={formData.admission_number}
                  onChangeText={v => setFormData(p => ({ ...p, admission_number: v }))}
                  placeholder="Enter admission #"
                />
                {fieldErrors.admission_number && <AppText style={styles.errorText}>{fieldErrors.admission_number}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Roll Number <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.roll_number && styles.inputError]}
                  value={formData.roll_number}
                  onChangeText={v => setFormData(p => ({ ...p, roll_number: v }))}
                  placeholder="Enter roll #"
                />
                {fieldErrors.roll_number && <AppText style={styles.errorText}>{fieldErrors.roll_number}</AppText>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Academic Year <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.academic_year && styles.inputError]}
                  value={formData.academic_year}
                  onChangeText={v => setFormData(p => ({ ...p, academic_year: v }))}
                  placeholder="YYYY-YY (e.g. 2024-25)"
                />
                {fieldErrors.academic_year && <AppText style={styles.errorText}>{fieldErrors.academic_year}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Date of Admission</AppText>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput]}
                  onPress={() => { setDateType('doa'); setShowDatePicker(true); }}
                >
                  <AppText style={styles.inputText}>{formData.date_of_admission}</AppText>
                  <Calendar size={18} color={C.t3} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">Previous School Name</AppText>
              <TextInput
                style={styles.input}
                value={formData.previous_school_name}
                onChangeText={v => setFormData(p => ({ ...p, previous_school_name: v }))}
                placeholder="Name of last attended school"
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formGrid}>
            <AppText style={styles.stepTitle} weight="bold">Guardian Information</AppText>
            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">Father/Guardian Name</AppText>
              <TextInput
                style={[styles.input, fieldErrors.father_guardian_name && styles.inputError]}
                value={formData.father_guardian_name}
                onChangeText={v => setFormData(p => ({ ...p, father_guardian_name: v }))}
                placeholder="Full name"
              />
              {fieldErrors.father_guardian_name && <AppText style={styles.errorText}>{fieldErrors.father_guardian_name}</AppText>}
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Mobile Number</AppText>
                <TextInput
                  style={[styles.input, fieldErrors.father_guardian_mobile && styles.inputError]}
                  value={formData.father_guardian_mobile}
                  onChangeText={v => setFormData(p => ({ ...p, father_guardian_mobile: v }))}
                  placeholder="10 digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {fieldErrors.father_guardian_mobile && <AppText style={styles.errorText}>{fieldErrors.father_guardian_mobile}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Occupation</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.father_guardian_occupation}
                  onChangeText={v => setFormData(p => ({ ...p, father_guardian_occupation: v }))}
                  placeholder="e.g. Business, Service"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">Mother/Guardian Name</AppText>
              <TextInput
                style={styles.input}
                value={formData.mother_guardian_name}
                onChangeText={v => setFormData(p => ({ ...p, mother_guardian_name: v }))}
                placeholder="Full name"
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Mobile Number</AppText>
                <TextInput
                  style={[styles.input, fieldErrors.mother_guardian_mobile && styles.inputError]}
                  value={formData.mother_guardian_mobile}
                  onChangeText={v => setFormData(p => ({ ...p, mother_guardian_mobile: v }))}
                  placeholder="10 digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {fieldErrors.mother_guardian_mobile && <AppText style={styles.errorText}>{fieldErrors.mother_guardian_mobile}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Occupation</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.mother_guardian_occupation}
                  onChangeText={v => setFormData(p => ({ ...p, mother_guardian_occupation: v }))}
                  placeholder="e.g. Homemaker, Teacher"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">Guardian Email</AppText>
              <TextInput
                style={[styles.input, fieldErrors.parent_guardian_email && styles.inputError]}
                value={formData.parent_guardian_email}
                onChangeText={v => setFormData(p => ({ ...p, parent_guardian_email: v }))}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {fieldErrors.parent_guardian_email && <AppText style={styles.errorText}>{fieldErrors.parent_guardian_email}</AppText>}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.formGrid}>
            <AppText style={styles.stepTitle} weight="bold">Contact & Address</AppText>
            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semiBold">House/Flat No. & Street</AppText>
              <TextInput
                style={styles.input}
                value={formData.house_no}
                onChangeText={v => setFormData(p => ({ ...p, house_no: v }))}
                placeholder="Enter house no, building name..."
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Village/Town/City <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  value={formData.village_town_city}
                  onChangeText={v => setFormData(p => ({ ...p, village_town_city: v }))}
                  placeholder="City name"
                />
                {fieldErrors.village_town_city && <AppText style={styles.errorText}>{fieldErrors.village_town_city}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">District</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.district}
                  onChangeText={v => setFormData(p => ({ ...p, district: v }))}
                  placeholder="District name"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">State <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  value={formData.state}
                  onChangeText={v => setFormData(p => ({ ...p, state: v }))}
                  placeholder="State name"
                />
                {fieldErrors.state && <AppText style={styles.errorText}>{fieldErrors.state}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">PIN Code</AppText>
                <TextInput
                  style={[styles.input, fieldErrors.pin_code && styles.inputError]}
                  value={formData.pin_code}
                  onChangeText={v => setFormData(p => ({ ...p, pin_code: v }))}
                  placeholder="6 digits"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {fieldErrors.pin_code && <AppText style={styles.errorText}>{fieldErrors.pin_code}</AppText>}
              </View>
            </View>

            <View style={styles.divider} />

            <AppText style={styles.stepTitle} weight="bold">Emergency & Medical</AppText>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Emergency Contact Name <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  value={formData.emergency_contact_name}
                  onChangeText={v => setFormData(p => ({ ...p, emergency_contact_name: v }))}
                  placeholder="Contact person"
                />
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semiBold">Emergency Phone <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_number && styles.inputError]}
                  value={formData.emergency_contact_number}
                  onChangeText={v => setFormData(p => ({ ...p, emergency_contact_number: v }))}
                  placeholder="10 digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {fieldErrors.emergency_contact_number && <AppText style={styles.errorText}>{fieldErrors.emergency_contact_number}</AppText>}
              </View>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.photoUploadContainer}>
            <AppText style={styles.stepTitle} weight="bold">Student Photograph</AppText>
            <AppText style={styles.stepSubtitle}>Please upload a clear, front-facing passport size photograph of the student.</AppText>

            <View style={styles.photoFrame}>
              {selectedPhoto ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setSelectedPhoto(null)}>
                    <X size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={48} color={C.t4} />
                  <AppText style={styles.placeholderText}>No photo selected</AppText>
                </View>
              )}
            </View>

            {fieldErrors.photo && <AppText style={[styles.errorText, { textAlign: 'center' }]}>{fieldErrors.photo}</AppText>}

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickImage('camera')}>
                <Camera size={20} color={C.primary} />
                <AppText style={styles.photoActionText} weight="semiBold">Take Photo</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => handlePickImage('library')}>
                <Users size={20} color={C.primary} />
                <AppText style={styles.photoActionText} weight="semiBold">Choose Gallery</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.reviewContainer}>
            <AppText style={styles.stepTitle} weight="bold">Review & Submit</AppText>
            <AppText style={styles.stepSubtitle}>Double check all details before finalizing the enrollment.</AppText>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                {selectedPhoto ? (
                  <Image source={{ uri: selectedPhoto.uri }} style={styles.reviewAvatar} />
                ) : (
                  <View style={[styles.reviewAvatar, { backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
                    <User size={32} color={C.primary} />
                  </View>
                )}
                <View>
                  <AppText style={styles.reviewName} weight="bold">{formData.first_name} {formData.last_name}</AppText>
                  <AppText style={styles.reviewSub}>Class {formData.class_grade} - {formData.section?.toUpperCase()}</AppText>
                </View>
              </View>

              <View style={styles.reviewGrid}>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Admission No</AppText>
                  <AppText style={styles.reviewValue} weight="semiBold">{formData.admission_number}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Roll No</AppText>
                  <AppText style={styles.reviewValue} weight="semiBold">{formData.roll_number}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Aadhaar</AppText>
                  <AppText style={styles.reviewValue} weight="semiBold">{formData.aadhaar_number || '—'}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>DOB</AppText>
                  <AppText style={styles.reviewValue} weight="semiBold">{formData.date_of_birth}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Father's Name</AppText>
                  <AppText style={styles.reviewValue} weight="semiBold">{formData.father_guardian_name || '—'}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Emergency Phone</AppText>
                  <AppText style={styles.reviewValue} weight="semiBold">{formData.emergency_contact_number}</AppText>
                </View>
              </View>

              <View style={styles.reviewAddress}>
                <AppText style={styles.reviewLabel}>Residential Address</AppText>
                <AppText style={styles.reviewValue} weight="semiBold">
                  {[formData.house_no, formData.village_town_city, formData.district, formData.state, formData.pin_code].filter(Boolean).join(', ')}
                </AppText>
              </View>
            </View>

            {serverError ? (
              <View style={styles.serverErrorBox}>
                <AlertTriangle size={16} color={C.danger} />
                <AppText style={styles.serverErrorText}>{serverError}</AppText>
              </View>
            ) : null}

            {serverSuccess ? (
              <View style={styles.serverSuccessBox}>
                <CheckCircle2 size={16} color={C.success} />
                <AppText style={styles.serverSuccessText}>{serverSuccess}</AppText>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.stepActions}>
          {step > 0 && (
            <TouchableOpacity style={styles.stepBackBtn} onPress={prevStep} disabled={loading}>
              <AppText style={styles.stepBackText} weight="semiBold">Back</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.stepNextBtn, step === STEPS.length - 1 && styles.stepSubmitBtn]}
            onPress={step === STEPS.length - 1 ? handleSubmit : nextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <AppText style={styles.stepNextText} weight="bold">
                  {step === STEPS.length - 1 ? 'Complete Registration' : 'Continue'}
                </AppText>
                {step < STEPS.length - 1 && <ChevronRight size={18} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateType === 'dob' ? (formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(new Date().getFullYear() - 5, 0, 1)) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // Load credentials
  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    if (schoolCode && branchId) {
      loadClasses();
    }
  }, [schoolCode, branchId]);

  useEffect(() => {
    if (selected?.class_grade && selected?.section) {
      loadStudents(selected.class_grade, selected.section);
    }
    setCurrentPage(1);
  }, [selected?.class_grade, selected?.section, query]);

  const loadCredentials = async () => {
    const code = await readLS('school_code', 'schoolCode', 'school_id', 'schoolId');
    const branch = await readLS('branch_id', 'branchId', 'branch_code', 'branchCode');
    setSchoolCode(code);
    setBranchId(branch);
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  });

  const loadClasses = async () => {
    if (!schoolCode || !branchId) {
      setCErr('Missing credentials — please log in again.');
      return;
    }

    setCLoading(true);
    setCErr('');

    try {
      const res = await API.get('/hm/classes', { headers: getHeaders() });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setClasses(items);

      if (!selected && items.length) {
        const f = items[0];
        setSelected({
          class_grade: f.class_grade,
          section: String(f.section || '').trim(),
          label: f.label,
        });
      }
    } catch (err: any) {
      setCErr(err?.response?.data?.detail || 'Unable to load classes.');
    } finally {
      setCLoading(false);
    }
  };

  const loadStudents = async (classGrade: string, section: string) => {
    setSLoading(true);
    setSErr('');

    try {
      const res = await API.get('/hm/students', {
        headers: getHeaders(),
        params: {
          class_grade: classGrade,
          section: String(section || '').trim(),
        },
      });
      setStudents(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err: any) {
      setSErr(err?.response?.data?.detail || 'Unable to load students.');
    } finally {
      setSLoading(false);
    }
  };

  const handleAddClass = async (payload: { class_name: string; sections: string[] }) => {
    await API.post('/hm/classes', payload, { headers: getHeaders() });
    await loadClasses();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const refreshPromises = [loadClasses()];
    if (selected?.class_grade && selected?.section) {
      refreshPromises.push(loadStudents(selected.class_grade, selected.section));
    }
    await Promise.all(refreshPromises);
    setRefreshing(false);
  };

  const handleExport = async () => {
    if (!selected?.class_grade || !selected?.section) return;

    try {
      const params = new URLSearchParams({
        class_grade: selected.class_grade,
        section: selected.section,
      });

      const response = await fetch(`${buildApiUrl('/hm/students/export')}?${params.toString()}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Download failed');
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Export returned empty file');
      }

      // Convert blob to base64 for sharing
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const filename = `students_${String(selected.label).replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

        try {
          await RNFS.writeFile(filePath, base64Data.split(',')[1], 'base64');

          await RNShare.open({
            url: `file://${filePath}`,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            title: 'Export Students',
          });
        } catch (err: any) {
          if (err.message !== 'User did not share') {
            Alert.alert('Error', err.message || 'Failed to share file');
          }
        }
      };
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Download failed');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) =>
      String(s.student_full_name || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, query]);

  const summaryStats = useMemo(() => {
    const presentCount = students.filter(s => s.status === 'PRESENT').length;
    const absentCount = students.filter(s => s.status === 'ABSENT').length;
    return {
      total: students.length,
      present: presentCount,
      absent: absentCount,
      visible: filtered.length,
    };
  }, [students, filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const visibleStart = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: colors.successSoft, color: colors.success, icon: CheckCircle2 };
      case 'ABSENT':
        return { bg: colors.errorSoft, color: colors.error, icon: XCircle };
      default:
        return { bg: colors.warningSoft, color: colors.warning, icon: Clock };
    }
  };

  const renderStudentCard = (student: Student, index: number) => {
    const statusStyle = getStatusBadge(student.status);
    const StatusIcon = statusStyle.icon;
    const { color } = PALETTE[index % PALETTE.length];

    return (
      <View key={student.student_id || index} style={styles.studentCard}>
        <View style={styles.studentCardHeader}>
          <View style={styles.studentCellName}>
            <AvatarBubble
              displayName={student.student_full_name}
              size={36}
              textSize={13}
              primaryColor={color}
            />
            <View style={styles.studentIdentity}>
              <AppText style={styles.studentName} weight="semiBold" numberOfLines={1}>{student.student_full_name || '—'}</AppText>
              <AppText style={styles.studentIdText} numberOfLines={1}>ID: {student.student_id || '—'}</AppText>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: 'transparent' }]}>
            <StatusIcon size={10} color={statusStyle.color} />
            <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
              {student.status || 'UNKNOWN'}
            </AppText>
          </View>
        </View>

        <View style={styles.studentMetaGrid}>
          <View style={styles.studentMetaItem}>
            <AppText style={styles.studentMetaLabel}>Roll No</AppText>
            <AppText style={styles.studentMetaValue} numberOfLines={1}>{student.roll_number || '—'}</AppText>
          </View>
          <View style={styles.studentMetaItem}>
            <AppText style={styles.studentMetaLabel}>Admission No</AppText>
            <AppText style={styles.studentMetaValue} numberOfLines={1}>{student.admission_number || '—'}</AppText>
          </View>
        </View>

        <View style={styles.studentCardFooter}>
          <TouchableOpacity
            style={[styles.cardActionBtn, styles.cardActionSecondary]}
            onPress={() => (navigation as any).navigate('StudentAttendanceReport', { studentId: student.student_id, studentName: student.student_full_name })}
          >
            <Clock size={14} color={C.primary} />
            <AppText style={styles.cardActionSecondaryText} weight="semiBold">Attendance</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cardActionBtn, styles.cardActionPrimary]} onPress={() => setViewStudent(student)}>
            <User size={14} color="#fff" />
            <AppText style={styles.cardActionPrimaryText} weight="semiBold">View Profile</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStudentItem = (student: Student, index: number) => {
    const statusStyle = getStatusBadge(student.status);
    const StatusIcon = statusStyle.icon;
    const { color } = PALETTE[index % PALETTE.length];

    return (
      <View key={student.student_id || index} style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellStudent]}>
          <AvatarBubble
            displayName={student.student_full_name}
            size={32}
            textSize={11}
            primaryColor={color}
          />
          <View>
            <AppText style={styles.studentName} weight="semiBold">{student.student_full_name || '—'}</AppText>
            <AppText style={styles.studentIdText}>ID: {student.student_id || '—'}</AppText>
          </View>
        </View>
        <View style={[styles.tableCell, styles.cellRoll]}>
          <AppText style={styles.monoText}>{student.roll_number || '—'}</AppText>
        </View>
        <View style={[styles.tableCell, styles.cellAdmission]}>
          <AppText style={styles.monoText}>{student.admission_number || '—'}</AppText>
        </View>
        <View style={[styles.tableCell, styles.cellStatus]}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: 'transparent' }]}>
            <StatusIcon size={10} color={statusStyle.color} />
            <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
              {student.status || 'UNKNOWN'}
            </AppText>
          </View>
        </View>
        <View style={[styles.tableCell, styles.cellActions]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setViewStudent(student)}>
            <User size={16} color={C.t3} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Standardized Header */}
      <View style={[styles.headerStandard, { paddingTop: insets.top + 10 }] }>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            try {
              if (navigation.canGoBack?.()) {
                navigation.goBack();
              } else {
                navigation.navigate('HMDashboard' as never);
              }
            } catch (err) {
              // Fallback to dashboard if navigation fails
              navigation.navigate('HMDashboard' as never);
            }
          }}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Student Management</AppText>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'list' && styles.tabBtnActive]}
          onPress={() => setActiveTab('list')}
        >
          <Users size={18} color={activeTab === 'list' ? C.primary : C.t3} />
          <AppText style={[styles.tabBtnText, activeTab === 'list' && styles.tabBtnTextActive]} weight="semiBold">
            Student Directory
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'enroll' && styles.tabBtnActive]}
          onPress={() => setActiveTab('enroll')}
        >
          <Plus size={18} color={activeTab === 'enroll' ? C.primary : C.t3} />
          <AppText style={[styles.tabBtnText, activeTab === 'enroll' && styles.tabBtnTextActive]} weight="semiBold">
            Student Enrollment
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.content}>
          {activeTab === 'list' ? (
            <>
              {/* Sub Header */}
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <AppText style={styles.kicker} weight="semiBold">Student & Class Management</AppText>
                  <AppText style={styles.title} weight="bold">Student Directory</AppText>
                  <AppText style={styles.titleSub} weight="regular">
                    Manage student enrollment, track attendance, and organize classes across all branches.
                  </AppText>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleRefresh}>
                    <RefreshCw size={14} color={C.text} />
                    <AppText style={styles.secondaryBtnText} weight="semiBold">Refresh</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowAddModal(true)}>
                    <Plus size={14} color="#fff" />
                    <AppText style={styles.primaryBtnText} weight="semiBold">Add Class</AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Summary Row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <AppText style={styles.summaryValue} weight="bold">{classes.length}</AppText>
                  <AppText style={styles.summaryLabel}>Total Classes</AppText>
                </View>
                <View style={styles.summaryCard}>
                  <AppText style={styles.summaryValue} weight="bold">{students.length}</AppText>
                  <AppText style={styles.summaryLabel}>Total Students</AppText>
                </View>
                <View style={styles.summaryCard}>
                  <AppText style={styles.summaryValue} weight="bold">{summaryStats.present}</AppText>
                  <AppText style={styles.summaryLabel}>Today Present</AppText>
                </View>
              </View>

              {/* Error Banner */}
              {cErr ? (
                <View style={styles.errorBanner}>
                  <AlertTriangle size={16} color={C.danger} />
                  <AppText style={styles.errorBannerText} weight="semiBold">{cErr}</AppText>
                </View>
              ) : null}

              {/* Main Content Area */}
              <View style={styles.grid}>
                {/* Class Selector Dropdown */}
                <View style={styles.selectorContainer}>
                  <AppText style={styles.panelTitle} weight="semiBold">Classes & Sections</AppText>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setShowClassPicker(true)}
                  >
                    {selected ? (
                      <View style={styles.selectedClassInfo}>
                        <View style={styles.selectedClassIcon}>
                          <Users size={16} color={C.primary} />
                        </View>
                        <View>
                          <AppText style={styles.selectedClassLabel} weight="bold">
                            Class {selected.label}
                          </AppText>
                          <AppText style={styles.selectedClassSub}>
                            {students.length} Students · {classes.find(c => c.label === selected.label)?.present || 0} Present
                          </AppText>
                        </View>
                      </View>
                    ) : (
                      <AppText style={styles.placeholderText}>Select a class...</AppText>
                    )}
                    <ChevronDown size={20} color={C.t3} />
                  </TouchableOpacity>
                </View>

                {/* Students Panel */}
                <View style={styles.tableContainer}>
                  <View style={styles.filterBar}>
                    <View style={styles.filterHeader}>
                      <View>
                        <AppText style={styles.filterTitle} weight="bold">Directory Filters</AppText>
                        <AppText style={styles.filterSubtitle}>
                          {selected ? `Class ${selected.label} • Showing ${summaryStats.visible} students` : 'Select a class to view directory'}
                        </AppText>
                      </View>
                      {selected && (
                        <View style={styles.filterBadge}>
                          <AppText style={styles.filterBadgeText} weight="semiBold">
                            {visibleStart === 0 ? '0' : `${visibleStart}-${visibleEnd}`}/{filtered.length}
                          </AppText>
                        </View>
                      )}
                    </View>

                    {selected && (
                      <>
                        <View style={styles.searchInput}>
                          <Search size={14} color={C.t3} />
                          <TextInput
                            style={styles.searchField}
                            placeholder="Search by name, roll no., or admission no."
                            value={query}
                            onChangeText={setQuery}
                            placeholderTextColor={C.t4}
                          />
                          {query ? (
                            <TouchableOpacity onPress={() => setQuery('')}>
                              <X size={14} color={C.t3} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        <View style={[styles.filterGroup, isCompactScreen && styles.filterGroupStack]}>
                          <TouchableOpacity style={[styles.filterBtn, isCompactScreen && styles.filterBtnFullWidth]} onPress={() => selected && loadStudents(selected.class_grade, selected.section)}>
                            <RefreshCw size={14} color={C.t2} />
                            <AppText style={styles.filterBtnText} weight="semiBold">Refresh</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.exportBtn, isCompactScreen && styles.filterBtnFullWidth]} onPress={handleExport}>
                            <Download size={14} color="#fff" />
                            <AppText style={styles.exportBtnText} weight="semiBold">Export XLS</AppText>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>

                  {selected ? (
                    <>
                      {sErr ? (
                        <View style={styles.errorBox}>
                          <AppText style={styles.errorBoxText}>{sErr}</AppText>
                        </View>
                      ) : null}

                      {isCompactScreen ? (
                        <View style={styles.mobileList}>
                          {sLoading ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator size="large" color={C.primary} />
                              <AppText style={styles.loadingText}>Loading students...</AppText>
                            </View>
                          ) : paginated.length > 0 ? (
                            paginated.map((student, idx) => renderStudentCard(student, idx))
                          ) : (
                            <View style={styles.emptyState}>
                              <User size={48} color={C.t4} />
                              <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
                              <AppText style={styles.emptyText}>Try adjusting your search or select a different class</AppText>
                            </View>
                          )}
                        </View>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.table}>
                            <View style={styles.tableHeader}>
                              <AppText style={[styles.headerCell, styles.cellStudent]} weight="bold">Student</AppText>
                              <AppText style={[styles.headerCell, styles.cellRoll]} weight="bold">Roll No.</AppText>
                              <AppText style={[styles.headerCell, styles.cellAdmission]} weight="bold">Admission No.</AppText>
                              <AppText style={[styles.headerCell, styles.cellStatus]} weight="bold">Status</AppText>
                              <AppText style={[styles.headerCell, styles.cellActions]} weight="bold">Actions</AppText>
                            </View>

                            {sLoading ? (
                              <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={C.primary} />
                                <AppText style={styles.loadingText}>Loading students...</AppText>
                              </View>
                            ) : paginated.length > 0 ? (
                              paginated.map((student, idx) => renderStudentItem(student, idx))
                            ) : (
                              <View style={styles.emptyState}>
                                <User size={48} color={C.t4} />
                                <AppText style={styles.emptyTitle} weight="bold">No students found</AppText>
                                <AppText style={styles.emptyText}>Try adjusting your search or select a different class</AppText>
                              </View>
                            )}
                          </View>
                        </ScrollView>
                      )}

                      <View style={styles.tableFooter}>
                        <AppText style={styles.footerText}>
                          Showing {visibleStart}–{visibleEnd} of {filtered.length}
                        </AppText>
                        <View style={styles.pagination}>
                          <TouchableOpacity
                            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                            onPress={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft size={14} color={currentPage === 1 ? C.t3 : C.t1} />
                          </TouchableOpacity>
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            let p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                            return (
                              <TouchableOpacity
                                key={p}
                                style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                                onPress={() => setCurrentPage(p)}
                              >
                                <AppText style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]} weight={currentPage === p ? "bold" : "regular"}>{p}</AppText>
                              </TouchableOpacity>
                            );
                          })}
                          <TouchableOpacity
                            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                            onPress={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            <ChevronRight size={14} color={currentPage === totalPages ? C.t3 : C.t1} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <Users size={48} color={C.t4} />
                      <AppText style={styles.emptyTitle} weight="bold">No Class Selected</AppText>
                      <AppText style={styles.emptyText}>Please select a class from the dropdown above to view student directory.</AppText>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : renderEnrollmentTab()}
        </View>
      </ScrollView>

      {/* Class Picker Modal */}
      <Modal
        visible={showClassPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClassPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowClassPicker(false)}
        >
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <AppText style={styles.pickerTitle} weight="bold">Select Class & Section</AppText>
              <TouchableOpacity onPress={() => setShowClassPicker(false)}>
                <X size={20} color={C.t2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {classes.map((c) => {
                const normalizedSection = String(c.section || '').trim();
                const isActive = selected?.label === c.label;
                const absent = (c.students_total || 0) - (c.present || 0);

                return (
                  <TouchableOpacity
                    key={`${c.class_grade}-${normalizedSection}`}
                    style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                    onPress={() => {
                      setSelected({
                        class_grade: c.class_grade,
                        section: normalizedSection,
                        label: c.label,
                      });
                      setShowClassPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemInfo}>
                      <AppText style={[styles.pickerItemLabel, isActive && styles.pickerItemLabelActive]} weight="semiBold">
                        Class {c.label}
                      </AppText>
                      <View style={styles.pickerItemStats}>
                        <AppText style={styles.pickerItemStatText}>{c.students_total} Total</AppText>
                        <AppText style={[styles.pickerItemStatText, { color: C.success }]}>{c.present} Present</AppText>
                        <AppText style={[styles.pickerItemStatText, { color: C.error }]}>{absent} Absent</AppText>
                      </View>
                    </View>
                    {isActive && <CheckCircle2 size={18} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Class Modal */}
      <AddClassModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddClass}
        existingClasses={classes}
      />

      {/* View Student Modal */}
      <Modal visible={!!viewStudent} transparent animationType="slide" onRequestClose={() => setViewStudent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Student Details</AppText>
              <TouchableOpacity onPress={() => setViewStudent(null)}>
                <X size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {viewStudent && (
                <View style={styles.profileSheet}>
                  <View style={styles.profileHeaderCard}>
                    <View style={[styles.studentAvatar, styles.profileAvatarLarge, { backgroundColor: C.primary }]}>
                      <AppText style={styles.profileAvatarText} weight="bold">
                        {viewStudent.student_full_name ? viewStudent.student_full_name.charAt(0).toUpperCase() : 'S'}
                      </AppText>
                    </View>
                    <View style={styles.profileHeaderMeta}>
                      <AppText style={styles.profileName} weight="bold" numberOfLines={1}>{viewStudent.student_full_name || '—'}</AppText>
                      <AppText style={styles.profileRole} weight="semiBold" numberOfLines={1}>Student · Class {selected?.label || '—'}</AppText>
                      <AppText style={styles.profileSubText} numberOfLines={1}>Roll No: {viewStudent.roll_number || '—'}</AppText>
                      <View style={[styles.statusPill, viewStudent.status === 'PRESENT' ? styles.statusActive : styles.statusInactive]}>
                        {viewStudent.status === 'PRESENT' ? (
                          <CheckCircle2 size={10} color={C.success} />
                        ) : (
                          <XCircle size={10} color={C.error} />
                        )}
                        <AppText style={[styles.statusText, viewStudent.status === 'PRESENT' ? styles.statusActiveText : styles.statusInactiveText]} weight="bold">
                          {viewStudent.status || 'UNKNOWN'}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <AppText style={styles.detailSectionTitle} weight="bold">Enrollment Information</AppText>
                    <View style={styles.detailGrid}>
                      {[
                        ['Student ID', viewStudent.student_id],
                        ['Roll Number', viewStudent.roll_number],
                        ['Admission No', viewStudent.admission_number],
                        ['Status', viewStudent.status],
                        ['Class', selected?.label],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.detailItem}>
                          <AppText style={styles.detailLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.detailValue} weight="semiBold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <AppText style={styles.detailSectionTitle} weight="bold">Personal & Contact Info</AppText>
                    <View style={styles.detailGrid}>
                      {[
                        ['Parent Name', viewStudent.parent_name],
                        ['Phone', viewStudent.phone],
                        ['Emergency', viewStudent.emergency_contact],
                        ['Gender', viewStudent.gender],
                        ['DOB', viewStudent.dob],
                        ['Email', viewStudent.email],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.detailItem}>
                          <AppText style={styles.detailLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.detailValue} weight="semiBold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  kicker: {
    fontSize: 11,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: 22, color: C.t1, lineHeight: 28 },
  titleSub: { fontSize: 12, color: C.t3, lineHeight: 18, maxWidth: 320 },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 13 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryBtnText: { color: C.t1, fontSize: 13 },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '32%',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#0f172a',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  summaryValue: { fontSize: 20, color: C.t1 },
  summaryLabel: { fontSize: 11, color: C.t3, marginTop: 2 },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  welcomeTitle: {
    fontSize: 18,
    color: C.t1,
  },
  welcomeSub: {
    fontSize: 12,
    color: C.t3,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateText: {
    fontSize: 11,
    color: C.t2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  footerText: { fontSize: 12, color: C.t3 },
  pagination: { flexDirection: 'row', gap: 6 },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  pageBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 12, color: C.t3 },
  pageBtnTextActive: { color: '#fff' },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerStandard: {
    backgroundColor: C.navy,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  pageHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: 20,
    color: C.t1,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: C.t3,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
  },
  addClassBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: C.dangerSoft,
    padding: 12,
    borderRadius: 9,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    color: C.danger,
    fontSize: 12,
    flex: 1,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  selectorContainer: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedClassIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedClassLabel: {
    fontSize: 15,
    color: C.t1,
  },
  selectedClassSub: {
    fontSize: 11,
    color: C.t3,
    marginTop: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: C.t3,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerContent: {
    backgroundColor: C.white,
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  pickerTitle: {
    fontSize: 16,
    color: C.t1,
  },
  pickerList: {
    padding: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: C.primarySoft,
  },
  pickerItemInfo: {
    flex: 1,
    gap: 4,
  },
  pickerItemLabel: {
    fontSize: 14,
    color: C.t1,
  },
  pickerItemLabelActive: {
    color: C.primary,
  },
  pickerItemStats: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerItemStatText: {
    fontSize: 11,
    color: C.t3,
  },
  panel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  panelHead: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  panelTitle: {
    fontSize: 14,
    color: C.t1,
  },
  panelSubtitle: {
    fontSize: 11,
    color: C.t3,
    marginTop: 2,
  },
  panelBody: {
    maxHeight: 400,
    padding: 12,
  },
  skeletonClassItem: {
    height: 66,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: C.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classBtn: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  classBtnActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primaryBorder,
  },
  classLabel: {
    fontSize: 14,
    color: C.t1,
    marginBottom: 6,
  },
  classLabelActive: {
    color: C.primary,
  },
  classMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaPillDefault: {
    backgroundColor: C.bg,
    borderColor: C.border,
  },
  metaPillSuccess: {
    backgroundColor: C.successSoft,
    borderColor: C.successBorder,
  },
  metaPillDanger: {
    backgroundColor: C.dangerSoft,
    borderColor: C.dangerBorder,
  },
  metaPillText: {
    fontSize: 11,
    color: C.t3,
  },
  studentsPanel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  stuHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  stuTitle: {
    fontSize: 14,
    color: C.t1,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.t1,
    padding: 0,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: {
    minWidth: 500,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCell: {
    fontSize: 11,
    color: C.t4,
    textTransform: 'uppercase',
  },
  cellStudent: { width: '35%' },
  cellRoll: { width: '20%' },
  cellAdmission: { width: '25%' },
  cellStatus: { width: '20%' },
  cellActions: { width: '12%', justifyContent: 'center' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableStudentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
  },
  studentName: {
    fontSize: 14,
    color: C.t1,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: C.t3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
  },
  skeletonCell: {
    flex: 1,
    height: 20,
    backgroundColor: C.borderLight,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 15,
    color: C.t1,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: C.t3,
    marginTop: 4,
    textAlign: 'center',
  },
  infoBar: {
    marginTop: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: C.t3,
  },
  infoStrong: {
    color: C.t1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: C.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    color: C.t1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: C.t3,
    marginTop: 4,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: C.t2,
    marginBottom: 6,
  },
  requiredStar: {
    color: C.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    padding: 10,
    fontSize: 14,
    color: C.t1,
    backgroundColor: C.bg,
  },
  flexOne: {
    flex: 1,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addSectionBtnText: {
    fontSize: 12,
    color: C.t3,
  },
  sectionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sectionPillText: {
    fontSize: 12,
    color: C.primary,
  },
  hintText: {
    fontSize: 11,
    color: C.t4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 11,
    color: C.danger,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  cancelBtnText: {
    fontSize: 13,
    color: C.t2,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.primary,
  },
  saveBtnText: {
    fontSize: 13,
    color: '#fff',
  },
  profileSheet: { gap: 16 },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  studentAvatar: { width: 62, height: 62, borderRadius: 18 },
  profileAvatarText: { color: '#fff', fontSize: 22 },
  profileHeaderMeta: { flex: 1, minWidth: 0, gap: 2 },
  profileName: { fontSize: 18, color: C.t1 },
  profileSubText: { fontSize: 12, color: C.t3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start', borderWidth: 1 },
  statusActive: { backgroundColor: C.successSoft, borderColor: C.successBorder },
  statusInactive: { backgroundColor: C.errorSoft, borderColor: C.dangerBorder },
  statusText: { fontSize: 10 },
  statusActiveText: { color: C.success },
  statusInactiveText: { color: C.error },
  // Enrollment Styles
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnActive: {
    backgroundColor: C.white,
  },
  tabBtnText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabBtnTextActive: {
    color: C.primary,
  },
  enrollmentContainer: {
    flex: 1,
  },
  stepperWrapper: {
    backgroundColor: C.white,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  stepDone: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  stepNumber: {
    fontSize: 12,
    color: C.t3,
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 9,
    color: C.t4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: C.t1,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
    marginTop: -20,
    marginHorizontal: -10,
    zIndex: -1,
  },
  stepConnectorDone: {
    backgroundColor: C.success,
  },
  stepForm: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
  },
  stepTitle: {
    fontSize: 18,
    color: C.t1,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: C.t3,
    marginBottom: 20,
  },
  formGrid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputError: {
    borderColor: C.danger,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    backgroundColor: C.bg,
    overflow: 'hidden',
    height: 48,
    justifyContent: 'center',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  inputText: {
    fontSize: 14,
    color: C.t1,
  },
  divider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginVertical: 8,
  },
  photoUploadContainer: {
    alignItems: 'center',
  },
  photoFrame: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: C.bg,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 4,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  photoActionText: {
    fontSize: 13,
    color: C.t1,
  },
  reviewContainer: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  reviewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  reviewName: {
    fontSize: 16,
    color: C.t1,
  },
  reviewSub: {
    fontSize: 12,
    color: C.t3,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  reviewItem: {
    width: '45%',
  },
  reviewLabel: {
    fontSize: 11,
    color: C.t4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 14,
    color: C.t1,
  },
  reviewAddress: {
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: 16,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 12,
  },
  stepBackBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  stepBackText: {
    fontSize: 15,
    color: C.t2,
  },
  stepNextBtn: {
    flex: 2,
    height: 52,
    backgroundColor: C.navy,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepNextText: {
    fontSize: 15,
    color: '#fff',
  },
  stepSubmitBtn: {
    backgroundColor: C.success,
  },
  serverErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.dangerSoft,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.dangerBorder,
  },
  serverErrorText: {
    color: C.danger,
    fontSize: 13,
    flex: 1,
  },
  serverSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.successSoft,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.successBorder,
  },
  serverSuccessText: {
    color: C.success,
    fontSize: 13,
    flex: 1,
  },
  tableContainer: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  filterBar: {
    padding: 16,
    gap: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: { fontSize: 16, color: C.t1 },
  filterSubtitle: { fontSize: 12, color: C.t3 },
  filterBadge: { backgroundColor: C.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  filterBadgeText: { fontSize: 11, color: C.primary },
  searchField: { flex: 1, fontSize: 14, color: C.t1, padding: 0 },
  filterGroup: { flexDirection: 'row', gap: 8 },
  filterGroupStack: { flexDirection: 'column' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  filterBtnFullWidth: { width: '100%' },
  filterBtnText: { fontSize: 12, color: C.t2 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exportBtnText: { fontSize: 12, color: '#fff' },
  errorBox: { padding: 16, backgroundColor: C.dangerSoft },
  errorBoxText: { color: C.danger, fontSize: 12 },
  mobileList: { padding: 12, gap: 12 },
  loadingContainer: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: C.t3 },
  studentCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, gap: 16 },
  studentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentCellName: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  studentIdentity: { flex: 1 },
  studentIdText: { fontSize: 11, color: C.t4, marginTop: 1 },
  studentMetaGrid: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: C.bg, borderRadius: 12 },
  studentMetaItem: { flex: 1, gap: 2 },
  studentMetaLabel: { fontSize: 10, color: C.t4, textTransform: 'uppercase' },
  studentMetaValue: { fontSize: 13, color: C.t1 },
  studentCardFooter: { flexDirection: 'row', gap: 10 },
  cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  cardActionPrimary: { backgroundColor: C.primary },
  cardActionPrimaryText: { color: '#fff', fontSize: 12 },
  cardActionSecondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  cardActionSecondaryText: { color: C.primary, fontSize: 12 },
  profileAvatarLarge: { width: 62, height: 62, borderRadius: 18 },
  profileRole: { fontSize: 13, color: C.primary },
  profileStatusText: { fontSize: 10 },
  detailSection: { gap: 10 },
  detailSectionTitle: { fontSize: 13, color: C.t1 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '48%', backgroundColor: C.bg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  detailLabel: { fontSize: 10, color: C.t4, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: C.t1, marginTop: 4 },
});