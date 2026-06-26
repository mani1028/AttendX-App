import { Theme } from '../../theme/tokens';
// src/components/layout/SchoolUnifiedLayout.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationPanel from '../common/NotificationPanel';
import AccountSwitcher from '../common/AccountSwitcher';
import { useAuth } from '../../context/AuthContext';
import CalendarView from '../common/CalendarView';
import { colors } from '../../theme/tokens';
import { getTeacherProfile } from '../../services/teacherService';
import { normalizePhotoUri } from '../../utils/normalizePhotoUri';

// Utility function for photo cache key generation
const getPhotoCacheKey = (roleBucket: 'student' | 'teacher', id: string, schoolCode: string): string | null => {
  if (!id) {return null;}
  return `profile_photo_url:${roleBucket}:${schoolCode || 'unknown'}:${id}`;
};

// Types
interface MenuItem {
  title: string;
  route: string;
  icon?: string;
}

interface RoleConfig {
  label: string;
  roleDisplay: string;
  menu: MenuItem[];
  pageTitles?: Record<string, string>;
}

// Menu items per role (enhanced from web version)
const MENU_CONFIG: Record<string, RoleConfig> = {
  admin: {
    label: 'Global Admin',
    roleDisplay: 'Administrator',
    menu: [
      { title: 'Schools', route: 'AdminDashboard', icon: '🏫' },
    ],
    pageTitles: {
      'AdminDashboard': 'School Dashboard',
    },
  },

  accountant: {
    label: 'Accountant Panel',
    roleDisplay: 'Accountant',
    menu: [
      { title: 'Overview', route: 'AccountantDashboard', icon: '📊' },
      { title: 'Fees', route: 'DirectorFeeManagement', icon: '💰' },
      { title: 'Collections', route: 'AccountantPaymentEntry', icon: '💳' },
      { title: 'Expenses', route: 'DirectorExpense', icon: '📉' },
      { title: 'Reports', route: 'DirectorReports', icon: '📈' },
      { title: 'Payroll', route: 'AccountantPayroll', icon: '👥' },
      { title: 'Salaries', route: 'AccountantSalaries', icon: '💰' },
      { title: 'Settings', route: 'AccountantSettings', icon: '⚙️' },
    ],
    pageTitles: {
      'AccountantDashboard': 'Finance Workspace - Overview',
      'DirectorFeeManagement': 'Fee Management',
      'AccountantPaymentEntry': 'Collection Entry',
      'DirectorExpense': 'Expense Ledger',
      'DirectorReports': 'Reports & Trends',
      'AccountantPayroll': 'Payroll Management',
      'AccountantSalaries': 'Salaries Management',
      'AccountantSettings': 'Fee Notifications',
    },
  },

  director: {
    label: 'Director Panel',
    roleDisplay: 'Director',
    menu: [
      { title: 'Dashboard', route: 'DirectorDashboard', icon: '📊' },
      { title: 'Branches', route: 'DirectorDashboard', icon: '🏢' },
      { title: 'Add Branch', route: 'DirectorDirectorRegistration', icon: '➕' },
    ],
    pageTitles: {
      'DirectorDashboard': 'Dashboard Overview',
      'DirectorBranchDetails': 'Branches',
      'DirectorDirectorRegistration': 'Add Branch',
    },
  },

  principal: {
    label: 'Principal Panel',
    roleDisplay: 'Principal',
    menu: [
      { title: 'Dashboard', route: 'DirectorDashboard', icon: '📊' },
      { title: 'Staff', route: 'DirectorTeacherManagement', icon: '👨‍🏫' },
      { title: 'Students', route: 'DirectorStudentManagement', icon: '👨‍🎓' },
      { title: 'Attendance', route: 'DirectorAttendance', icon: '📅' },
      { title: 'Calendar', route: 'CalendarManagement', icon: '📆' },
      { title: 'Teacher Leaves', route: 'TeacherLeaveApproval', icon: '📋' },
      { title: 'Exams', route: 'DirectorExams', icon: '📝' },
      { title: 'Teacher Assignments', route: 'TeacherAssignment', icon: '👥' },
      { title: 'Announcements', route: 'DirectorAnnouncements', icon: '📢' },
      { title: 'Visitors', route: 'VisitorDashboard', icon: '👥' },
      { title: 'Settings', route: 'DirectorSettings', icon: '⚙️' },
    ],
    pageTitles: {
      'DirectorDashboard': 'Director Dashboard',
      'DirectorTeacherManagement': 'Staff Management',
      'DirectorStudentManagement': 'Student Management',
      'DirectorAttendance': 'Attendance Records',
      'CalendarManagement': 'Calendar Management',
      'TeacherLeaveApproval': 'Teacher Leave Requests',
      'DirectorExams': 'Exam Management',
      'TeacherAssignment': 'Teacher Assignments',
      'DirectorAnnouncements': 'Announcements Manager',
      'VisitorDashboard': 'Visitor Management',
      'DirectorSettings': 'Director Settings',
    },
  },

  teacher: {
    label: 'Teacher Panel',
    roleDisplay: 'Teacher',
    menu: [
      { title: 'Dashboard', route: 'TeacherDashboard', icon: '📊' },
      { title: 'Attendance', route: 'TeacherAttendance', icon: '📋' },
      { title: 'Attendance Verification', route: 'MarkAttendance', icon: '✅' },
      { title: 'View Attendance', route: 'TeacherViewAttendance', icon: '👀' },
      { title: 'VitalScan AI', route: 'TeacherVitalScan', icon: '🔬' },
      { title: 'Skin Disease', route: 'TeacherSkinDisease', icon: '🩺' },
      { title: 'Homework', route: 'TeacherHomeworkManagement', icon: '📚' },
      { title: 'Leave Request', route: 'TeacherLeaveRequest', icon: '📅' },
      { title: 'Leave Approval', route: 'TeacherLeaveApproval', icon: '📋' },
      { title: 'Marks Entry', route: 'TeacherMarksEntry', icon: '📝' },
      { title: 'Student List', route: 'TeacherStudentList', icon: '👨‍🎓' },
      { title: 'Student Registration', route: 'StudentRegistrationRequests', icon: '📝' },
    ],
    pageTitles: {
      'TeacherDashboard': 'Teacher Dashboard',
      'TeacherAttendance': 'Attendance Logs',
      'MarkAttendance': 'Mark Attendance',
      'TeacherViewAttendance': 'View Attendance',
      'TeacherVitalScan': 'VitalScan AI',
      'TeacherSkinDisease': 'Skin Disease Detection',
      'TeacherHomeworkManagement': 'Homework Management',
      'TeacherLeaveRequest': 'Leave Request',
      'TeacherLeaveApproval': 'Leave Approval',
      'TeacherMarksEntry': 'Marks Entry',
      'TeacherStudentList': 'Student List',
      'StudentRegistrationRequests': 'Student Registration Requests',
    },
  },

  student: {
    label: 'Student Panel',
    roleDisplay: 'Student',
    menu: [
      { title: 'Dashboard', route: 'StudentDashboard', icon: '📊' },
      { title: 'Attendance', route: 'StudentAttendance', icon: '📅' },
      { title: 'Homework', route: 'StudentHomework', icon: '📚' },
      { title: 'Leave', route: 'StudentLeave', icon: '📋' },
      { title: 'Marks', route: 'StudentMarks', icon: '📝' },
      { title: 'Fees', route: 'StudentFee', icon: '💰' },
      { title: 'Question Papers', route: 'StudentQuestionPapers', icon: '📄' },
    ],
    pageTitles: {
      'StudentDashboard': 'Student Dashboard',
      'StudentAttendance': 'Attendance Records',
      'StudentHomework': 'Homework',
      'StudentLeave': 'Leave Requests',
      'StudentMarks': 'Marks & Results',
      'StudentFee': 'Fees & Payments',
      'StudentQuestionPapers': 'Question Papers',
    },
  },
};

