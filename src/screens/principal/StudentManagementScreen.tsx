import { useScrollTabBar } from '../../hooks/useScrollTabBar';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera, type CameraOptions, type ImageLibraryOptions } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
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
  Mail,
  Phone,
  Briefcase,
  Award,
  MapPin,
  Shield,
} from 'lucide-react-native';
import * as RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import API, { buildApiUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/tokens';

import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';
import AppButton from '../../components/common/AppButton';
import { BLOOD_GROUPS, validateStudentRegistrationStep } from '../../utils/studentRegistrationValidation';
import { Theme, C } from '../../theme/tokens';




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
  studentId?: string;
  id?: string;
  code?: string;
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
  { color: Theme.colors.blue, bg: 'rgba(59, 130, 246, 0.08)' },
  { color: Theme.colors.success, bg: 'rgba(16, 185, 129, 0.08)' },
  { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
  { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
];

const getIconForField = (label: string, primaryColor: string, size: number = 14) => {
  const lbl = label.toLowerCase();
  if (lbl.includes('id')) {return <Shield size={size} color={primaryColor} />;}
  if (lbl.includes('designation') || lbl.includes('type') || lbl.includes('experience') || lbl.includes('role')) {return <Briefcase size={size} color={primaryColor} />;}
  if (lbl.includes('department') || lbl.includes('qualification') || lbl.includes('subject') || lbl.includes('class')) {return <Award size={size} color={primaryColor} />;}
  if (lbl.includes('mobile') || lbl.includes('number') || lbl.includes('contact') || lbl.includes('phone') || lbl.includes('emergency')) {return <Phone size={size} color={primaryColor} />;}
  if (lbl.includes('email')) {return <Mail size={size} color={primaryColor} />;}
  if (lbl.includes('gender') || lbl.includes('age') || lbl.includes('marital') || lbl.includes('nationality') || lbl.includes('religion') || lbl.includes('tongue') || lbl.includes('aadhaar') || lbl.includes('parent') || lbl.includes('name')) {return <User size={size} color={primaryColor} />;}
  if (lbl.includes('birth') || lbl.includes('date') || lbl.includes('dob') || lbl.includes('joining')) {return <Calendar size={size} color={primaryColor} />;}
  if (lbl.includes('house') || lbl.includes('street') || lbl.includes('city') || lbl.includes('mandal') || lbl.includes('district') || lbl.includes('state') || lbl.includes('pin') || lbl.includes('address')) {return <MapPin size={size} color={primaryColor} />;}
  return null;
};

const readLS = async (...keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') {return String(value).trim();}
  }
  return '';
};

const avColor = (i: number) => PALETTE[i % PALETTE.length];

const isValidEmail = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) {return true;}
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};
const isValidMobile = (v: string): boolean => /^\d{10}$/.test(String(v || '').trim());
const isValidPin = (v: string): boolean => /^\d{6}$/.test(String(v || '').trim());
const isValidAadhaar = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) {return true;}
  return /^\d{12}$/.test(s);
};
const isValidName = (v: string): boolean => {
  const s = String(v || '').trim();
  if (!s) {return false;}
  return /^[a-zA-Z\s'-]+$/.test(s) && !/^\d+$/.test(s);
};
const isStrongPassword = (v: string): boolean => {
  const s = String(v || '');
  return s.length >= 8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
};

const calcAgeFromDOB = (dob: string): string => {
  if (!dob) {return '';}
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) {return '';}
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {age--;}
  return age >= 0 && age < 120 ? String(age) : '';
};

const isValidDateOfBirth = (dobString: string): { valid: boolean; error: string | null } => {
  if (!dobString) {return { valid: true, error: null };}
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {return { valid: false, error: 'Invalid date format' };}
  const year = dob.getFullYear();
  if (year < 1000 || year > new Date().getFullYear()) {
    return { valid: false, error: `Invalid year ${year}.` };
  }
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  if (dob > oneYearAgo) {return { valid: false, error: 'Date of Birth must be more than 1 year old' };}
  return { valid: true, error: null };
};

