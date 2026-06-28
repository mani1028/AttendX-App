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
  Image,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Search,
  Plus,
  Link,
  Download,
  RefreshCw,
  X,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  Check,
  ChevronRight,
  Users,
  Home,
  Shield,
  GitBranch,
  Calendar,
  Camera,
  Mail,
  Phone,
  Briefcase,
  Award,
  User,
  MapPin,
} from 'lucide-react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import API from '../../services/api';
import * as principalService from '../../services/principalService';
import { colors } from '../../theme/tokens';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import {
  innerPageLayoutStyles,
  segmentedControlIconColor,
} from '../../components/layout/innerPageLayoutStyles';
import { heroHeaderStyles } from '../../components/layout/HeroHeaderShell';
import { Theme, C } from '../../theme/tokens';




const STEPS = ['Basics', 'Contact', 'Emergency', 'Employment', 'Preview'];

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

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const DESIGNATION_OPTIONS = [
  'Teacher', 'Senior Teacher', 'Head of Department', 'Vice Principal',
  'Principal', 'Lab Assistant', 'Sports Teacher', 'Special Educator', 'Accountant',
];
const QUALIFICATION_OPTIONS = ['B.Ed', 'M.Ed', 'B.Sc + B.Ed', 'M.Sc + B.Ed', 'BA + B.Ed', 'MA + B.Ed', 'Ph.D', 'Other'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR'];
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const readLS = async (keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') {return String(value).trim();}
  }
  return '';
};

const getSchoolCode = async () => readLS(['school_code', 'schoolCode', 'school_id', 'schoolId']);
const getBranchId = async () => readLS(['branch_id', 'branchId', 'branch_code', 'branchCode']);

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
const isValidName = (v: string) => {
  const s = String(v || '').trim();
  if (!s) {return false;}
  return /^[a-zA-Z\s'-]+$/.test(s) && !/^\d+$/.test(s);
};
const isValidAadhaar = (v: string) => {
  const s = String(v || '').trim();
  if (!s) {return true;}
  return /^\d{12}$/.test(s);
};
const isValidMobile = (v: string) => /^\d{10}$/.test(String(v || '').trim());
const isValidPinCode = (v: string) => /^\d{6}$/.test(String(v || '').trim());

const calculateAge = (dob: string) => {
  if (!dob) {return '';}
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) {return '';}
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {age--;}
  return age >= 0 ? String(age) : '';
};

const INITIAL_FORM = {
  branch_id: '',
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
  teacher_photograph: null as any,
};

function validateStep(step: number, form: any): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!form.teacher_full_name.trim()) {errors.teacher_full_name = 'Full name is required';}
    else if (!isValidName(form.teacher_full_name)) {errors.teacher_full_name = 'Full name must contain only letters';}
    if (!form.gender) {errors.gender = 'Gender is required';}
    if (!form.date_of_birth) {errors.date_of_birth = 'Date of birth is required';}
    if (!form.nationality.trim()) {errors.nationality = 'Nationality is required';}
    else if (!isValidName(form.nationality)) {errors.nationality = 'Nationality must contain only letters';}
    if (!form.mother_tongue.trim()) {errors.mother_tongue = 'Mother tongue is required';}
    else if (!isValidName(form.mother_tongue)) {errors.mother_tongue = 'Mother tongue must contain only letters';}
    if (!form.email_id.trim()) {errors.email_id = 'Email is required';}
    else if (!isValidEmail(form.email_id)) {errors.email_id = 'Enter a valid email';}
    if (!form.aadhaar_number.trim()) {errors.aadhaar_number = 'Aadhaar number is required';}
    else if (!isValidAadhaar(form.aadhaar_number)) {errors.aadhaar_number = 'Aadhaar must be 12 digits';}
  }

  if (step === 1) {
    if (!form.mobile_number.trim()) {errors.mobile_number = 'Mobile is required';}
    else if (!isValidMobile(form.mobile_number)) {errors.mobile_number = 'Enter valid 10-digit number';}
    if (!form.house_no.trim()) {errors.house_no = 'House No is required';}
    if (!form.street_locality.trim()) {errors.street_locality = 'Street is required';}
    if (!form.village_town_city.trim()) {errors.village_town_city = 'City is required';}
    if (!form.mandal_taluk.trim()) {errors.mandal_taluk = 'Mandal/Taluk is required';}
    if (!form.district.trim()) {errors.district = 'District is required';}
    if (!form.state.trim()) {errors.state = 'State is required';}
    if (!form.pin_code.trim()) {errors.pin_code = 'Pin code is required';}
    else if (!isValidPinCode(form.pin_code)) {errors.pin_code = 'Enter valid 6-digit pin code';}
  }

  if (step === 2) {
    if (!form.emergency_contact_name.trim()) {errors.emergency_contact_name = 'Contact name is required';}
    if (!form.emergency_contact_number.trim()) {errors.emergency_contact_number = 'Contact number is required';}
    else if (!isValidMobile(form.emergency_contact_number)) {errors.emergency_contact_number = 'Enter valid 10-digit number';}
    if (!form.emergency_contact_relationship.trim()) {errors.emergency_contact_relationship = 'Relationship is required';}
  }

  if (step === 3) {
    if (!form.designation.trim()) {errors.designation = 'Designation is required';}
    if (!form.department_subject.trim()) {errors.department_subject = 'Department/Subject is required';}
    if (!form.date_of_joining) {errors.date_of_joining = 'Joining date is required';}
    if (!form.password || String(form.password).length < 6) {errors.password = 'Password must be at least 6 characters';}
    if (!form.email_id.trim()) {errors.email_id = 'Email is required';}
    else if (!isValidEmail(form.email_id)) {errors.email_id = 'Enter a valid email';}
    if (!form.teacher_photograph) {errors.teacher_photograph = 'Photo is required';}
  }

  return errors;
}

interface Teacher {
  teacher_id: string;
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

export default function TeacherPage() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 520;
  const { setTabBarVisible } = useAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'enroll'>('list');
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [items, setItems] = useState<Teacher[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'date_of_birth' | 'date_of_joining'>('date_of_birth');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadCredentials();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);
  const handleScroll = useScrollTabBar();


  useEffect(() => {
    if (schoolCode && branchId) {
      if (activeTab === 'list') {loadTeachers();}
      else {fetchNextEmployeeId();}
    }
  }, [schoolCode, branchId, activeTab]);

  const loadCredentials = async () => {
    const code = await getSchoolCode();
    const branch = await getBranchId();
    setSchoolCode(code);
    setBranchId(branch);
    setFormData(prev => ({ ...prev, branch_id: branch }));
  };

  const getHeaders = () => ({
    'X-School-Code': schoolCode,
    'X-Branch-Id': branchId,
  });

  const fetchNextEmployeeId = async () => {
    if (!schoolCode || !branchId) {return;}
    try {
      const res = await API.get('/principal/next-employee-id', { headers: getHeaders() });
      const nextEmployeeId = String(res?.data?.employee_id || '').trim();
      if (nextEmployeeId) {
        setFormData(prev => ({ ...prev, employee_id: nextEmployeeId }));
      }
    } catch (err) {
      console.error('Failed to fetch next employee ID:', err);
    }
  };

