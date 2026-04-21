import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
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
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import API from '../../services/api';

const Colors = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primarySoft: '#dbeafe',
  success: '#059669',
  danger: '#dc2626',
  bg: '#f8fafc',
  cardBg: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
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

export default function TeacherPage() {
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
  const [preview, setPreview] = useState<string | null>(null);
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
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadCredentials();
  }, []);

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
    setPreview(null);
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
        responseType: 'blob',
      });

      const blob = response.data;
      if (!blob || !blob.size) throw new Error('Export returned empty file');

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const filename = `teachers_${schoolCode}_${branchId}.csv`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;
        await RNFS.writeFile(filePath, base64Data.split(',')[1], 'base64');
        await Share.open({
          url: `file://${filePath}`,
          type: 'text/csv',
          title: 'Export Teachers',
        });
      };
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Download failed');
    }
  };

  const buildTeacherInviteLink = () => {
    const sc = String(schoolCode || '').trim();
    const bid = String(branchId || '').trim();
    if (!sc || !bid) return '';
    return `https://yourapp.com/teacher-registration?school_code=${encodeURIComponent(sc)}&branch_id=${encodeURIComponent(bid)}`;
  };

  const handleCopyLink = async () => {
    const url = buildTeacherInviteLink();
    if (!url) {
      setListErr('School code or branch id missing.');
      return;
    }
    // On React Native, we can show the link in an Alert for copying
    Alert.alert('Invite Link', url, [
      { text: 'Copy', onPress: () => {
        // Copy to clipboard using AsyncStorage or a library
        setInviteLink(url);
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
        <View style={styles.teacherAvatar}>
          <Text style={styles.avatarText}>
            {teacher.teacher_full_name ? teacher.teacher_full_name.charAt(0).toUpperCase() : 'T'}
          </Text>
        </View>
        <View>
          <Text style={styles.teacherName}>{teacher.teacher_full_name || '—'}</Text>
          <Text style={styles.teacherEmail}>{teacher.email_id || '—'}</Text>
        </View>
      </View>
      <View style={styles.teacherCellEmpId}>
        <Text style={styles.teacherText}>{teacher.employee_id || '—'}</Text>
      </View>
      <View style={styles.teacherCellContact}>
        <Text style={styles.teacherText}>{teacher.mobile_number || '—'}</Text>
        <Text style={styles.teacherSubText}>{teacher.gender || '—'}{teacher.age ? ` • ${teacher.age}y` : ''}</Text>
      </View>
      <View style={styles.teacherCellDesignation}>
        <Text style={styles.teacherText}>{teacher.designation || '—'}</Text>
      </View>
      <View style={styles.teacherCellDept}>
        <Text style={styles.teacherText}>{teacher.department_subject || '—'}</Text>
      </View>
      <View style={styles.teacherCellStatus}>
        <View style={[styles.statusPill, teacher.teacher_status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
          <Icon name={teacher.teacher_status === 'ACTIVE' ? 'check-circle' : 'x-circle'} size={10} color={teacher.teacher_status === 'ACTIVE' ? '#059669' : '#dc2626'} />
          <Text style={[styles.statusText, teacher.teacher_status === 'ACTIVE' ? styles.statusActiveText : styles.statusInactiveText]}>
            {teacher.teacher_status || 'INACTIVE'}
          </Text>
        </View>
      </View>
      <View style={styles.teacherCellActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setViewTeacher(teacher)}>
          <Icon name="eye" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditTeacher(teacher)}>
          <Icon name="edit-2" size={16} color={Colors.textTertiary} />
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
          <Text style={styles.label}>{label}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={value}
              onValueChange={(val) => handleChange(name, val)}
              style={styles.picker}
            >
              <Picker.Item label={`Select ${label}`} value="" />
              {options.map(opt => (
                <Picker.Item key={opt} label={opt} value={opt} />
              ))}
            </Picker>
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );
    }

    if (type === 'date') {
      return (
        <View key={name} style={styles.formGroup}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={[styles.input, error && styles.inputError]}
            onPress={() => {
              setDatePickerField(name as any);
              setShowDatePicker(true);
            }}
          >
            <Text style={value ? styles.dateText : styles.placeholderText}>
              {value || `Select ${label}`}
            </Text>
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );
    }

    return (
      <View key={name} style={styles.formGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => handleChange(name, text)}
          keyboardType={type === 'number' ? 'numeric' : 'default'}
          secureTextEntry={name === 'password'}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          activeTab === 'list' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              Teacher Management{' '}
              <Text style={styles.titleSub}>
                {activeTab === 'list' ? `${filtered.length} records` : `Step ${step + 1} of ${STEPS.length}`}
              </Text>
            </Text>
          </View>
          <View style={styles.headerActions}>
            {activeTab === 'list' && (
              <>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleCopyLink}>
                  <Icon name="link" size={14} color={Colors.textSecondary} />
                  <Text style={styles.secondaryBtnText}>{copied ? 'Copied!' : 'Invite'}</Text>
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
                  <Icon name="plus" size={14} color="#fff" />
                  <Text style={styles.primaryBtnText}>Add Teacher</Text>
                </TouchableOpacity>
              </>
            )}
            {activeTab === 'enroll' && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setActiveTab('list')}>
                <Icon name="chevron-left" size={14} color={Colors.textSecondary} />
                <Text style={styles.secondaryBtnText}>Back</Text>
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
            <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>Staff Directory</Text>
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
            <Text style={[styles.tabText, activeTab === 'enroll' && styles.activeTabText]}>Register Teacher</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {serverError && activeTab === 'enroll' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{serverError}</Text>
          </View>
        )}
        {serverSuccess && activeTab === 'enroll' && (
          <View style={styles.successBox}>
            <Text style={styles.successBoxText}>{serverSuccess}</Text>
          </View>
        )}

        {/* Enrollment Form */}
        {activeTab === 'enroll' && (
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <View style={styles.stepsContainer}>
                {STEPS.map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.stepItem}
                    onPress={() => i <= step && setStep(i)}
                    disabled={i > step}
                  >
                    <View style={[
                      styles.stepCircle,
                      step > i && styles.stepCompleted,
                      step === i && styles.stepActive,
                      i > step && styles.stepInactive,
                    ]}>
                      {step > i ? <Icon name="check" size={12} color="#fff" /> : <Text style={styles.stepNumber}>{i + 1}</Text>}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      step === i && styles.stepLabelActive,
                      step > i && styles.stepLabelCompleted,
                    ]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formBody}>
              {step === 0 && (
                <>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  <View style={styles.formGrid}>
                    {renderFormField('branch_id', 'Branch ID', '', 'text')}
                    {renderFormField('teacher_full_name', 'Full Name *', 'e.g. Ramesh Kumar', 'text')}
                    {renderFormField('gender', 'Gender *', 'Select Gender', 'select', GENDER_OPTIONS)}
                    {renderFormField('date_of_birth', 'Date of Birth *', '', 'date')}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Age (auto-calculated)</Text>
                      <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.age ? `${formData.age} years` : ''} editable={false} />
                    </View>
                    {renderFormField('blood_group', 'Blood Group', 'Select', 'select', BLOOD_GROUPS)}
                    {renderFormField('nationality', 'Nationality *', 'Indian', 'text')}
                    {renderFormField('mother_tongue', 'Mother Tongue *', '', 'text')}
                    <View style={styles.formGroupFull}>
                      <Text style={styles.label}>Email ID *</Text>
                      <View style={styles.emailRow}>
                        <TextInput
                          style={[styles.input, styles.emailInput, fieldErrors.email_id && styles.inputError]}
                          placeholder="teacher@email.com"
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
                          <Text style={styles.verifyBtnText}>
                            {emailVerified ? 'Verified' : otpSending ? 'Sending...' : 'Verify'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {fieldErrors.email_id && <Text style={styles.errorText}>{fieldErrors.email_id}</Text>}
                      {otpSent && !emailVerified && (
                        <View style={styles.otpRow}>
                          <TextInput
                            style={[styles.input, styles.otpInput]}
                            placeholder="Enter OTP"
                            value={otp}
                            onChangeText={setOtp}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOtp} disabled={otpVerifying}>
                            <Text style={styles.verifyBtnText}>{otpVerifying ? 'Verifying...' : 'Verify OTP'}</Text>
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
                  <Text style={styles.sectionTitle}>Contact & Address</Text>
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
                  <Text style={styles.sectionTitle}>Emergency Contact</Text>
                  <View style={styles.formGrid}>
                    {renderFormField('emergency_contact_name', 'Contact Name *', '', 'text')}
                    {renderFormField('emergency_contact_number', 'Contact Number *', '10-digit mobile', 'number')}
                    {renderFormField('emergency_contact_relationship', 'Relationship *', '', 'text')}
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.sectionTitle}>Employment Details</Text>
                  <View style={styles.formGrid}>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Employee ID</Text>
                      <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={formData.employee_id}
                        editable={false}
                      />
                      <Text style={styles.hintText}>Employee ID will be assigned after save.</Text>
                    </View>
                    {renderFormField('designation', 'Designation *', '', 'select', DESIGNATION_OPTIONS)}
                    {renderFormField('department_subject', 'Department / Subject *', '', 'text')}
                    {renderFormField('qualification', 'Qualification', '', 'select', QUALIFICATION_OPTIONS)}
                    {renderFormField('experience_years', 'Experience (Years)', '0-50', 'number')}
                    {renderFormField('date_of_joining', 'Date of Joining *', '', 'date')}
                    {renderFormField('employment_type', 'Employment Type', '', 'select', EMPLOYMENT_TYPES)}
                    {renderFormField('teacher_status', 'Teacher Status', '', 'select', STATUS_OPTIONS)}
                    <View style={styles.formGroupFull}>
                      <Text style={styles.label}>Email *</Text>
                      <TextInput style={[styles.input, styles.readOnlyInput]} value={formData.email_id} editable={false} />
                    </View>
                    {renderFormField('password', 'Password *', 'Min. 6 characters', 'text')}
                    {renderFormField('salary_amount', 'Salary Amount', 'Optional', 'number')}
                  </View>
                </>
              )}

              {step === 4 && (
                <>
                  <Text style={styles.sectionTitle}>Registration Preview</Text>
                  <Text style={styles.previewHint}>Review all details before submitting.</Text>

                  <View style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                      <View style={styles.previewPhoto}>
                        {preview ? (
                          <Image source={{ uri: preview }} style={styles.previewImage} />
                        ) : (
                          <Text style={styles.previewInitial}>
                            {formData.teacher_full_name ? formData.teacher_full_name.charAt(0).toUpperCase() : 'T'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.previewInfo}>
                        <Text style={styles.previewName}>{formData.teacher_full_name || '—'}</Text>
                        <Text style={styles.previewDesignation}>
                          {formData.designation || '—'} · {formData.department_subject || '—'}
                        </Text>
                        <Text style={styles.previewEmail}>{formData.email_id || '—'}</Text>
                        <View style={[styles.previewStatus, formData.teacher_status === 'ACTIVE' ? styles.previewStatusActive : styles.previewStatusInactive]}>
                          <Icon name={formData.teacher_status === 'ACTIVE' ? 'check-circle' : 'x-circle'} size={10} color="#fff" />
                          <Text style={styles.previewStatusText}>{formData.teacher_status}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.previewSectionTitle}>Personal Information</Text>
                    <View style={styles.previewGrid}>
                      {[
                        ['Gender', formData.gender], ['Date of Birth', formData.date_of_birth],
                        ['Age', formData.age], ['Blood Group', formData.blood_group || '—'],
                        ['Nationality', formData.nationality], ['Mother Tongue', formData.mother_tongue],
                        ['Religion', formData.religion || '—'], ['Marital Status', formData.marital_status || '—'],
                        ['Aadhaar', formData.aadhaar_number || '—'],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <Text style={styles.previewLabel}>{label}</Text>
                          <Text style={styles.previewValue}>{value || '—'}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.previewSectionTitle}>Contact & Address</Text>
                    <View style={styles.previewGrid}>
                      {[
                        ['Mobile', formData.mobile_number], ['Alt Mobile', formData.alternate_mobile_number || '—'],
                        ['House No', formData.house_no], ['Street', formData.street_locality],
                        ['City', formData.village_town_city], ['Mandal', formData.mandal_taluk],
                        ['District', formData.district], ['State', formData.state],
                        ['Pin Code', formData.pin_code],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <Text style={styles.previewLabel}>{label}</Text>
                          <Text style={styles.previewValue}>{value || '—'}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.previewSectionTitle}>Emergency Contact</Text>
                    <View style={styles.previewGrid}>
                      {[
                        ['Contact Name', formData.emergency_contact_name],
                        ['Contact Number', formData.emergency_contact_number],
                        ['Relationship', formData.emergency_contact_relationship],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <Text style={styles.previewLabel}>{label}</Text>
                          <Text style={styles.previewValue}>{value || '—'}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.previewSectionTitle}>Employment Details</Text>
                    <View style={styles.previewGrid}>
                      {[
                        ['Employee ID', formData.employee_id], ['Designation', formData.designation],
                        ['Department', formData.department_subject], ['Qualification', formData.qualification || '—'],
                        ['Experience', formData.experience_years ? `${formData.experience_years} yrs` : '—'],
                        ['Joining Date', formData.date_of_joining], ['Employment Type', formData.employment_type],
                        ['Salary', formData.salary_amount || '—'],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.previewItem}>
                          <Text style={styles.previewLabel}>{label}</Text>
                          <Text style={styles.previewValue}>{value || '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={step === 0 ? () => setActiveTab('list') : prevStep} disabled={loading}>
                <Icon name="chevron-left" size={16} color={Colors.textSecondary} />
                <Text style={styles.cancelBtnText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
              </TouchableOpacity>
              <View style={styles.footerRight}>
                <Text style={styles.stepIndicator}>{step + 1}/{STEPS.length}</Text>
                {step < STEPS.length - 1 ? (
                  <TouchableOpacity style={styles.nextBtn} onPress={nextStep} disabled={loading}>
                    <Text style={styles.nextBtnText}>Next</Text>
                    <Icon name="chevron-right" size={16} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.submitBtn} onPress={submitTeacher} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="check-circle" size={16} color="#fff" />
                        <Text style={styles.submitBtnText}>Register</Text>
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
                <Icon name="search" size={14} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchField}
                  placeholder="Search name, ID, email, mobile..."
                  value={q}
                  onChangeText={setQ}
                  placeholderTextColor={Colors.textMuted}
                />
                {q ? (
                  <TouchableOpacity onPress={() => setQ('')}>
                    <Icon name="x" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.filterGroup}>
                <View style={styles.pickerSmall}>
                  <Picker
                    selectedValue={statusFilter}
                    onValueChange={setStatusFilter}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Status" value="all" />
                    <Picker.Item label="Active" value="active" />
                    <Picker.Item label="Inactive" value="inactive" />
                  </Picker>
                </View>
                <View style={styles.pickerSmall}>
                  <Picker
                    selectedValue={deptFilter}
                    onValueChange={setDeptFilter}
                    style={styles.picker}
                  >
                    {departments.map(d => (
                      <Picker.Item key={d} label={d === 'all' ? 'All Departments' : d} value={d} />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity style={styles.filterBtn} onPress={loadTeachers}>
                  <Icon name="refresh-cw" size={14} color={Colors.textSecondary} />
                  <Text style={styles.filterBtnText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                  <Icon name="download" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>

            {listErr ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{listErr}</Text>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.cellName]}>Teacher</Text>
                  <Text style={[styles.headerCell, styles.cellEmpId]}>Emp ID</Text>
                  <Text style={[styles.headerCell, styles.cellContact]}>Contact</Text>
                  <Text style={[styles.headerCell, styles.cellDesignation]}>Designation</Text>
                  <Text style={[styles.headerCell, styles.cellDept]}>Department</Text>
                  <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                  <Text style={[styles.headerCell, styles.cellActions]}>Actions</Text>
                </View>

                {listLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading teachers...</Text>
                  </View>
                ) : paginated.length > 0 ? (
                  paginated.map((teacher, idx) => renderTeacherItem(teacher, idx))
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="users" size={48} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No teachers found</Text>
                    <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.tableFooter}>
              <Text style={styles.footerText}>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </Text>
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <Icon name="chevron-left" size={14} color={currentPage === 1 ? Colors.textMuted : Colors.textSecondary} />
                </TouchableOpacity>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
                      onPress={() => setCurrentPage(p)}
                    >
                      <Text style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <Icon name="chevron-right" size={14} color={currentPage === totalPages ? Colors.textMuted : Colors.textSecondary} />
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
              <Text style={styles.modalTitle}>Teacher Details</Text>
              <TouchableOpacity onPress={() => setViewTeacher(null)}>
                <Icon name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailGrid}>
                {viewTeacher && Object.entries(viewTeacher).map(([key, value]) => (
                  <View key={key} style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.detailValue}>{value || '—'}</Text>
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
              <Text style={styles.modalTitle}>Edit Teacher</Text>
              <TouchableOpacity onPress={() => setEditTeacher(null)}>
                <Icon name="x" size={20} color={Colors.textSecondary} />
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
                        <Text style={styles.label}>{label}</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={value}
                            onValueChange={(val) => setEditForm((p: any) => ({ ...p, [name]: val }))}
                            style={styles.picker}
                          >
                            {options.map(opt => (
                              <Picker.Item key={opt} label={opt} value={opt} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View key={name} style={styles.formGroup}>
                      <Text style={styles.label}>{label}</Text>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={(val) => setEditForm((p: any) => ({ ...p, [name]: val }))}
                      />
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditTeacher(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEditTeacher} disabled={savingEdit}>
                <Text style={styles.saveBtnText}>{savingEdit ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* School Info Footer */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Icon name="home" size={12} color={Colors.primary} />
          <Text style={styles.footerText}>School: <Text style={styles.footerStrong}>{schoolCode || '—'}</Text></Text>
        </View>
        <View style={styles.footerItem}>
          <Icon name="git-branch" size={12} color={Colors.primary} />
          <Text style={styles.footerText}>Branch: <Text style={styles.footerStrong}>{branchId || '—'}</Text></Text>
        </View>
        <View style={styles.footerItem}>
          <Icon name="shield" size={12} color={Colors.primary} />
          <Text style={styles.footerText}>Role: <Text style={styles.footerStrong}>Head Master</Text></Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  titleSub: { fontSize: 12, color: Colors.textTertiary, fontWeight: '400' },
  headerActions: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.cardBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginHorizontal: 16 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  activeTabText: { color: Colors.primary },
  errorBox: { margin: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  errorBoxText: { color: Colors.danger, fontSize: 13 },
  successBox: { margin: 16, padding: 12, backgroundColor: '#d1fae5', borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0' },
  successBoxText: { color: Colors.success, fontSize: 13 },
  formCard: { backgroundColor: Colors.cardBg, margin: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' },
  formCardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: '#f8fafc' },
  stepsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.borderLight },
  stepActive: { backgroundColor: Colors.primary },
  stepCompleted: { backgroundColor: Colors.success },
  stepInactive: { backgroundColor: Colors.borderLight, opacity: 0.5 },
  stepNumber: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  stepLabel: { fontSize: 10, marginTop: 4, color: Colors.textMuted, textAlign: 'center' },
  stepLabelActive: { color: Colors.primary, fontWeight: '600' },
  stepLabelCompleted: { color: Colors.success },
  formBody: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  formGroup: { flex: 1, minWidth: '45%' },
  formGroupFull: { width: '100%' },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: Colors.bg },
  inputError: { borderColor: Colors.danger },
  readOnlyInput: { backgroundColor: '#f1f5f9', color: Colors.textMuted },
  pickerContainer: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 8, overflow: 'hidden' },
  picker: { height: 44 },
  pickerSmall: { minWidth: 120, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 8, overflow: 'hidden' },
  emailRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  emailInput: { flex: 1 },
  verifyBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  verifyBtnSuccess: { backgroundColor: Colors.success },
  verifyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  otpInput: { flex: 1 },
  hintText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  formFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: '#f8fafc' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIndicator: { fontSize: 12, color: Colors.textMuted },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  previewHint: { fontSize: 12, color: Colors.textTertiary, marginBottom: 16 },
  previewCard: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', gap: 16, padding: 16, backgroundColor: Colors.primary },
  previewPhoto: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: 64, height: 64, borderRadius: 32 },
  previewInitial: { fontSize: 24, fontWeight: '700', color: '#fff' },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  previewDesignation: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  previewStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  previewStatusActive: { backgroundColor: 'rgba(16,185,129,0.3)' },
  previewStatusInactive: { backgroundColor: 'rgba(239,68,68,0.3)' },
  previewStatusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  previewSectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.primary, padding: 12, paddingBottom: 8, backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  previewItem: { width: '50%', padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, borderRightWidth: 1, borderRightColor: Colors.borderLight },
  previewLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  previewValue: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  tableContainer: { backgroundColor: Colors.cardBg, margin: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden' },
  filterBar: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 8, paddingHorizontal: 12, height: 40, backgroundColor: Colors.bg },
  searchField: { flex: 1, fontSize: 14 },
  filterGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.success },
  exportBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  table: { minWidth: 800 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCell: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  cellName: { width: '22%' },
  cellEmpId: { width: '10%' },
  cellContact: { width: '15%' },
  cellDesignation: { width: '15%' },
  cellDept: { width: '15%' },
  cellStatus: { width: '10%' },
  cellActions: { width: '10%' },
  teacherRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, alignItems: 'center' },
  teacherCellName: { width: '22%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  teacherAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  teacherName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  teacherEmail: { fontSize: 11, color: Colors.textTertiary },
  teacherCellEmpId: { width: '10%' },
  teacherCellContact: { width: '15%' },
  teacherCellDesignation: { width: '15%' },
  teacherCellDept: { width: '15%' },
  teacherCellStatus: { width: '10%' },
  teacherCellActions: { width: '10%', flexDirection: 'row', gap: 8 },
  teacherText: { fontSize: 13, color: Colors.textPrimary },
  teacherSubText: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  iconBtn: { padding: 6, borderRadius: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusActive: { backgroundColor: '#d1fae5' },
  statusInactive: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '600' },
  statusActiveText: { color: Colors.success },
  statusInactiveText: { color: Colors.danger },
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: '#f8fafc' },
  footerText: { fontSize: 12, color: Colors.textTertiary },
  pagination: { flexDirection: 'row', gap: 6 },
  pageBtn: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  pageBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 12, color: Colors.textSecondary },
  pageBtnTextActive: { color: '#fff' },
  loadingContainer: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textMuted },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: 12 },
  emptyText: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: Colors.cardBg, borderRadius: 12, width: '90%', maxHeight: '80%' },
  modalLarge: { width: '95%', maxWidth: 800 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '48%', backgroundColor: Colors.bg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight },
  detailLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 4 },
  dateText: { fontSize: 14, color: Colors.textPrimary },
  placeholderText: { fontSize: 14, color: Colors.textMuted },
  errorText: { fontSize: 11, color: Colors.danger, marginTop: 4 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, backgroundColor: Colors.cardBg, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStrong: { fontWeight: '700', color: Colors.textPrimary },
});