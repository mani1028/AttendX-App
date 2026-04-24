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
import CalendarView from '../common/CalendarView';
import { colors } from '../../constants/colors';

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
      '/admin-dashboard': 'School Dashboard',
    },
  },

  accountant: {
    label: 'Accountant Panel',
    roleDisplay: 'Accountant',
    menu: [
      { title: 'Overview', route: 'AccountantDashboard', icon: '📊' },
      { title: 'Fees', route: 'FeeManagement', icon: '💰' },
      { title: 'Collections', route: 'PaymentEntry', icon: '💳' },
      { title: 'Expenses', route: 'Expense', icon: '📉' },
      { title: 'Reports', route: 'Reports', icon: '📈' },
      { title: 'Payroll', route: 'Payroll', icon: '👥' },
      { title: 'Pending Dues', route: 'PendingStudents', icon: '⏰' },
      { title: 'Settings', route: 'Settings', icon: '⚙️' },
    ],
    pageTitles: {
      '/accountant-dashboard': 'Finance Workspace - Overview',
      '/accountant/fees': 'Fee Management',
      '/accountant/collections': 'Collection Entry',
      '/accountant/expenses': 'Expense Ledger',
      '/accountant/reports': 'Reports & Trends',
      '/accountant/payroll': 'Payroll Management',
      '/accountant/pending': 'Pending Due Tracking',
      '/accountant/settings': 'Fee Notifications',
    },
  },

  principal: {
    label: 'Principal Panel',
    roleDisplay: 'Principal',
    menu: [
      { title: 'Dashboard', route: 'PrincipalDashboard', icon: '📊' },
      { title: 'Branches', route: 'PrincipalDashboard', icon: '🏢' },
      { title: 'Add Branch', route: 'PrincipalDashboard', icon: '➕' },
    ],
    pageTitles: {
      '/principal-dashboard': 'Dashboard Overview',
      '/principal/branches': 'Branches',
      '/principal/add-branch': 'Add Branch',
    },
  },

  hm: {
    label: 'HM Panel',
    roleDisplay: 'Head Master',
    menu: [
      { title: 'Dashboard', route: 'HMDashboard', icon: '📊' },
      { title: 'Staff', route: 'TeacherManagement', icon: '👨‍🏫' },
      { title: 'Students', route: 'StudentManagement', icon: '👨‍🎓' },
      { title: 'Attendance', route: 'HMAttendance', icon: '📅' },
      { title: 'Calendar', route: 'HMAttendance', icon: '📆' },
      { title: 'Teacher Leaves', route: 'TeacherLeaves', icon: '📋' },
      { title: 'Exams', route: 'Exams', icon: '📝' },
      { title: 'Data Export', route: 'DataExport', icon: '📎' },
      { title: 'Teacher Assignments', route: 'TeacherAssignments', icon: '👥' },
      { title: 'Announcements', route: 'Announcements', icon: '📢' },
      { title: 'Visitors', route: 'VisitorDashboard', icon: '👥' },
      { title: 'Settings', route: 'Settings', icon: '⚙️' },
    ],
    pageTitles: {
      '/hm-dashboard': 'HM Dashboard',
      '/hm/teachers': 'Staff Management',
      '/hm/students': 'Student Management',
      '/hm/attendance': 'Attendance Records',
      '/hm/calendar': 'Calendar Management',
      '/hm/teacher-leaves': 'Teacher Leave Requests',
      '/hm/settings': 'HM Settings',
      '/hm/exams': 'Exam Management',
      '/hm/data-export': 'Data Export',
      '/hm/teacher-assignments': 'Teacher Assignments',
      '/hm/announcements': 'Announcements Manager',
      '/hm/visitors': 'Visitor Management',
    },
  },

  teacher: {
    label: 'Teacher Panel',
    roleDisplay: 'Teacher',
    menu: [
      { title: 'Attendance Logs', route: 'TeacherAttendance', icon: '📋' },
      { title: 'Student Enrollment', route: 'StudentRegistration', icon: '👨‍🎓' },
      { title: 'Manage Profiles', route: 'StudentList', icon: '📝' },
      { title: 'Attendance Verification', route: 'TeacherAttendance', icon: '✅' },
      { title: 'VitalScan AI', route: 'VitalScan', icon: '🔬' },
      { title: 'Homework Management', route: 'HomeworkManagement', icon: '📚' },
      { title: 'Leave Approval', route: 'LeaveApproval', icon: '📋' },
      { title: 'Leave Request', route: 'LeaveRequest', icon: '📅' },
      { title: 'Marks Entry', route: 'MarksEntry', icon: '📝' },
      { title: 'Question Papers', route: 'QuestionPapers', icon: '📄' },
    ],
    pageTitles: {
      '/teacher-dashboard': 'Attendance Logs',
      '/teacher-dashboard/enroll': 'Student Enrollment',
      '/teacher-dashboard/manage': 'Manage Profiles',
      '/teacher-dashboard/verify': 'Attendance Verification',
      '/teacher-dashboard/vitalscan': 'VitalScan AI',
      '/teacher-dashboard/homework-management': 'Homework Management',
      '/teacher-dashboard/leave-approval': 'Leave Approval',
      '/teacher-dashboard/leave': 'Leave Request',
      '/teacher-dashboard/marks-entry': 'Marks Entry',
      '/teacher-dashboard/question-papers': 'Question Papers',
    },
  },

  student: {
    label: 'Student Panel',
    roleDisplay: 'Student',
    menu: [
      { title: 'Attendance', route: 'StudentAttendance', icon: '📅' },
      { title: 'Homework', route: 'StudentHomework', icon: '📚' },
      { title: 'Leave', route: 'StudentLeave', icon: '📋' },
      { title: 'Marks', route: 'StudentMarks', icon: '📝' },
      { title: 'Fees & Payments', route: 'StudentFee', icon: '💰' },
      { title: 'Question Papers', route: 'StudentQuestionPapers', icon: '📄' },
    ],
    pageTitles: {
      '/student-dashboard/attendance': 'Attendance Records',
      '/student-dashboard/homework': 'Homework',
      '/student-dashboard/leave': 'Leave Requests',
      '/student-dashboard/marks': 'Marks & Results',
      '/student-dashboard/fees': 'Fees & Payments',
      '/student-dashboard/question-papers': 'Question Papers',
    },
  },
};

