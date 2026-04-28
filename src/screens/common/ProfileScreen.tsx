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
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  Edit2,
  LogOut,
  Key,
  Globe,
  Sliders,
  ChevronRight,
  User,
  Mail,
  Phone,
  Users,
  Calendar,
  Droplet,
  Flag,
  MessageCircle,
  Heart,
  CreditCard,
  Hash,
  Briefcase,
  BookOpen,
  Award,
  Clock,
  Grid,
  Home,
  GitBranch,
  MapPin,
  X
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { getStudentProfile, getStudentProfilePhotoDataUri, getStudentProfilePhotoUrl } from '../../services/studentService';
import { getTeacherProfile, getTeacherProfilePhotoDataUri, getTeacherProfilePhotoUrl } from '../../services/teacherService';
import { buildApiUrl } from '../../services/api';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AppText from '../../components/common/AppText';
import AvatarBubble from '../../components/common/AvatarBubble';

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
  roll_number?: string;
  class_grade?: string;
  section?: string;
}

interface AppSettings {
  notifications: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
  darkMode: boolean;
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

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);

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
  });
  
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true, emailAlerts: true, pushNotifications: true,
    darkMode: false, autoSave: true, language: 'English',
  });
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState({ key: '', label: '', value: '' });

  const fetchProfileData = useCallback(async () => {
    try {
      const cachedProfilePhoto = await AsyncStorage.getItem('profile_photo_url');
      if (cachedProfilePhoto && isMounted.current) {
        setProfilePhotoUrl(cachedProfilePhoto);
        setProfilePhotoError(false);
      }

      const storedRole = (await AsyncStorage.getItem('userRole')) || (await AsyncStorage.getItem('role')) || 'student';
      const normalizedRole = String(storedRole).trim().toLowerCase();
      const roleBucket = normalizeRoleBucket(normalizedRole);
      let freshData;
      if (roleBucket === 'student') {
        freshData = await getStudentProfile();
      } else {
        freshData = await getTeacherProfile();
      }

      if (!isMounted.current) return;

      if (freshData) {
        const storedUserRaw = await AsyncStorage.getItem('user');
        const storedUser = storedUserRaw ? (() => {
          try {
            return JSON.parse(storedUserRaw);
          } catch {
            return {};
          }
        })() : {};

        const [storedEmail, storedPhone, storedBranchName, storedBranchId, storedSchoolName, storedSchoolCode, storedTeacherId, storedEmployeeId, storedStudentId] =
          await AsyncStorage.multiGet([
            'email',
            'phone',
            'branch_name',
            'branch_id',
            'school_name',
            'school_code',
            'teacher_id',
            'employee_id',
            'student_id',
          ]).then(items => items.map(([, value]) => value || ''));

        const resolvedProfile = {
          ...(freshData as any),
          role: firstNonEmptyText((freshData as any)?.role, normalizedRole, 'student'),
          name: firstNonEmptyText((freshData as any)?.name, (freshData as any)?.full_name, (freshData as any)?.teacher_full_name, (freshData as any)?.student_full_name, storedUser?.name),
          email: firstNonEmptyText((freshData as any)?.email, (freshData as any)?.email_id, (freshData as any)?.email_address, storedEmail, storedUser?.email),
          phone: firstNonEmptyText((freshData as any)?.phone, (freshData as any)?.mobile, (freshData as any)?.mobile_number, (freshData as any)?.phone_number, storedPhone, storedUser?.phone),
          branch_name: firstNonEmptyText((freshData as any)?.branch_name, (freshData as any)?.branchName, (freshData as any)?.branch, storedBranchName, storedUser?.branch_name),
          branch_id: firstNonEmptyText((freshData as any)?.branch_id, (freshData as any)?.branchId, storedBranchId, storedUser?.branch_id),
          school_name: firstNonEmptyText((freshData as any)?.school_name, (freshData as any)?.schoolName, (freshData as any)?.school, storedSchoolName, storedUser?.school_name),
          school_code: firstNonEmptyText((freshData as any)?.school_code, (freshData as any)?.schoolCode, storedSchoolCode, storedUser?.school_code),
          teacher_id: firstNonEmptyText((freshData as any)?.teacher_id, storedTeacherId, storedUser?.teacher_id),
          employee_id: firstNonEmptyText((freshData as any)?.employee_id, storedEmployeeId, storedUser?.employee_id),
          student_id: firstNonEmptyText((freshData as any)?.student_id, storedStudentId, storedUser?.student_id),
        };

        setUserInfo(prev => ({
          ...prev,
          ...resolvedProfile,
          role: resolvedProfile.role || prev.role || 'student',
        }));

        const entityId = roleBucket === 'student'
          ? resolvedProfile.student_id
          : (resolvedProfile.teacher_id || resolvedProfile.employee_id);
        const schoolCode = resolvedProfile.school_code;
        const photoCacheKey = getPhotoCacheKey(roleBucket, entityId, schoolCode);

        if (photoCacheKey) {
          const scopedCachedPhoto = await AsyncStorage.getItem(photoCacheKey);
          if (scopedCachedPhoto && isMounted.current) {
            setProfilePhotoUrl(scopedCachedPhoto);
            setProfilePhotoError(false);
          }
        }

        const directProfilePhoto = normalizePhotoUri(
          (freshData as any)?.profile_photo_url ||
          (roleBucket === 'student' ? (freshData as any)?.student_photograph : (freshData as any)?.teacher_photograph)
        );

        let resolvedPhoto = directProfilePhoto;
        if (!resolvedPhoto && entityId) {
          resolvedPhoto = roleBucket === 'student'
            ? ((await getStudentProfilePhotoDataUri(entityId, schoolCode)) || (await getStudentProfilePhotoUrl(entityId, schoolCode)))
            : ((await getTeacherProfilePhotoDataUri(entityId, schoolCode)) || (await getTeacherProfilePhotoUrl(entityId, schoolCode)));
        }

        if (resolvedPhoto && isMounted.current) {
          await AsyncStorage.setItem('profile_photo_url', resolvedPhoto);
          if (photoCacheKey) {
            await AsyncStorage.setItem(photoCacheKey, resolvedPhoto);
          }
          setProfilePhotoUrl(resolvedPhoto);
          setProfilePhotoError(false);
        }
      }

      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings && isMounted.current) setSettings(JSON.parse(savedSettings));

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
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const renderInfoRow = (label: string, value: string | undefined, IconComponent: any, onEdit?: () => void) => (
    <View style={styles.infoRow}>
      <View style={styles.iconCircle}>
        <IconComponent size={18} color="#2563eb" />
      </View>
      <View style={styles.infoContent}>
        <AppText style={styles.infoLabel}>{label}</AppText>
        <AppText style={styles.infoValue}>{value || '—'}</AppText>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editIcon}>
          <Edit2 size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#001a3d" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
              source={{ uri: profilePhotoUrl }}
              style={styles.profileAvatarImage}
              onError={() => setProfilePhotoError(true)}
            />
          ) : (
            <AvatarBubble
              displayName={userInfo.name || 'User'}
              size={80}
              textSize={28}
              primaryColor="#2563eb"
            />
          )}
          <View style={styles.profileTextInfo}>
            <AppText style={styles.userName}>{userInfo.name}</AppText>
            <AppText style={styles.userRole}>
              {userInfo.role?.toUpperCase() || 'STUDENT'} • ID: {userInfo.student_id || userInfo.employee_id}
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Basic Information</AppText>
          <AppCard style={styles.infoCard}>
            {renderInfoRow('Full Name', userInfo.name, User)}
            <View style={styles.divider} />
            {renderInfoRow('Email Address', userInfo.email, Mail)}
            <View style={styles.divider} />
            {renderInfoRow('Phone Number', userInfo.phone, Phone)}
            <View style={styles.divider} />
            {renderInfoRow('Blood Group', userInfo.blood_group, Droplet)}
          </AppCard>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>
            {userInfo.role === 'student' ? 'Academic Details' : 'Professional Details'}
          </AppText>
          <AppCard style={styles.infoCard}>
            {userInfo.role === 'student' ? (
              <>
                {renderInfoRow('Class', userInfo.class_grade, BookOpen)}
                <View style={styles.divider} />
                {renderInfoRow('Section', userInfo.section, Grid)}
                <View style={styles.divider} />
                {renderInfoRow('Roll Number', userInfo.roll_number, Hash)}
              </>
            ) : (
              <>
                {renderInfoRow('Designation', userInfo.designation, Briefcase)}
                <View style={styles.divider} />
                {renderInfoRow('Department', userInfo.department_subject, BookOpen)}
              </>
            )}
          </AppCard>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Organization</AppText>
          <AppCard style={styles.infoCard}>
            {renderInfoRow('School', userInfo.school_name, Home)}
            <View style={styles.divider} />
            {renderInfoRow('Branch', userInfo.branch_name, MapPin)}
          </AppCard>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Account Settings</AppText>
          <AppCard style={styles.infoCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
              <View style={styles.menuIconContainer}>
                <Sliders size={18} color="#0f172a" />
              </View>
              <AppText style={styles.menuText}>App Settings</AppText>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
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
              <View style={styles.settingRow}>
                <AppText style={styles.settingLabel}>Dark Mode (Beta)</AppText>
                <Switch value={settings.darkMode} onValueChange={(v) => setSettings({...settings, darkMode: v})} />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setShowSettingsModal(false)} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#001a3d',
    paddingTop: 50,
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
    borderColor: '#2563eb',
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
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
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
});
