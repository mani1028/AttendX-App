import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import {
  getStudentProfile,
  getStudentProfilePhotoDataUri,
  getStudentProfilePhotoUrl,
  getProfile as getStudentProfileDetails,
  updateStudentProfile,
} from '../../services/studentService';
import {
  getTeacherProfile,
  getTeacherProfilePhotoDataUri,
  getTeacherProfilePhotoUrl,
  updateTeacherProfile,
} from '../../services/teacherService';
import API from '../../services/api';
import { authService } from '../../api/authService';
import { updateUserData } from '../../utils/authSession';
import * as adminService from '../../services/adminService';
import { getAccountantProfile } from '../../services/accountantService';
import { formatErrorMessage, resolveStudentRollNumber } from '../../utils/helpers';
import { safeJsonParse } from '../../utils/storage';
import { decodeJwt } from '../../utils/jwt';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import {
  firstNonEmptyText,
  getPhotoCacheKey,
  getProfileSubtitle,
  getRoleFlags,
  getSystemSettingsRoute,
  isStrongPassword,
  mapOtpErrorMessage,
  normalizePhotoUri,
  normalizeRoleBucket,
  withTimeout,
} from './helpers';
import { AppSettings, DEFAULT_APP_SETTINGS, EditField, EMPTY_USER_PROFILE, PasswordChangeStep } from './types';