// Theme colors (matches web version)
const theme = {
  bg: '#020617',
  sidebar: '#050d1a',
  sidebarBorder: 'rgba(59,130,246,0.12)',
  primary: '#3b82f6',
  primaryGlow: 'rgba(59,130,246,0.22)',
  activeNavBg: 'rgba(59,130,246,0.15)',
  hoverNavBg: 'rgba(255,255,255,0.04)',
  surface: '#0f172a',
  surfaceBorder: 'rgba(59,130,246,0.1)',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textDim: '#475569',
  error: '#ef4444',
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
  
  const config = MENU_CONFIG[role] || MENU_CONFIG.hm;
  
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
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState<'info' | 'confirm' | 'success' | 'error'>('info');
  const [dialogOnConfirm, setDialogOnConfirm] = useState<(() => void) | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoError, setProfilePhotoError] = useState(false);

  const profileRef = useRef<View>(null);

  // Screen size detection
  useEffect(() => {
    const handleDimensionChange = () => {
      const width = Dimensions.get('window').width;
      setIsTablet(width >= 640 && width < 1024);
      if (width >= 1024) setDrawerOpen(false);
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
        
        // Load profile photo
        const photoUrl = await AsyncStorage.getItem('profile_photo_url');
        if (photoUrl) {
          setProfilePhotoUrl(photoUrl);
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
      if (role !== 'teacher') return;
      
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

  // Build profile details
  useEffect(() => {
    const buildProfileDetails = async () => {
      const details: Array<{ label: string; value: string }> = [];
      
      details.push({ label: 'Name', value: displayName });
      details.push({ label: 'Role', value: config.roleDisplay });
      if (schoolCode) details.push({ label: 'School Code', value: schoolCode });
      
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) details.push({ label: 'User ID', value: userId });
      
      const schoolName = await AsyncStorage.getItem('school_name');
      if (schoolName) details.push({ label: 'School', value: schoolName });
      
      if (role === 'teacher') {
        const teacherId = await AsyncStorage.getItem('teacher_id');
        const employeeId = await AsyncStorage.getItem('employee_id');
        const branchId = await AsyncStorage.getItem('branch_id');
        const branchName = await AsyncStorage.getItem('branch_name');
        
        if (teacherId) details.push({ label: 'Teacher ID', value: teacherId });
        if (employeeId) details.push({ label: 'Employee ID', value: employeeId });
        details.push({ label: 'Designation', value: isClassTeacher ? 'Class Teacher' : 'Subject Teacher' });
        if (branchId) details.push({ label: 'Branch ID', value: branchId });
        if (branchName) details.push({ label: 'Branch Name', value: branchName });
      }
      
      if (role === 'hm') {
        const hmEmployeeId = await AsyncStorage.getItem('hm_employee_id');
        const hmEmail = await AsyncStorage.getItem('hm_email');
        const branchId = await AsyncStorage.getItem('branch_id');
        const branchName = await AsyncStorage.getItem('branch_name');
        
        if (hmEmployeeId) details.push({ label: 'HM Employee ID', value: hmEmployeeId });
        if (hmEmail) details.push({ label: 'HM Email', value: hmEmail });
        if (branchId) details.push({ label: 'Branch ID', value: branchId });
        if (branchName) details.push({ label: 'Branch Name', value: branchName });
      }
      
      if (role === 'principal') {
        const email = await AsyncStorage.getItem('email');
        if (email) details.push({ label: 'Email', value: email });
      }
      
      if (role === 'student') {
        const studentId = await AsyncStorage.getItem('student_id');
        const parentId = await AsyncStorage.getItem('parent_id');
        const branchId = await AsyncStorage.getItem('branch_id');
        
        if (studentId) details.push({ label: 'Student ID', value: studentId });
        if (parentId) details.push({ label: 'Parent ID', value: parentId });
        if (branchId) details.push({ label: 'Branch ID', value: branchId });
      }
      
      setProfileDetails(details);
    };
    
    buildProfileDetails();
  }, [displayName, config.roleDisplay, role, schoolCode, isClassTeacher]);

  const getInitials = (): string => {
    const name = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    return name.slice(0, 2) || 'U';
  };

  const getPageTitle = (): string => {
    const currentPath = route.name;
    return config.pageTitles?.[currentPath] || config.label;
  };

  const handleLogout = () => {
    setDialogMessage('Are you sure you want to sign out?');
    setDialogType('confirm');
    setDialogOnConfirm(() => async () => {
      await AsyncStorage.multiRemove([
        'token', 'user_role', 'user_name', 'user_id',
        'school_code', 'branch_id', 'employee_id', 'teacher_id',
        'student_id', 'profile_photo_url', 'user'
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
    if (dialogOnConfirm) dialogOnConfirm();
    closeDialog();
  };

  const isCompact = isTablet || !sidebarExpanded;
  const showCalendarForRole = role === 'student' || role === 'teacher';
  
  // Filter menu items for non-class teachers
  const visibleMenuItems = (role === 'teacher' && !isClassTeacher)
    ? config.menu.filter(item =>
        ['Attendance Logs', 'Attendance Verification', 'Homework Management', 'Marks Entry', 'VitalScan AI', 'Question Papers'].includes(item.title)
      )
    : config.menu;

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
        {/* Desktop Sidebar */}
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
                    <Text style={styles.brandRole}>{config.roleDisplay}</Text>
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
              <TouchableOpacity onPress={() => setOpenProfile(!openProfile)} style={styles.profileButton}>
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
              dialogType === 'confirm' ? styles.dialogIconConfirm : styles.dialogIconInfo
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
    paddingHorizontal: 16,
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
    fontSize: 14,
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
    paddingVertical: 16,
  },
  menuLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: theme.textDim,
    marginBottom: 12,
    paddingHorizontal: 16,
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
    marginBottom: 4,
  },
  schoolCodeValue: {
    fontSize: 14,
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
    padding: 8,
  },
  menuIcon: {
    fontSize: 20,
    color: theme.textSecondary,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 18,
  },
  profileButton: {
    padding: 4,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.sidebarBorder,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  profileRole: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  profileDetails: {
    maxHeight: 300,
    padding: 16,
  },
  profileDetailsTitle: {
    fontSize: 11,
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
    fontSize: 11,
    color: theme.textSecondary,
  },
  profileDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  profileLogout: {
    padding: 16,
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
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  drawerSchoolCode: {
    fontSize: 10,
    color: theme.primary,
    marginTop: 4,
  },
  drawerNav: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: 14,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  closeCalendarButton: {
    marginTop: 16,
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
    padding: 24,
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
    marginBottom: 16,
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
    fontSize: 14,
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  dialogButtonConfirmText: {
    color: '#fff',
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
    color: '#fff',
    fontWeight: 'bold',
  },
});