// Theme colors
const theme = {
  bg: '#020617',
  sidebar: '#050d1a',
  sidebarBorder: 'rgba(59,130,246,0.12)',
  primary: Theme.colors.blue,
  primaryGlow: 'rgba(59,130,246,0.22)',
  activeNavBg: 'rgba(59,130,246,0.15)',
  hoverNavBg: 'rgba(255,255,255,0.04)',
  surface: Theme.colors.text,
  surfaceBorder: 'rgba(59,130,246,0.1)',
  textPrimary: Theme.colors.background,
  textSecondary: '#94a3b8',
  textDim: Theme.colors.textSec,
  error: Theme.colors.error,
};

const { width: screenWidth } = Dimensions.get('window');
const isTabletWidth = screenWidth >= 640 && screenWidth < 1024;

interface SchoolUnifiedLayoutProps {
  children: React.ReactNode;
  role: string;
}

export default function SchoolUnifiedLayout({ children, role }: SchoolUnifiedLayoutProps) {
  const navigation = useNavigation();
  const route = useRoute();

  // Normalize role values
  const normalizeRole = (r: string) => {
    if (!r) {return 'teacher';}
    const v = String(r).trim().toLowerCase();
    if (v === 'class_teacher' || v === 'class teacher' || v === 'classteacher' || v === 'class-teacher') {return 'teacher';}
    if (v === 'director') {return 'director';}
    if (v === 'principal' || v === 'headmaster' || v === 'head_master') {return 'principal';}
    if (v === 'admin' || v === 'administrator') {return 'admin';}
    if (v === 'accountant') {return 'accountant';}
    if (v === 'student') {return 'student';}
    return v;
  };

  const normalizedRole = normalizeRole(role);
  const config = MENU_CONFIG[normalizedRole] || MENU_CONFIG.teacher;

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isTablet, setIsTablet] = useState(isTabletWidth);
  const [displayName, setDisplayName] = useState(config.label);
  const [userName, setUserName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [userRole, setUserRole] = useState(role);
  const [profileDetails, setProfileDetails] = useState<Array<{ label: string; value: string }>>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  const effectiveRoleDisplay = normalizedRole === 'teacher' && isClassTeacher
    ? 'Class Teacher'
    : config.roleDisplay;
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState<'info' | 'confirm' | 'success' | 'error'>('info');
  const [dialogOnConfirm, setDialogOnConfirm] = useState<(() => void) | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoError, setProfilePhotoError] = useState(false);

  const { savedAccounts, switchToAccount } = useAuth();
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const lastTapRef = useRef<number | null>(null);

  const profileRef = useRef<View>(null);

  // Screen size detection
  useEffect(() => {
    const handleDimensionChange = () => {
      const width = Dimensions.get('window').width;
      setIsTablet(width >= 640 && width < 1024);
      if (width >= 1024) {setDrawerOpen(false);}
    };

    const subscription = Dimensions.addEventListener('change', handleDimensionChange);
    return () => subscription?.remove();
  }, []);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('user_name');
        const code = await AsyncStorage.getItem('school_code');
        const roleStored = await AsyncStorage.getItem('user_role');
        const userStr = await AsyncStorage.getItem('user');

        setUserName(name || 'User');
        setSchoolCode(code || '');
        setUserRole(roleStored || role);

        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            setDisplayName(user.name || user.school_name || name || config.label);
          } catch {
            setDisplayName(name || config.label);
          }
        } else {
          setDisplayName(name || config.label);
        }

        const roleBucket = role === 'student' ? 'student' : 'teacher';
        const storedStudentId = await AsyncStorage.getItem('student_id');
        const storedTeacherId = await AsyncStorage.getItem('teacher_id');
        const storedEmployeeId = await AsyncStorage.getItem('employee_id');
        const entityId = roleBucket === 'student'
          ? (storedStudentId || '')
          : (storedTeacherId || storedEmployeeId || '');
        const scopedPhotoKey = getPhotoCacheKey(roleBucket, entityId, code || '');

        // Try scoped key first, then plain key as fallback
        let resolvedPhoto = '';
        if (scopedPhotoKey) {
          const scopedPhotoUrl = await AsyncStorage.getItem(scopedPhotoKey);
          if (scopedPhotoUrl) { resolvedPhoto = scopedPhotoUrl; }
        }
        if (!resolvedPhoto) {
          const photoUrl = await AsyncStorage.getItem('profile_photo_url');
          if (photoUrl) { resolvedPhoto = photoUrl; }
        }
        const normalizedPhoto = normalizePhotoUri(resolvedPhoto);
        if (normalizedPhoto) {
          setProfilePhotoUrl(normalizedPhoto);
          setProfilePhotoError(false);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setDisplayName(config.label);
      }
    };

    loadUserData();
  }, [role, config.label]);

  // Load teacher capability
  useEffect(() => {
    const loadTeacherCapability = async () => {
      if (role !== 'teacher') {return;}

      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (typeof user?.is_class_teacher === 'boolean') {
            setIsClassTeacher(user.is_class_teacher);
            return;
          }
        }
        const isCT = await AsyncStorage.getItem('is_class_teacher');
        setIsClassTeacher(isCT === '1');
      } catch {
        const isCT = await AsyncStorage.getItem('is_class_teacher');
        setIsClassTeacher(isCT === '1');
      }
    };

    loadTeacherCapability();
  }, [role]);

  // Fetch teacher profile from API and persist to AsyncStorage
  useEffect(() => {
    if (role !== 'teacher') { return; }
    let mounted = true;

    const fetchAndSync = async () => {
      try {
        const data = await getTeacherProfile();
        if (!data || !mounted) { return; }

        const updates: [string, string][] = [];
        if (data.name) { updates.push(['user_name', data.name]); }
        const normalizedPhotoUrl = normalizePhotoUri(data.profile_photo_url);
        if (normalizedPhotoUrl) { updates.push(['profile_photo_url', normalizedPhotoUrl]); }
        if (data.school_name) { updates.push(['school_name', data.school_name]); }
        if (data.school_code) { updates.push(['school_code', data.school_code]); }
        if (data.branch_name) { updates.push(['branch_name', data.branch_name]); }
        if (data.branch_id) { updates.push(['branch_id', data.branch_id]); }
        if (data.employee_id) { updates.push(['employee_id', data.employee_id]); }
        if (data.teacher_id) { updates.push(['teacher_id', data.teacher_id]); }
        if (data.email) { updates.push(['email', data.email]); }
        if (data.phone || data.mobile_number) { updates.push(['phone', data.phone || data.mobile_number]); }
        if (data.designation) { updates.push(['designation', data.designation]); }
        if (data.department_subject) { updates.push(['department_subject', data.department_subject]); }
        if (typeof data.is_class_teacher === 'boolean') {
          updates.push(['is_class_teacher', data.is_class_teacher ? '1' : '0']);
          if (mounted) { setIsClassTeacher(data.is_class_teacher); }
        }
        if (data.user_id) { updates.push(['user_id', String(data.user_id)]); }

        if (updates.length > 0) { await AsyncStorage.multiSet(updates); }

        // Update local state
        if (mounted) {
          if (data.name) { setDisplayName(data.name); }
          if (data.name) { setUserName(data.name); }
          if (data.school_code) { setSchoolCode(data.school_code); }
          const photo = normalizePhotoUri(data.profile_photo_url || data.teacher_photograph);
          if (photo) { setProfilePhotoUrl(photo); setProfilePhotoError(false); }
        }

        // Also store the full profile in 'user' key for other screens
        const existingUserRaw = await AsyncStorage.getItem('user');
        const existingUser = existingUserRaw ? JSON.parse(existingUserRaw) : {};
        await AsyncStorage.setItem('user', JSON.stringify({ ...existingUser, ...data, is_class_teacher: data.is_class_teacher }));
      } catch (err) {
        console.warn('[Profile] Failed to sync teacher profile:', err);
      }
    };

    fetchAndSync();
    return () => { mounted = false; };
  }, [role]);

  // Build profile details
  useEffect(() => {
    const buildProfileDetails = async () => {
      const details: Array<{ label: string; value: string }> = [];

      details.push({ label: 'Name', value: displayName });
      details.push({ label: 'Role', value: effectiveRoleDisplay });
      if (schoolCode) {details.push({ label: 'School Code', value: schoolCode });}

      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {details.push({ label: 'User ID', value: userId });}

      const schoolName = await AsyncStorage.getItem('school_name');
      if (schoolName) {details.push({ label: 'School', value: schoolName });}

      if (role === 'teacher') {
        const teacherId = await AsyncStorage.getItem('teacher_id');
        const employeeId = await AsyncStorage.getItem('employee_id');
        const branchId = await AsyncStorage.getItem('branch_id');
        const branchName = await AsyncStorage.getItem('branch_name');

        if (teacherId) {details.push({ label: 'Teacher ID', value: teacherId });}
        if (employeeId) {details.push({ label: 'Employee ID', value: employeeId });}
        details.push({ label: 'Designation', value: isClassTeacher ? 'Class Teacher' : 'Subject Teacher' });
        if (branchId) {details.push({ label: 'Branch ID', value: branchId });}
        if (branchName) {details.push({ label: 'Branch Name', value: branchName });}
      }

      if (role === 'director') {
        const directorEmployeeId = await AsyncStorage.getItem('director_employee_id');
        const directorEmail = await AsyncStorage.getItem('director_email');
        const branchId = await AsyncStorage.getItem('branch_id');
        const branchName = await AsyncStorage.getItem('branch_name');

        if (directorEmployeeId) {details.push({ label: 'Director Employee ID', value: directorEmployeeId });}
        if (directorEmail) {details.push({ label: 'Director Email', value: directorEmail });}
        if (branchId) {details.push({ label: 'Branch ID', value: branchId });}
        if (branchName) {details.push({ label: 'Branch Name', value: branchName });}
      }

      if (role === 'director') {
        const email = await AsyncStorage.getItem('email');
        if (email) {details.push({ label: 'Email', value: email });}
      }

      if (role === 'student') {
        const studentId = await AsyncStorage.getItem('student_id');
        const parentId = await AsyncStorage.getItem('parent_id');
        const branchId = await AsyncStorage.getItem('branch_id');

        if (studentId) {details.push({ label: 'Student ID', value: studentId });}
        if (parentId) {details.push({ label: 'Parent ID', value: parentId });}
        if (branchId) {details.push({ label: 'Branch ID', value: branchId });}
      }

      setProfileDetails(details);
    };

    buildProfileDetails();
  }, [displayName, effectiveRoleDisplay, role, schoolCode, isClassTeacher]);

  const getInitials = (): string => {
    const name = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    return name.slice(0, 2) || 'U';
  };

  const getPageTitle = (): string => {
    const currentPath = route.name;
    return config.pageTitles?.[currentPath] || config.label;
  };

  const handleAvatarPress = async () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // Double-tap detected: try to switch to an accountant account directly
      lastTapRef.current = null;
      try {
        const acct = (savedAccounts || []).find(a => String(a.role || '').toLowerCase() === 'accountant');
        if (acct) {
          const ok = await switchToAccount(acct);
          if (!ok) {setShowAccountSwitcher(true);}
        } else {
          setShowAccountSwitcher(true);
        }
      } catch (err) {
        console.warn('Account switch failed:', err);
        setShowAccountSwitcher(true);
      }
    } else {
      lastTapRef.current = now;
      // If no second tap within the delay, treat as single tap (toggle profile)
      setTimeout(() => {
        if (lastTapRef.current && Date.now() - lastTapRef.current >= DOUBLE_PRESS_DELAY) {
          setOpenProfile(prev => !prev);
          lastTapRef.current = null;
        }
      }, DOUBLE_PRESS_DELAY + 20);
    }
  };

  const handleLogout = () => {
    setDialogMessage('Are you sure you want to sign out?');
    setDialogType('confirm');
    setDialogOnConfirm(() => async () => {
      await AsyncStorage.multiRemove([
        'token', 'user_role', 'user_name', 'user_id',
        'school_code', 'branch_id', 'employee_id', 'teacher_id',
        'student_id', 'profile_photo_url', 'user',
      ]);
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    });
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setDialogMessage('');
    setDialogOnConfirm(null);
  };

  const confirmDialog = () => {
    if (dialogOnConfirm) {dialogOnConfirm();}
    closeDialog();
  };

  const isCompact = isTablet || !sidebarExpanded;
  const showCalendarForRole = normalizedRole === 'student' || normalizedRole === 'teacher';

  // Filter menu items for teachers
  const visibleMenuItems = config.menu.filter(item => {
    if (normalizedRole === 'teacher') {
      // Remove manual attendance menu option for any teacher role
      if (item.route === 'MarkAttendance' || item.title === 'Attendance Verification') {
        return false;
      }
      // For non-class teachers, filter out other class-teacher-only screens
      if (!isClassTeacher) {
        return ['Dashboard', 'Attendance', 'View Attendance', 'Homework', 'Leave Request', 'Marks Entry', 'VitalScan AI', 'Skin Disease'].includes(item.title);
      }
    }
    return true;
  });

  // Avatar Component
  const AvatarBubble = ({ size = 36, textSize = 14 }: { size?: number; textSize?: number }) => {
    if ((role === 'teacher' || role === 'student') && profilePhotoUrl && !profilePhotoError) {
      return (
        <Image
          source={{ uri: profilePhotoUrl }}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setProfilePhotoError(true)}
        />
      );
    }

    return (
      <View
        style={[
          styles.avatarInitials,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.primary,
          },
        ]}
      >
        <Text style={[styles.avatarInitialsText, { fontSize: textSize }]}>{getInitials()}</Text>
      </View>
    );
  };

  // Drawer Menu Item
  const DrawerMenuItem = ({ item, onPress }: { item: MenuItem; onPress: () => void }) => (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
      <Text style={styles.drawerItemIcon}>{item.icon || '📄'}</Text>
      <Text style={styles.drawerItemText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar background */}
      <View style={styles.statusBar} />

      {/* Main Layout */}
      <View style={styles.layoutContainer}>
        {/* Desktop Sidebar - Only for web platform */}
        {Platform.OS === 'web' && (
          <View
            style={[
              styles.desktopSidebar,
              {
                width: isCompact ? 72 : 256,
                backgroundColor: theme.sidebar,
                borderRightColor: theme.sidebarBorder,
              },
            ]}
          >
            {/* Brand */}
            <View style={[styles.sidebarBrand, { borderBottomColor: theme.sidebarBorder }]}>
              <View style={[styles.brandContainer, isCompact && styles.brandContainerCompact]}>
                <AvatarBubble size={36} textSize={14} />
                {!isCompact && (
                  <View style={styles.brandTextContainer}>
                    <Text style={styles.brandName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.brandRole}>{effectiveRoleDisplay}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Navigation */}
            <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
              {!isCompact && <Text style={styles.menuLabel}>Menu</Text>}
              <View style={styles.menuContainer}>
                {visibleMenuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.navItem, isCompact && styles.navItemCompact]}
                    onPress={() => {
                      navigation.navigate(item.route as never);
                    }}
                  >
                    <Text style={styles.navItemIcon}>{item.icon || '📄'}</Text>
                    {!isCompact && <Text style={styles.navItemText}>{item.title}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* School Code Badge */}
            {!isCompact && schoolCode && (
              <View style={styles.schoolCodeBadge}>
                <Text style={styles.schoolCodeLabel}>School Code</Text>
                <Text style={styles.schoolCodeValue}>{schoolCode}</Text>
              </View>
            )}

            {/* Logout Button */}
            <View style={[styles.logoutContainer, { borderTopColor: theme.sidebarBorder }]}>
              <TouchableOpacity
                style={[styles.logoutButton, isCompact && styles.logoutButtonCompact]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutIcon}>🚪</Text>
                {!isCompact && <Text style={styles.logoutText}>Sign Out</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.sidebarBorder }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuButton}>
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{getPageTitle()}</Text>
            </View>

            <View style={styles.headerRight}>
              {showCalendarForRole && (
                <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.iconButton}>
                  <Text style={styles.iconText}>📅</Text>
                </TouchableOpacity>
              )}
              <NotificationPanel type={role} />
              <TouchableOpacity onPress={handleAvatarPress} style={styles.profileButton}>
                <AvatarBubble size={32} textSize={12} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Dropdown */}
          {openProfile && (
            <TouchableOpacity
              style={styles.profileOverlay}
              activeOpacity={1}
              onPress={() => setOpenProfile(false)}
            >
              <View style={styles.profileDropdown} ref={profileRef}>
                <View style={styles.profileHeader}>
                  <AvatarBubble size={40} textSize={16} />
                  <View>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileRole}>{config.roleDisplay}</Text>
                  </View>
                </View>
                <ScrollView style={styles.profileDetails} showsVerticalScrollIndicator={false}>
                  <Text style={styles.profileDetailsTitle}>Profile Details</Text>
                  {profileDetails.map((item, idx) => (
                    <View key={idx} style={styles.profileDetailRow}>
                      <Text style={styles.profileDetailLabel}>{item.label}</Text>
                      <Text style={styles.profileDetailValue}>{item.value}</Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.profileView}
                  onPress={() => {
                    setOpenProfile(false);
                    navigation.navigate('Profile' as never);
                  }}
                >
                  <Text style={styles.profileViewText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileLogout} onPress={handleLogout}>
                  <Text style={styles.profileLogoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {/* Page Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>

      {/* Account Switcher (Instagram-like) */}
      <AccountSwitcher visible={showAccountSwitcher} onClose={() => setShowAccountSwitcher(false)} />

      {/* Mobile Drawer */}
      <Modal visible={drawerOpen} transparent animationType="slide" onRequestClose={() => setDrawerOpen(false)}>
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
          <View style={styles.drawer}>
            <View style={[styles.drawerHeader, { borderBottomColor: theme.sidebarBorder }]}>
              <AvatarBubble size={48} textSize={18} />
              <View style={styles.drawerHeaderInfo}>
                <Text style={styles.drawerName}>{displayName}</Text>
                <Text style={styles.drawerRole}>{config.roleDisplay}</Text>
                {schoolCode && <Text style={styles.drawerSchoolCode}>🏫 {schoolCode}</Text>}
              </View>
            </View>
            <ScrollView style={styles.drawerNav}>
              {visibleMenuItems.map((item, index) => (
                <DrawerMenuItem
                  key={index}
                  item={item}
                  onPress={() => {
                    setDrawerOpen(false);
                    navigation.navigate(item.route as never);
                  }}
                />
              ))}
              <TouchableOpacity style={[styles.drawerItem, styles.drawerLogout]} onPress={handleLogout}>
                <Text style={styles.drawerItemIcon}>🚪</Text>
                <Text style={styles.drawerLogoutText}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <View style={styles.calendarModal}>
            <CalendarView />
            <TouchableOpacity style={styles.closeCalendarButton} onPress={() => setShowCalendar(false)}>
              <Text style={styles.closeCalendarText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal visible={dialogVisible} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <View style={[
              styles.dialogIcon,
              dialogType === 'success' ? styles.dialogIconSuccess :
              dialogType === 'error' ? styles.dialogIconError :
              dialogType === 'confirm' ? styles.dialogIconConfirm : styles.dialogIconInfo,
            ]}>
              <Text style={styles.dialogIconText}>
                {dialogType === 'success' ? '✓' : dialogType === 'error' ? '⚠️' : dialogType === 'confirm' ? '?' : 'ℹ️'}
              </Text>
            </View>
            <Text style={styles.dialogMessage}>{dialogMessage}</Text>
            <View style={styles.dialogButtons}>
              {dialogType === 'confirm' ? (
                <>
                  <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonCancel]} onPress={closeDialog}>
                    <Text style={styles.dialogButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonConfirm]} onPress={confirmDialog}>
                    <Text style={[styles.dialogButtonText, styles.dialogButtonConfirmText]}>Confirm</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonConfirm]} onPress={closeDialog}>
                  <Text style={[styles.dialogButtonText, styles.dialogButtonConfirmText]}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  statusBar: {
    height: Platform.OS === 'ios' ? 44 : 0,
    backgroundColor: theme.surface,
  },
  layoutContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    borderRightWidth: 1,
  },
  sidebarBrand: {
    height: 80,
    paddingHorizontal: Theme.spacing.md,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandContainerCompact: {
    justifyContent: 'center',
  },
  brandTextContainer: {
    flex: 1,
  },
  brandName: {
    ...Theme.typography.body,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  brandRole: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sidebarNav: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
  },
  menuLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: theme.textDim,
    marginBottom: 12,
    paddingHorizontal: Theme.spacing.md,
  },
  menuContainer: {
    gap: 4,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemCompact: {
    justifyContent: 'center',
  },
  navItemIcon: {
    fontSize: 18,
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  schoolCodeBadge: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderWidth: 1,
    borderColor: theme.sidebarBorder,
  },
  schoolCodeLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.textDim,
    marginBottom: Theme.spacing.xs,
  },
  schoolCodeValue: {
    ...Theme.typography.body,
    fontWeight: 'bold',
    color: theme.primary,
  },
  logoutContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutButtonCompact: {
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.error,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    height: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: Theme.spacing.sm,
  },
  menuIcon: {
    fontSize: 20,
    color: theme.textSecondary,
  },
  pageTitle: {
    ...Theme.typography.h4,
    color: theme.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: Theme.spacing.sm,
  },
  iconText: {
    fontSize: 18,
  },
  profileButton: {
    padding: Theme.spacing.xs,
  },
  profileOverlay: {
    position: 'absolute',
    top: 64,
    right: 20,
    zIndex: 100,
  },
  profileDropdown: {
    width: 320,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.sidebarBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.sidebarBorder,
  },
  profileName: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  profileRole: {
    ...Theme.typography.label,
    color: theme.textSecondary,
  },
  profileDetails: {
    maxHeight: 300,
    padding: Theme.spacing.md,
  },
  profileDetailsTitle: {
    ...Theme.typography.label,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  profileDetailLabel: {
    ...Theme.typography.label,
    color: theme.textSecondary,
  },
  profileDetailValue: {
    ...Theme.typography.caption,
    fontWeight: '500',
    color: theme.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  profileLogout: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.sidebarBorder,
    backgroundColor: 'rgba(239,68,68,0.08)',
    margin: 12,
    borderRadius: 12,
  },
  profileLogoutText: {
    color: theme.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileView: {
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  profileViewText: {
    color: Theme.colors.card,
    ...Theme.typography.body,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  drawer: {
    width: '70%',
    maxWidth: 280,
    height: '100%',
    backgroundColor: theme.sidebar,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
  },
  drawerHeaderInfo: {
    flex: 1,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  drawerRole: {
    ...Theme.typography.label,
    color: theme.textSecondary,
    marginTop: 2,
  },
  drawerSchoolCode: {
    fontSize: 10,
    color: theme.primary,
    marginTop: Theme.spacing.xs,
  },
  drawerNav: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  drawerItemIcon: {
    fontSize: 18,
  },
  drawerItemText: {
    ...Theme.typography.body,
    color: theme.textSecondary,
  },
  drawerLogout: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.sidebarBorder,
  },
  drawerLogoutText: {
    color: theme.error,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: Theme.colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: Theme.spacing.md,
  },
  closeCalendarButton: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  closeCalendarText: {
    color: theme.primary,
    fontWeight: '600',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.sidebarBorder,
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  dialogIconSuccess: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  dialogIconError: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  dialogIconConfirm: {
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  dialogIconInfo: {
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  dialogIconText: {
    fontSize: 28,
  },
  dialogMessage: {
    ...Theme.typography.body,
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dialogButtonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: theme.sidebarBorder,
  },
  dialogButtonConfirm: {
    backgroundColor: theme.primary,
  },
  dialogButtonText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  dialogButtonConfirmText: {
    color: Theme.colors.card,
  },
  avatarImage: {
    borderWidth: 1,
    borderColor: theme.sidebarBorder,
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: Theme.colors.card,
    fontWeight: 'bold',
  },
});