  const loadTeachers = async () => {
    if (!schoolCode || !branchId) {return;}
    setListLoading(true);
    setListErr('');

    try {
      const rows = await principalService.getPrincipalTeachers(getHeaders());
      setItems(rows);
    } catch (err: any) {
      setItems([]);
      setListErr(err?.response?.data?.detail || 'Unable to fetch teachers.');
    } finally {
      setListLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeachers();
    setRefreshing(false);
  };

  const handleSendOtp = async () => {
    setServerError('');
    setServerSuccess('');

    const email = String(formData.email_id || '').trim().toLowerCase();

    if (!email) {
      setFieldErrors(prev => ({ ...prev, email_id: 'Email is required' }));
      setServerError('Please enter teacher email first.');
      return;
    }

    if (!isValidEmail(email)) {
      setFieldErrors(prev => ({ ...prev, email_id: 'Enter a valid email' }));
      setServerError('Please enter a valid email address.');
      return;
    }

    const emailExists = items.some(t => String(t.email_id || '').trim().toLowerCase() === email);

    if (emailExists) {
      setOtpSent(false);
      setEmailVerified(false);
      setFieldErrors(prev => ({ ...prev, email_id: 'Email already exists' }));
      setServerError('Email already exists');
      Alert.alert('Error', 'Email already exists');
      return;
    }

    setOtpSending(true);

    try {
      const res = await API.post(
        '/teacher/register/send-otp',
        { email_id: email },
        { headers: getHeaders() }
      );

      setFormData(prev => ({ ...prev, email_id: email }));
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.email_id;
        return next;
      });
      setOtpSent(true);
      setEmailVerified(false);
      const otpNote = res?.data?.otp ? ` Debug OTP: ${res.data.otp}` : '';
      setServerSuccess(`${res?.data?.message || 'OTP sent successfully.'}${otpNote}`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP.';
      setOtpSent(false);
      setEmailVerified(false);
      if (err?.response?.status === 409) {
        setFieldErrors(prev => ({ ...prev, email_id: msg }));
        Alert.alert('Error', formatErrorMessage(msg));
      }
      setServerError(formatErrorMessage(msg));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setServerError('');
    setServerSuccess('');

    const email = String(formData.email_id || '').trim().toLowerCase();
    const enteredOtp = String(otp || '').trim();

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
      await API.post('/teacher/register/verify-otp', {
        email_id: email,
        otp: enteredOtp,
      }, { headers: getHeaders() });

      setOtpSent(true);
      setEmailVerified(true);
      setServerSuccess('Teacher email verified successfully.');
    } catch (err: any) {
      setEmailVerified(false);
      setServerError(err?.response?.data?.detail || 'OTP verification failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setServerError('');
    setServerSuccess('');

    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    // Name fields - only letters, spaces, hyphens, apostrophes
    const nameFields = new Set([
      'teacher_full_name', 'nationality', 'mother_tongue', 'religion', 'marital_status',
      'emergency_contact_name', 'emergency_contact_relationship', 'designation', 'department_subject',
      'district', 'state', 'village_town_city', 'mandal_taluk',
    ]);

    if (nameFields.has(name)) {
      value = value.replace(/[^a-zA-Z\s'-]/g, '');
    }

    // Number fields - only digits
    const numberFields = new Set([
      'mobile_number', 'alternate_mobile_number', 'emergency_contact_number',
      'pin_code', 'aadhaar_number', 'age', 'salary_amount', 'experience_years',
    ]);

    if (numberFields.has(name)) {
      value = value.replace(/\D/g, '');
    }

    if (name === 'date_of_birth') {
      setFormData(prev => ({ ...prev, date_of_birth: value, age: calculateAge(value) }));
      return;
    }

    if (name === 'email_id') {
      setFormData(prev => ({ ...prev, email_id: value }));
      setOtp('');
      setOtpSent(false);
      setEmailVerified(false);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 4) {return;}

    const errs = validateStep(step, formData);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    if (step === 0 && !emailVerified) {
      setServerError('Please verify your email with OTP before proceeding.');
      return;
    }

    setFieldErrors({});
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setServerError('');
    setServerSuccess('');
    setFieldErrors({});
    setStep(prev => Math.max(prev - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setFieldErrors({});
    setOtp('');
    setOtpSent(false);
    setEmailVerified(false);
    setFormData({ ...INITIAL_FORM, branch_id: branchId });
  };

  const submitTeacher = async () => {
    setServerError('');
    setServerSuccess('');

    if (!schoolCode || !branchId) {
      setServerError('Missing school/branch.');
      return;
    }

    const allErrors = {
      ...validateStep(0, formData),
      ...validateStep(1, formData),
      ...validateStep(2, formData),
      ...validateStep(3, formData),
    };

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      if (allErrors.teacher_full_name || allErrors.gender || allErrors.date_of_birth ||
          allErrors.nationality || allErrors.mother_tongue || allErrors.email_id ||
          allErrors.aadhaar_number) {
        setStep(0);
      } else if (allErrors.mobile_number || allErrors.house_no || allErrors.street_locality ||
                 allErrors.village_town_city || allErrors.mandal_taluk || allErrors.district ||
                 allErrors.state || allErrors.pin_code) {
        setStep(1);
      } else if (allErrors.emergency_contact_name || allErrors.emergency_contact_number ||
                 allErrors.emergency_contact_relationship) {
        setStep(2);
      } else {
        setStep(3);
      }
      setServerError('Please fix the highlighted fields before registering.');
      return;
    }

    if (!emailVerified) {
      setStep(0);
      setServerError('Please verify teacher email with OTP before submitting.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'teacher_photograph' && v && v.uri) {
          data.append('teacher_photograph', {
            uri: v.uri,
            type: v.type || 'image/jpeg',
            name: v.fileName || 'teacher.jpg',
          } as any);
        } else if (v !== null && v !== '') {
          data.append(k, v);
        }
      });

      const res = await API.post('/teacher/register', data, {
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
      });

      const createdTeacherId = String(res?.data?.teacher_id || '').trim();
      const createdEmployeeId = String(res?.data?.employee_id || formData.employee_id || '').trim();
      setServerSuccess(
        createdTeacherId
          ? `Teacher Registered Successfully! Teacher ID: ${createdTeacherId}${createdEmployeeId ? ` | Employee ID: ${createdEmployeeId}` : ''}`
          : 'Teacher Registered Successfully!'
      );
      resetForm();
      setStep(0);
      setActiveTab('list');
      loadTeachers();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === 'object') {
        const firstMsg = Object.values(detail)[0];
        setServerError(String(firstMsg || 'Validation failed.'));
        setFieldErrors(prev => ({ ...prev, ...detail }));
      } else {
        setServerError(detail || 'Submission failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditTeacher = (teacher: Teacher) => {
    setEditTeacher(teacher);
    setEditForm({
      teacher_full_name: teacher.teacher_full_name || '',
      gender: teacher.gender || '',
      date_of_birth: teacher.date_of_birth || '',
      age: teacher.age || '',
      blood_group: teacher.blood_group || '',
      nationality: teacher.nationality || '',
      mother_tongue: teacher.mother_tongue || '',
      religion: teacher.religion || '',
      marital_status: teacher.marital_status || '',
      aadhaar_number: teacher.aadhaar_number || '',
      mobile_number: teacher.mobile_number || '',
      alternate_mobile_number: teacher.alternate_mobile_number || '',
      email_id: teacher.email_id || '',
      house_no: teacher.house_no || '',
      street_locality: teacher.street_locality || '',
      village_town_city: teacher.village_town_city || '',
      mandal_taluk: teacher.mandal_taluk || '',
      district: teacher.district || '',
      state: teacher.state || '',
      pin_code: teacher.pin_code || '',
      emergency_contact_name: teacher.emergency_contact_name || '',
      emergency_contact_number: teacher.emergency_contact_number || '',
      emergency_contact_relationship: teacher.emergency_contact_relationship || '',
      employee_id: teacher.employee_id || '',
      designation: teacher.designation || '',
      department_subject: teacher.department_subject || '',
      qualification: teacher.qualification || '',
      experience_years: teacher.experience_years || '',
      date_of_joining: teacher.date_of_joining || '',
      employment_type: teacher.employment_type || '',
      teacher_status: teacher.teacher_status || 'ACTIVE',
      salary_amount: teacher.salary_amount || '',
    });
  };

  const saveEditTeacher = async () => {
    if (!editTeacher || !editForm) {return;}

    if (!editForm.teacher_full_name.trim()) {
      setListErr('Teacher name is required.');
      return;
    }
    if (!editForm.mobile_number.trim()) {
      setListErr('Mobile number is required.');
      return;
    }
    if (!editForm.employee_id.trim()) {
      setListErr('Employee ID is required.');
      return;
    }
    if (!editForm.designation.trim()) {
      setListErr('Designation is required.');
      return;
    }
    if (editForm.email_id && !isValidEmail(editForm.email_id)) {
      setListErr('Enter a valid email.');
      return;
    }

    setSavingEdit(true);
    setListErr('');

    try {
      await API.put(`/principal/teachers/${editTeacher.teacher_id}`, editForm, { headers: getHeaders() });
      setServerSuccess('Teacher updated successfully.');
      setEditTeacher(null);
      setEditForm(null);
      loadTeachers();
    } catch (err: any) {
      setListErr(err?.response?.data?.detail || 'Failed to update teacher.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await API.get('/principal/teachers/download', {
        headers: getHeaders(),
        params: { file_format: 'csv' },
      });

      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const filename = `teachers_${schoolCode}_${branchId}.csv`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

      await RNFS.writeFile(filePath, content, 'utf8');

      await Share.open({
        url: `file://${filePath}`,
        type: 'text/csv',
        filename: filename,
        title: 'Export Teachers',
      });
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        Alert.alert('Error', err?.message || 'Download failed');
      }
    }
  };

  const buildTeacherInviteLink = () => {
    const sc = String(schoolCode || '').trim();
    const bid = String(branchId || '').trim();
    if (!sc || !bid) {return '';}
    return `https://attendx.edu/teacher-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}`;
  };

  const handleCopyLink = async () => {
    const url = buildTeacherInviteLink();
    if (!url) {
      setListErr('School code or branch id missing.');
      return;
    }
    Alert.alert('Invite Link', url, [
      { text: 'Copy', onPress: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImagePick = () => {
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => {
          launchCamera({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (response) => {
            const asset = response.assets?.[0];
            if (asset?.uri) {
              setFormData(prev => ({ ...prev, teacher_photograph: asset }));
            }
          });
        } },
        { text: 'Choose from Gallery', onPress: () => {
          launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 800, maxHeight: 800 }, (response) => {
            const asset = response.assets?.[0];
            if (asset?.uri) {
              setFormData(prev => ({ ...prev, teacher_photograph: asset }));
            }
          });
        } },
      ]
    );
  };

  const departments = useMemo(() => {
    const d = items.map(i => i.department_subject).filter(Boolean);
    return ['all', ...new Set(d)];
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const search = q.trim().toLowerCase();

    if (search) {
      list = list.filter(t =>
        String(t.teacher_full_name || '').toLowerCase().includes(search) ||
        String(t.employee_id || '').toLowerCase().includes(search) ||
        String(t.email_id || '').toLowerCase().includes(search) ||
        String(t.mobile_number || '').toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter(t =>
        statusFilter === 'active'
          ? String(t.teacher_status || '').toUpperCase() === 'ACTIVE'
          : String(t.teacher_status || '').toUpperCase() === 'INACTIVE'
      );
    }

    if (deptFilter !== 'all') {
      list = list.filter(t => String(t.department_subject || '') === deptFilter);
    }

    return list;
  }, [items, q, statusFilter, deptFilter]);

  const summaryStats = useMemo(() => {
    const active = items.filter(t => String(t.teacher_status || '').toUpperCase() === 'ACTIVE').length;
    const inactive = items.filter(t => String(t.teacher_status || '').toUpperCase() === 'INACTIVE').length;
    return {
      total: items.length,
      active,
      inactive,
      visible: filtered.length,
    };
  }, [items, filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const visibleStart = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  const renderTeacherCard = (teacher: Teacher, index: number) => (
    <View key={teacher.teacher_id || index} style={styles.teacherCard}>
      <View style={styles.teacherCardHeader}>
        <View style={styles.teacherCardIdentityContainer}>
          <View style={[styles.teacherAvatar, { backgroundColor: C.primary }]}>
            <AppText style={styles.avatarText} weight="bold">
              {teacher.teacher_full_name ? teacher.teacher_full_name.charAt(0).toUpperCase() : 'T'}
            </AppText>
          </View>
          <View style={styles.teacherIdentity}>
            <AppText style={styles.teacherName} weight="semibold" numberOfLines={1}>{teacher.teacher_full_name || '—'}</AppText>
            <AppText style={styles.teacherEmail} numberOfLines={1}>{teacher.email_id || '—'}</AppText>
          </View>
        </View>
        <View style={[styles.statusPill, teacher.teacher_status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
          {teacher.teacher_status === 'ACTIVE' ? (
            <CheckCircle2 size={10} color={C.success} />
          ) : (
            <XCircle size={10} color={C.error} />
          )}
          <AppText style={[styles.statusText, teacher.teacher_status === 'ACTIVE' ? styles.statusActiveText : styles.statusInactiveText]} weight="bold">
            {teacher.teacher_status || 'INACTIVE'}
          </AppText>
        </View>
      </View>

      <View style={styles.teacherMetaGrid}>
        <View style={styles.teacherMetaItem}>
          <AppText style={styles.teacherMetaLabel}>Emp ID</AppText>
          <AppText style={styles.teacherMetaValue} numberOfLines={1}>{teacher.employee_id || '—'}</AppText>
        </View>
        <View style={styles.teacherMetaItem}>
          <AppText style={styles.teacherMetaLabel}>Contact</AppText>
          <AppText style={styles.teacherMetaValue} numberOfLines={1}>{teacher.mobile_number || '—'}</AppText>
        </View>
        <View style={styles.teacherMetaItem}>
          <AppText style={styles.teacherMetaLabel}>Designation</AppText>
          <AppText style={styles.teacherMetaValue} numberOfLines={1}>{teacher.designation || '—'}</AppText>
        </View>
        <View style={styles.teacherMetaItem}>
          <AppText style={styles.teacherMetaLabel}>Department</AppText>
          <AppText style={styles.teacherMetaValue} numberOfLines={1}>{teacher.department_subject || '—'}</AppText>
        </View>
      </View>

      <View style={styles.teacherCardFooter}>
        <View style={styles.teacherSubStack}>
          <AppText style={styles.teacherSubText}>{teacher.gender || '—'}{teacher.age ? ` • ${teacher.age}y` : ''}</AppText>
        </View>
        <View style={styles.teacherCardActions}>
          <TouchableOpacity accessibilityRole="button" style={[styles.cardActionBtn, styles.cardActionSecondary]} onPress={() => setViewTeacher(teacher)}>
            <Eye size={14} color={C.primary} />
            <AppText style={styles.cardActionSecondaryText} weight="semibold">View Profile</AppText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.cardActionBtn, styles.cardActionPrimary]} onPress={() => openEditTeacher(teacher)}>
            <Edit2 size={14} color={Theme.colors.card} />
            <AppText style={styles.cardActionPrimaryText} weight="semibold">Edit Details</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTeacherItem = (teacher: Teacher, index: number) => (
    <View key={teacher.teacher_id || index} style={styles.teacherRow}>
      <View style={styles.teacherCellName}>
        <View style={[styles.teacherAvatar, { backgroundColor: C.primary }]}>
          <AppText style={styles.avatarText} weight="bold">
            {teacher.teacher_full_name ? teacher.teacher_full_name.charAt(0).toUpperCase() : 'T'}
          </AppText>
        </View>
        <View>
          <AppText style={styles.teacherName} weight="semibold">{teacher.teacher_full_name || '—'}</AppText>
          <AppText style={styles.teacherEmail}>{teacher.email_id || '—'}</AppText>
        </View>
      </View>
      <View style={styles.teacherCellEmpId}>
        <AppText style={styles.teacherText}>{teacher.employee_id || '—'}</AppText>
      </View>
      <View style={styles.teacherCellContact}>
        <AppText style={styles.teacherText}>{teacher.mobile_number || '—'}</AppText>
        <AppText style={styles.teacherSubText}>{teacher.gender || '—'}{teacher.age ? ` • ${teacher.age}y` : ''}</AppText>
      </View>
      <View style={styles.teacherCellDesignation}>
        <AppText style={styles.teacherText}>{teacher.designation || '—'}</AppText>
      </View>
      <View style={styles.teacherCellDept}>
        <AppText style={styles.teacherText}>{teacher.department_subject || '—'}</AppText>
      </View>
      <View style={styles.teacherCellStatus}>
        <View style={[styles.statusPill, teacher.teacher_status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
          {teacher.teacher_status === 'ACTIVE' ? (
            <CheckCircle2 size={10} color={C.success} />
          ) : (
            <XCircle size={10} color={C.error} />
          )}
          <AppText style={[styles.statusText, teacher.teacher_status === 'ACTIVE' ? styles.statusActiveText : styles.statusInactiveText]} weight="bold">
            {teacher.teacher_status || 'INACTIVE'}
          </AppText>
        </View>
      </View>
      <View style={styles.teacherCellActions}>
        <TouchableOpacity accessibilityRole="button" style={styles.iconBtn} onPress={() => setViewTeacher(teacher)}>
          <Eye size={16} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.iconBtn} onPress={() => openEditTeacher(teacher)}>
          <Edit2 size={16} color={C.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFormField = (name: string, label: string, placeholder: string, type: 'text' | 'number' | 'date' | 'select' = 'text', options?: string[]) => {
    const value = formData[name as keyof typeof formData] as string;
    const error = fieldErrors[name];

    if (type === 'select' && options) {
      return (
        <View key={name} style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">{label}</AppText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={value}
              onValueChange={(val) => handleChange(name, val)}
              style={styles.picker}
              dropdownIconColor={C.muted}
            >
              <Picker.Item label={`Select ${label}`} value="" color={C.muted} />
              {options.map(opt => (
                <Picker.Item key={opt} label={opt} value={opt} color={C.text} />
              ))}
            </Picker>
          </View>
          {error && <AppText style={styles.errorText}>{error}</AppText>}
        </View>
      );
    }

    if (type === 'date') {
      return (
        <View key={name} style={styles.formGroup}>
          <AppText style={styles.label} weight="semibold">{label}</AppText>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.input, error && styles.inputError]}
            onPress={() => {
              setDatePickerField(name as any);
              setShowDatePicker(true);
            }}
          >
            <AppText style={value ? styles.dateText : styles.placeholderText}>
              {value || `Select ${label}`}
            </AppText>
          </TouchableOpacity>
          {error && <AppText style={styles.errorText}>{error}</AppText>}
        </View>
      );
    }

    return (
      <View key={name} style={styles.formGroup}>
        <AppText style={styles.label} weight="semibold">{label}</AppText>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={(text) => handleChange(name, text)}
          keyboardType={type === 'number' ? 'numeric' : 'default'}
          secureTextEntry={name === 'password'}
        />
        {error && <AppText style={styles.errorText}>{error}</AppText>}
      </View>
    );
  };

  return (
    <View style={styles.container}>

      <StandardPageHeader
        title="Staff Management"
        subtitle="Staff directory and registration"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
        rightActions={(
          <TouchableOpacity
            accessibilityRole="button"
            style={heroHeaderStyles.iconBtn}
            onPress={() => loadTeachers()}
          >
            <RefreshCw size={20} color={Theme.colors.card} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
       style={[styles.scrollView, innerPageLayoutStyles.scrollViewFront]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          activeTab === 'list' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          ) : undefined
        }
      >
        <View style={styles.headerContentContainer}>
          <View style={[innerPageLayoutStyles.segmentedControl, styles.headerToggle]}>
            <TouchableOpacity accessibilityRole="button"
              style={[innerPageLayoutStyles.segmentedTab, activeTab === 'list' && innerPageLayoutStyles.segmentedTabActive]}
              onPress={() => setActiveTab('list')}
            >
              <Users size={16} color={segmentedControlIconColor(activeTab === 'list')} />
              <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'list' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">Staff Directory</AppText>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[innerPageLayoutStyles.segmentedTab, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabActive]}
              onPress={async () => {
                setActiveTab('enroll');
                resetForm();
                setServerError('');
                setServerSuccess('');
                await fetchNextEmployeeId();
              }}
            >
              <Plus size={16} color={segmentedControlIconColor(activeTab === 'enroll')} />
              <AppText style={[innerPageLayoutStyles.segmentedTabText, activeTab === 'enroll' && innerPageLayoutStyles.segmentedTabTextActive]} weight="bold">Staff Register</AppText>
            </TouchableOpacity>
          </View>
        </View>
        {/* Sub Header */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {activeTab === 'list' && (
              <>
                <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={handleCopyLink}>
                  <Link size={14} color={C.text} />
                  <AppText style={styles.secondaryBtnText} weight="semibold">{copied ? 'Copied!' : 'Invite'}</AppText>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.primaryBtn}
                  onPress={async () => {
                    setActiveTab('enroll');
                    resetForm();
                    setServerError('');
                    setServerSuccess('');
                    await fetchNextEmployeeId();
                  }}
                >
                  <Plus size={14} color={Theme.colors.card} />
                  <AppText style={styles.primaryBtnText} weight="semibold">Add Teacher</AppText>
                </TouchableOpacity>
              </>
            )}
            {activeTab === 'enroll' && (
              <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={() => setActiveTab('list')}>
                <ChevronLeft size={14} color={C.text} />
                <AppText style={styles.secondaryBtnText} weight="semibold">Back</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activeTab === 'list' && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryValue} weight="bold">{summaryStats.total}</AppText>
              <AppText style={styles.summaryLabel}>Total Staff</AppText>
            </View>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryValue} weight="bold">{summaryStats.active}</AppText>
              <AppText style={styles.summaryLabel}>Active</AppText>
            </View>
            <View style={styles.summaryCard}>
              <AppText style={styles.summaryValue} weight="bold">{summaryStats.inactive}</AppText>
              <AppText style={styles.summaryLabel}>Inactive</AppText>
            </View>
          </View>
        )}



        {/* Messages */}
        {serverError && activeTab === 'enroll' && (
          <View style={styles.errorBox}>
            <AppText style={styles.errorBoxText}>{serverError}</AppText>
          </View>
        )}
        {serverSuccess && activeTab === 'enroll' && (
          <View style={styles.successBox}>
            <AppText style={styles.successBoxText}>{serverSuccess}</AppText>
          </View>
        )}

        {/* Enrollment Form */}
        {activeTab === 'enroll' && (
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <Stepper currentStep={step} />
            </View>

            <View style={styles.formBody}>
              {step === 0 && (
                <>
                  <AppText style={styles.sectionTitle} weight="bold">Personal Details</AppText>
                  <View style={styles.formGrid}>
                    {renderFormField('teacher_full_name', 'Full Name *', 'e.g. Ramesh Kumar', 'text')}
                    {renderFormField('gender', 'Gender *', 'Select Gender', 'select', GENDER_OPTIONS)}
                    {renderFormField('date_of_birth', 'Date of Birth *', '', 'date')}
                    <View style={styles.formGroup}>
                      <AppText style={styles.label} weight="semibold">Age (auto-calculated)</AppText>
                      <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.age ? `${formData.age} years` : ''} editable={false} />
                    </View>
                    {renderFormField('blood_group', 'Blood Group', 'Select', 'select', BLOOD_GROUPS)}
                    {renderFormField('nationality', 'Nationality *', 'Indian', 'text')}
                    {renderFormField('mother_tongue', 'Mother Tongue *', '', 'text')}
                    <View style={styles.formGroupFull}>
                      <AppText style={styles.label} weight="semibold">Email ID *</AppText>
                      <View style={styles.emailRow}>
                        <TextInput
                          style={[styles.input, styles.emailInput, fieldErrors.email_id && styles.inputError]}
                          placeholder="teacher@email.com"
                          placeholderTextColor={C.muted}
                          value={formData.email_id}
                          onChangeText={(text) => handleChange('email_id', text)}
                          editable={!emailVerified}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        <TouchableOpacity accessibilityRole="button"
                          style={[styles.verifyBtn, emailVerified && styles.verifyBtnSuccess]}
                          onPress={handleSendOtp}
                          disabled={otpSending || emailVerified}
                        >
                          <AppText style={styles.verifyBtnText} weight="bold">
                            {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                          </AppText>
                        </TouchableOpacity>
                      </View>
                      {fieldErrors.email_id && <AppText style={styles.errorText}>{fieldErrors.email_id}</AppText>}
                      {otpSent && !emailVerified && (
                        <View style={styles.otpRow}>
                          <TextInput
                            style={[styles.input, styles.otpInput]}
                            placeholder="Enter OTP"
                            placeholderTextColor={C.muted}
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity accessibilityRole="button" style={styles.verifyBtn} onPress={handleVerifyOtp} disabled={otpVerifying}>
                            <AppText style={styles.verifyBtnText} weight="bold">{otpVerifying ? 'Verifying...' : 'Verify OTP'}</AppText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {renderFormField('religion', 'Religion', '', 'text')}
                    {renderFormField('marital_status', 'Marital Status', '', 'text')}
                    {renderFormField('aadhaar_number', 'Aadhaar Number *', '12-digit Aadhaar', 'number')}
                  </View>
                </>
              )}

              {step === 1 && (
                <>
                  <AppText style={styles.sectionTitle} weight="bold">Contact & Address</AppText>
                  <View style={styles.formGrid}>
                    {renderFormField('mobile_number', 'Mobile Number *', '10-digit mobile', 'number')}
                    {renderFormField('alternate_mobile_number', 'Alternate Mobile', '10-digit mobile', 'number')}
                    {renderFormField('house_no', 'House No *', '', 'text')}
                    {renderFormField('street_locality', 'Street / Locality *', '', 'text')}
                    {renderFormField('village_town_city', 'City / Town *', '', 'text')}
                    {renderFormField('mandal_taluk', 'Mandal / Taluk *', '', 'text')}
                    {renderFormField('district', 'District *', '', 'text')}
                    {renderFormField('state', 'State *', '', 'text')}
                    {renderFormField('pin_code', 'Pin Code *', '6-digit pin code', 'number')}
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <AppText style={styles.sectionTitle} weight="bold">Emergency Contact</AppText>
                  <View style={styles.formGrid}>
                    {renderFormField('emergency_contact_name', 'Contact Name *', '', 'text')}
                    {renderFormField('emergency_contact_number', 'Contact Number *', '10-digit mobile', 'number')}
                    {renderFormField('emergency_contact_relationship', 'Relationship *', '', 'text')}
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <AppText style={styles.sectionTitle} weight="bold">Employment Details</AppText>
                  <View style={styles.formGrid}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label} weight="semibold">Employee ID</AppText>
                      <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={formData.employee_id}
                        editable={false}
                      />
                      <AppText style={styles.hintText}>Employee ID will be assigned after save.</AppText>
                    </View>
                    {renderFormField('designation', 'Designation *', '', 'select', DESIGNATION_OPTIONS)}
                    {renderFormField('department_subject', 'Department / Subject *', '', 'text')}
                    {renderFormField('qualification', 'Qualification', '', 'select', QUALIFICATION_OPTIONS)}
                    {renderFormField('experience_years', 'Experience (Years)', '0-50', 'number')}
                    {renderFormField('date_of_joining', 'Date of Joining *', '', 'date')}
                    {renderFormField('employment_type', 'Employment Type', '', 'select', EMPLOYMENT_TYPES)}
                    {renderFormField('teacher_status', 'Teacher Status', '', 'select', STATUS_OPTIONS)}
                    <View style={styles.formGroupFull}>
                      <AppText style={styles.label} weight="semibold">Email *</AppText>
                      <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.email_id} editable={false} />
                    </View>
                    {renderFormField('password', 'Password *', 'Min. 6 characters', 'text')}
                    {renderFormField('salary_amount', 'Salary Amount', 'Optional', 'number')}

                    <View style={styles.formGroupFull}>
                      <AppText style={styles.label} weight="semibold">Teacher Photo *</AppText>
                      <TouchableOpacity accessibilityRole="button" style={styles.photoZone} onPress={handleImagePick}>
                        {formData.teacher_photograph ? (
                          <Image source={{ uri: formData.teacher_photograph.uri }} style={styles.photoPreview} />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Camera size={32} color={C.muted} />
                            <AppText style={styles.photoText}>Tap to add photo</AppText>
                            <AppText style={styles.photoSubtext}>Camera or Gallery</AppText>
                          </View>
                        )}
                      </TouchableOpacity>
                      {fieldErrors.teacher_photograph && <AppText style={styles.errorText}>{fieldErrors.teacher_photograph}</AppText>}
                    </View>
                  </View>
                </>
              )}

              {step === 4 && (
                <>
                  <AppText style={styles.sectionTitle} weight="bold">Registration Preview</AppText>
                  <AppText style={styles.previewHint}>Review all details before submitting.</AppText>

                  <View style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                      <View style={styles.previewPhoto}>
                        {formData.teacher_photograph ? (
                          <Image source={{ uri: formData.teacher_photograph.uri }} style={styles.previewPhotoImage} />
                        ) : (
                          <AppText style={styles.previewInitial} weight="bold">
                            {formData.teacher_full_name ? formData.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                          </AppText>
                        )}
                      </View>
                      <View style={styles.previewInfo}>
                        <AppText style={styles.previewName} weight="bold">{formData.teacher_full_name || '—'}</AppText>
                        <AppText style={styles.previewDesignation}>
                          {formData.designation || '—'} · {formData.department_subject || '—'}
                        </AppText>
                        <AppText style={styles.previewEmail}>{formData.email_id || '—'}</AppText>
                        <View style={[styles.previewStatus, formData.teacher_status === 'ACTIVE' ? styles.previewStatusActive : styles.previewStatusInactive]}>
                          {formData.teacher_status === 'ACTIVE' ? (
                            <CheckCircle2 size={10} color={Theme.colors.card} />
                          ) : (
                            <XCircle size={10} color={Theme.colors.card} />
                          )}
                          <AppText style={styles.previewStatusText} weight="bold">{formData.teacher_status}</AppText>
                        </View>
                      </View>
                    </View>

                    <AppText style={styles.previewSectionTitle} weight="bold">Personal Information</AppText>
                    <View style={styles.previewGrid}>
                      {[
                        ['Gender', formData.gender], ['Date of Birth', formData.date_of_birth],
                        ['Age', formData.age], ['Blood Group', formData.blood_group || '—'],
                        ['Nationality', formData.nationality], ['Mother Tongue', formData.mother_tongue],
                        ['Religion', formData.religion || '—'], ['Marital Status', formData.marital_status || '—'],
                        ['Aadhaar', formData.aadhaar_number || '—'],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <AppText style={styles.previewLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.previewValue} weight="semibold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>

                    <AppText style={styles.previewSectionTitle} weight="bold">Contact & Address</AppText>
                    <View style={styles.previewGrid}>
                      {[
                        ['Mobile', formData.mobile_number], ['Alt Mobile', formData.alternate_mobile_number || '—'],
                        ['House No', formData.house_no], ['Street', formData.street_locality],
                        ['City', formData.village_town_city], ['Mandal', formData.mandal_taluk],
                        ['District', formData.district], ['State', formData.state],
                        ['Pin Code', formData.pin_code],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <AppText style={styles.previewLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.previewValue} weight="semibold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>

                    <AppText style={styles.previewSectionTitle} weight="bold">Emergency Contact</AppText>
                    <View style={styles.previewGrid}>
                      {[
                        ['Contact Name', formData.emergency_contact_name],
                        ['Contact Number', formData.emergency_contact_number],
                        ['Relationship', formData.emergency_contact_relationship],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <AppText style={styles.previewLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.previewValue} weight="semibold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>

                    <AppText style={styles.previewSectionTitle} weight="bold">Employment Details</AppText>
                    <View style={styles.previewGrid}>
                      {[
                        ['Employee ID', formData.employee_id], ['Designation', formData.designation],
                        ['Department', formData.department_subject], ['Qualification', formData.qualification || '—'],
                        ['Experience', formData.experience_years ? `${formData.experience_years} yrs` : '—'],
                        ['Joining Date', formData.date_of_joining], ['Employment Type', formData.employment_type],
                        ['Salary', formData.salary_amount || '—'],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <AppText style={styles.previewLabel} weight="bold">{label}</AppText>
                          <AppText style={styles.previewValue} weight="semibold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={step === 0 ? () => setActiveTab('list') : prevStep} disabled={loading}>
                <ChevronLeft size={16} color={C.text} />
                <AppText style={styles.cancelBtnText} weight="semibold">{step === 0 ? 'Cancel' : 'Back'}</AppText>
              </TouchableOpacity>
              <View style={styles.footerRight}>
                <AppText style={styles.stepIndicator}>{step + 1}/{STEPS.length}</AppText>
                {step < STEPS.length - 1 ? (
                  <TouchableOpacity accessibilityRole="button" style={styles.nextBtn} onPress={nextStep} disabled={loading}>
                    <AppText style={styles.nextBtnText} weight="semibold">Next</AppText>
                    <ChevronRight size={16} color={Theme.colors.card} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity accessibilityRole="button" style={styles.submitBtn} onPress={submitTeacher} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color={Theme.colors.card} />
                    ) : (
                      <>
                        <CheckCircle2 size={16} color={Theme.colors.card} />
                        <AppText style={styles.submitBtnText} weight="semibold">Register</AppText>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Teacher List */}
        {activeTab === 'list' && (
          <View style={styles.tableContainer}>
            <View style={styles.filterBar}>
              <View style={styles.filterHeader}>
                <View>
                  <AppText style={styles.filterTitle} weight="bold">Directory Filters</AppText>
                  <AppText style={styles.filterSubtitle}>Showing {summaryStats.visible} matching profiles</AppText>
                </View>
                <View style={styles.filterBadge}>
                  <AppText style={styles.filterBadgeText} weight="semibold">{visibleStart === 0 ? '0' : `${visibleStart}-${visibleEnd}`}/{filtered.length}</AppText>
                </View>
              </View>
              <View style={styles.searchInput}>
                <Search size={14} color={C.muted} />
                <TextInput
                  style={styles.searchField}
                  placeholder="Search name, ID, email, mobile..."
                  value={q}
                  onChangeText={setQ}
                  placeholderTextColor={C.muted}
                />
                {q ? (
                  <TouchableOpacity accessibilityRole="button" onPress={() => setQ('')}>
                    <X size={14} color={C.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={[styles.filterGroup, isCompactScreen && styles.filterGroupStack]}>
                <View style={styles.pickerSmall}>
                  <Picker
                    selectedValue={statusFilter}
                    onValueChange={setStatusFilter}
                    style={styles.picker}
                    dropdownIconColor={C.muted}
                  >
                    <Picker.Item label="All Status" value="all" color={C.text} />
                    <Picker.Item label="Active" value="active" color={C.text} />
                    <Picker.Item label="Inactive" value="inactive" color={C.text} />
                  </Picker>
                </View>
                <View style={styles.pickerSmall}>
                  <Picker
                    selectedValue={deptFilter}
                    onValueChange={setDeptFilter}
                    style={styles.picker}
                    dropdownIconColor={C.muted}
                  >
                    {departments.map(d => (
                      <Picker.Item key={d} label={d === 'all' ? 'All Departments' : d} value={d} color={C.text} />
                    ))}
                  </Picker>
                </View>
                <View style={isCompactScreen ? styles.filterRowMobile : styles.filterRowDesktop}>
                  <TouchableOpacity accessibilityRole="button" style={[styles.filterBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]} onPress={loadTeachers}>
                    <RefreshCw size={14} color={C.text} />
                    <AppText style={styles.filterBtnText} weight="semibold">Refresh</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={[styles.exportBtn, isCompactScreen && { flex: 1, justifyContent: 'center' }]} onPress={handleExport}>
                    <Download size={14} color={Theme.colors.card} />
                    <AppText style={styles.exportBtnText} weight="semibold">Export</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {listErr ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorBoxText}>{listErr}</AppText>
              </View>
            ) : null}

            {isCompactScreen ? (
              <View style={styles.mobileList}>
                {listLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <AppText style={styles.loadingText}>Loading teachers...</AppText>
                  </View>
                ) : paginated.length > 0 ? (
                  paginated.map((teacher, idx) => renderTeacherCard(teacher, idx))
                ) : (
                  <View style={styles.emptyState}>
                    <Users size={48} color={C.muted} />
                    <AppText style={styles.emptyTitle} weight="bold">No teachers found</AppText>
                    <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
                  </View>
                )}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <AppText style={[styles.headerCell, styles.cellName]} weight="bold">Teacher</AppText>
                    <AppText style={[styles.headerCell, styles.cellEmpId]} weight="bold">Emp ID</AppText>
                    <AppText style={[styles.headerCell, styles.cellContact]} weight="bold">Contact</AppText>
                    <AppText style={[styles.headerCell, styles.cellDesignation]} weight="bold">Designation</AppText>
                    <AppText style={[styles.headerCell, styles.cellDept]} weight="bold">Department</AppText>
                    <AppText style={[styles.headerCell, styles.cellStatus]} weight="bold">Status</AppText>
                    <AppText style={[styles.headerCell, styles.cellActions]} weight="bold">Actions</AppText>
                  </View>

                  {listLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={C.primary} />
                      <AppText style={styles.loadingText}>Loading teachers...</AppText>
                    </View>
                  ) : paginated.length > 0 ? (
                    paginated.map((teacher, idx) => renderTeacherItem(teacher, idx))
                  ) : (
                    <View style={styles.emptyState}>
                      <Users size={48} color={C.muted} />
                      <AppText style={styles.emptyTitle} weight="bold">No teachers found</AppText>
                      <AppText style={styles.emptyText}>Try adjusting your search or filters</AppText>
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
                  <ChevronLeft size={14} color={currentPage === 1 ? C.muted : C.text} />
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
                  <ChevronRight size={14} color={currentPage === totalPages ? C.muted : C.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerField === 'date_of_birth' && formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const dateStr = selectedDate.toISOString().split('T')[0];
              if (datePickerField === 'date_of_birth') {
                setFormData(prev => ({ ...prev, date_of_birth: dateStr, age: calculateAge(dateStr) }));
              } else {
                setFormData(prev => ({ ...prev, date_of_joining: dateStr }));
              }
            }
          }}
        />
      )}

      {/* View Teacher Modal */}
      <Modal visible={!!viewTeacher} transparent animationType="slide" onRequestClose={() => setViewTeacher(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Teacher Details</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setViewTeacher(null)} style={styles.closeBtn}>
                <X size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
              {viewTeacher && (
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
                          {viewTeacher.teacher_full_name ? viewTeacher.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.profileHeaderMeta}>
                      <AppText style={styles.profileName} weight="bold" numberOfLines={1}>{viewTeacher.teacher_full_name || '—'}</AppText>
                      <AppText style={styles.profileRole} weight="semibold" numberOfLines={1}>{viewTeacher.designation || 'Staff Member'}</AppText>
                      <AppText style={styles.profileSubText} numberOfLines={1}>{viewTeacher.department_subject || '—'}</AppText>
                      <View style={[
                        styles.statusPill,
                        viewTeacher.teacher_status === 'ACTIVE' ? styles.statusActiveCard : styles.statusInactiveCard,
                      ]}>
                        {viewTeacher.teacher_status === 'ACTIVE' ? (
                          <CheckCircle2 size={10} color="#34d399" />
                        ) : (
                          <XCircle size={10} color="#f87171" />
                        )}
                        <AppText style={[
                          styles.statusText,
                          viewTeacher.teacher_status === 'ACTIVE' ? styles.statusActiveCardText : styles.statusInactiveCardText,
                        ]} weight="bold">
                          {viewTeacher.teacher_status || 'INACTIVE'}
                        </AppText>
                      </View>
                    </View>
                  </LinearGradient>

                  {
                    // build sections array so we can control visibility and layout responsively
                    (() => {
                      const sections = [
                        {
                          title: 'Profile Overview',
                          fields: [
                            ['Employee ID', viewTeacher.employee_id],
                            ['Teacher ID', viewTeacher.teacher_id],
                            ['Designation', viewTeacher.designation],
                            ['Department', viewTeacher.department_subject],
                            ['Employment Type', viewTeacher.employment_type],
                            ['Qualification', viewTeacher.qualification],
                          ],
                        },
                        {
                          title: 'Contact & Personal',
                          fields: [
                            ['Mobile', viewTeacher.mobile_number],
                            ['Alternate Mobile', viewTeacher.alternate_mobile_number],
                            ['Email', viewTeacher.email_id],
                            ['Gender', viewTeacher.gender],
                            ['Age', viewTeacher.age ? `${viewTeacher.age} years` : '—'],
                            ['Date of Birth', viewTeacher.date_of_birth],
                          ],
                        },
                        {
                          title: 'Address',
                          fields: [
                            ['House No', viewTeacher.house_no],
                            ['Street', viewTeacher.street_locality],
                            ['City', viewTeacher.village_town_city],
                            ['Mandal/Taluk', viewTeacher.mandal_taluk],
                            ['District', viewTeacher.district],
                            ['State', viewTeacher.state],
                            ['Pin Code', viewTeacher.pin_code],
                          ],
                        },
                        {
                          title: 'Emergency Contact',
                          fields: [
                            ['Contact Name', viewTeacher.emergency_contact_name],
                            ['Relationship', viewTeacher.emergency_contact_relationship],
                            ['Contact Number', viewTeacher.emergency_contact_number],
                          ],
                        },
                      ];

                      const visibleSections = sections.filter((s, idx) => detailsExpanded || idx < 2);
                      const hiddenCount = sections.length - visibleSections.length;
                      const columnCount = width < 420 ? 1 : 2;

                      return (
                        <>
                          {visibleSections.map((section, sIdx) => {
                            const visible = section.fields.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
                            if (visible.length === 0) {return null;}
                            return (
                              <View key={section.title} style={styles.detailSection}>
                                <AppText style={styles.detailSectionTitle} weight="bold">{section.title}</AppText>
                                <View style={styles.detailGrid}>
                                  {visible.map(([label, value]) => (
                                    <View key={label} style={[styles.detailItem, { width: columnCount === 1 ? '100%' : '48%' }]}>
                                      <View style={styles.detailIconContainer}>
                                        {getIconForField(label, C.primary, 16)}
                                      </View>
                                      <View style={styles.detailInfoContainer}>
                                        <AppText style={styles.detailLabel} weight="bold">{label}</AppText>
                                        <AppText style={styles.detailValue} weight="semibold" numberOfLines={2}>{value}</AppText>
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            );
                          })}

                          {hiddenCount > 0 && (
                            <TouchableOpacity accessibilityRole="button" onPress={() => setDetailsExpanded(!detailsExpanded)} style={{ alignSelf: 'center', marginTop: Theme.spacing.sm }}>
                              <AppText style={{ color: C.primary }} weight="bold">{detailsExpanded ? 'Show less' : `Show more (${hiddenCount})`}</AppText>
                            </TouchableOpacity>
                          )}
                        </>
                      );
                    })()
                  }
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal visible={!!editTeacher} transparent animationType="slide" onRequestClose={() => setEditTeacher(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalLarge]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Edit Teacher Details</AppText>
              <TouchableOpacity accessibilityRole="button" onPress={() => setEditTeacher(null)} style={styles.closeBtn}>
                <X size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.modalBody, innerPageLayoutStyles.scrollViewFront]}>
              <View style={styles.formGrid}>
                {editForm && (() => {
                  const editFields: Array<[string, string, 'text' | 'number' | 'date' | 'select', string[]?]> = [
                  ['teacher_full_name', 'Full Name', 'text'],
                  ['gender', 'Gender', 'select', GENDER_OPTIONS],
                  ['date_of_birth', 'Date of Birth', 'date'],
                  ['mobile_number', 'Mobile Number', 'number'],
                  ['email_id', 'Email', 'text'],
                  ['designation', 'Designation', 'text'],
                  ['department_subject', 'Department', 'text'],
                  ['teacher_status', 'Status', 'select', STATUS_OPTIONS],
                  ];

                  return editFields.map(([name, label, type, options]) => {
                  const value = editForm?.[name];
                  if (type === 'select' && options) {
                    return (
                      <View key={name} style={styles.formGroup}>
                        <AppText style={styles.label} weight="semibold">{label}</AppText>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={value}
                            onValueChange={(val) => setEditForm((p: any) => ({ ...p, [name]: val }))}
                            style={styles.picker}
                            dropdownIconColor={C.muted}
                          >
                            {options.map((opt: string) => (
                              <Picker.Item key={opt} label={opt} value={opt} color={C.text} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View key={name} style={styles.formGroup}>
                      <AppText style={styles.label} weight="semibold">{label}</AppText>
                      <TextInput
                        style={styles.input}
                        value={value}
                        placeholderTextColor={C.muted}
                        onChangeText={(val) => setEditForm((p: any) => ({ ...p, [name]: val }))}
                      />
                    </View>
                  );
                  });
                })()}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={() => setEditTeacher(null)}>
                <AppText style={styles.cancelBtnText} weight="semibold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={saveEditTeacher} disabled={savingEdit}>
                <AppText style={styles.saveBtnText} weight="bold">{savingEdit ? 'Saving...' : 'Save Changes'}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: Theme.spacing.md,
    paddingBottom: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  kicker: {
    ...Theme.typography.label,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: 22, color: C.text, lineHeight: 28 },
  titleSub: { ...Theme.typography.caption, color: C.muted, lineHeight: 18, maxWidth: 320 },
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
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryBtnText: { color: C.text, fontSize: 13 },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  summaryRowStacked: {
    flexDirection: 'column',
  },
  summaryCard: {
    width: '32%',
    backgroundColor: C.card,
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
  summaryValue: { fontSize: 20, color: C.text },
  summaryLabel: { ...Theme.typography.label, color: C.muted, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    marginHorizontal: Theme.spacing.md,
    marginBottom: 12,
    padding: Theme.spacing.xs,
  },
  tab: { flex: 1, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: C.primarySoft, borderBottomWidth: 0 },
  tabText: { fontSize: 13, color: C.muted, textAlign: 'center' },
  activeTabText: { color: C.primary },
  errorBox: { margin: Theme.spacing.md, padding: 12, backgroundColor: C.errorSoft, borderRadius: 8, borderWidth: 1, borderColor: C.error },
  errorBoxText: { color: C.error, fontSize: 13 },
  successBox: { margin: Theme.spacing.md, padding: 12, backgroundColor: C.successSoft, borderRadius: 8, borderWidth: 1, borderColor: C.success },
  successBoxText: { color: C.success, fontSize: 13 },
  formCard: { backgroundColor: C.card, margin: Theme.spacing.md, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  formCardHeader: { padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  stepperWrapper: {
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepActive: {
    backgroundColor: '#6648dc',
    borderColor: '#6648dc',
  },
  stepDone: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  stepNumber: {
    ...Theme.typography.caption,
    color: C.muted,
  },
  stepNumberActive: {
    color: Theme.colors.card,
  },
  stepLabel: {
    fontSize: 10,
    color: C.muted,
  },
  stepLabelActive: {
    color: '#6648dc',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
    marginHorizontal: -15,
      },
  stepConnectorDone: {
    backgroundColor: C.success,
  },
  formBody: { padding: Theme.spacing.md },
  sectionTitle: { ...Theme.typography.body, color: C.text, marginBottom: 12, paddingBottom: Theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: C.border },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  formGroup: { flex: 1, minWidth: '45%' },
  formGroupFull: { width: '100%' },
  label: { ...Theme.typography.caption, color: C.muted, marginBottom: Theme.spacing.xs },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, ...Theme.typography.body, backgroundColor: Theme.colors.background, color: C.text },
  inputError: { borderColor: C.error },
  readOnlyInput: { backgroundColor: C.bg, color: C.muted, opacity: 0.7 },
  pickerContainer: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, overflow: 'hidden', backgroundColor: Theme.colors.background },
  picker: { height: 44, color: C.text },
  pickerSmall: { minWidth: 120, borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg },
  emailRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  emailInput: { flex: 1 },
  verifyBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 8 },
  verifyBtnSuccess: { backgroundColor: C.success },
  verifyBtnText: { color: Theme.colors.card, ...Theme.typography.caption },
  otpRow: { flexDirection: 'row', gap: 8, marginTop: Theme.spacing.sm },
  otpInput: { flex: 1 },
  hintText: { ...Theme.typography.label, color: C.muted, marginTop: Theme.spacing.xs },
  formFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Theme.spacing.md, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIndicator: { ...Theme.typography.caption, color: C.muted },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Theme.spacing.lg, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: Theme.colors.background },
  cancelBtnText: { color: Theme.colors.textSec, ...Theme.typography.body, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  nextBtnText: { color: Theme.colors.card, ...Theme.typography.body },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { color: Theme.colors.card, ...Theme.typography.body },
  previewHint: { ...Theme.typography.caption, color: C.muted, marginBottom: Theme.spacing.md },
  previewCard: { borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden', backgroundColor: C.card },
  previewHeader: { flexDirection: 'row', gap: 16, padding: Theme.spacing.md, backgroundColor: C.primary },
  previewPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  previewInitial: { fontSize: 24, color: Theme.colors.card },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 16, color: Theme.colors.card },
  previewDesignation: { ...Theme.typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewEmail: { ...Theme.typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: Theme.spacing.sm, paddingVertical: Theme.spacing.xs, borderRadius: 12, marginTop: 6 },
  previewStatusActive: { backgroundColor: 'rgba(16,185,129,0.3)' },
  previewStatusInactive: { backgroundColor: 'rgba(239,68,68,0.3)' },
  previewStatusText: { color: Theme.colors.card, fontSize: 10 },
  previewSectionTitle: { ...Theme.typography.label, color: C.primary, padding: 12, paddingBottom: Theme.spacing.sm, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  previewItem: { width: '50%', padding: 10, borderBottomWidth: 1, borderBottomColor: C.border, borderRightWidth: 1, borderRightColor: C.border },
  previewLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase' },
  previewValue: { ...Theme.typography.caption, color: C.text, marginTop: 2 },
  tableContainer: {
    backgroundColor: C.card,
    margin: Theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: Theme.colors.text,
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  filterBar: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  filterTitle: { ...Theme.typography.bodyMd, color: C.text },
  filterSubtitle: { ...Theme.typography.caption, color: C.muted, marginTop: 2 },
  filterBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primaryBorder },
  filterBadgeText: { ...Theme.typography.label, color: C.primary },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, height: 46, backgroundColor: C.bg },
  searchField: { flex: 1, ...Theme.typography.body, color: C.text },
  filterGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterGroupStack: { flexDirection: 'column' },
  filterRowMobile: { flexDirection: 'row', gap: 8, width: '100%', marginTop: Theme.spacing.xs },
  filterRowDesktop: { flexDirection: 'row', gap: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterBtnFullWidth: { width: '100%', justifyContent: 'center' },
  filterBtnText: { ...Theme.typography.caption, color: C.text },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: C.success },
  exportBtnText: { ...Theme.typography.caption, color: Theme.colors.card },
  table: { minWidth: 800 },
  mobileList: { padding: Theme.spacing.md, gap: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.bg, paddingVertical: 12, paddingHorizontal: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerCell: { ...Theme.typography.label, color: C.muted, textTransform: 'uppercase' },
  cellName: { width: '22%' },
  cellEmpId: { width: '10%' },
  cellContact: { width: '15%' },
  cellDesignation: { width: '15%' },
  cellDept: { width: '15%' },
  cellStatus: { width: '10%' },
  cellActions: { width: '10%' },
  teacherRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center', backgroundColor: C.card },
  teacherCellName: { width: '22%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  teacherAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  avatarText: { color: Theme.colors.card, fontSize: 13 },
  teacherName: { ...Theme.typography.body, color: C.text },
  teacherEmail: { ...Theme.typography.label, color: C.muted, marginTop: 2 },
  teacherCellEmpId: { width: '10%' },
  teacherCellContact: { width: '15%' },
  teacherCellDesignation: { width: '15%' },
  teacherCellDept: { width: '15%' },
  teacherCellStatus: { width: '10%' },
  teacherCellActions: { width: '10%', flexDirection: 'row', gap: 8 },
  teacherText: { fontSize: 13, color: C.text },
  teacherSubText: { ...Theme.typography.label, color: C.muted, marginTop: 2 },
  iconBtn: { padding: Theme.spacing.sm, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Theme.spacing.sm, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start', borderWidth: 1 },
  statusActive: { backgroundColor: C.successSoft },
  statusInactive: { backgroundColor: C.errorSoft },
  statusText: { fontSize: 10 },
  statusActiveText: { color: C.success },
  statusInactiveText: { color: C.error },
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  footerText: { ...Theme.typography.caption, color: C.muted },
  pagination: { flexDirection: 'row', gap: 6 },
  pageBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  pageBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { ...Theme.typography.caption, color: C.muted },
  pageBtnTextActive: { color: Theme.colors.card },
  loadingContainer: { padding: Theme.spacing.xxl, alignItems: 'center', backgroundColor: C.card },
  loadingText: { marginTop: 12, color: C.muted },
  emptyState: { alignItems: 'center', padding: Theme.spacing.xxl, backgroundColor: C.card },
  emptyTitle: { fontSize: 16, color: C.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: C.muted, marginTop: Theme.spacing.xs },
  teacherCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    gap: 12,
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
  teacherCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  teacherCardIdentityContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  teacherIdentity: { flex: 1, minWidth: 0 },
  teacherMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  teacherMetaItem: {
    width: '48%',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.sm,
  },
  teacherMetaLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 3 },
  teacherMetaValue: { fontSize: 13, color: C.text },
  teacherCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  teacherSubStack: { flex: 1, minWidth: 0 },
  teacherCardActions: { flexDirection: 'row', gap: 8 },
  cardActionBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardActionSecondary: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  cardActionPrimary: { backgroundColor: C.primary },
  cardActionSecondaryText: { ...Theme.typography.caption, color: C.primary },
  cardActionPrimaryText: { ...Theme.typography.caption, color: Theme.colors.card },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.md },
  modalContent: {
    backgroundColor: C.card,
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
  modalLarge: { width: '95%', maxWidth: 800 },
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
  modalTitle: { fontSize: 18, color: C.text, fontWeight: '700' },
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
  profileRole: { fontSize: 13, color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileSubText: { ...Theme.typography.caption, color: '#cbd5e1' },
  statusActiveCard: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  statusInactiveCard: { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  statusActiveCardText: { color: '#34d399' },
  statusInactiveCardText: { color: '#f87171' },
  detailSection: { gap: 10, marginTop: Theme.spacing.xs },
  detailSectionTitle: { ...Theme.typography.caption, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingHorizontal: 20, paddingVertical: Theme.spacing.md, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { color: Theme.colors.card, ...Theme.typography.body, fontWeight: '700' },
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
  detailLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  detailValue: { fontSize: 13, color: C.text, marginTop: 2, fontWeight: '600' },
  dateText: { ...Theme.typography.body, color: C.text },
  placeholderText: { ...Theme.typography.body, color: C.muted },
  errorText: { ...Theme.typography.label, color: C.error, marginTop: Theme.spacing.xs },
  photoZone: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: C.bg,
    marginTop: Theme.spacing.sm,
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
  photoText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: C.text,
    marginTop: Theme.spacing.sm,
  },
  photoSubtext: {
    ...Theme.typography.label,
    color: C.muted,
    marginTop: Theme.spacing.xs,
  },
  previewPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: Theme.spacing.md, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStrong: { color: C.text },
  headerContentContainer: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  headerToggle: {
    width: '100%',
  },
});