export function useProfileScreen() {
  const { logout, userToken, userName, setTabBarVisible } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setTabBarVisible(true);
    return () => {
      isMounted.current = false;
      setTabBarVisible(true);
    };
  }, [setTabBarVisible]);

  const [userInfo, setUserInfo] = useState(EMPTY_USER_PROFILE);
  const { roleKey, isAgent, isStudent, isAdminPanel, isDirector, isAccountant } = getRoleFlags(userInfo.role);
  const studentRollNumber = isStudent
    ? resolveStudentRollNumber(userInfo.roll_number, userInfo.roll_no)
    : '';
  const systemSettingsRoute = getSystemSettingsRoute(roleKey);
  const profileSubtitle = getProfileSubtitle(userInfo, roleKey, isAgent, isAdminPanel, studentRollNumber);
  const passwordTargetEmail = isStudent
    ? (userInfo.parent_guardian_email || userInfo.email)
    : userInfo.email;

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editField, setEditField] = useState<EditField>({ key: '', label: '', value: '' });

  // Password change states
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<PasswordChangeStep>('otp-request');
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
      const storedRole = (await storage.getString(StorageKeys.USER_ROLE)) || (await storage.getString(StorageKeys.USER_ROLE)) || 'student';
      const normalizedRole = String(storedRole).trim().toLowerCase();
      const roleBucket = normalizeRoleBucket(normalizedRole);

      const storedStudentId = (await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('studentId')) || '';
      const storedTeacherId = (await AsyncStorage.getItem('teacher_id')) || '';
      const storedEmployeeId = (await storage.getString(StorageKeys.EMPLOYEE_ID)) || '';
      const storedSchoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';

      const entityId = roleBucket === 'student' ? storedStudentId : (storedTeacherId || storedEmployeeId);
      const profileCacheKey = entityId ? `profile_cache:${roleBucket}:${storedSchoolCode || 'unknown'}:${entityId}` : `profile_cache:${roleBucket}:${storedSchoolCode || 'unknown'}:anon`;
      const isDirOrAdmin =
        normalizedRole === 'director' ||
        normalizedRole === 'admin' ||
        normalizedRole === 'superadmin' ||
        normalizedRole === 'super_admin' ||
        normalizedRole === 'super admin' ||
        normalizedRole === 'administrator';
      const photoCacheKey = (!isDirOrAdmin && entityId) ? getPhotoCacheKey(roleBucket, entityId, storedSchoolCode) : null;

      const cachedProfileRaw = await AsyncStorage.getItem(profileCacheKey);
      if (cachedProfileRaw && isMounted.current) {
        const parsed = safeJsonParse<Record<string, any>>(cachedProfileRaw, {});
        const sanitizedRoll = resolveStudentRollNumber(parsed.roll_number, parsed.roll_no);
        if (sanitizedRoll) {
          parsed.roll_number = sanitizedRoll;
          parsed.roll_no = sanitizedRoll;
        } else {
          delete parsed.roll_number;
          delete parsed.roll_no;
        }
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
      if (hadCache && isMounted.current) {setLoading(false);}

      const refresh = async () => {
        let freshData: any = null;
        try {
          if (roleBucket === 'student') {
            if (storedStudentId && storedSchoolCode) {
              freshData = await withTimeout(getStudentProfileDetails(storedStudentId, storedSchoolCode));
            }
            if (!freshData) {freshData = await withTimeout(getStudentProfile());}
          } else if (normalizedRole === 'director') {
            try {
              const profileRes = await withTimeout(
                API.get('/director/profile', { suppressFallback404Log: true } as any),
              );
              if (profileRes?.data) {
                freshData =
                  profileRes.data.director ||
                  profileRes.data.profile ||
                  profileRes.data.user ||
                  profileRes.data;
              }
            } catch (err) {
              console.warn('Failed to fetch director profile:', err);
            }
            if (!freshData) {
              try {
                const overviewRes = await withTimeout(
                  API.get('/director/dashboard/overview', { suppressFallback404Log: true } as any),
                );
                if (overviewRes?.data) {
                  freshData =
                    overviewRes.data.director ||
                    overviewRes.data.profile ||
                    overviewRes.data.user ||
                    overviewRes.data.school ||
                    null;
                }
              } catch (err) {
                console.warn('Failed to fetch director overview:', err);
              }
            }
          } else if (normalizedRole === 'agent') {
            try {
              const res = await withTimeout(adminService.getAgentMe());
              const agent = res?.agent ?? res;
              if (agent && typeof agent === 'object') {
                freshData = {
                  name: agent.full_name ?? agent.name,
                  username: agent.username,
                  email: agent.email,
                  can_register_school: agent.can_register_school,
                  can_view_payments: agent.can_view_payments,
                  can_edit_features: agent.can_edit_features,
                };
              }
            } catch (err) {
              console.warn('Failed to fetch agent profile:', err);
            }
          } else if (normalizedRole === 'principal') {
            try {
              const storedBranchId = (await AsyncStorage.getItem('branch_id')) || '';
              const decodedToken = decodeJwt(userToken) || {};
              const branchId = storedBranchId || decodedToken.branch_id;
              if (branchId) {
                const res = await withTimeout(API.get(`/director/branch/${branchId}`));
                if (res && res.data) {
                  const branchData = res.data;
                  freshData = {
                    name: branchData.principal_name,
                    email: branchData.principal_email,
                    address: branchData.principal_address,
                    employee_id: branchData.principal_employee_id,
                    branch_id: branchData.branch_id,
                    branch_name: branchData.branch_name,
                  };
                }
              }
            } catch (err) {
              console.warn('Failed to fetch principal branch details:', err);
            }
          } else if (normalizedRole === 'accountant') {
            try {
              const data = await withTimeout(
                getAccountantProfile({
                  name: userName || undefined,
                  role: normalizedRole,
                }),
              );
              if (data) {
                freshData = {
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  employee_id: data.employeeId,
                  school_code: data.schoolCode,
                  school_name: data.schoolCode,
                  branch_id: data.branchId,
                  branch_name: data.branchName,
                  designation: data.designation,
                  department_subject: data.department,
                  date_of_joining: data.joinedAt,
                  role: data.role || 'accountant',
                };
              }
            } catch (err) {
              console.warn('Failed to fetch accountant profile:', err);
            }
          } else if (!isDirOrAdmin && normalizedRole !== 'principal' && normalizedRole !== 'agent') {
            freshData = await withTimeout(getTeacherProfile());
          }
        } catch (e) {
          console.warn('Failed to fetch profile:', e);
        }

        if (!isMounted.current) {return;}

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
          storedRollNo,
          storedRollNumber,
          storedBloodGroup,
          storedAddress,
          storedPrincipalEmployeeId,
          storedPrincipalEmail,
          storedPrincipalMobile,
          storedPrincipalAddress,
          storedDirectorEmail,
          storedDirectorEmployeeId,
          storedDesignation,
          storedDepartment,
          storedUserName,
          storedUsername,
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
            'roll_no',
            'roll_number',
            'blood_group',
            'address',
            'principal_employee_id',
            'principal_email',
            'principal_mobile',
            'principal_address',
            'director_email',
            'director_employee_id',
            'designation',
            'department_subject',
            'user_name',
            'username',
          ]).then(items => items.map(([, value]) => value || ''));

        const persistedUserEmail = (await storage.getString(StorageKeys.USER_EMAIL)) || '';

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
            persistedUserEmail,
            storedDirectorEmail,
            storedPrincipalEmail,
            storedUser?.email,
            storedUser?.principal_email,
            storedUser?.director_email,
            storedUsername?.includes('@') ? storedUsername : '',
            storedUser?.username?.includes('@') ? storedUser.username : '',
            (decodeJwt(userToken) || {}).email,
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
          employee_id: isDirOrAdmin
            ? firstNonEmptyText(
                profileSource?.director_employee_id,
                storedDirectorEmployeeId,
                profileSource?.employee_id,
                storedEmployeeId2,
                storedUser?.director_employee_id,
                storedUser?.employee_id,
                (decodeJwt(userToken) || {}).director_employee_id,
                (decodeJwt(userToken) || {}).sub,
              )
            : firstNonEmptyText(
                profileSource?.employee_id,
                storedEmployeeId2,
                storedPrincipalEmployeeId,
                storedUser?.employee_id,
                storedUser?.principal_employee_id,
              ),
          student_id: firstNonEmptyText(profileSource?.student_id, storedStudentId2, storedUser?.student_id),
          parent_guardian_email: firstNonEmptyText(profileSource?.parent_guardian_email, profileSource?.parent_email, profileSource?.guardian_email, profileSource?.father_email, profileSource?.mother_email, profileSource?.father_guardian_email, storedUser?.parent_guardian_email),
          designation: firstNonEmptyText(profileSource?.designation, profileSource?.teacher_designation, storedDesignation, storedUser?.designation),
          department_subject: firstNonEmptyText(profileSource?.department_subject, profileSource?.department, profileSource?.subject, storedDepartment, storedUser?.department_subject),
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
          roll_number: resolveStudentRollNumber(
            profileSource?.roll_number,
            profileSource?.roll_no,
            profileSource?.rollNo,
            storedUser?.roll_number,
            storedUser?.roll_no,
            storedRollNo,
            storedRollNumber,
          ),
          roll_no: resolveStudentRollNumber(
            profileSource?.roll_no,
            profileSource?.roll_number,
            profileSource?.rollNo,
            storedUser?.roll_no,
            storedUser?.roll_number,
            storedRollNo,
            storedRollNumber,
          ),
          class_grade: firstNonEmptyText(profileSource?.class_grade, profileSource?.class, storedUser?.class_grade),
          section: firstNonEmptyText(profileSource?.section, storedUser?.section),
          emergency_contact_name: firstNonEmptyText(profileSource?.emergency_contact_name, storedUser?.emergency_contact_name),
          emergency_contact_number: firstNonEmptyText(profileSource?.emergency_contact_number, storedUser?.emergency_contact_number),
          father_guardian_name: firstNonEmptyText(profileSource?.father_guardian_name, profileSource?.father_name, profileSource?.fatherName, storedUser?.father_guardian_name),
          father_guardian_mobile: firstNonEmptyText(profileSource?.father_guardian_mobile, profileSource?.father_mobile, profileSource?.father_phone, storedUser?.father_guardian_mobile),
          mother_guardian_name: firstNonEmptyText(profileSource?.mother_guardian_name, profileSource?.mother_name, profileSource?.motherName, storedUser?.mother_guardian_name),
          mother_guardian_mobile: firstNonEmptyText(profileSource?.mother_guardian_mobile, profileSource?.mother_mobile, profileSource?.mother_phone, storedUser?.mother_guardian_mobile),
          username: firstNonEmptyText(
            profileSource?.username,
            storedUser?.username,
            storedUser?.user_name,
            storedUsername,
            storedUserName,
          ),
          can_register_school: profileSource?.can_register_school ?? storedUser?.can_register_school ?? false,
          can_view_payments: profileSource?.can_view_payments ?? storedUser?.can_view_payments ?? false,
          can_edit_features: profileSource?.can_edit_features ?? storedUser?.can_edit_features ?? false,
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
          } else if (normalizedRole === 'director') {
            const decodedToken = decodeJwt(userToken) || {};
            resolvedProfile.employee_id = resolvedProfile.employee_id || profileSource?.director_employee_id || storedDirectorEmployeeId || storedUser?.director_employee_id || decodedToken.director_employee_id || decodedToken.sub;
            resolvedProfile.email = resolvedProfile.email || profileSource?.director_email || storedDirectorEmail || storedUser?.director_email;
            resolvedProfile.address = resolvedProfile.address || profileSource?.director_address || storedUser?.director_address;
            resolvedProfile.name = resolvedProfile.name || profileSource?.director_name || storedUser?.director_name;
          }

          resolvedProfile.school_name = resolvedProfile.school_name || resolvedProfile.school_code || 'Unknown School';

          setUserInfo(prev => ({ ...prev, ...resolvedProfile, role: resolvedProfile.role || prev.role || 'student' }));

          if (roleBucket === 'student' && resolvedProfile.roll_number) {
            AsyncStorage.multiSet([
              ['roll_no', resolvedProfile.roll_number],
              ['roll_number', resolvedProfile.roll_number],
            ]).catch(() => {});
          }
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
        if (!resolvedPhoto && resolvedEntityId && freshData && !isDirOrAdmin) {
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
  // Password change handlers
  const getSchoolCodeForAuth = async () =>
    (
      (await storage.getString(StorageKeys.SCHOOL_CODE)) ||
      (await AsyncStorage.getItem('school_code')) ||
      userInfo.school_code ||
      ''
    ).trim().toUpperCase();

  const handleRequestOtp = async () => {
    const targetEmail = isStudent ? (userInfo.parent_guardian_email || userInfo.email) : userInfo.email;
    if (!targetEmail) {
      setPasswordChangeError('Email not found in profile');
      return;
    }

    const schoolCode = await getSchoolCodeForAuth();
    if (!schoolCode) {
      setPasswordChangeError('School code not found. Please log in again.');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      await authService.requestOtp(schoolCode, targetEmail);
      setPasswordChangeStep('otp-verify');
      setPasswordChangeSuccess(`OTP sent to ${targetEmail}`);
      setTimeout(() => setPasswordChangeSuccess(''), 3000);
    } catch (err: any) {
      setPasswordChangeError(
        mapOtpErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || err?.message || 'Failed to send OTP. Please try again.'
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

    const schoolCode = await getSchoolCodeForAuth();
    if (!schoolCode) {
      setPasswordChangeError('School code not found. Please log in again.');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      const result = await authService.verifyOtp(schoolCode, targetEmail, passwordChangeOtp);
      const token = String(result?.reset_token || (result as any)?.data?.reset_token || '').trim();
      if (!token) {
        throw new Error('Reset token missing. Please request a new OTP.');
      }
      setVerifiedOtpToken(token);
      setPasswordChangeStep('new-password');
      setPasswordChangeSuccess('OTP verified successfully');
      setTimeout(() => setPasswordChangeSuccess(''), 2000);
    } catch (err: any) {
      setPasswordChangeError(
        mapOtpErrorMessage(err?.response?.data?.detail || err?.response?.data?.message) || err?.message || 'Invalid OTP. Please try again.'
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

    if (!verifiedOtpToken) {
      setPasswordChangeError('OTP verification expired. Please start again.');
      return;
    }

    const schoolCode = await getSchoolCodeForAuth();
    if (!schoolCode) {
      setPasswordChangeError('School code not found. Please log in again.');
      return;
    }

    setPasswordChangeLoading(true);

    try {
      await authService.resetPassword(
        schoolCode,
        targetEmail,
        verifiedOtpToken,
        newPassword,
        confirmPassword,
      );
      setPasswordChangeSuccess('Password changed successfully!');
      setTimeout(() => {
        setShowPasswordChangeModal(false);
        resetPasswordChangeModal();
      }, 2000);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        try {
          await authService.forgotPasswordReset(
            schoolCode,
            targetEmail,
            passwordChangeOtp,
            verifiedOtpToken,
            newPassword,
          );
          setPasswordChangeSuccess('Password changed successfully!');
          setTimeout(() => {
            setShowPasswordChangeModal(false);
            resetPasswordChangeModal();
          }, 2000);
          return;
        } catch (fallbackErr: any) {
          setPasswordChangeError(
            formatErrorMessage(fallbackErr?.response?.data?.detail || fallbackErr?.response?.data?.message) || fallbackErr?.message || 'Failed to change password. Please try again.'
          );
          return;
        }
      }
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
    if (!editField.key) {return;}

    setEditLoading(true);
    try {
      const updateData = { [editField.key]: editField.value };
      const sessionUpdates: Record<string, any> = { [editField.key]: editField.value };

      if (isStudent) {
        await updateStudentProfile(updateData);
      } else if (roleKey === 'principal') {
        const body: any = {};
        if (editField.key === 'phone') {
          body.phone = editField.value;
        } else if (editField.key === 'email') {
          body.email = editField.value;
          sessionUpdates.principal_email = editField.value;
          sessionUpdates.email = editField.value;
        } else if (editField.key === 'name') {
          body.name = editField.value;
        } else if (editField.key === 'address') {
          body.address = editField.value;
          sessionUpdates.principal_address = editField.value;
          sessionUpdates.address = editField.value;
        }
        await API.put('/principal/profile', body);
      } else if (isDirector && roleKey === 'director') {
        const body: any = { ...updateData };
        if (editField.key === 'email') {
          body.director_email = editField.value;
          sessionUpdates.director_email = editField.value;
          sessionUpdates.email = editField.value;
        } else if (editField.key === 'name') {
          body.director_name = editField.value;
          sessionUpdates.director_name = editField.value;
          sessionUpdates.name = editField.value;
        } else if (editField.key === 'address') {
          body.director_address = editField.value;
          sessionUpdates.director_address = editField.value;
          sessionUpdates.address = editField.value;
        }
        await API.put('/director/profile', body);
      } else {
        await updateTeacherProfile(updateData);
        if (editField.key === 'email') {
          sessionUpdates.email = editField.value;
        }
        if (editField.key === 'address') {
          sessionUpdates.address = editField.value;
        }
      }

      const nextProfile = { ...userInfo, [editField.key]: editField.value };
      setUserInfo(nextProfile);
      await updateUserData(sessionUpdates);

      const storedRole = (await storage.getString(StorageKeys.USER_ROLE)) || (await AsyncStorage.getItem('role')) || 'student';
      const normalizedRole = String(storedRole).trim().toLowerCase();
      const roleBucket = normalizeRoleBucket(normalizedRole);
      const storedStudentId = (await AsyncStorage.getItem('student_id')) || '';
      const storedTeacherId = (await AsyncStorage.getItem('teacher_id')) || '';
      const storedEmployeeId = (await storage.getString(StorageKeys.EMPLOYEE_ID)) || '';
      const storedSchoolCode = (await storage.getString(StorageKeys.SCHOOL_CODE)) || '';
      const entityId = roleBucket === 'student' ? storedStudentId : (storedTeacherId || storedEmployeeId);
      const profileCacheKey = entityId
        ? `profile_cache:${roleBucket}:${storedSchoolCode || 'unknown'}:${entityId}`
        : `profile_cache:${roleBucket}:${storedSchoolCode || 'unknown'}:anon`;
      await AsyncStorage.setItem(profileCacheKey, JSON.stringify(nextProfile)).catch(() => {});

      Alert.alert('Success', `${editField.label} updated successfully`);
      setShowEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', formatErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || error?.message) || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditField = (key: string, label: string, value: string) => {
    setEditField({ key, label, value });
    setShowEditModal(true);
  };

  const handleEditValueChange = (value: string) => {
    setEditField((prev) => ({ ...prev, value }));
  };

  const handleToggleNotifications = (notifications: boolean) => {
    setSettings((prev) => ({ ...prev, notifications }));
  };

  return {
    loading,
    userToken,
    userInfo,
    settings,
    profilePhotoUrl,
    profilePhotoError,
    setProfilePhotoError,
    showAccountSwitcher,
    setShowAccountSwitcher,
    showSettingsModal,
    setShowSettingsModal,
    showEditModal,
    setShowEditModal,
    editField,
    editLoading,
    showPasswordChangeModal,
    passwordChangeStep,
    passwordChangeLoading,
    passwordChangeOtp,
    passwordChangeError,
    passwordChangeSuccess,
    newPassword,
    confirmPassword,
    showNewPassword,
    showConfirmPassword,
    roleKey,
    isAgent,
    isStudent,
    isAdminPanel,
    isDirector,
    isAccountant,
    studentRollNumber,
    systemSettingsRoute,
    profileSubtitle,
    passwordTargetEmail,
    handleLogout,
    handleRequestOtp,
    handleVerifyOtp,
    handleChangePassword,
    handlePasswordChangeModalClose,
    handleUpdateProfile,
    handleEditField,
    handleEditValueChange,
    handleToggleNotifications,
    setPasswordChangeOtp,
    setNewPassword,
    setConfirmPassword,
    setShowNewPassword,
    setShowConfirmPassword,
    setShowPasswordChangeModal,
  };
}