const initials = (name: string = ''): string => {
  const text = String(name || '').trim();
  if (!text) {return 'ST';}
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

    if (!className.trim()) {e.className = 'Class name is required.';}
    if (sections.length === 0) {e.sections = 'Add at least one section.';}

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
    if (!v) {return;}
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
    if (!validate()) {return;}

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
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {errors.api && (
              <View style={styles.errorBanner}>
                <AlertTriangle size={16} color={C.danger} />
                <AppText style={styles.errorBannerText} weight="semibold">{errors.api}</AppText>
              </View>
            )}

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semibold">
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
              <AppText style={styles.label} weight="semibold">
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
                <TouchableOpacity accessibilityRole="button" style={styles.addSectionBtn} onPress={addSection}>
                  <Plus size={12} color={colors.textMuted} />
                  <AppText style={styles.addSectionBtnText} weight="semibold">Add</AppText>
                </TouchableOpacity>
              </View>

              {errors.sectionInput && <AppText style={styles.errorText}>{errors.sectionInput}</AppText>}

              {sections.length > 0 && (
                <View style={styles.sectionsWrap}>
                  {sections.map((s) => (
                    <View key={s} style={styles.sectionPill}>
                      <AppText style={styles.sectionPillText} weight="semibold">Section {s}</AppText>
                      <TouchableOpacity accessibilityRole="button" onPress={() => removeSection(s)}>
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
            <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText} weight="semibold">Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <AppText style={styles.saveBtnText} weight="semibold">{saving ? 'Saving…' : 'Add Class'}</AppText>
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
                isActive && styles.stepActive,
              ]}>
                {isDone ? (
                  <Check size={14} color={Theme.colors.card} />
                ) : (
                  <AppText style={[styles.stepNumber, isActive && styles.stepNumberActive]} weight="bold">{stepNumber}</AppText>
                )}
              </View>
              <AppText style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} weight={isActive ? 'bold' : 'regular'} numberOfLines={1}>
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
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 520;
  const columnCount = width < 420 ? 1 : 2;
  const { userName, setTabBarVisible } = useAuth();
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
    const errors = validateStudentRegistrationStep(s, formData, {
      hasPhoto: Boolean(selectedPhoto),
      requireRollNumber: false,
    });
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
      if (res.didCancel) {return;}
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

    if (type === 'camera') {launchCamera(options, callback);}
    else {launchImageLibrary(options, callback);}
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) {return;}

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

      const res = await API.post('/principal/students/register', payload, {
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
                <AppText style={styles.label} weight="semibold">First Name <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.first_name && styles.inputError]}
                  value={formData.first_name}
                  onChangeText={v => setFormData(p => ({ ...p, first_name: v }))}
                  placeholder="Enter first name"
                />
                {fieldErrors.first_name && <AppText style={styles.errorText}>{fieldErrors.first_name}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Last Name <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Gender <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Date of Birth <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TouchableOpacity accessibilityRole="button"
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
                <AppText style={styles.label} weight="semibold">Nationality <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.nationality && styles.inputError]}
                  value={formData.nationality}
                  onChangeText={v => setFormData(p => ({ ...p, nationality: v }))}
                  placeholder="e.g. Indian"
                />
                {fieldErrors.nationality && <AppText style={styles.errorText}>{fieldErrors.nationality}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Mother Tongue</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.mother_tongue}
                  onChangeText={v => setFormData(p => ({ ...p, mother_tongue: v }))}
                  placeholder="e.g. Telugu"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Aadhaar Number</AppText>
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
                <AppText style={styles.label} weight="semibold">Blood Group</AppText>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.blood_group}
                    onValueChange={v => setFormData(p => ({ ...p, blood_group: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select" value="" />
                    {BLOOD_GROUPS.map(bg => (
                      <Picker.Item key={bg} label={bg} value={bg} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Religion</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.religion}
                  onChangeText={v => setFormData(p => ({ ...p, religion: v }))}
                  placeholder="e.g. Hindu, Muslim, Christian"
                />
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Caste Category</AppText>
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
                <AppText style={styles.label} weight="semibold">Class <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Section <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Admission Number <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.admission_number && styles.inputError]}
                  value={formData.admission_number}
                  onChangeText={v => setFormData(p => ({ ...p, admission_number: v }))}
                  placeholder="Enter admission #"
                />
                {fieldErrors.admission_number && <AppText style={styles.errorText}>{fieldErrors.admission_number}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Roll Number</AppText>
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
                <AppText style={styles.label} weight="semibold">Academic Year <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.academic_year && styles.inputError]}
                  value={formData.academic_year}
                  onChangeText={v => setFormData(p => ({ ...p, academic_year: v }))}
                  placeholder="YYYY-YY (e.g. 2024-25)"
                />
                {fieldErrors.academic_year && <AppText style={styles.errorText}>{fieldErrors.academic_year}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Date of Admission</AppText>
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.input, styles.dateInput]}
                  onPress={() => { setDateType('doa'); setShowDatePicker(true); }}
                >
                  <AppText style={styles.inputText}>{formData.date_of_admission}</AppText>
                  <Calendar size={18} color={C.t3} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semibold">Previous School Name</AppText>
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
              <AppText style={styles.label} weight="semibold">Father/Guardian Name <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Father Mobile <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Occupation</AppText>
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
              <AppText style={styles.label} weight="semibold">Mother/Guardian Name <AppText style={styles.requiredStar}>*</AppText></AppText>
              <TextInput
                style={[styles.input, fieldErrors.mother_guardian_name && styles.inputError]}
                value={formData.mother_guardian_name}
                onChangeText={v => setFormData(p => ({ ...p, mother_guardian_name: v }))}
                placeholder="Full name"
              />
              {fieldErrors.mother_guardian_name && <AppText style={styles.errorText}>{fieldErrors.mother_guardian_name}</AppText>}
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Mobile Number</AppText>
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
                <AppText style={styles.label} weight="semibold">Occupation</AppText>
                <TextInput
                  style={styles.input}
                  value={formData.mother_guardian_occupation}
                  onChangeText={v => setFormData(p => ({ ...p, mother_guardian_occupation: v }))}
                  placeholder="e.g. Homemaker, Teacher"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label} weight="semibold">Parent / Guardian Email <AppText style={styles.requiredStar}>*</AppText></AppText>
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
            <AppText style={styles.stepTitle} weight="bold">Current Address</AppText>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">House No. <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.house_no && styles.inputError]}
                  value={formData.house_no}
                  onChangeText={v => setFormData(p => ({ ...p, house_no: v }))}
                  placeholder="e.g. 12-3A"
                />
                {fieldErrors.house_no && <AppText style={styles.errorText}>{fieldErrors.house_no}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Street / Locality <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.street_locality && styles.inputError]}
                  value={formData.street_locality}
                  onChangeText={v => setFormData(p => ({ ...p, street_locality: v }))}
                  placeholder="Street or locality"
                />
                {fieldErrors.street_locality && <AppText style={styles.errorText}>{fieldErrors.street_locality}</AppText>}
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Village/Town/City <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.village_town_city && styles.inputError]}
                  value={formData.village_town_city}
                  onChangeText={v => setFormData(p => ({ ...p, village_town_city: v }))}
                  placeholder="City name"
                />
                {fieldErrors.village_town_city && <AppText style={styles.errorText}>{fieldErrors.village_town_city}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Mandal / Taluk <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.mandal_taluk && styles.inputError]}
                  value={formData.mandal_taluk}
                  onChangeText={v => setFormData(p => ({ ...p, mandal_taluk: v }))}
                  placeholder="Mandal or Taluk"
                />
                {fieldErrors.mandal_taluk && <AppText style={styles.errorText}>{fieldErrors.mandal_taluk}</AppText>}
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">District <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.district && styles.inputError]}
                  value={formData.district}
                  onChangeText={v => setFormData(p => ({ ...p, district: v }))}
                  placeholder="District name"
                />
                {fieldErrors.district && <AppText style={styles.errorText}>{fieldErrors.district}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">State <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.state && styles.inputError]}
                  value={formData.state}
                  onChangeText={v => setFormData(p => ({ ...p, state: v }))}
                  placeholder="State name"
                />
                {fieldErrors.state && <AppText style={styles.errorText}>{fieldErrors.state}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">PIN Code <AppText style={styles.requiredStar}>*</AppText></AppText>
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
                <AppText style={styles.label} weight="semibold">Emergency Contact Name <AppText style={styles.requiredStar}>*</AppText></AppText>
                <TextInput
                  style={[styles.input, fieldErrors.emergency_contact_name && styles.inputError]}
                  value={formData.emergency_contact_name}
                  onChangeText={v => setFormData(p => ({ ...p, emergency_contact_name: v }))}
                  placeholder="Contact person"
                />
                {fieldErrors.emergency_contact_name && <AppText style={styles.errorText}>{fieldErrors.emergency_contact_name}</AppText>}
              </View>
              <View style={[styles.formGroup, styles.flexOne]}>
                <AppText style={styles.label} weight="semibold">Emergency Phone <AppText style={styles.requiredStar}>*</AppText></AppText>
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
            <AppText style={styles.stepTitle} weight="bold">
              Student Photograph
              <AppText style={styles.requiredStar}> *</AppText>
            </AppText>
            <AppText style={styles.stepSubtitle}>Please upload a clear, front-facing passport size photograph of the student.</AppText>

            <View style={styles.photoFrame}>
              {selectedPhoto ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} />
                  <TouchableOpacity accessibilityRole="button" style={styles.removePhotoBtn} onPress={() => setSelectedPhoto(null)}>
                    <X size={20} color={Theme.colors.card} />
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
              <TouchableOpacity accessibilityRole="button" style={styles.photoActionBtn} onPress={() => handlePickImage('camera')}>
                <Camera size={20} color={C.primary} />
                <AppText style={styles.photoActionText} weight="semibold">Take Photo</AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.photoActionBtn} onPress={() => handlePickImage('library')}>
                <Users size={20} color={C.primary} />
                <AppText style={styles.photoActionText} weight="semibold">Choose Gallery</AppText>
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
                  <AppText style={styles.reviewValue} weight="semibold">{formData.admission_number}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Roll No</AppText>
                  <AppText style={styles.reviewValue} weight="semibold">{formData.roll_number}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Aadhaar</AppText>
                  <AppText style={styles.reviewValue} weight="semibold">{formData.aadhaar_number || '—'}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>DOB</AppText>
                  <AppText style={styles.reviewValue} weight="semibold">{formData.date_of_birth}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Father's Name</AppText>
                  <AppText style={styles.reviewValue} weight="semibold">{formData.father_guardian_name || '—'}</AppText>
                </View>
                <View style={styles.reviewItem}>
                  <AppText style={styles.reviewLabel}>Emergency Phone</AppText>
                  <AppText style={styles.reviewValue} weight="semibold">{formData.emergency_contact_number}</AppText>
                </View>
              </View>

              <View style={styles.reviewAddress}>
                <AppText style={styles.reviewLabel}>Residential Address</AppText>
                <AppText style={styles.reviewValue} weight="semibold">
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
            <TouchableOpacity accessibilityRole="button" style={styles.stepBackBtn} onPress={prevStep} disabled={loading}>
              <AppText style={styles.stepBackText} weight="semibold">Back</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityRole="button"
            style={[styles.stepNextBtn, step === STEPS.length - 1 && styles.stepSubmitBtn]}
            onPress={step === STEPS.length - 1 ? handleSubmit : nextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Theme.colors.card} />
            ) : (
              <>
                <AppText style={styles.stepNextText} weight="bold">
                  {step === STEPS.length - 1 ? 'Complete Registration' : 'Continue'}
                </AppText>
                {step < STEPS.length - 1 && <ChevronRight size={18} color={Theme.colors.card} />}
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
    if (hour < 12) {return 'Morning';}
    if (hour < 17) {return 'Afternoon';}
    return 'Evening';
  };

  // Load credentials
  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


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
      const res = await API.get('/principal/classes', { headers: getHeaders() });
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
      const res = await API.get('/principal/students', {
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
    await API.post('/principal/classes', payload, { headers: getHeaders() });
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
    if (!selected?.class_grade || !selected?.section) {return;}

    try {
      const params = new URLSearchParams({
        class_grade: selected.class_grade,
        section: selected.section,
      });

      const response = await fetch(`${buildApiUrl('/principal/students/export')}?${params.toString()}`, {
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
    if (!q) {return students;}

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
    const studentId = student.student_id || student.studentId || (student as any).id || (student as any).code || '—';

    return (
      <View key={studentId || index} style={styles.studentCard}>
        <View style={styles.studentCardHeader}>
          <View style={styles.studentCellName}>
            <AvatarBubble
              displayName={student.student_full_name}
              size={36}
              textSize={13}
              primaryColor={color}
            />
            <View style={styles.studentIdentity}>
              <AppText style={styles.studentName} weight="semibold" numberOfLines={1}>{student.student_full_name || '—'}</AppText>
              <AppText style={styles.studentIdText} numberOfLines={1}>Roll No: {student.roll_number || '—'}</AppText>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: 'transparent' }]}>
            <StatusIcon size={10} color={statusStyle.color} />
            <AppText style={[styles.statusText, { color: statusStyle.color }]} weight="bold">
              {student.status || 'UNKNOWN'}
            </AppText>
          </View>
        </View>

        <View style={styles.studentCardFooter}>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.cardActionBtn, styles.cardActionSecondary]}
            onPress={() => (navigation as any).navigate('PrincipalStudentAttendanceReport', { studentId: studentId, studentName: student.student_full_name })}
          >
            <Clock size={14} color={C.primary} />
            <AppText style={styles.cardActionSecondaryText} weight="semibold">Attendance</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.cardActionBtn, styles.cardActionPrimary]} onPress={() => setViewStudent(student)}>
            <User size={14} color={Theme.colors.card} />
            <AppText style={styles.cardActionPrimaryText} weight="semibold">View Profile</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStudentItem = (student: Student, index: number) => {
    const statusStyle = getStatusBadge(student.status);
    const StatusIcon = statusStyle.icon;
    const { color } = PALETTE[index % PALETTE.length];
    const studentId = student.student_id || student.studentId || (student as any).id || (student as any).code || '—';

    return (
      <View key={studentId || index} style={styles.tableRow}>
        <View style={[styles.tableCell, styles.cellStudent]}>
          <AvatarBubble
            displayName={student.student_full_name}
            size={32}
            textSize={11}
            primaryColor={color}
          />
          <View>
            <AppText style={styles.studentName} weight="semibold">{student.student_full_name || '—'}</AppText>
            <AppText style={styles.studentIdText}>Roll No: {student.roll_number || '—'}</AppText>
          </View>
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
          <TouchableOpacity accessibilityRole="button" style={styles.iconBtn} onPress={() => setViewStudent(student)}>
            <User size={16} color={C.t3} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      <StandardPageHeader
        title="Student Management"
        subtitle="Student directory and registration"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={handleRefresh}
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
       style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        <View style={[innerPageLayoutStyles.segmentedControl, styles.tabSwitcher]}>
          <TouchableOpacity accessibilityRole="button"
            style={[innerPageLayoutStyles.segmentedTab, activeTab === 'list' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={() => setActiveTab('list')}
          >
            <Users size={16} color={segmentedControlIconColor(activeTab === 'list')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'list' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
              Student Directory
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={[innerPageLayoutStyles.segmentedTab, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabActive]}
            onPress={() => setActiveTab('enroll')}
          >
            <Plus size={16} color={segmentedControlIconColor(activeTab === 'enroll')} />
            <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">
              Student Register
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={[styles.contentOverlap, innerPageLayoutStyles.contentFront]}>
          <View style={styles.content}>
            {activeTab === 'list' ? (
              <>
                {/* Sub Header */}
                {!isCompactScreen && (
                  <View style={styles.header}>
                    <View style={styles.headerCopy}>
                      <AppText style={styles.kicker} weight="semibold">Student & Class Management</AppText>
                      <AppText style={styles.title} weight="bold">Student Directory</AppText>
                      <AppText style={styles.titleSub} weight="regular">
                        Manage student enrollment, track attendance, and organize classes across all branches.
                      </AppText>
                    </View>
                    <View style={styles.headerActions}>
                      <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={handleRefresh}>
                        <RefreshCw size={14} color={C.text} />
                        <AppText style={styles.secondaryBtnText} weight="semibold">Refresh</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={() => setShowAddModal(true)}>
                        <Plus size={14} color={Theme.colors.card} />
                        <AppText style={styles.primaryBtnText} weight="semibold">Add Class</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

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
                    <AppText style={styles.errorBannerText} weight="semibold">{cErr}</AppText>
                  </View>
                ) : null}

                {/* Main Content Area */}
                <View style={styles.grid}>
                  {/* Class Selector Dropdown */}
                  <View style={styles.selectorContainer}>
                    <View style={styles.selectorHeader}>
                      <AppText style={styles.panelTitle} weight="bold">Classes & Sections</AppText>
                      {isCompactScreen && (
                        <TouchableOpacity accessibilityRole="button" style={styles.addBtnSmall} onPress={() => setShowAddModal(true)}>
                          <Plus size={14} color={C.primary} />
                          <AppText style={styles.addBtnSmallText} weight="semibold">Add Class</AppText>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity accessibilityRole="button"
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
                            <AppText style={styles.filterBadgeText} weight="semibold">
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
                              <TouchableOpacity accessibilityRole="button" onPress={() => setQuery('')}>
                                <X size={14} color={C.t3} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                          <View style={styles.filterGroup}>
                            <TouchableOpacity accessibilityRole="button"
                              style={[styles.filterBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]}
                              onPress={() => selected && loadStudents(selected.class_grade, selected.section)}
                            >
                              <RefreshCw size={14} color={C.t2} />
                              <AppText style={styles.filterBtnText} weight="semibold">Refresh</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity accessibilityRole="button"
                              style={[styles.exportBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]}
                              onPress={handleExport}
                            >
                              <Download size={14} color={Theme.colors.card} />
                              <AppText style={styles.exportBtnText} weight="semibold">Export XLS</AppText>
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
                            <TouchableOpacity accessibilityRole="button"
                              style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                              onPress={() => setCurrentPage(p => Math.max(p - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft size={14} color={currentPage === 1 ? C.t3 : C.t1} />
                            </TouchableOpacity>
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                              let p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                              return (
                                <TouchableOpacity accessibilityRole="button"
                                  key={p}
                                  style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                                  onPress={() => setCurrentPage(p)}
                                >
                                  <AppText style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]} weight={currentPage === p ? 'bold' : 'regular'}>{p}</AppText>
                                </TouchableOpacity>
                              );
                            })}
                            <TouchableOpacity accessibilityRole="button"
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
        </View>
      </ScrollView>

      {/* Class Picker Modal */}
      <Modal
        visible={showClassPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClassPicker(false)}
      >
        <TouchableOpacity accessibilityRole="button"
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowClassPicker(false)}
        >
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <AppText style={styles.pickerTitle} weight="bold">Select Class & Section</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setShowClassPicker(false)}>
                <X size={20} color={C.t2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.pickerList, innerPageLayoutStyles.scrollViewFront]}>
              {classes.map((c) => {
                const normalizedSection = String(c.section || '').trim();
                const isActive = selected?.label === c.label;
                const absent = (c.students_total || 0) - (c.present || 0);

                return (
                  <TouchableOpacity accessibilityRole="button"
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
                      <AppText style={[styles.pickerItemLabel, isActive && styles.pickerItemLabelActive]} weight="semibold">
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
              <TouchableOpacity accessibilityRole="button" onPress={() => setViewStudent(null)} style={styles.closeBtn}>
                <X size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
              {viewStudent && (
                <View style={styles.profileSheet}>
                  <LinearGradient
                    colors={[C.primary, C.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileHeaderCardGradient}
                  >
                    <View style={styles.profileAvatarContainer}>
                      <View style={styles.profileAvatarLarge}>
                        <AppText style={styles.profileAvatarText} weight="bold">
                          {viewStudent.student_full_name ? viewStudent.student_full_name.charAt(0).toUpperCase() : 'S'}
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.profileHeaderMeta}>
                      <AppText style={styles.profileName} weight="bold" numberOfLines={1}>{viewStudent.student_full_name || '—'}</AppText>
                      <AppText style={styles.profileRole} weight="semibold" numberOfLines={1}>Student · Class {selected?.label || '—'}</AppText>
                      <AppText style={styles.profileSubText} numberOfLines={1}>ID: {viewStudent.student_id || viewStudent.studentId || (viewStudent as any).id || (viewStudent as any).code || '—'} · Roll No: {viewStudent.roll_number || '—'}</AppText>
                      <View style={[
                        styles.statusPill,
                        viewStudent.status === 'PRESENT' ? styles.statusActiveCard : styles.statusInactiveCard,
                      ]}>
                        {viewStudent.status === 'PRESENT' ? (
                          <CheckCircle2 size={10} color="#34d399" />
                        ) : (
                          <XCircle size={10} color="#f87171" />
                        )}
                        <AppText style={[
                          styles.statusText,
                          viewStudent.status === 'PRESENT' ? styles.statusActiveCardText : styles.statusInactiveCardText,
                        ]} weight="bold">
                          {viewStudent.status || 'UNKNOWN'}
                        </AppText>
                      </View>
                    </View>
                  </LinearGradient>

                  <View style={styles.detailSection}>
                    <AppText style={styles.detailSectionTitle} weight="bold">Enrollment Information</AppText>
                    <View style={styles.detailGrid}>
                      {([
                        ['Student ID', viewStudent.student_id],
                        ['Roll Number', viewStudent.roll_number],
                        ['Admission No', viewStudent.admission_number],
                        ['Status', viewStudent.status],
                        ['Class', selected?.label],
                      ] as const).map(([label, value]) => (
                        <View key={label} style={[styles.detailItem, { width: columnCount === 1 ? '100%' : '48%' }]}>
                          <View style={styles.detailIconContainer}>
                            {getIconForField(label, C.primary, 16)}
                          </View>
                          <View style={styles.detailInfoContainer}>
                            <AppText style={styles.detailLabel} weight="bold">{label}</AppText>
                            <AppText style={styles.detailValue} weight="semibold" numberOfLines={2}>{value || '—'}</AppText>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <AppText style={styles.detailSectionTitle} weight="bold">Personal & Contact Info</AppText>
                    <View style={styles.detailGrid}>
                      {([
                        ['Parent Name', viewStudent.parent_name],
                        ['Phone', viewStudent.phone],
                        ['Emergency', viewStudent.emergency_contact],
                        ['Gender', viewStudent.gender],
                        ['DOB', viewStudent.dob],
                        ['Email', viewStudent.email],
                        ['Address', viewStudent.address],
                      ] as const).map(([label, value]) => (
                        <View key={label} style={[styles.detailItem, { width: columnCount === 1 ? '100%' : '48%' }]}>
                          <View style={styles.detailIconContainer}>
                            {getIconForField(label, C.primary, 16)}
                          </View>
                          <View style={styles.detailInfoContainer}>
                            <AppText style={styles.detailLabel} weight="bold">{label}</AppText>
                            <AppText style={styles.detailValue} weight="semibold" numberOfLines={2}>{value || '—'}</AppText>
                          </View>
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
    ...Theme.typography.label,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: 22, color: C.t1, lineHeight: 28 },
  titleSub: { ...Theme.typography.caption, color: C.t3, lineHeight: 18, maxWidth: 320 },
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
  primaryBtnText: { color: Theme.colors.card, fontSize: 13 },
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
        shadowColor: Theme.colors.text,
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  summaryValue: { fontSize: 20, color: C.t1 },
  summaryLabel: { ...Theme.typography.label, color: C.t3, marginTop: 2 },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    backgroundColor: C.white,
    padding: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  welcomeTitle: {
    fontSize: 18,
    color: C.t1,
  },
  welcomeSub: {
    ...Theme.typography.caption,
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
    ...Theme.typography.label,
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
  footerText: { ...Theme.typography.caption, color: C.t3 },
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
  pageBtnText: { ...Theme.typography.caption, color: C.t3 },
  pageBtnTextActive: { color: Theme.colors.card },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  contentOverlap: {
    flex: 1,
    backgroundColor: C.bg,
    zIndex: 10,
  },
  tabSwitcher: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  enrollmentContainer: {
    flex: 1,
  },
  stepperWrapper: {
    backgroundColor: C.white,
    paddingVertical: Theme.spacing.md,
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
    ...Theme.typography.caption,
    color: C.t3,
  },
  stepNumberActive: {
    color: Theme.colors.card,
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
    marginBottom: Theme.spacing.xs,
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
    ...Theme.typography.body,
    color: C.t1,
  },
  divider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginVertical: Theme.spacing.sm,
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
    marginBottom: Theme.spacing.lg,
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
    padding: Theme.spacing.xs,
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
    paddingHorizontal: Theme.spacing.md,
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
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: Theme.spacing.md,
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
    ...Theme.typography.caption,
    color: C.t3,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: Theme.spacing.md,
  },
  reviewItem: {
    width: '45%',
  },
  reviewLabel: {
    ...Theme.typography.label,
    color: C.t4,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.xs,
  },
  reviewValue: {
    ...Theme.typography.body,
    color: C.t1,
  },
  reviewAddress: {
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingTop: Theme.spacing.md,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xl,
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
    ...Theme.typography.bodyMd,
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
    ...Theme.typography.bodyMd,
    color: Theme.colors.card,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.md },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.md },
  modalContent: {
    backgroundColor: C.white,
    borderRadius: 24,
    width: '90%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    shadowColor: Theme.colors.text,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, color: C.t1, fontWeight: '700' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 20, paddingBottom: Theme.spacing.lg },
  profileSheet: { gap: 18 },
  profileHeaderCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    marginBottom: Theme.spacing.sm,
  },
  profileAvatarContainer: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 26,
    padding: 2,
  },
  profileAvatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { color: C.primary, fontSize: 24 },
  profileHeaderMeta: { flex: 1, minWidth: 0, gap: 4 },
  profileName: { fontSize: 20, color: Theme.colors.card, fontWeight: '700' },
  profileSubText: { ...Theme.typography.caption, color: '#cbd5e1' },
  statusActiveCard: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  statusInactiveCard: { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  statusActiveCardText: { color: '#34d399' },
  statusInactiveCardText: { color: '#f87171' },
  tableContainer: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  filterBar: {
    padding: Theme.spacing.md,
    gap: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: { fontSize: 16, color: C.t1 },
  filterSubtitle: { ...Theme.typography.caption, color: C.t3 },
  filterBadge: { backgroundColor: C.primarySoft, paddingHorizontal: 10, paddingVertical: Theme.spacing.xs, borderRadius: 20 },
  filterBadgeText: { ...Theme.typography.label, color: C.primary },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: Theme.spacing.xs,
  },
  searchField: { flex: 1, ...Theme.typography.body, color: C.t1, padding: 0 },
  filterGroup: { flexDirection: 'row', gap: 8 },
  filterGroupStack: { flexDirection: 'column' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: Theme.spacing.sm, borderRadius: 10 },
  filterBtnFullWidth: { width: '100%' },
  filterBtnText: { ...Theme.typography.caption, color: C.t2 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: Theme.spacing.sm, borderRadius: 10 },
  exportBtnText: { ...Theme.typography.caption, color: Theme.colors.card },
  errorBox: { padding: Theme.spacing.md, backgroundColor: C.dangerSoft },
  errorBoxText: { color: C.danger, ...Theme.typography.caption },
  mobileList: { padding: 12, gap: 12 },
  loadingContainer: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: C.t3 },
  studentCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10, marginBottom: 12 },
  studentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentCellName: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  studentIdentity: { flex: 1 },
  studentIdText: { ...Theme.typography.label, color: C.t4, marginTop: 1 },
  studentMetaGrid: { flexDirection: 'row', gap: 8, padding: Theme.spacing.sm, backgroundColor: C.bg, borderRadius: 8, marginTop: Theme.spacing.xs },
  studentMetaItem: { flex: 1, gap: 1 },
  studentMetaLabel: { fontSize: 9, color: C.t4, textTransform: 'uppercase' },
  studentMetaValue: { ...Theme.typography.caption, color: C.t1 },
  studentCardFooter: { flexDirection: 'row', gap: 8, marginTop: Theme.spacing.xs },
  cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  cardActionPrimary: { backgroundColor: C.primary },
  cardActionPrimaryText: { color: Theme.colors.card, ...Theme.typography.caption },
  cardActionSecondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  cardActionSecondaryText: { color: C.primary, ...Theme.typography.caption },
  profileRole: { fontSize: 13, color: C.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileStatusText: { fontSize: 10 },
  detailSection: { gap: 10, marginTop: Theme.spacing.xs },
  detailSectionTitle: { ...Theme.typography.caption, color: C.t3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.sm,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfoContainer: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: { fontSize: 10, color: C.t4, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  detailValue: { fontSize: 13, color: C.t1, marginTop: 2, fontWeight: '600' },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnSmallText: {
    ...Theme.typography.caption,
    color: C.primary,
  },
  selectedClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedClassIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedClassLabel: {
    ...Theme.typography.bodyMd,
    color: C.t1,
  },
  selectedClassSub: {
    ...Theme.typography.caption,
    color: C.t3,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.border,
  },
  statusActive: {
    backgroundColor: C.successSoft,
    borderColor: C.success,
  },
  statusInactive: {
    backgroundColor: C.errorSoft,
    borderColor: C.error,
  },
  statusText: {
    fontSize: 10,
  },
  statusActiveText: {
    color: C.success,
  },
  statusInactiveText: {
    color: C.error,
  },
  emptyState: {
    alignItems: 'center',
    padding: Theme.spacing.xxl,
    backgroundColor: C.white,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.t1,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: C.t3,
    marginTop: Theme.spacing.xs,
  },
  pickerContent: {
    backgroundColor: C.white,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    gap: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    color: C.t1,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: C.bg,
  },
  pickerItemActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  pickerItemInfo: {
    flex: 1,
    gap: 4,
  },
  pickerItemLabel: {
    ...Theme.typography.body,
    color: C.t1,
  },
  pickerItemLabelActive: {
    color: C.primary,
  },
  pickerItemStats: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerItemStatText: {
    ...Theme.typography.label,
    color: C.t3,
  },
  grid: {
    gap: 16,
  },
  formGroup: {
    marginBottom: Theme.spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  selectorContainer: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  panelTitle: {
    fontSize: 16,
    color: C.t1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginTop: Theme.spacing.sm,
  },
  placeholderText: {
    ...Theme.typography.body,
    color: C.t3,
  },
  table: {
    minWidth: 600,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCell: {
    ...Theme.typography.label,
    color: C.t3,
    textTransform: 'uppercase',
  },
  cellStudent: {
    width: '55%',
  },
  cellRoll: {
    width: '15%',
  },
  cellAdmission: {
    width: '20%',
  },
  cellStatus: {
    width: '20%',
  },
  cellActions: {
    width: '25%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.dangerSoft,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    marginBottom: Theme.spacing.md,
  },
  errorBannerText: {
    color: C.danger,
    fontSize: 13,
    flex: 1,
  },
  label: {
    ...Theme.typography.body,
    color: C.t1,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  requiredStar: {
    color: C.error,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    backgroundColor: C.white,
    color: C.t1,
    ...Theme.typography.body,
  },
  errorText: {
    color: C.error,
    ...Theme.typography.caption,
    marginTop: Theme.spacing.xs,
  },
  studentName: {
    ...Theme.typography.body,
    color: C.t1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  tableCell: {
    justifyContent: 'center',
  },
  monoText: {
    fontFamily: Platform.select({ ios: 'CourierNewPSMT', android: 'monospace' }),
    fontSize: 13,
    color: C.t1,
  },
  iconBtn: {
    padding: Theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: C.t3,
    marginTop: 2,
  },
  sectionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.primarySoft,
    paddingHorizontal: Theme.spacing.md,
    height: 48,
    borderRadius: 10,
  },
  addSectionBtnText: {
    ...Theme.typography.body,
    color: C.primary,
  },
  sectionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sectionPillText: {
    ...Theme.typography.caption,
    color: C.t1,
  },
  hintText: {
    ...Theme.typography.label,
    color: C.t4,
    marginTop: Theme.spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: Theme.spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...Theme.typography.body,
    color: C.t2,
  },
  saveBtn: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...Theme.typography.body,
    color: Theme.colors.card,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
  },
});
