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
  StatusBar,
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
} from 'lucide-react-native';
import API from '../../services/api';
import { colors } from '../../constants/theme';
import AppText from '../../components/common/AppText';
import { useAuth } from '../../context/AuthContext';

// Local theme bridge
const C = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.textPrimary,
  muted: colors.textMuted,
  primary: colors.primary,
  success: colors.success,
  successSoft: colors.successSoft,
  error: colors.error,
  errorSoft: colors.errorSoft,
  warning: colors.warning,
  warningSoft: colors.warningSoft,
};

const STEPS = ['Basics', 'Contact', 'Emergency', 'Employment', 'Preview'];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const DESIGNATION_OPTIONS = [
  'Teacher', 'Senior Teacher', 'Head of Department', 'Vice Principal',
  'Principal', 'Lab Assistant', 'Sports Teacher', 'Special Educator', 'Accountant'
];
const QUALIFICATION_OPTIONS = ['B.Ed', 'M.Ed', 'B.Sc + B.Ed', 'M.Sc + B.Ed', 'BA + B.Ed', 'MA + B.Ed', 'Ph.D', 'Other'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR'];
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const readLS = async (keys: string[]): Promise<string> => {
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

const getSchoolCode = async () => readLS(['school_code', 'schoolCode', 'school_id', 'schoolId']);
const getBranchId = async () => readLS(['branch_id', 'branchId', 'branch_code', 'branchCode']);

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
const isValidName = (v: string) => {
  const s = String(v || '').trim();
  if (!s) return false;
  return /^[a-zA-Z\s'-]+$/.test(s) && !/^\d+$/.test(s);
};
const isValidAadhaar = (v: string) => {
  const s = String(v || '').trim();
  if (!s) return true;
  return /^\d{12}$/.test(s);
};
const isValidMobile = (v: string) => /^\d{10}$/.test(String(v || '').trim());
const isValidPinCode = (v: string) => /^\d{6}$/.test(String(v || '').trim());

const calculateAge = (dob: string) => {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '';
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
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
    if (!form.teacher_full_name.trim()) errors.teacher_full_name = 'Full name is required';
    else if (!isValidName(form.teacher_full_name)) errors.teacher_full_name = 'Full name must contain only letters';
    if (!form.gender) errors.gender = 'Gender is required';
    if (!form.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!form.nationality.trim()) errors.nationality = 'Nationality is required';
    else if (!isValidName(form.nationality)) errors.nationality = 'Nationality must contain only letters';
    if (!form.mother_tongue.trim()) errors.mother_tongue = 'Mother tongue is required';
    else if (!isValidName(form.mother_tongue)) errors.mother_tongue = 'Mother tongue must contain only letters';
    if (!form.email_id.trim()) errors.email_id = 'Email is required';
    else if (!isValidEmail(form.email_id)) errors.email_id = 'Enter a valid email';
    if (!form.aadhaar_number.trim()) errors.aadhaar_number = 'Aadhaar number is required';
    else if (!isValidAadhaar(form.aadhaar_number)) errors.aadhaar_number = 'Aadhaar must be 12 digits';
  }

  if (step === 1) {
    if (!form.mobile_number.trim()) errors.mobile_number = 'Mobile is required';
    else if (!isValidMobile(form.mobile_number)) errors.mobile_number = 'Enter valid 10-digit number';
    if (!form.house_no.trim()) errors.house_no = 'House No is required';
    if (!form.street_locality.trim()) errors.street_locality = 'Street is required';
    if (!form.village_town_city.trim()) errors.village_town_city = 'City is required';
    if (!form.mandal_taluk.trim()) errors.mandal_taluk = 'Mandal/Taluk is required';
    if (!form.district.trim()) errors.district = 'District is required';
    if (!form.state.trim()) errors.state = 'State is required';
    if (!form.pin_code.trim()) errors.pin_code = 'Pin code is required';
    else if (!isValidPinCode(form.pin_code)) errors.pin_code = 'Enter valid 6-digit pin code';
  }

  if (step === 2) {
    if (!form.emergency_contact_name.trim()) errors.emergency_contact_name = 'Contact name is required';
    if (!form.emergency_contact_number.trim()) errors.emergency_contact_number = 'Contact number is required';
    else if (!isValidMobile(form.emergency_contact_number)) errors.emergency_contact_number = 'Enter valid 10-digit number';
    if (!form.emergency_contact_relationship.trim()) errors.emergency_contact_relationship = 'Relationship is required';
  }

  if (step === 3) {
    if (!form.designation.trim()) errors.designation = 'Designation is required';
    if (!form.department_subject.trim()) errors.department_subject = 'Department/Subject is required';
    if (!form.date_of_joining) errors.date_of_joining = 'Joining date is required';
    if (!form.password || String(form.password).length < 6) errors.password = 'Password must be at least 6 characters';
    if (!form.email_id.trim()) errors.email_id = 'Email is required';
    else if (!isValidEmail(form.email_id)) errors.email_id = 'Enter a valid email';
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
                isActive && styles.stepActive
              ]}>
                {isDone ? (
                  <Check size={14} color="#fff" />
                ) : (
                  <AppText style={[styles.stepNumber, isActive && styles.stepNumberActive]} weight="bold">{stepNumber}</AppText>
                )}
              </View>
              <AppText style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]} weight={isActive ? "bold" : "normal"} numberOfLines={1}>
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
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);
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

  const ITEMS_PER_PAGE = 10;

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
      if (activeTab === 'list') loadTeachers();
      else fetchNextEmployeeId();
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
    if (!schoolCode || !branchId) return;
    try {
      const res = await API.get('/hm/next-employee-id', { headers: getHeaders() });
      const nextEmployeeId = String(res?.data?.employee_id || '').trim();
      if (nextEmployeeId) {
        setFormData(prev => ({ ...prev, employee_id: nextEmployeeId }));
      }
    } catch (err) {
      console.error('Failed to fetch next employee ID:', err);
    }
  };

  const loadTeachers = async () => {
    if (!schoolCode || !branchId) return;
    setListLoading(true);
    setListErr('');

    try {
      const res = await API.get('/hm/teachers', { headers: getHeaders() });
      const rows = Array.isArray(res.data?.items) ? res.data.items : [];
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
        Alert.alert('Error', msg);
      }
      setServerError(msg);
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
      'district', 'state', 'village_town_city', 'mandal_taluk'
    ]);

    if (nameFields.has(name)) {
      value = value.replace(/[^a-zA-Z\s'-]/g, '');
    }

    // Number fields - only digits
    const numberFields = new Set([
      'mobile_number', 'alternate_mobile_number', 'emergency_contact_number',
      'pin_code', 'aadhaar_number', 'age', 'salary_amount', 'experience_years'
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
    if (step === 4) return;

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
        if (v !== null && v !== '') data.append(k, v);
      });

      const res = await API.post('/teacher/register', data, {
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
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
    if (!editTeacher || !editForm) return;

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
      await API.put(`/hm/teachers/${editTeacher.teacher_id}`, editForm, { headers: getHeaders() });
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
      const response = await API.get('/hm/teachers/download', {
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
    if (!sc || !bid) return '';
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const renderTeacherItem = (teacher: Teacher, index: number) => (
    <View key={teacher.teacher_id || index} style={styles.teacherRow}>
      <View style={styles.teacherCellName}>
        <View style={[styles.teacherAvatar, { backgroundColor: C.primary }]}>
          <AppText style={styles.avatarText} weight="bold">
            {teacher.teacher_full_name ? teacher.teacher_full_name.charAt(0).toUpperCase() : 'T'}
          </AppText>
        </View>
        <View>
          <AppText style={styles.teacherName} weight="semiBold">{teacher.teacher_full_name || '—'}</AppText>
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
        <TouchableOpacity style={styles.iconBtn} onPress={() => setViewTeacher(teacher)}>
          <Eye size={16} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditTeacher(teacher)}>
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
          <AppText style={styles.label} weight="semiBold">{label}</AppText>
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
          <AppText style={styles.label} weight="semiBold">{label}</AppText>
          <TouchableOpacity
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
        <AppText style={styles.label} weight="semiBold">{label}</AppText>
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
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />

      {/* Standardized Header */}
      <View style={styles.headerStandard}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="bold">Teacher Management</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          activeTab === 'list' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          ) : undefined
        }
      >
        {/* Sub Header */}
        <View style={styles.header}>
          <View>
            <AppText style={styles.title} weight="bold">
              {activeTab === 'list' ? 'Staff Directory' : 'Register Teacher'}{' '}
              <AppText style={styles.titleSub} weight="regular">
                {activeTab === 'list' ? `${filtered.length} records` : `Step ${step + 1} of ${STEPS.length}`}
              </AppText>
            </AppText>
          </View>
          <View style={styles.headerActions}>
            {activeTab === 'list' && (
              <>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleCopyLink}>
                  <Link size={14} color={C.text} />
                  <AppText style={styles.secondaryBtnText} weight="semiBold">{copied ? 'Copied!' : 'Invite'}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={async () => {
                    setActiveTab('enroll');
                    resetForm();
                    setServerError('');
                    setServerSuccess('');
                    await fetchNextEmployeeId();
                  }}
                >
                  <Plus size={14} color="#fff" />
                  <AppText style={styles.primaryBtnText} weight="semiBold">Add Teacher</AppText>
                </TouchableOpacity>
              </>
            )}
            {activeTab === 'enroll' && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setActiveTab('list')}>
                <ChevronLeft size={14} color={C.text} />
                <AppText style={styles.secondaryBtnText} weight="semiBold">Back</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'list' && styles.activeTab]}
            onPress={() => setActiveTab('list')}
          >
            <AppText style={[styles.tabText, activeTab === 'list' && styles.activeTabText]} weight="semiBold">Staff Directory</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'enroll' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('enroll');
              resetForm();
              setServerError('');
              setServerSuccess('');
              await fetchNextEmployeeId();
            }}
          >
            <AppText style={[styles.tabText, activeTab === 'enroll' && styles.activeTabText]} weight="semiBold">Register Teacher</AppText>
          </TouchableOpacity>
        </View>

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
                      <AppText style={styles.label} weight="semiBold">Age (auto-calculated)</AppText>
                      <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.age ? `${formData.age} years` : ''} editable={false} />
                    </View>
                    {renderFormField('blood_group', 'Blood Group', 'Select', 'select', BLOOD_GROUPS)}
                    {renderFormField('nationality', 'Nationality *', 'Indian', 'text')}
                    {renderFormField('mother_tongue', 'Mother Tongue *', '', 'text')}
                    <View style={styles.formGroupFull}>
                      <AppText style={styles.label} weight="semiBold">Email ID *</AppText>
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
                        <TouchableOpacity
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
                          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOtp} disabled={otpVerifying}>
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
                      <AppText style={styles.label} weight="semiBold">Employee ID</AppText>
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
                      <AppText style={styles.label} weight="semiBold">Email *</AppText>
                      <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.email_id} editable={false} />
                    </View>
                    {renderFormField('password', 'Password *', 'Min. 6 characters', 'text')}
                    {renderFormField('salary_amount', 'Salary Amount', 'Optional', 'number')}
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
                        <AppText style={styles.previewInitial} weight="bold">
                          {formData.teacher_full_name ? formData.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                        </AppText>
                      </View>
                      <View style={styles.previewInfo}>
                        <AppText style={styles.previewName} weight="bold">{formData.teacher_full_name || '—'}</AppText>
                        <AppText style={styles.previewDesignation}>
                          {formData.designation || '—'} · {formData.department_subject || '—'}
                        </AppText>
                        <AppText style={styles.previewEmail}>{formData.email_id || '—'}</AppText>
                        <View style={[styles.previewStatus, formData.teacher_status === 'ACTIVE' ? styles.previewStatusActive : styles.previewStatusInactive]}>
                          {formData.teacher_status === 'ACTIVE' ? (
                            <CheckCircle2 size={10} color="#fff" />
                          ) : (
                            <XCircle size={10} color="#fff" />
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
                          <AppText style={styles.previewValue} weight="semiBold">{value || '—'}</AppText>
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
                          <AppText style={styles.previewValue} weight="semiBold">{value || '—'}</AppText>
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
                          <AppText style={styles.previewValue} weight="semiBold">{value || '—'}</AppText>
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
                          <AppText style={styles.previewValue} weight="semiBold">{value || '—'}</AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={step === 0 ? () => setActiveTab('list') : prevStep} disabled={loading}>
                <ChevronLeft size={16} color={C.text} />
                <AppText style={styles.cancelBtnText} weight="semiBold">{step === 0 ? 'Cancel' : 'Back'}</AppText>
              </TouchableOpacity>
              <View style={styles.footerRight}>
                <AppText style={styles.stepIndicator}>{step + 1}/{STEPS.length}</AppText>
                {step < STEPS.length - 1 ? (
                  <TouchableOpacity style={styles.nextBtn} onPress={nextStep} disabled={loading}>
                    <AppText style={styles.nextBtnText} weight="semiBold">Next</AppText>
                    <ChevronRight size={16} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.submitBtn} onPress={submitTeacher} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} color="#fff" />
                        <AppText style={styles.submitBtnText} weight="semiBold">Register</AppText>
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
                  <TouchableOpacity onPress={() => setQ('')}>
                    <X size={14} color={C.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.filterGroup}>
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
                <TouchableOpacity style={styles.filterBtn} onPress={loadTeachers}>
                  <RefreshCw size={14} color={C.text} />
                  <AppText style={styles.filterBtnText} weight="semiBold">Refresh</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                  <Download size={14} color="#fff" />
                  <AppText style={styles.exportBtnText} weight="semiBold">Export</AppText>
                </TouchableOpacity>
              </View>
            </View>

            {listErr ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorBoxText}>{listErr}</AppText>
              </View>
            ) : null}

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

            <View style={styles.tableFooter}>
              <AppText style={styles.footerText}>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </AppText>
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} color={currentPage === 1 ? C.muted : C.text} />
                </TouchableOpacity>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                      onPress={() => setCurrentPage(p)}
                    >
                      <AppText style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]} weight={currentPage === p ? "bold" : "normal"}>{p}</AppText>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
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
              <TouchableOpacity onPress={() => setViewTeacher(null)}>
                <X size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailGrid}>
                {viewTeacher && Object.entries(viewTeacher).map(([key, value]) => (
                  <View key={key} style={styles.detailItem}>
                    <AppText style={styles.detailLabel} weight="bold">{key.replace(/_/g, ' ').toUpperCase()}</AppText>
                    <AppText style={styles.detailValue} weight="semiBold">{value || '—'}</AppText>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal visible={!!editTeacher} transparent animationType="slide" onRequestClose={() => setEditTeacher(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalLarge]}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} weight="bold">Edit Teacher</AppText>
              <TouchableOpacity onPress={() => setEditTeacher(null)}>
                <X size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGrid}>
                {editForm && [
                  ['teacher_full_name', 'Full Name', 'text'],
                  ['gender', 'Gender', 'select', GENDER_OPTIONS],
                  ['date_of_birth', 'Date of Birth', 'date'],
                  ['mobile_number', 'Mobile Number', 'number'],
                  ['email_id', 'Email', 'text'],
                  ['designation', 'Designation', 'text'],
                  ['department_subject', 'Department', 'text'],
                  ['teacher_status', 'Status', 'select', STATUS_OPTIONS],
                ].map(([name, label, type, options]) => {
                  const value = editForm[name];
                  if (type === 'select' && options) {
                    return (
                      <View key={name} style={styles.formGroup}>
                        <AppText style={styles.label} weight="semiBold">{label}</AppText>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={value}
                            onValueChange={(val) => setEditForm((p: any) => ({ ...p, [name]: val }))}
                            style={styles.picker}
                            dropdownIconColor={C.muted}
                          >
                            {options.map(opt => (
                              <Picker.Item key={opt} label={opt} value={opt} color={C.text} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View key={name} style={styles.formGroup}>
                      <AppText style={styles.label} weight="semiBold">{label}</AppText>
                      <TextInput
                        style={styles.input}
                        value={value}
                        placeholderTextColor={C.muted}
                        onChangeText={(val) => setEditForm((p: any) => ({ ...p, [name]: val }))}
                      />
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditTeacher(null)}>
                <AppText style={styles.cancelBtnText} weight="semiBold">Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEditTeacher} disabled={savingEdit}>
                <AppText style={styles.saveBtnText} weight="bold">{savingEdit ? 'Saving...' : 'Save Changes'}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* School Info Footer */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Home size={12} color={C.primary} />
          <AppText style={styles.footerText}>School: <AppText style={styles.footerStrong} weight="bold">{schoolCode || '—'}</AppText></AppText>
        </View>
        <View style={styles.footerItem}>
          <GitBranch size={12} color={C.primary} />
          <AppText style={styles.footerText}>Branch: <AppText style={styles.footerStrong} weight="bold">{branchId || '—'}</AppText></AppText>
        </View>
        <View style={styles.footerItem}>
          <Shield size={12} color={C.primary} />
          <AppText style={styles.footerText}>Role: <AppText style={styles.footerStrong} weight="bold">Head Master</AppText></AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerStandard: {
    backgroundColor: '#001F3F',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
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
  container: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12 },
  title: { fontSize: 20, color: C.text },
  titleSub: { fontSize: 12, color: C.muted },
  headerActions: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontSize: 13 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.text, fontSize: 13 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, marginHorizontal: 16 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabText: { fontSize: 14, color: C.muted },
  activeTabText: { color: C.primary },
  errorBox: { margin: 16, padding: 12, backgroundColor: C.errorSoft, borderRadius: 8, borderWidth: 1, borderColor: C.error },
  errorBoxText: { color: C.error, fontSize: 13 },
  successBox: { margin: 16, padding: 12, backgroundColor: C.successSoft, borderRadius: 8, borderWidth: 1, borderColor: C.success },
  successBoxText: { color: C.success, fontSize: 13 },
  formCard: { backgroundColor: C.card, margin: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  formCardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
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
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepActive: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  stepDone: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  stepNumber: {
    fontSize: 12,
    color: C.muted,
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: C.muted,
  },
  stepLabelActive: {
    color: '#001F3F',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
    marginHorizontal: -15,
    marginTop: -18,
  },
  stepConnectorDone: {
    backgroundColor: C.success,
  },
  formBody: { padding: 16 },
  sectionTitle: { fontSize: 14, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  formGroup: { flex: 1, minWidth: '45%' },
  formGroupFull: { width: '100%' },
  label: { fontSize: 12, color: C.muted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: C.bg, color: C.text },
  inputError: { borderColor: C.error },
  readOnlyInput: { backgroundColor: C.bg, color: C.muted, opacity: 0.7 },
  pickerContainer: { borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg },
  picker: { height: 44, color: C.text },
  pickerSmall: { minWidth: 120, borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg },
  emailRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  emailInput: { flex: 1 },
  verifyBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 8 },
  verifyBtnSuccess: { backgroundColor: C.success },
  verifyBtnText: { color: '#fff', fontSize: 12 },
  otpRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  otpInput: { flex: 1 },
  hintText: { fontSize: 11, color: C.muted, marginTop: 4 },
  formFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIndicator: { fontSize: 12, color: C.muted },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  cancelBtnText: { color: C.text, fontSize: 14 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  nextBtnText: { color: '#fff', fontSize: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { color: '#fff', fontSize: 14 },
  previewHint: { fontSize: 12, color: C.muted, marginBottom: 16 },
  previewCard: { borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden', backgroundColor: C.card },
  previewHeader: { flexDirection: 'row', gap: 16, padding: 16, backgroundColor: C.primary },
  previewPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  previewInitial: { fontSize: 24, color: '#fff' },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 16, color: '#fff' },
  previewDesignation: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  previewStatusActive: { backgroundColor: 'rgba(16,185,129,0.3)' },
  previewStatusInactive: { backgroundColor: 'rgba(239,68,68,0.3)' },
  previewStatusText: { color: '#fff', fontSize: 10 },
  previewSectionTitle: { fontSize: 11, color: C.primary, padding: 12, paddingBottom: 8, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  previewItem: { width: '50%', padding: 10, borderBottomWidth: 1, borderBottomColor: C.border, borderRightWidth: 1, borderRightColor: C.border },
  previewLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase' },
  previewValue: { fontSize: 12, color: C.text, marginTop: 2 },
  tableContainer: { backgroundColor: C.card, margin: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  filterBar: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, height: 40, backgroundColor: C.bg },
  searchField: { flex: 1, fontSize: 14, color: C.text },
  filterGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterBtnText: { fontSize: 12, color: C.text },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: C.success },
  exportBtnText: { fontSize: 12, color: '#fff' },
  table: { minWidth: 800 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.bg, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerCell: { fontSize: 11, color: C.muted, textTransform: 'uppercase' },
  cellName: { width: '22%' },
  cellEmpId: { width: '10%' },
  cellContact: { width: '15%' },
  cellDesignation: { width: '15%' },
  cellDept: { width: '15%' },
  cellStatus: { width: '10%' },
  cellActions: { width: '10%' },
  teacherRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center' },
  teacherCellName: { width: '22%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  teacherAvatar: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13 },
  teacherName: { fontSize: 14, color: C.text },
  teacherEmail: { fontSize: 11, color: C.muted },
  teacherCellEmpId: { width: '10%' },
  teacherCellContact: { width: '15%' },
  teacherCellDesignation: { width: '15%' },
  teacherCellDept: { width: '15%' },
  teacherCellStatus: { width: '10%' },
  teacherCellActions: { width: '10%', flexDirection: 'row', gap: 8 },
  teacherText: { fontSize: 13, color: C.text },
  teacherSubText: { fontSize: 11, color: C.muted, marginTop: 2 },
  iconBtn: { padding: 6, borderRadius: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusActive: { backgroundColor: C.successSoft },
  statusInactive: { backgroundColor: C.errorSoft },
  statusText: { fontSize: 10 },
  statusActiveText: { color: C.success },
  statusInactiveText: { color: C.error },
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  footerText: { fontSize: 12, color: C.muted },
  pagination: { flexDirection: 'row', gap: 6 },
  pageBtn: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  pageBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 12, color: C.muted },
  pageBtnTextActive: { color: '#fff' },
  loadingContainer: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 12, color: C.muted },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 16, color: C.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: C.muted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: C.card, borderRadius: 12, width: '90%', maxHeight: '80%', borderWidth: 1, borderColor: C.border },
  modalLarge: { width: '95%', maxWidth: 800 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 16, color: C.text },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  saveBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 14 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '48%', backgroundColor: C.bg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  detailLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: C.text, marginTop: 4 },
  dateText: { fontSize: 14, color: C.text },
  placeholderText: { fontSize: 14, color: C.muted },
  errorText: { fontSize: 11, color: C.error, marginTop: 4 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStrong: { color: C.text },
});