import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import Icon from '@react-native-vector-icons/feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';
import API from '../../services/api';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import AvatarBubble from '../../components/common/AvatarBubble';

// Types
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

// Settings Interface
interface AppSettings {
  notifications: boolean;
  emailAlerts: boolean;
  pushNotifications: boolean;
  darkMode: boolean;
  autoSave: boolean;
  language: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { userRole, logout, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    teacher_id: '',
    student_id: '',
    school_name: '',
    school_code: '',
    branch_id: '',
    branch_name: '',
    role: '',
    designation: '',
    department_subject: '',
    date_of_joining: '',
    qualification: '',
    experience_years: '',
    address: '',
    blood_group: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    mother_tongue: '',
    religion: '',
    aadhaar_number: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    father_guardian_name: '',
    father_guardian_mobile: '',
    mother_guardian_name: '',
    mother_guardian_mobile: '',
  });
  
  // Settings state
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    emailAlerts: true,
    pushNotifications: true,
    darkMode: false,
    autoSave: true,
    language: 'English',
  });
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState({ key: '', label: '', value: '' });

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get stored user data from multiple sources
      const storedUser = await AsyncStorage.getItem('user');
      let parsedUser: any = {};
      try {
        if (storedUser) parsedUser = JSON.parse(storedUser);
      } catch (e) {}
      
      // Get all stored values
      const [
        name, email, phone, employeeId, teacherId, studentId,
        schoolName, schoolCode, branchId, branchName, role,
        designation, departmentSubject, dateOfJoining, qualification,
        experienceYears, address, bloodGroup, dateOfBirth, gender,
        nationality, motherTongue, religion, aadhaarNumber,
        emergencyContactName, emergencyContactNumber,
        fatherName, fatherMobile, motherName, motherMobile,
        rollNumber, classGrade, section,
      ] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        AsyncStorage.getItem('user_email'),
        AsyncStorage.getItem('user_phone'),
        AsyncStorage.getItem('employee_id'),
        AsyncStorage.getItem('teacher_id'),
        AsyncStorage.getItem('student_id'),
        AsyncStorage.getItem('school_name'),
        AsyncStorage.getItem('school_code'),
        AsyncStorage.getItem('branch_id'),
        AsyncStorage.getItem('branch_name'),
        AsyncStorage.getItem('user_role'),
        AsyncStorage.getItem('designation'),
        AsyncStorage.getItem('department_subject'),
        AsyncStorage.getItem('date_of_joining'),
        AsyncStorage.getItem('qualification'),
        AsyncStorage.getItem('experience_years'),
        AsyncStorage.getItem('address'),
        AsyncStorage.getItem('blood_group'),
        AsyncStorage.getItem('date_of_birth'),
        AsyncStorage.getItem('gender'),
        AsyncStorage.getItem('nationality'),
        AsyncStorage.getItem('mother_tongue'),
        AsyncStorage.getItem('religion'),
        AsyncStorage.getItem('aadhaar_number'),
        AsyncStorage.getItem('emergency_contact_name'),
        AsyncStorage.getItem('emergency_contact_number'),
        AsyncStorage.getItem('father_guardian_name'),
        AsyncStorage.getItem('father_guardian_mobile'),
        AsyncStorage.getItem('mother_guardian_name'),
        AsyncStorage.getItem('mother_guardian_mobile'),
        AsyncStorage.getItem('roll_number'),
        AsyncStorage.getItem('class_grade'),
        AsyncStorage.getItem('section'),
      ]);
      
      // Load settings
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      
      // Determine role from multiple sources
      const finalRole = role || userRole || parsedUser?.role || 'user';
      
      // Build user info from all available sources
      setUserInfo({
        name: name || parsedUser?.name || parsedUser?.full_name || 'User',
        email: email || parsedUser?.email || '',
        phone: phone || parsedUser?.phone || '',
        employee_id: employeeId || parsedUser?.employee_id || '',
        teacher_id: teacherId || parsedUser?.teacher_id || '',
        student_id: studentId || parsedUser?.student_id || '',
        school_name: schoolName || parsedUser?.school_name || '',
        school_code: schoolCode || parsedUser?.school_code || '',
        branch_id: branchId || parsedUser?.branch_id || '',
        branch_name: branchName || parsedUser?.branch_name || '',
        role: finalRole,
        designation: designation || parsedUser?.designation || '',
        department_subject: departmentSubject || parsedUser?.department_subject || '',
        date_of_joining: dateOfJoining || parsedUser?.date_of_joining || '',
        qualification: qualification || parsedUser?.qualification || '',
        experience_years: experienceYears || parsedUser?.experience_years || '',
        address: address || parsedUser?.address || '',
        blood_group: bloodGroup || parsedUser?.blood_group || '',
        date_of_birth: dateOfBirth || parsedUser?.date_of_birth || '',
        gender: gender || parsedUser?.gender || '',
        nationality: nationality || parsedUser?.nationality || 'Indian',
        mother_tongue: motherTongue || parsedUser?.mother_tongue || '',
        religion: religion || parsedUser?.religion || '',
        aadhaar_number: aadhaarNumber || parsedUser?.aadhaar_number || '',
        emergency_contact_name: emergencyContactName || parsedUser?.emergency_contact_name || '',
        emergency_contact_number: emergencyContactNumber || parsedUser?.emergency_contact_number || '',
        father_guardian_name: fatherName || parsedUser?.father_guardian_name || '',
        father_guardian_mobile: fatherMobile || parsedUser?.father_guardian_mobile || '',
        mother_guardian_name: motherName || parsedUser?.mother_guardian_name || '',
        mother_guardian_mobile: motherMobile || parsedUser?.mother_guardian_mobile || '',
        roll_number: rollNumber || parsedUser?.roll_number || '',
        class_grade: classGrade || parsedUser?.class_grade || '',
        section: section || parsedUser?.section || '',
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const saveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    Alert.alert('Success', 'Settings saved successfully');
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleEditField = async () => {
    if (!editField.key || !editField.value) return;
    
    try {
      // Update local state immediately for UI feedback
      setUserInfo(prev => ({ ...prev, [editField.key]: editField.value }));
      
      // Update AsyncStorage
      await AsyncStorage.setItem(editField.key, editField.value);
      
      // Also update user object if needed
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          userObj[editField.key] = editField.value;
          await AsyncStorage.setItem('user', JSON.stringify(userObj));
        } catch (e) {}
      }
      
      // Try to update via API if available (don't block on error)
      try {
        await API.put('/profile/update', {
          [editField.key]: editField.value,
        });
      } catch (apiError) {
        console.log('API update failed, but local save succeeded');
      }
      
      Alert.alert('Success', `${editField.label} updated successfully`);
      setShowEditModal(false);
      setEditField({ key: '', label: '', value: '' });
      
      // Refresh auth context to update header
      refreshAuth();
    } catch (error) {
      Alert.alert('Error', 'Failed to update field');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getRoleDisplayName = () => {
    const role = userInfo.role?.toLowerCase() || '';
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      case 'hm': return 'Head Master';
      case 'principal': return 'Principal';
      case 'accountant': return 'Accountant';
      default: return userInfo.role || 'User';
    }
  };

  const getBasicInfoFields = () => [
    { label: 'Full Name', key: 'name', value: userInfo.name, icon: 'user' },
    { label: 'Email Address', key: 'email', value: userInfo.email, icon: 'mail' },
    { label: 'Phone Number', key: 'phone', value: userInfo.phone, icon: 'phone' },
    { label: 'Gender', key: 'gender', value: userInfo.gender, icon: 'users' },
    { label: 'Date of Birth', key: 'date_of_birth', value: userInfo.date_of_birth, icon: 'calendar' },
    { label: 'Blood Group', key: 'blood_group', value: userInfo.blood_group, icon: 'droplet' },
    { label: 'Nationality', key: 'nationality', value: userInfo.nationality, icon: 'flag' },
    { label: 'Mother Tongue', key: 'mother_tongue', value: userInfo.mother_tongue, icon: 'message-circle' },
    { label: 'Religion', key: 'religion', value: userInfo.religion, icon: 'heart' },
    { label: 'Aadhaar Number', key: 'aadhaar_number', value: userInfo.aadhaar_number, icon: 'credit-card' },
  ];

  const getAcademicInfoFields = () => {
    const fields = [];
    if (userInfo.role === 'teacher' || userInfo.role === 'hm') {
      fields.push(
        { label: 'Employee ID', key: 'employee_id', value: userInfo.employee_id, icon: 'hash' },
        { label: 'Designation', key: 'designation', value: userInfo.designation, icon: 'briefcase' },
        { label: 'Department/Subject', key: 'department_subject', value: userInfo.department_subject, icon: 'book-open' },
        { label: 'Qualification', key: 'qualification', value: userInfo.qualification, icon: 'award' },
        { label: 'Experience (Years)', key: 'experience_years', value: userInfo.experience_years, icon: 'clock' },
        { label: 'Date of Joining', key: 'date_of_joining', value: userInfo.date_of_joining, icon: 'calendar' },
      );
    } else if (userInfo.role === 'student') {
      fields.push(
        { label: 'Student ID', key: 'student_id', value: userInfo.student_id, icon: 'hash' },
        { label: 'Roll Number', key: 'roll_number', value: userInfo.roll_number, icon: 'hash' },
        { label: 'Class', key: 'class_grade', value: userInfo.class_grade, icon: 'book-open' },
        { label: 'Section', key: 'section', value: userInfo.section, icon: 'grid' },
      );
    }
    return fields;
  };

  const getSchoolInfoFields = () => [
    { label: 'School Name', key: 'school_name', value: userInfo.school_name, icon: 'home' },
    { label: 'School Code', key: 'school_code', value: userInfo.school_code, icon: 'hash' },
    { label: 'Branch ID', key: 'branch_id', value: userInfo.branch_id, icon: 'git-branch' },
    { label: 'Branch Name', key: 'branch_name', value: userInfo.branch_name, icon: 'map-pin' },
  ];

  const getEmergencyContactFields = () => [
    { label: 'Emergency Contact', key: 'emergency_contact_name', value: userInfo.emergency_contact_name, icon: 'user' },
    { label: 'Emergency Number', key: 'emergency_contact_number', value: userInfo.emergency_contact_number, icon: 'phone' },
    { label: 'Father Name', key: 'father_guardian_name', value: userInfo.father_guardian_name, icon: 'user' },
    { label: 'Father Mobile', key: 'father_guardian_mobile', value: userInfo.father_guardian_mobile, icon: 'phone' },
    { label: 'Mother Name', key: 'mother_guardian_name', value: userInfo.mother_guardian_name, icon: 'user' },
    { label: 'Mother Mobile', key: 'mother_guardian_mobile', value: userInfo.mother_guardian_mobile, icon: 'phone' },
  ];

  const renderInfoRow = (label: string, value: string, icon: string, onEdit?: () => void) => (
    <View style={styles.infoRow}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={18} color={colors.accent || '#2563eb'} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editIcon}>
          <Icon name="edit-2" size={16} color={colors.textMuted || '#64748b'} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary || '#2563eb'} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <AvatarBubble
          displayName={userInfo.name}
          size={80}
          textSize={28}
          primaryColor={colors.primary || '#2563eb'}
        />
        <Text style={styles.name}>{userInfo.name}</Text>
        <Text style={styles.role}>{getRoleDisplayName()}</Text>
        {userInfo.email ? <Text style={styles.email}>{userInfo.email}</Text> : null}
        {userInfo.phone ? <Text style={styles.phone}>{userInfo.phone}</Text> : null}
      </View>

      {/* Basic Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <AppCard style={styles.infoCard}>
          {getBasicInfoFields().map((field, index) => (
            <View key={field.key}>
              {renderInfoRow(field.label, field.value, field.icon, () => {
                setEditField({ key: field.key, label: field.label, value: field.value });
                setShowEditModal(true);
              })}
              {index < getBasicInfoFields().length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AppCard>
      </View>

      {/* Academic/Professional Information */}
      {getAcademicInfoFields().length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {userInfo.role === 'student' ? 'Academic Information' : 'Professional Information'}
          </Text>
          <AppCard style={styles.infoCard}>
            {getAcademicInfoFields().map((field, index) => (
              <View key={field.key}>
                {renderInfoRow(field.label, field.value, field.icon, () => {
                  setEditField({ key: field.key, label: field.label, value: field.value });
                  setShowEditModal(true);
                })}
                {index < getAcademicInfoFields().length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </AppCard>
        </View>
      )}

      {/* School Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Organization Details</Text>
        <AppCard style={styles.infoCard}>
          {getSchoolInfoFields().map((field, index) => (
            <View key={field.key}>
              {renderInfoRow(field.label, field.value, field.icon)}
              {index < getSchoolInfoFields().length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AppCard>
      </View>

      {/* Emergency Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <AppCard style={styles.infoCard}>
          {getEmergencyContactFields().map((field, index) => (
            <View key={field.key}>
              {renderInfoRow(field.label, field.value, field.icon, () => {
                setEditField({ key: field.key, label: field.label, value: field.value });
                setShowEditModal(true);
              })}
              {index < getEmergencyContactFields().length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AppCard>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <AppCard style={styles.infoCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
            <View style={styles.menuIconContainer}>
              <Icon name="sliders" size={18} color={colors.textPrimary || '#0f172a'} />
            </View>
            <Text style={styles.menuText}>App Settings</Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted || '#64748b'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Security settings will be available soon')}>
            <View style={styles.menuIconContainer}>
              <Icon name="lock" size={18} color={colors.textPrimary || '#0f172a'} />
            </View>
            <Text style={styles.menuText}>Security Settings</Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted || '#64748b'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Language settings will be available soon')}>
            <View style={styles.menuIconContainer}>
              <Icon name="globe" size={18} color={colors.textPrimary || '#0f172a'} />
            </View>
            <Text style={styles.menuText}>Language</Text>
            <Text style={styles.menuValue}>{settings.language}</Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted || '#64748b'} />
          </TouchableOpacity>
        </AppCard>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <AppCard style={styles.infoCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Change password will be available soon')}>
            <View style={styles.menuIconContainer}>
              <Icon name="key" size={18} color={colors.textPrimary || '#0f172a'} />
            </View>
            <Text style={styles.menuText}>Change Password</Text>
            <Icon name="chevron-right" size={20} color={colors.textMuted || '#64748b'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuItem, styles.logoutBtn]} onPress={handleLogout}>
            <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Icon name="log-out" size={18} color={colors.error || '#ef4444'} />
            </View>
            <Text style={[styles.menuText, { color: colors.error || '#ef4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </AppCard>
      </View>

      <Text style={styles.version}>AttendX Mobile v1.0.0</Text>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>App Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.modalClose}>
                <Icon name="x" size={24} color={colors.textMuted || '#64748b'} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Notifications</Text>
                  <Text style={styles.settingDescription}>Receive push notifications</Text>
                </View>
                <Switch
                  value={settings.notifications}
                  onValueChange={(val) => handleSettingChange('notifications', val)}
                  trackColor={{ false: colors.border || '#e2e8f0', true: colors.primary || '#2563eb' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : settings.notifications ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Email Alerts</Text>
                  <Text style={styles.settingDescription}>Receive email notifications</Text>
                </View>
                <Switch
                  value={settings.emailAlerts}
                  onValueChange={(val) => handleSettingChange('emailAlerts', val)}
                  trackColor={{ false: colors.border || '#e2e8f0', true: colors.primary || '#2563eb' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : settings.emailAlerts ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Instant mobile alerts</Text>
                </View>
                <Switch
                  value={settings.pushNotifications}
                  onValueChange={(val) => handleSettingChange('pushNotifications', val)}
                  trackColor={{ false: colors.border || '#e2e8f0', true: colors.primary || '#2563eb' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : settings.pushNotifications ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>Switch to dark theme</Text>
                </View>
                <Switch
                  value={settings.darkMode}
                  onValueChange={(val) => handleSettingChange('darkMode', val)}
                  trackColor={{ false: colors.border || '#e2e8f0', true: colors.primary || '#2563eb' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : settings.darkMode ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingItem}>
                <View>
                  <Text style={styles.settingLabel}>Auto Save</Text>
                  <Text style={styles.settingDescription}>Automatically save changes</Text>
                </View>
                <Switch
                  value={settings.autoSave}
                  onValueChange={(val) => handleSettingChange('autoSave', val)}
                  trackColor={{ false: colors.border || '#e2e8f0', true: colors.primary || '#2563eb' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : settings.autoSave ? '#fff' : '#f4f3f4'}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setShowSettingsModal(false)} type="secondary" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Field Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editField.label}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalClose}>
                <Icon name="x" size={24} color={colors.textMuted || '#64748b'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TextInput
                style={styles.editInput}
                value={editField.value}
                onChangeText={(text) => setEditField(prev => ({ ...prev, value: text }))}
                placeholder={`Enter ${editField.label}`}
                placeholderTextColor={colors.textMuted || '#64748b'}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <AppButton title="Cancel" onPress={() => setShowEditModal(false)} type="secondary" />
              <AppButton title="Save" onPress={handleEditField} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
  },
  role: {
    fontSize: 13,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  phone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  editIcon: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  menuValue: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 8,
  },
  logoutBtn: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  version: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 30,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
});