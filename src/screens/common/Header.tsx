// src/components/common/Header.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Bell, CalendarDays, LogOut, User, X, ChevronDown } from 'lucide-react-native';
import AppText from './AppText';
import { useAuth } from '../../context/AuthContext';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import NotificationPanel from './NotificationPanel';
import CalendarView from '../CalendarView';

// Utility function for photo cache key generation
const getPhotoCacheKey = (roleBucket: 'student' | 'teacher', id: string, schoolCode: string): string | null => {
  if (!id) return null;
  return `profile_photo_url:${roleBucket}:${schoolCode || 'unknown'}:${id}`;
};

/* ================= TYPES ================= */

interface UserData {
  name: string;
  employee_id?: string;
  student_id?: string;
  role: string;
  email?: string;
  school_code?: string;
  is_class_teacher?: boolean;
}

interface ProfileDetail {
  label: string;
  value: string;
}

/* ================= COMPONENT ================= */

interface HeaderProps {
  title?: string;
  showCalendar?: boolean;
  showNotifications?: boolean;
  role?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  title = "Dashboard", 
  showCalendar = true, 
  showNotifications = true,
  role: propRole 
}) => {
  const navigation = useNavigation();
  const { userRole: authRole, logout } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  
  const [userData, setUserData] = useState<UserData>({
    name: "",
    employee_id: "",
    role: "",
  });
  const [profileDetails, setProfileDetails] = useState<ProfileDetail[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  const role = propRole || authRole || 'teacher';
  const effectiveRoleDisplay = role === 'teacher' && isClassTeacher ? 'Class Teacher' : 
    role === 'teacher' ? 'Subject Teacher' :
    role === 'hm' ? 'Head Master' :
    role === 'student' ? 'Student' :
    role === 'accountant' ? 'Accountant' :
    role === 'principal' ? 'Principal' :
    role === 'admin' ? 'Administrator' : role;

  useEffect(() => {
    loadUserData();
    loadProfilePhoto();
  }, []);

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

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('user_name') || 
                   await AsyncStorage.getItem('teacher_name') || 
                   await AsyncStorage.getItem('student_name') || 
                   'User';
      
      const employeeId = await AsyncStorage.getItem('employee_id') || 
                        await AsyncStorage.getItem('teacher_id') || 
                        await AsyncStorage.getItem('student_id') || 
                        '';
      
      const storedRole = await AsyncStorage.getItem('user_role') || propRole || 'teacher';
      const email = await AsyncStorage.getItem('email') || '';
      const schoolCode = await AsyncStorage.getItem('school_code') || '';
      
      // Get user object
      const userStr = await AsyncStorage.getItem('user');
      let userName = name;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userName = user.name || user.school_name || name;
        } catch {}
      }

      setUserData({
        name: userName,
        employee_id: employeeId,
        role: storedRole,
        email,
        school_code: schoolCode,
      });

      // Build profile details
      const details: ProfileDetail[] = [
        { label: 'Name', value: userName },
        { label: 'Role', value: effectiveRoleDisplay },
      ];
      
      if (schoolCode) details.push({ label: 'School Code', value: schoolCode });
      
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) details.push({ label: 'User ID', value: userId });
      
      const schoolName = await AsyncStorage.getItem('school_name');
      if (schoolName) details.push({ label: 'School', value: schoolName });
      
      if (storedRole === 'teacher') {
        const teacherId = await AsyncStorage.getItem('teacher_id');
        if (teacherId) details.push({ label: 'Teacher ID', value: teacherId });
        if (employeeId) details.push({ label: 'Employee ID', value: employeeId });
        details.push({ label: 'Designation', value: isClassTeacher ? 'Class Teacher' : 'Subject Teacher' });
        
        const branchId = await AsyncStorage.getItem('branch_id');
        const branchName = await AsyncStorage.getItem('branch_name');
        if (branchId) details.push({ label: 'Branch ID', value: branchId });
        if (branchName) details.push({ label: 'Branch Name', value: branchName });
      }
      
      if (storedRole === 'hm') {
        const hmEmployeeId = await AsyncStorage.getItem('hm_employee_id');
        const hmEmail = await AsyncStorage.getItem('hm_email');
        const branchId = await AsyncStorage.getItem('branch_id');
        const branchName = await AsyncStorage.getItem('branch_name');
        
        if (hmEmployeeId) details.push({ label: 'HM Employee ID', value: hmEmployeeId });
        if (hmEmail) details.push({ label: 'HM Email', value: hmEmail });
        if (branchId) details.push({ label: 'Branch ID', value: branchId });
        if (branchName) details.push({ label: 'Branch Name', value: branchName });
      }
      
      if (storedRole === 'student') {
        const studentId = await AsyncStorage.getItem('student_id');
        const parentId = await AsyncStorage.getItem('parent_id');
        if (studentId) details.push({ label: 'Student ID', value: studentId });
        if (parentId) details.push({ label: 'Parent ID', value: parentId });
      }
      
      if (storedRole === 'principal' && email) {
        details.push({ label: 'Email', value: email });
      }
      
      setProfileDetails(details);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadProfilePhoto = async () => {
    try {
      const storedRole = await AsyncStorage.getItem('user_role') || propRole || 'teacher';
      const roleBucket = storedRole === 'student' ? 'student' : 'teacher';
      
      let entityId = '';
      if (storedRole === 'student') {
        entityId = await AsyncStorage.getItem('student_id') || '';
      } else {
        entityId = await AsyncStorage.getItem('teacher_id') || 
                   await AsyncStorage.getItem('employee_id') || '';
      }
      
      const schoolCode = await AsyncStorage.getItem('school_code') || '';
      const scopedPhotoKey = getPhotoCacheKey(roleBucket as any, entityId, schoolCode);
      
      if (scopedPhotoKey) {
        const scopedPhotoUrl = await AsyncStorage.getItem(scopedPhotoKey);
        if (scopedPhotoUrl) {
          setProfilePhotoUrl(scopedPhotoUrl);
          setProfilePhotoError(false);
          return;
        }
      }
      
      // Fallback to old key
      const photoUrl = await AsyncStorage.getItem('profile_photo_url');
      if (photoUrl) {
        setProfilePhotoUrl(photoUrl);
        setProfilePhotoError(false);
      } else {
        setProfilePhotoError(true);
      }
    } catch (error) {
      console.error('Failed to load profile photo:', error);
      setProfilePhotoError(true);
    }
  };

  const getInitials = (): string => {
    const name = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
    return name.slice(0, 2) || 'U';
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
          }
        },
      ]
    );
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications' as never);
  };

  const Avatar = ({ size = 40 }: { size?: number }) => {
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
      <View style={[styles.avatarInitials, { width: size, height: size, borderRadius: size / 2 }]}>
        <AppText style={[styles.avatarInitialsText, { fontSize: size * 0.4 }]}>{getInitials()}</AppText>
      </View>
    );
  };

  const ProfileDropdown = () => {
    if (!showProfileDropdown) return null;
    
    return (
      <Modal
        visible={showProfileDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1} 
          onPress={() => setShowProfileDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Avatar size={50} />
              <View style={styles.dropdownHeaderInfo}>
                <AppText style={styles.dropdownName}>{userData.name}</AppText>
                <AppText style={styles.dropdownRole}>{effectiveRoleDisplay}</AppText>
              </View>
            </View>
            
            <ScrollView style={styles.dropdownDetails} showsVerticalScrollIndicator={false}>
              <AppText style={styles.dropdownDetailsTitle}>Profile Details</AppText>
              {profileDetails.map((item, idx) => (
                <View key={idx} style={styles.dropdownDetailRow}>
                  <AppText style={styles.dropdownDetailLabel}>{item.label}</AppText>
                  <AppText style={styles.dropdownDetailValue}>{item.value}</AppText>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.dropdownViewProfile}
              onPress={() => {
                setShowProfileDropdown(false);
                navigation.navigate('Profile' as never);
              }}
            >
              <AppText style={styles.dropdownViewProfileText}>View Full Profile</AppText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.dropdownLogout} onPress={handleLogout}>
              <LogOut size={18} color="#ef4444" />
              <AppText style={styles.dropdownLogoutText}>Sign Out</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const CalendarModal = () => {
    if (!showCalendarModal) return null;
    
    return (
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity 
          style={styles.calendarOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <AppText style={styles.calendarTitle}>📅 Academic Calendar</AppText>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <X size={24} color="#0d1b2a" />
              </TouchableOpacity>
            </View>
            <CalendarView />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View>
          <AppText style={styles.title}>{title}</AppText>
          {userData.school_code && (
            <AppText style={styles.schoolCode}>{userData.school_code}</AppText>
          )}
        </View>

        <View style={styles.rightSection}>
          {showCalendar && (role === 'student' || role === 'teacher') && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => setShowCalendarModal(true)}
            >
              <CalendarDays size={22} color="#f1f5f9" />
            </TouchableOpacity>
          )}
          
          {showNotifications && (
            <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
              <View style={styles.bellContainer}>
                <Bell size={22} color="#f1f5f9" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </AppText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => setShowProfileDropdown(true)}
          >
            <Avatar size={40} />
            <ChevronDown size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      <ProfileDropdown />
      <CalendarModal />
    </>
  );
};

export default Header;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  schoolCode: {
    color: "#60a5fa",
    fontSize: 10,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 30,
    gap: 6,
  },
  avatarImage: {
    borderWidth: 2,
    borderColor: "#60a5fa",
    backgroundColor: "#334155",
  },
  avatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#3b82f6",
  },
  avatarInitialsText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    width: 320,
    marginTop: 60,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,130,246,0.1)',
  },
  dropdownHeaderInfo: {
    flex: 1,
  },
  dropdownName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownRole: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  dropdownDetails: {
    maxHeight: 300,
    padding: 16,
  },
  dropdownDetailsTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  dropdownDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownDetailLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  dropdownDetailValue: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  dropdownViewProfile: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  dropdownViewProfileText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  dropdownLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  dropdownLogoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  // Calendar Modal styles
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e9f2',
    backgroundColor: '#f8fafc',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0d1b2a',
  },
});