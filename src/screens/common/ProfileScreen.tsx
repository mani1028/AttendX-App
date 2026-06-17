import { Theme } from '../../theme/theme';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  StatusBar,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  LogOut,
  Key,
  Sliders,
  ChevronRight,
  User,
  Mail,
  Phone,
  Droplet,
  Briefcase,
  BookOpen,
  Grid,
  Home,
  MapPin,
  X,
  Eye,
  EyeOff,
  Check,
  Hash,
  ChevronDown,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { getStudentProfile, getStudentProfilePhotoDataUri, getStudentProfilePhotoUrl, getProfile as getStudentProfileDetails, sendOtp, verifyOtp, changePassword, updateStudentProfile } from '../../services/studentService';
import { getTeacherProfile, getTeacherProfilePhotoDataUri, getTeacherProfilePhotoUrl, updateTeacherProfile } from '../../services/teacherService';
import { buildApiUrl } from '../../services/api';
import API from '../../services/api';
import { formatErrorMessage } from '../../utils/helpers';
import { safeJsonParse } from '../../utils/storage';
import { decodeJwt } from '../../utils/jwt';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';
import AccountSwitcher from '../../components/common/AccountSwitcher';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  employee_id: string;
  teacher_id: string;
  student_id: string;
  school_name: string;
  school_code: string;
  branch_id: string;
  branch_name: string;
  role: string;
  designation: string;
  department_subject: string;
  date_of_joining: string;
  qualification: string;
  experience_years: string;
  address: string;
  blood_group: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  mother_tongue: string;
  religion: string;
  aadhaar_number: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  father_guardian_name: string;
  father_guardian_mobile: string;
  mother_guardian_name: string;
  mother_guardian_mobile: string;
  parent_guardian_email?: string;
  roll_number?: string;
  class_grade?: string;
  section?: string;
}

interface AppSettings {
  notifications: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
  autoSave: boolean;
  language: string;
}

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  return '';
};

const firstNonEmptyText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return '';
};

const normalizeRoleBucket = (role: string): 'student' | 'teacher' => {
  const key = String(role || '').trim().toLowerCase();
  return key === 'student' || key === 'students' ? 'student' : 'teacher';
};

const getPhotoCacheKey = (roleBucket: 'student' | 'teacher', id: string, schoolCode: string): string | null => {
  if (!id) return null;
  return `profile_photo_url:${roleBucket}:${schoolCode || 'unknown'}:${id}`;
};

const normalizePhotoUri = (value: unknown): string | null => {
  const photo = toText(value);
  if (!photo) return null;

  if (
    photo.startsWith('data:') ||
    photo.startsWith('http://') ||
    photo.startsWith('https://') ||
    photo.startsWith('file://') ||
    photo.startsWith('content://')
  ) {
    return photo;
  }

  if (photo.startsWith('/')) {
    return buildApiUrl(photo);
  }

  if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(photo)) {
    return photo;
  }

  const compact = photo.replace(/\s+/g, '');
  const likelyBase64 = compact.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
  if (likelyBase64) {
    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    return `data:image/jpeg;base64,${normalized}`;
  }

  return photo;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T | null> => {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout, userToken, userName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [userInfo, setUserInfo] = useState<UserProfile>({
    name: '', email: '', phone: '', employee_id: '', teacher_id: '', student_id: '',
    school_name: '', school_code: '', branch_id: '', branch_name: '', role: '',
    designation: '', department_subject: '', date_of_joining: '', qualification: '',
    experience_years: '', address: '', blood_group: '', date_of_birth: '',
    gender: '', nationality: '', mother_tongue: '', religion: '', aadhaar_number: '',
    emergency_contact_name: '', emergency_contact_number: '', father_guardian_name: '',
    father_guardian_mobile: '', mother_guardian_name: '', mother_guardian_mobile: '',
    parent_guardian_email: '',
  });

  const roleKey = String(userInfo.role || '').trim().toLowerCase();
  const isStudent = roleKey === 'student' || roleKey === 'students';
  const isDirector = roleKey === 'director' || roleKey === 'principal' || roleKey === 'admin';
  const isTeacher = roleKey === 'teacher' || roleKey === 'teachers' || roleKey === 'staff';

  const systemSettingsRoute = (() => {
    switch (roleKey) {
      case 'principal': return 'PrincipalSettings';
      case 'admin':
      case 'superadmin':
      case 'super_admin':
      case 'super admin':
        return 'AdminSettings';
      case 'accountant': return 'AccountantSettings';
      default: return null;
    }
  })();

  const [settings, setSettings] = useState<AppSettings>({
    notifications: true, emailAlerts: true, pushNotifications: true,
    autoSave: true, language: 'English',
  });
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editField, setEditField] = useState({ key: '', label: '', value: '' });

  // Password change states
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'otp-request' | 'otp-verify' | 'new-password'>(
    'otp-request'
  );
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeOtp, setPasswordChangeOtp] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedOtpToken, setVerifiedOtpToken] = useState('');

  const fetchProfileData = useCallback(async () => {
    try {
      const storedRole = (await AsyncStorage.getItem('userRole')) || (await AsyncStorage.getItem('role')) || 'student';
      const normalizedRole = String(storedRole).trim().toLowerCase();
      const roleBucket = normalizeRoleBucket(normalizedRole);

      const storedStudentId = (await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId')) || '';
      const storedTeacherId = (await AsyncStorage.getItem('teacher_id')) || '';
      const storedEmployeeId = (await AsyncStorage.getItem('employee_id')) || '';
      const storedSchoolCode = (await AsyncStorage.getItem('school_code')) || (await AsyncStorage.getItem('schoolCode')) || '';

      const entityId = roleBucket === 'student' ? storedStudentId : (storedTeacherId || storedEmployeeId);
      const profileCacheKey = entityId ? `profile_cache:${roleBucket}:${storedSchoolCode || 'unknown'}:${entityId}` : `profile_cache:${roleBucket}:${storedSchoolCode || 'unknown'}:anon`;
      const photoCacheKey = getPhotoCacheKey(roleBucket, entityId, storedSchoolCode);

      const cachedProfileRaw = await AsyncStorage.getItem(profileCacheKey);
      if (cachedProfileRaw && isMounted.current) {
        const parsed = safeJsonParse<Record<string, any>>(cachedProfileRaw, {});
        setUserInfo(prev => ({ ...prev, ...parsed }));
      }

      if (photoCacheKey) {
        const cachedPhoto = await AsyncStorage.getItem(photoCacheKey);
        if (cachedPhoto && isMounted.current) {
          setProfilePhotoUrl(cachedPhoto);
          setProfilePhotoError(false);
        } else if (isMounted.current) {
          setProfilePhotoUrl(null);
          setProfilePhotoError(false);
        }
      } else if (isMounted.current) {
        setProfilePhotoUrl(null);
        setProfilePhotoError(false);
      }

      const hadCache = !!cachedProfileRaw;
      if (hadCache && isMounted.current) setLoading(false);

      const refresh = async () => {
        let freshData: any = null;
        try {
          if (roleBucket === 'student') {
            if (storedStudentId && storedSchoolCode) {
              freshData = await withTimeout(getStudentProfileDetails(storedStudentId, storedSchoolCode), 5000);
            }
            if (!freshData) freshData = await withTimeout(getStudentProfile(), 5000);
          } else if (normalizedRole === 'director') {
            try {
              const profRes = await withTimeout(API.get('/director/profile'), 5000);
              if (profRes && profRes.data) {
                freshData = profRes.data.director || profRes.data.profile || profRes.data.user || profRes.data;
              }
            } catch (err) {
              console.warn('Failed to fetch GET /director/profile, trying overview...', err);
              try {
                const overviewRes = await withTimeout(API.get('/director/dashboard/overview'), 5000);
                if (overviewRes && overviewRes.data) {
                  freshData = overviewRes.data.director || overviewRes.data.profile || overviewRes.data.user || null;
                }
              } catch (err2) {
                console.warn('Failed to fetch director overview:', err2);
              }
            }
          } else if (normalizedRole === 'principal' || (normalizedRole !== 'admin')) {
            freshData = await withTimeout(getTeacherProfile(), 5000);
          }
        } catch (e) {
          console.warn('Failed to fetch profile:', e);
        }

        if (!isMounted.current) return;

        const storedUserRaw = await AsyncStorage.getItem('user');
        const storedUser = safeJsonParse<Record<string, any>>(storedUserRaw, {});

        const [
          storedEmail,
          storedPhone,
          storedMobile,
          storedMobileNumber,
          storedBranchName,
          storedBranchId,
          storedSchoolName,
          storedSchoolCodeFromStore,
          storedTeacherId2,
          storedEmployeeId2,
          storedStudentId2,
          storedBloodGroup,
          storedAddress,
          storedPrincipalEmployeeId,
          storedPrincipalEmail,
          storedPrincipalMobile,
          storedPrincipalAddress,
          storedDirectorEmail,
          storedDirectorEmployeeId,
        ] =
          await AsyncStorage.multiGet([
            'email',
            'phone',
            'mobile',
            'mobile_number',
            'branch_name',
            'branch_id',
            'school_name',
            'school_code',
            'teacher_id',
            'employee_id',
            'student_id',
            'blood_group',
            'address',
            'principal_employee_id',
            'principal_email',
            'principal_mobile',
            'principal_address',
            'director_email',
            'director_employee_id',
          ]).then(items => items.map(([, value]) => value || ''));

        const profileSource = (freshData as any) || {};
        const resolvedProfile = {
          ...profileSource,
          role: firstNonEmptyText(profileSource?.role, normalizedRole, 'student'),
          name: firstNonEmptyText(
            profileSource?.name,
            profileSource?.full_name,
            profileSource?.teacher_full_name,
            profileSource?.student_full_name,
            profileSource?.director_name,
            userName,
            storedUser?.name,
            storedUser?.director_name
          ),
          email: firstNonEmptyText(
            profileSource?.email,
            profileSource?.email_id,
            profileSource?.email_address,
            profileSource?.director_email,
            storedEmail,
            storedDirectorEmail,
            storedPrincipalEmail,
            storedUser?.email,
            storedUser?.principal_email,
            storedUser?.director_email
          ),
          phone: firstNonEmptyText(
            profileSource?.phone,
            profileSource?.mobile,
            profileSource?.mobile_number,
            profileSource?.phone_number,
            profileSource?.director_phone,
            profileSource?.director_mobile,
            storedPhone,
            storedMobile,
            storedMobileNumber,
            storedPrincipalMobile,
            storedUser?.phone,
            storedUser?.mobile,
            storedUser?.principal_mobile,
            storedUser?.director_phone
          ),
          branch_name: firstNonEmptyText(
            profileSource?.branch_name,
            profileSource?.branchName,
            typeof profileSource?.branch === 'object' && profileSource?.branch !== null ? (profileSource?.branch?.branch_name || profileSource?.branch?.name) : profileSource?.branch,
            storedBranchName,
            storedUser?.branch_name
          ),
          branch_id: firstNonEmptyText(profileSource?.branch_id, profileSource?.branchId, storedBranchId, storedUser?.branch_id),
          school_name: firstNonEmptyText(
            profileSource?.school_name,
            profileSource?.schoolName,
            typeof profileSource?.school === 'object' && profileSource?.school !== null ? (profileSource?.school?.school_name || profileSource?.school?.name) : profileSource?.school,
            storedSchoolName,
            storedUser?.school_name
          ),
          school_code: firstNonEmptyText(profileSource?.school_code, profileSource?.schoolCode, storedSchoolCodeFromStore, storedUser?.school_code),
          teacher_id: firstNonEmptyText(profileSource?.teacher_id, storedTeacherId2, storedUser?.teacher_id),
          employee_id: firstNonEmptyText(
            profileSource?.employee_id,
            profileSource?.director_employee_id,
            storedEmployeeId2,
            storedDirectorEmployeeId,
            storedPrincipalEmployeeId,
            storedUser?.employee_id,
            storedUser?.principal_employee_id,
            storedUser?.director_employee_id
          ),
          student_id: firstNonEmptyText(profileSource?.student_id, storedStudentId2, storedUser?.student_id),
          parent_guardian_email: firstNonEmptyText(profileSource?.parent_guardian_email, profileSource?.parent_email, profileSource?.guardian_email, profileSource?.father_email, profileSource?.mother_email, profileSource?.father_guardian_email, storedUser?.parent_guardian_email),
          designation: firstNonEmptyText(profileSource?.designation, profileSource?.teacher_designation, storedUser?.designation),
          department_subject: firstNonEmptyText(profileSource?.department_subject, profileSource?.department, profileSource?.subject, storedUser?.department_subject),
          address: firstNonEmptyText(
            profileSource?.address,
            profileSource?.director_address,
            storedAddress,
            storedPrincipalAddress,
            storedUser?.address,
            storedUser?.principal_address,
            storedUser?.director_address
          ),
          blood_group: firstNonEmptyText(profileSource?.blood_group, profileSource?.bloodGroup, profileSource?.blood_type, storedBloodGroup, storedUser?.blood_group),
          date_of_birth: firstNonEmptyText(profileSource?.date_of_birth, storedUser?.date_of_birth),
          gender: firstNonEmptyText(profileSource?.gender, storedUser?.gender),
          nationality: firstNonEmptyText(profileSource?.nationality, storedUser?.nationality),
          mother_tongue: firstNonEmptyText(profileSource?.mother_tongue, storedUser?.mother_tongue),
          religion: firstNonEmptyText(profileSource?.religion, storedUser?.religion),
          aadhaar_number: firstNonEmptyText(profileSource?.aadhaar_number, storedUser?.aadhaar_number),
          date_of_joining: firstNonEmptyText(profileSource?.date_of_joining, storedUser?.date_of_joining),
          qualification: firstNonEmptyText(profileSource?.qualification, storedUser?.qualification),
          experience_years: firstNonEmptyText(profileSource?.experience_years, profileSource?.experience, storedUser?.experience_years),
          roll_number: firstNonEmptyText(profileSource?.roll_number, profileSource?.roll_no, profileSource?.rollNo, storedUser?.roll_number),
          class_grade: firstNonEmptyText(profileSource?.class_grade, profileSource?.class, storedUser?.class_grade),
          section: firstNonEmptyText(profileSource?.section, storedUser?.section),
          emergency_contact_name: firstNonEmptyText(profileSource?.emergency_contact_name, storedUser?.emergency_contact_name),
          emergency_contact_number: firstNonEmptyText(profileSource?.emergency_contact_number, storedUser?.emergency_contact_number),
          father_guardian_name: firstNonEmptyText(profileSource?.father_guardian_name, profileSource?.father_name, profileSource?.fatherName, storedUser?.father_guardian_name),
          father_guardian_mobile: firstNonEmptyText(profileSource?.father_guardian_mobile, profileSource?.father_mobile, profileSource?.father_phone, storedUser?.father_guardian_mobile),
          mother_guardian_name: firstNonEmptyText(profileSource?.mother_guardian_name, profileSource?.mother_name, profileSource?.motherName, storedUser?.mother_guardian_name),
          mother_guardian_mobile: firstNonEmptyText(profileSource?.mother_guardian_mobile, profileSource?.mother_mobile, profileSource?.mother_phone, storedUser?.mother_guardian_mobile),
        };

        if (isMounted.current) {
          if (normalizedRole === 'principal') {
            const decodedToken = decodeJwt(userToken) || {};
            resolvedProfile.employee_id = resolvedProfile.employee_id || profileSource?.principal_employee_id || storedUser?.principal_employee_id || storedPrincipalEmployeeId || decodedToken.principal_employee_id || decodedToken.sub;
            resolvedProfile.email = resolvedProfile.email || profileSource?.principal_email || storedUser?.principal_email || storedPrincipalEmail;
            resolvedProfile.phone = resolvedProfile.phone || profileSource?.principal_mobile || storedUser?.principal_mobile || storedPrincipalMobile;
            resolvedProfile.address = resolvedProfile.address || profileSource?.principal_address || storedUser?.principal_address || storedPrincipalAddress;
            resolvedProfile.branch_id = resolvedProfile.branch_id || profileSource?.branch_id || storedUser?.branch_id || storedBranchId || decodedToken.branch_id;
            resolvedProfile.school_code = resolvedProfile.school_code || profileSource?.school_code || storedUser?.school_code || storedSchoolCodeFromStore || decodedToken.school_code;
          }
        
          resolvedProfile.school_name = resolvedProfile.school_name || resolvedProfile.school_code || 'Unknown School';

          setUserInfo(prev => ({ ...prev, ...resolvedProfile, role: resolvedProfile.role || prev.role || 'student' }));
        }

        const directProfilePhoto = normalizePhotoUri(
          profileSource?.profile_photo_url ||
          profileSource?.photo_url ||
          profileSource?.photo_path ||
          (roleBucket === 'student' ? profileSource?.student_photograph : profileSource?.teacher_photograph)
        );

        const resolvedEntityId = roleBucket === 'student'
          ? firstNonEmptyText(resolvedProfile.student_id, storedStudentId, storedStudentId2)
          : firstNonEmptyText(resolvedProfile.teacher_id, resolvedProfile.employee_id, storedTeacherId, storedEmployeeId, storedTeacherId2, storedEmployeeId2);

        const resolvedPhotoCacheKey = getPhotoCacheKey(
          roleBucket,
          resolvedEntityId,
          resolvedProfile.school_code || storedSchoolCode,
        );

        let resolvedPhoto = directProfilePhoto;
        if (!resolvedPhoto && resolvedEntityId && freshData) {
          try {
            resolvedPhoto = roleBucket === 'student'
              ? ((await withTimeout(Promise.resolve(getStudentProfilePhotoDataUri(resolvedEntityId, storedSchoolCode)))) ||
                (await withTimeout(Promise.resolve(getStudentProfilePhotoUrl(resolvedEntityId, resolvedProfile.school_code || storedSchoolCode)))))
              : ((await withTimeout(Promise.resolve(getTeacherProfilePhotoDataUri(resolvedEntityId, resolvedProfile.school_code || storedSchoolCode)))) ||
                (await withTimeout(Promise.resolve(getTeacherProfilePhotoUrl(resolvedEntityId, resolvedProfile.school_code || storedSchoolCode)))));
          } catch (photoError) {
            console.warn('Error fetching profile photo:', photoError);
          }
        }

        if (resolvedPhoto && isMounted.current) {
          if (resolvedPhotoCacheKey) {
            await AsyncStorage.setItem(resolvedPhotoCacheKey, resolvedPhoto);
          }
          setProfilePhotoUrl(resolvedPhoto);
          setProfilePhotoError(false);
        } else if (isMounted.current) {
          setProfilePhotoUrl(null);
          setProfilePhotoError(false);
        }

        try {
          await AsyncStorage.setItem(profileCacheKey, JSON.stringify(resolvedProfile));
        } catch (e) {
        }

        const savedSettings = await AsyncStorage.getItem('app_settings');
        if (savedSettings && isMounted.current) {
          setSettings(safeJsonParse<AppSettings>(savedSettings, settings));
        }
      };

      if (hadCache) {
        void refresh();
      } else {
        await refresh();
      }

    } catch (error: any) {
      console.error('Profile fetch error:', error);
      if (isMounted.current && error?.response?.status !== 401) {
        Alert.alert(
          'Profile Error',
          'Could not load profile information. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userName, userToken]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // Password validation functions
  const isStrongPassword = (pwd: string): boolean => {
    const p = String(pwd || '');
    return (
      p.length >= 8 &&
      /[A-Z]/.test(p) &&
      /[a-z]/.test(p) &&
      /\d/.test(p) &&
      /[^A-Za-z0-9]/.test(p)
    );
  };

  const getPasswordStrength = (pwd: string) => ({
    minLength: String(pwd || '').length >= 8,
    hasUpper: /[A-Z]/.test(String(pwd || '')),
    hasLower: /[a-z]/.test(String(pwd || '')),
    hasNumber: /\d/.test(String(pwd || '')),
    hasSpecial: /[^A-Za-z0-9]/.test(String(pwd || '')),
  });

  // Password change handlers
  const handleRequestOtp = async () => {
    const targetEmail = isStudent ? (userInfo.parent_guardian_email || userInfo.email) : userInfo.email;
    if (!targetEmail) {
      setPasswordChangeError('Email not found in profile');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      await sendOtp(targetEmail);
      setPasswordChangeStep('otp-verify');
      setPasswordChangeSuccess(`OTP sent to ${targetEmail}`);
      setTimeout(() => setPasswordChangeSuccess(''), 3000);
    } catch (err: any) {
      setPasswordChangeError(
        formatErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || err?.message || 'Failed to send OTP. Please try again.'
      );
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!passwordChangeOtp || passwordChangeOtp.length < 4) {
      setPasswordChangeError('Please enter a valid OTP');
      return;
    }

    const targetEmail = isStudent ? (userInfo.parent_guardian_email || userInfo.email) : userInfo.email;
    if (!targetEmail) {
      setPasswordChangeError('Email not found in profile');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      const result = await verifyOtp(targetEmail, passwordChangeOtp);
      setVerifiedOtpToken(result.token || passwordChangeOtp);
      setPasswordChangeStep('new-password');
      setPasswordChangeSuccess('OTP verified successfully');
      setTimeout(() => setPasswordChangeSuccess(''), 2000);
    } catch (err: any) {
      setPasswordChangeError(
        formatErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || err?.message || 'Invalid OTP. Please try again.'
      );
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordChangeError('');

    if (!newPassword || !confirmPassword) {
      setPasswordChangeError('Please enter both passwords');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setPasswordChangeError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      );
      return;
    }

    const targetEmail = isStudent ? (userInfo.parent_guardian_email || userInfo.email) : userInfo.email;
    if (!targetEmail) {
      setPasswordChangeError('Email not found in profile');
      return;
    }

    setPasswordChangeLoading(true);

    try {
      await changePassword(targetEmail, newPassword, passwordChangeOtp);
      setPasswordChangeSuccess('Password changed successfully!');
      setTimeout(() => {
        setShowPasswordChangeModal(false);
        resetPasswordChangeModal();
      }, 2000);
    } catch (err: any) {
      setPasswordChangeError(
        formatErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || err?.message || 'Failed to change password. Please try again.'
      );
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const resetPasswordChangeModal = () => {
    setPasswordChangeStep('otp-request');
    setPasswordChangeOtp('');
    setPasswordChangeError('');
    setPasswordChangeSuccess('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setVerifiedOtpToken('');
  };

  const handlePasswordChangeModalClose = () => {
    setShowPasswordChangeModal(false);
    resetPasswordChangeModal();
  };

  const handleUpdateProfile = async () => {
    if (!editField.key) return;

    setEditLoading(true);
    try {
      const updateData = { [editField.key]: editField.value };

      if (isStudent) {
        await updateStudentProfile(updateData);
      } else if (isDirector) {
        const { buildApiUrl } = require('../../services/api');
        const API = require('../../services/api').default;
        const body = { ...updateData };
        if (editField.key === 'phone') {
          body.director_phone = editField.value;
          body.director_mobile = editField.value;
          body.mobile = editField.value;
        } else if (editField.key === 'email') {
          body.director_email = editField.value;
        } else if (editField.key === 'name') {
          body.director_name = editField.value;
        } else if (editField.key === 'address') {
          body.director_address = editField.value;
        }
        await API.put('/director/profile', body);
      } else {
        await updateTeacherProfile(updateData);
      }

      setUserInfo(prev => ({ ...prev, [editField.key]: editField.value }));
      Alert.alert('Success', `${editField.label} updated successfully`);
      setShowEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message) || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const renderInfoRow = (label: string, value: string | undefined, IconComponent: any, fieldKey?: string) => {
    const RowComponent = (fieldKey && isDirector) ? TouchableOpacity : View;
    return (
      <RowComponent 
        style={styles.infoRow}
        onPress={fieldKey && isDirector ? () => {
          setEditField({ key: fieldKey, label, value: value || '' });
          setShowEditModal(true);
        } : undefined}
      >
        <View style={styles.iconCircle}>
          <IconComponent size={18} color={Theme.colors.blue} />
        </View>
        <View style={styles.infoContent}>
          <AppText style={styles.infoLabel}>{label}</AppText>
          <AppText style={styles.infoValue}>{value || '—'}</AppText>
        </View>
        {fieldKey && isDirector && (
          <View style={styles.editIcon}>
            <AppText style={{ fontSize: 12, color: Theme.colors.blue, fontWeight: '600' }}>Edit</AppText>
          </View>
        )}
      </RowComponent>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('MainTabs');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>My Profile</AppText>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSummary}>
          {profilePhotoUrl && !profilePhotoError ? (
            <Image
              source={{
                uri: profilePhotoUrl,
                headers: userToken ? { Authorization: `Bearer ${userToken}` } : undefined
              }}
              style={styles.profileAvatarImage}
              onError={() => setProfilePhotoError(true)}
            />
          ) : (
            <AvatarBubble
              displayName={userInfo.name || 'User'}
              size={80}
              textSize={28}
              primaryColor={Theme.colors.blue}
            />
          )}
          <TouchableOpacity style={styles.profileTextInfo} onPress={() => setShowAccountSwitcher(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={styles.userName}>{userInfo.name}</AppText>
              <ChevronDown size={20} color="#fff" style={{ marginLeft: 6 }} />
            </View>
            <AppText style={styles.userRole}>
              {userInfo.role?.toUpperCase() || 'STUDENT'} • ID: {userInfo.student_id || userInfo.employee_id}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Basic Information</AppText>
          <AppCard style={styles.infoCard}>
            {isDirector && (
              <>
                {renderInfoRow('Full Name', userInfo.name, User, 'name')}
                <View style={styles.divider} />
                {renderInfoRow('Email', userInfo.email, Mail, 'email')}
                
                {roleKey !== 'admin' && (
                  <>
                    <View style={styles.divider} />
                    {renderInfoRow('Phone', userInfo.phone, Phone, 'phone')}
                    <View style={styles.divider} />
                    {renderInfoRow('Address', userInfo.address, MapPin, 'address')}
                  </>
                )}
              </>
            )}
            {isStudent && (
              <>
                {renderInfoRow('Roll Number', userInfo.roll_number, Hash)}
                <View style={styles.divider} />
                {renderInfoRow('Class', userInfo.class_grade, BookOpen)}
                <View style={styles.divider} />
                {renderInfoRow('Section', userInfo.section, Grid)}
                <View style={styles.divider} />
                {renderInfoRow('Blood Group', userInfo.blood_group, Droplet)}
              </>
            )}
            {!isStudent && !isDirector && (
              <>
                {renderInfoRow('Blood Group', userInfo.blood_group, Droplet)}
              </>
            )}
          </AppCard>
        </View>

        {!isStudent && !isDirector && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Professional Details</AppText>
            <AppCard style={styles.infoCard}>
              {renderInfoRow('Designation', userInfo.designation, Briefcase)}
              <View style={styles.divider} />
              {renderInfoRow('Department', userInfo.department_subject, BookOpen)}
            </AppCard>
          </View>
        )}

        {isStudent && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Parental Information</AppText>
            <AppCard style={styles.infoCard}>
              {renderInfoRow('Father Name', userInfo.father_guardian_name, User)}
              <View style={styles.divider} />
              {renderInfoRow('Father Mobile', userInfo.father_guardian_mobile, Phone)}
              <View style={styles.divider} />
              {renderInfoRow('Parent Email', userInfo.parent_guardian_email, Mail)}
            </AppCard>
          </View>
        )}

        {!isStudent && !isDirector && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Contact Information</AppText>
            <AppCard style={styles.infoCard}>
              {renderInfoRow('Email', userInfo.email, Mail)}
              <View style={styles.divider} />
              {renderInfoRow('Phone', userInfo.phone, Phone)}
              <View style={styles.divider} />
              {renderInfoRow('Address', userInfo.address, MapPin)}
            </AppCard>
          </View>
        )}
        {(!isDirector || roleKey === 'principal') && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Organization</AppText>
            <AppCard style={styles.infoCard}>
              {renderInfoRow('School', userInfo.school_name, Home)}
              <View style={styles.divider} />
              {renderInfoRow('Branch', userInfo.branch_name, MapPin)}
              <View style={styles.divider} />
              {renderInfoRow('Branch ID', userInfo.branch_id, Hash)}
            </AppCard>
          </View>
        )}

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Account Settings</AppText>
          <AppCard style={styles.infoCard}>
            {systemSettingsRoute ? (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => systemSettingsRoute && (navigation as any).navigate(systemSettingsRoute)}
                >
                  <View style={styles.menuIconContainer}>
                    <Sliders size={18} color="#0f172a" />
                  </View>
                  <AppText style={styles.menuText}>Settings</AppText>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
                <View style={styles.divider} />
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
                  <View style={styles.menuIconContainer}>
                    <Sliders size={18} color="#0f172a" />
                  </View>
                  <AppText style={styles.menuText}>App Settings</AppText>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
                <View style={styles.divider} />
              </>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowPasswordChangeModal(true)}
            >
              <View style={styles.menuIconContainer}>
                <Key size={18} color="#0f172a" />
              </View>
              <AppText style={styles.menuText}>Change Password</AppText>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </AppCard>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Edit {editField.label}</AppText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.passwordInputGroup}>
                <AppText style={styles.passwordInputLabel}>{editField.label}</AppText>
                <TextInput
                  style={styles.passwordInput}
                  value={editField.value}
                  onChangeText={(text) => setEditField({ ...editField, value: text })}
                  placeholder={`Enter ${editField.label.toLowerCase()}`}
                  placeholderTextColor="#cbd5e1"
                  autoFocus
                />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1, marginRight: 10 }]}
                onPress={() => setShowEditModal(false)}
              >
                <AppText style={styles.cancelBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <AppButton
                title={editLoading ? "Saving..." : "Save Changes"}
                onPress={handleUpdateProfile}
                disabled={editLoading}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal - Simplified for consistent UI */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>App Settings</AppText>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.settingRow}>
                <AppText style={styles.settingLabel}>Push Notifications</AppText>
                <Switch value={settings.notifications} onValueChange={(v) => setSettings({...settings, notifications: v})} />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setShowSettingsModal(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal visible={showPasswordChangeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Change Password</AppText>
              <TouchableOpacity onPress={handlePasswordChangeModalClose}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Error and Success Messages */}
              {passwordChangeError && (
                <View style={styles.errorAlert}>
                  <AppText style={styles.errorAlertText}>{passwordChangeError}</AppText>
                </View>
              )}
              {passwordChangeSuccess && (
                <View style={styles.successAlert}>
                  <AppText style={styles.successAlertText}>{passwordChangeSuccess}</AppText>
                </View>
              )}

              {/* Step 1: Request OTP */}
              {passwordChangeStep === 'otp-request' && (
                <View>
                  <AppText style={styles.passwordStepLabel}>Step 1: Request OTP</AppText>
                  <AppText style={styles.passwordStepDesc}>
                    We'll send an OTP to: {isStudent ? (userInfo.parent_guardian_email || userInfo.email) : userInfo.email}
                  </AppText>
                  <AppButton
                    title={passwordChangeLoading ? 'Sending...' : 'Send OTP'}
                    onPress={handleRequestOtp}
                    disabled={passwordChangeLoading}
                    style={styles.passwordModalButton}
                  />
                </View>
              )}

              {/* Step 2: Verify OTP */}
              {passwordChangeStep === 'otp-verify' && (
                <View>
                  <AppText style={styles.passwordStepLabel}>Step 2: Verify OTP</AppText>
                  <AppText style={styles.passwordStepDesc}>
                    Enter the OTP sent to your email
                  </AppText>
                  <View style={styles.passwordInputGroup}>
                    <AppText style={styles.passwordInputLabel}>OTP Code</AppText>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter 4-6 digit OTP"
                      placeholderTextColor="#cbd5e1"
                      value={passwordChangeOtp}
                      onChangeText={setPasswordChangeOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!passwordChangeLoading}
                    />
                  </View>
                  <AppButton
                    title={passwordChangeLoading ? 'Verifying...' : 'Verify OTP'}
                    onPress={handleVerifyOtp}
                    disabled={passwordChangeLoading || !passwordChangeOtp}
                    style={styles.passwordModalButton}
                  />
                </View>
              )}

              {/* Step 3: New Password */}
              {passwordChangeStep === 'new-password' && (
                <View>
                  <AppText style={styles.passwordStepLabel}>Step 3: Set New Password</AppText>

                  {/* New Password Input */}
                  <View style={styles.passwordInputGroup}>
                    <AppText style={styles.passwordInputLabel}>New Password</AppText>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInputField}
                        placeholder="Enter new password"
                        placeholderTextColor="#cbd5e1"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        editable={!passwordChangeLoading}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggleIcon}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <Eye size={18} color="#64748b" />
                        ) : (
                          <EyeOff size={18} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.passwordInputGroup}>
                    <AppText style={styles.passwordInputLabel}>Confirm Password</AppText>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInputField}
                        placeholder="Re-enter password"
                        placeholderTextColor="#cbd5e1"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        editable={!passwordChangeLoading}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggleIcon}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <Eye size={18} color="#64748b" />
                        ) : (
                          <EyeOff size={18} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Password Strength Requirements */}
                  {newPassword && (
                    <View style={styles.passwordRequirements}>
                      <AppText style={styles.passwordReqTitle}>Password must have:</AppText>
                      <PasswordRequirement
                        met={getPasswordStrength(newPassword).minLength}
                        text="At least 8 characters"
                      />
                      <PasswordRequirement
                        met={getPasswordStrength(newPassword).hasUpper}
                        text="At least 1 uppercase (A-Z)"
                      />
                      <PasswordRequirement
                        met={getPasswordStrength(newPassword).hasLower}
                        text="At least 1 lowercase (a-z)"
                      />
                      <PasswordRequirement
                        met={getPasswordStrength(newPassword).hasNumber}
                        text="At least 1 number (0-9)"
                      />
                      <PasswordRequirement
                        met={getPasswordStrength(newPassword).hasSpecial}
                        text="At least 1 special character"
                      />
                    </View>
                  )}

                  <AppButton
                    title={passwordChangeLoading ? 'Changing Password...' : 'Change Password'}
                    onPress={handleChangePassword}
                    disabled={
                      passwordChangeLoading ||
                      !newPassword ||
                      !confirmPassword ||
                      !isStrongPassword(newPassword)
                    }
                    style={styles.passwordModalButton}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <AccountSwitcher visible={showAccountSwitcher} onClose={() => setShowAccountSwitcher(false)} />
    </View>
  );
}

// Password Requirement Component
const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <View style={styles.passwordReq}>
    {met ? (
      <Check size={14} color="#059669" />
    ) : (
      <View style={styles.passwordReqDot} />
    )}
    <AppText style={[styles.passwordReqText, met && styles.passwordReqTextMet]}>
      {text}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileTextInfo: {
    marginLeft: 20,
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Theme.colors.blue,
    backgroundColor: '#e2e8f0',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  userRole: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  editIcon: {
    padding: 6,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
  },
  passwordStepLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  passwordStepDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 18,
  },
  passwordInputGroup: {
    marginBottom: 16,
  },
  passwordInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingRight: 8,
  },
  passwordInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  passwordToggleIcon: {
    padding: 6,
  },
  passwordRequirements: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  passwordReqTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  passwordReq: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  passwordReqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    marginRight: 10,
  },
  passwordReqText: {
    fontSize: 12,
    color: '#64748b',
  },
  passwordReqTextMet: {
    color: '#059669',
    fontWeight: '600',
  },
  passwordModalButton: {
    marginTop: 12,
    marginBottom: 8,
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  errorAlertText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  successAlertText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
});
